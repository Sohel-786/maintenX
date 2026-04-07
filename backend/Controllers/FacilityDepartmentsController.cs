using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using static net_backend.Services.PaginationHelper;

namespace net_backend.Controllers
{
    [Route("api/facility-departments")]
    [ApiController]
    public class FacilityDepartmentsController : BaseController
    {
        public FacilityDepartmentsController(ApplicationDbContext context) : base(context)
        {
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<FacilityDepartmentDto>>>> GetAll(
            [FromQuery] bool includeInactive = false,
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int? page = null,
            [FromQuery] int pageSize = 25)
        {
            if (!await HasPermission("ViewComplaints")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync(); // still used for writes / legacy FK

            IQueryable<FacilityDepartment> q = _context.FacilityDepartments.AsNoTracking()
                .Include(d => d.Location)
                .Where(d => d.CompanyId == companyId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(d => d.Name.ToLower().Contains(s));
            }

            if (page.HasValue)
            {
                if (isActive.HasValue)
                    q = q.Where(d => d.IsActive == isActive.Value);
                else if (!includeInactive)
                    q = q.Where(d => d.IsActive);
            }
            else
            {
                if (!includeInactive)
                    q = q.Where(d => d.IsActive);
            }

            if (!page.HasValue)
            {
                var list = await q
                    .OrderBy(d => d.Name)
                    .Select(d => new FacilityDepartmentDto
                    {
                        Id = d.Id,
                        Name = d.Name,
                        IsActive = d.IsActive
                    })
                    .ToListAsync();
                return Ok(new ApiResponse<List<FacilityDepartmentDto>> { Data = list });
            }

            var totalCount = await q.CountAsync();
            var (skip, take) = GetSkipTake(page!.Value, pageSize);
            var paged = await q
                .OrderBy(d => d.Name)
                .Skip(skip)
                .Take(take)
                .Select(d => new FacilityDepartmentDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    IsActive = d.IsActive
                })
                .ToListAsync();
            return Ok(new ApiResponse<List<FacilityDepartmentDto>> { Data = paged, TotalCount = totalCount });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<FacilityDepartmentDto>>> Create([FromBody] CreateFacilityDepartmentRequest request)
        {
            if (!await HasPermission("ManageCategories")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync(); // stored for legacy FK, but dept is company-scoped
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<FacilityDepartmentDto> { Success = false, Message = "Name is required." });
            var name = request.Name.Trim();
            if (await _context.FacilityDepartments.AnyAsync(d => d.CompanyId == companyId && d.Name.ToLower() == name.ToLower()))
                return Conflict(new ApiResponse<FacilityDepartmentDto> { Success = false, Message = "Department already exists." });

            var d = new FacilityDepartment
            {
                CompanyId = companyId,
                LocationId = locationId,
                Name = name,
                IsActive = true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _context.FacilityDepartments.Add(d);
            await _context.SaveChangesAsync();
            var loc = await _context.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.Id == locationId);
            return StatusCode(201, new ApiResponse<FacilityDepartmentDto>
            {
                Data = new FacilityDepartmentDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    IsActive = d.IsActive
                }
            });
        }

        [HttpPatch("{id:int}")]
        public async Task<ActionResult<ApiResponse<FacilityDepartmentDto>>> Update(int id, [FromBody] UpdateFacilityDepartmentRequest request)
        {
            if (!await HasPermission("ManageCategories")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync();
            var d = await _context.FacilityDepartments.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId);
            if (d == null) return NotFound();
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<FacilityDepartmentDto> { Success = false, Message = "Name is required." });
            var name = request.Name.Trim();
            if (await _context.FacilityDepartments.AnyAsync(x => x.CompanyId == companyId && x.Id != id && x.Name.ToLower() == name.ToLower()))
                return Conflict(new ApiResponse<FacilityDepartmentDto> { Success = false, Message = "Another department with this name already exists." });
            d.Name = name;
            d.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            var loc = await _context.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.Id == locationId);
            return Ok(new ApiResponse<FacilityDepartmentDto>
            {
                Data = new FacilityDepartmentDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    IsActive = d.IsActive
                }
            });
        }

        [HttpPatch("{id:int}/toggle")]
        public async Task<ActionResult<ApiResponse<FacilityDepartmentDto>>> Toggle(int id)
        {
            if (!await HasPermission("ManageCategories")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync();
            var d = await _context.FacilityDepartments.FirstOrDefaultAsync(x => x.Id == id && x.CompanyId == companyId);
            if (d == null) return NotFound();

            // Company-scoped master: don't allow inactivating if used by any active ticket in this company.
            if (d.IsActive)
            {
                var companyLocationIds = await _context.Locations
                    .Where(l => l.CompanyId == companyId)
                    .Select(l => l.Id)
                    .ToListAsync();

                var hasActiveTickets = await _context.Complaints.AnyAsync(c =>
                    companyLocationIds.Contains(c.LocationId) &&
                    c.DepartmentId == id &&
                    c.Status != ComplaintStatus.Done);

                if (hasActiveTickets)
                    return BadRequest(new ApiResponse<FacilityDepartmentDto> { Success = false, Message = "Cannot inactivate: this department is used by active tickets." });
            }

            d.IsActive = !d.IsActive;
            d.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            var loc = await _context.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.Id == locationId);
            return Ok(new ApiResponse<FacilityDepartmentDto>
            {
                Data = new FacilityDepartmentDto
                {
                    Id = d.Id,
                    Name = d.Name,
                    IsActive = d.IsActive
                }
            });
        }
    }
}
