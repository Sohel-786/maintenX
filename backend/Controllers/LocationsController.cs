using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;

namespace net_backend.Controllers
{
    [Route("api/locations")]
    [ApiController]
    public class LocationsController : BaseController
    {
        private readonly IExcelService _excelService;
        public LocationsController(ApplicationDbContext context, IExcelService excelService) : base(context)
        {
            _excelService = excelService;
        }

        [HttpGet("export")]
        public async Task<IActionResult> Export()
        {
            if (!await HasAllPermissions("ViewMaster", "ExportMaster", "ManageLocation")) return Forbidden();

            var locations = await _context.Locations
                .Include(l => l.Company)
                .OrderByDescending(l => l.CreatedAt)
                .ToListAsync();
            var data = locations.Select(l => new {
                Name = l.Name,
                Address = l.Address,
                Company = l.Company?.Name ?? "",
                IsActive = l.IsActive ? "Yes" : "No",
                CreatedAt = l.CreatedAt.ToString("yyyy-MM-dd HH:mm")
            });

            var file = _excelService.GenerateExcel(data, "Locations");
            return File(file, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "locations.xlsx");
        }

        [HttpPost("validate")]
        public async Task<ActionResult<ApiResponse<ValidationResultDto<LocationImportDto>>>> Validate(IFormFile file)
        {
            if (!await HasAllPermissions("ViewMaster", "ManageLocation")) return Forbidden();
            if (file == null || file.Length == 0) return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Success = false, Message = "No file uploaded" });
            try
            {
                using var stream = file.OpenReadStream();
                var result = _excelService.ImportExcel<LocationImportDto>(stream);
                var validation = await ValidateLocations(result.Data);
                validation.TotalRows = result.TotalRows;
                return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Data = validation });
            }
            catch (Exception ex) { return Ok(new ApiResponse<ValidationResultDto<LocationImportDto>> { Success = false, Message = ex.Message }); }
        }

        [HttpPost("import")]
        public async Task<ActionResult<ApiResponse<object>>> Import(IFormFile file)
        {
            if (!await HasAllPermissions("ViewMaster", "ImportMaster", "ManageLocation")) return Forbidden();

            if (file == null || file.Length == 0)
                return Ok(new ApiResponse<object> { Success = false, Message = "No file uploaded" });

            try
            {
                using (var stream = file.OpenReadStream())
                {
                    var result = _excelService.ImportExcel<LocationImportDto>(stream);
                    var validation = await ValidateLocations(result.Data);
                    var newLocations = new List<Location>();

                    var companies = await _context.Companies.ToDictionaryAsync(c => c.Name.ToLower(), c => c.Id);

                    foreach (var validRow in validation.Valid)
                    {
                        if (companies.TryGetValue(validRow.Data.CompanyName.Trim().ToLower(), out int companyId))
                        {
                            newLocations.Add(new Location
                            {
                                Name = validRow.Data.Name.Trim(),
                                Address = validRow.Data.Address.Trim(),
                                CompanyId = companyId,
                                IsActive = true,
                                CreatedAt = DateTime.Now,
                                UpdatedAt = DateTime.Now
                            });
                        }
                    }

                    if (newLocations.Any())
                    {
                        _context.Locations.AddRange(newLocations);
                        await _context.SaveChangesAsync();
                    }

                    var finalResult = new
                    {
                        imported = newLocations.Count,
                        totalRows = result.TotalRows,
                        errors = validation.Invalid.Select(e => new RowError { Row = e.Row, Message = e.Message ?? "" }).ToList()
                    };

                    return Ok(new ApiResponse<object> { Data = finalResult, Message = $"{newLocations.Count} locations imported successfully" });
                }
            }
            catch (Exception ex)
            {
                return Ok(new ApiResponse<object> { Success = false, Message = $"Import failed: {ex.Message}" });
            }
        }

        private async Task<ValidationResultDto<LocationImportDto>> ValidateLocations(List<ExcelRow<LocationImportDto>> rows)
        {
            var validation = new ValidationResultDto<LocationImportDto>();
            var existingLocations = await _context.Locations
                .Include(l => l.Company)
                .Select(l => new { Name = l.Name.ToLower(), CompanyName = l.Company!.Name.ToLower() })
                .ToListAsync();
            var existingSet = new HashSet<string>(existingLocations.Select(l => l.Name + "|" + l.CompanyName));

            var companies = await _context.Companies
                .Select(c => c.Name.ToLower())
                .ToListAsync();
            var processedInFile = new HashSet<string>();

            foreach (var row in rows)
            {
                var item = row.Data;
                if (string.IsNullOrWhiteSpace(item.Name))
                {
                    validation.Invalid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = "Name is mandatory" });
                    continue;
                }

                if (string.IsNullOrWhiteSpace(item.CompanyName))
                {
                    validation.Invalid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = "Company Name is mandatory" });
                    continue;
                }

                if (string.IsNullOrWhiteSpace(item.Address))
                {
                    validation.Invalid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = "Address is mandatory" });
                    continue;
                }

                var nameLower = item.Name.Trim().ToLower();
                var companyLower = item.CompanyName.Trim().ToLower();
                var compositeKey = nameLower + "|" + companyLower;

                if (!companies.Contains(companyLower))
                {
                    validation.Invalid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = $"Company '{item.CompanyName}' not found" });
                    continue;
                }

                if (processedInFile.Contains(compositeKey))
                {
                    validation.Duplicates.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = "Duplicate Name for this Company in file" });
                    continue;
                }

                if (existingSet.Contains(compositeKey))
                {
                    validation.AlreadyExists.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item, Message = "Already exists in database" });
                    processedInFile.Add(compositeKey);
                    continue;
                }

                validation.Valid.Add(new ValidationEntry<LocationImportDto> { Row = row.RowNumber, Data = item });
                processedInFile.Add(compositeKey);
            }

            return validation;
        }

        /// <summary>Existing location names for a company (autocomplete / duplicate hints).</summary>
        [HttpGet("name-suggestions")]
        public async Task<ActionResult<ApiResponse<List<string>>>> GetNameSuggestions(
            [FromQuery] int companyId,
            [FromQuery] string? q = null)
        {
            if (!await HasAllPermissions("ViewMaster", "ManageLocation")) return Forbidden();
            if (companyId <= 0)
                return BadRequest(new ApiResponse<List<string>> { Success = false, Message = "companyId is required." });

            var query = _context.Locations.AsNoTracking().Where(l => l.CompanyId == companyId);
            if (!string.IsNullOrWhiteSpace(q))
            {
                var t = q.Trim().ToLower();
                query = query.Where(l => l.Name.ToLower().Contains(t));
            }

            var names = await query
                .Select(l => l.Name)
                .Distinct()
                .OrderBy(n => n)
                .Take(80)
                .ToListAsync();
            return Ok(new ApiResponse<List<string>> { Data = names });
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetAll(
            [FromQuery] string? search,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 25)
        {
            if (!await HasAllPermissions("ViewMaster", "ManageLocation")) return Forbidden();
            var query = _context.Locations.Include(l => l.Company).AsQueryable();
            if (isActive.HasValue)
                query = query.Where(l => l.IsActive == isActive.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                query = query.Where(l =>
                    (l.Name != null && l.Name.ToLower().Contains(s)) ||
                    (l.Address != null && l.Address.ToLower().Contains(s)) ||
                    (l.Company != null && l.Company.Name != null && l.Company.Name.ToLower().Contains(s)));
            }
            var totalCount = await query.CountAsync();
            var (skip, take) = net_backend.Services.PaginationHelper.GetSkipTake(page, pageSize);
            var locations = await query
                .OrderByDescending(l => l.CreatedAt)
                .Skip(skip)
                .Take(take)
                .Select(l => new {
                    l.Id,
                    l.Name,
                    l.Address,
                    l.CompanyId,
                    CompanyName = l.Company != null ? l.Company.Name : "",
                    l.IsActive,
                    l.CreatedAt
                })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = locations, TotalCount = totalCount });
        }

        [HttpGet("active")]
        public async Task<ActionResult<ApiResponse<IEnumerable<object>>>> GetActive()
        {
            if (!await HasAllPermissions("ViewMaster", "ManageLocation")) return Forbidden();
            var locations = await _context.Locations
                .Where(l => l.IsActive)
                .OrderByDescending(l => l.CreatedAt)
                .Select(l => new { l.Id, l.Name, l.Address, l.CompanyId })
                .ToListAsync();
            return Ok(new ApiResponse<IEnumerable<object>> { Data = locations });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<Location>>> Create([FromBody] CreateLocationRequest request)
        {
            if (!await CanCreateMaster("ManageLocation")) return Forbidden();

            if (await _context.Locations.AnyAsync(l => l.Name.ToLower() == request.Name.Trim().ToLower() && l.CompanyId == request.CompanyId))
                return BadRequest(new ApiResponse<Location> { Success = false, Message = "Location already exists for this company" });

            var location = new Location
            {
                Name = request.Name.Trim(),
                Address = string.IsNullOrWhiteSpace(request.Address) ? string.Empty : request.Address.Trim(),
                CompanyId = request.CompanyId,
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _context.Locations.Add(location);
            await _context.SaveChangesAsync();

            await GrantNewLocationAccessToAdminsAsync(request.CompanyId, location.Id);

            return StatusCode(201, new ApiResponse<Location> { Data = location });
        }

        /// <summary>When a new location is created, grant all admin users access so they see it in Select Company &amp; Location and in Settings pills.</summary>
        private async Task GrantNewLocationAccessToAdminsAsync(int companyId, int locationId)
        {
            var adminIds = await _context.Users
                .Where(u => u.Role == Role.ADMIN && u.IsActive)
                .Select(u => u.Id)
                .ToListAsync();
            var existing = await _context.UserLocationAccess
                .Where(ula => ula.CompanyId == companyId && ula.LocationId == locationId)
                .Select(ula => ula.UserId)
                .ToListAsync();
            var existingSet = new HashSet<int>(existing);
            foreach (var uid in adminIds)
            {
                if (existingSet.Contains(uid)) continue;
                _context.UserLocationAccess.Add(new UserLocationAccess
                {
                    UserId = uid,
                    CompanyId = companyId,
                    LocationId = locationId,
                    CreatedAt = DateTime.Now
                });
            }
            await _context.SaveChangesAsync();
        }

        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<Location>>> Update(int id, [FromBody] UpdateLocationRequest request)
        {
            if (!await CanEditMaster("ManageLocation")) return Forbidden();

            var existing = await _context.Locations.FindAsync(id);
            if (existing == null) return NotFound(new ApiResponse<Location> { Success = false, Message = "Location not found" });

            var newName = (request.Name ?? existing.Name).Trim();
            var newCompanyId = request.CompanyId ?? existing.CompanyId;

            if (request.Name != null || request.CompanyId != null)
            {
                if (await _context.Locations.AnyAsync(l => l.Id != id && l.Name.ToLower() == newName.ToLower() && l.CompanyId == newCompanyId))
                    return BadRequest(new ApiResponse<Location> { Success = false, Message = "Location already exists for this company" });
            }

            if (request.Name != null) existing.Name = request.Name.Trim();
            if (request.Address != null) existing.Address = request.Address.Trim();
            if (request.CompanyId != null && request.CompanyId > 0) existing.CompanyId = request.CompanyId.Value;
            if (request.IsActive.HasValue) existing.IsActive = request.IsActive.Value;
            existing.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<Location> { Data = existing });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            if (!await HasPermission("ManageLocation")) return Forbidden();

            var location = await _context.Locations.FindAsync(id);
            if (location == null) return NotFound(new ApiResponse<bool> { Success = false, Message = "Location not found" });

            _context.Locations.Remove(location);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }
    }
}
