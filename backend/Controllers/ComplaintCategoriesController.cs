using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using static net_backend.Services.PaginationHelper;

namespace net_backend.Controllers
{
    [Route("api/complaint-categories")]
    [ApiController]
    public class ComplaintCategoriesController : BaseController
    {
        public ComplaintCategoriesController(ApplicationDbContext context) : base(context)
        {
        }

        /// <summary>
        /// Without <paramref name="page"/>: returns all rows for dropdowns (respects includeInactive).
        /// With <paramref name="page"/>: server-side filters + pagination for master UI (use includeInactive=true to see inactive).
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<ApiResponse<List<ComplaintCategoryDto>>>> GetAll(
            [FromQuery] bool includeInactive = false,
            [FromQuery] string? search = null,
            [FromQuery] bool? isActive = null,
            [FromQuery] int? page = null,
            [FromQuery] int pageSize = 25)
        {
            if (!await HasPermission("ViewComplaints")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync(); // still used for writes / legacy FK

            IQueryable<ComplaintCategory> q = _context.ComplaintCategories.AsNoTracking()
                .Include(c => c.Location)
                .Where(c => c.CompanyId == companyId);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim().ToLower();
                q = q.Where(c => c.Name.ToLower().Contains(s));
            }

            if (page.HasValue)
            {
                if (isActive.HasValue)
                    q = q.Where(c => c.IsActive == isActive.Value);
                else if (!includeInactive)
                    q = q.Where(c => c.IsActive);
            }
            else
            {
                if (!includeInactive)
                    q = q.Where(c => c.IsActive);
            }

            if (!page.HasValue)
            {
                var list = await q
                    .OrderBy(c => c.Name)
                    .Select(c => new ComplaintCategoryDto
                    {
                        Id = c.Id,
                        Name = c.Name,
                        IsActive = c.IsActive
                    })
                    .ToListAsync();
                return Ok(new ApiResponse<List<ComplaintCategoryDto>> { Data = list });
            }

            var totalCount = await q.CountAsync();
            var (skip, take) = GetSkipTake(page!.Value, pageSize);
            var paged = await q
                .OrderBy(c => c.Name)
                .Skip(skip)
                .Take(take)
                .Select(c => new ComplaintCategoryDto
                {
                    Id = c.Id,
                    Name = c.Name,
                    IsActive = c.IsActive
                })
                .ToListAsync();
            return Ok(new ApiResponse<List<ComplaintCategoryDto>> { Data = paged, TotalCount = totalCount });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<ComplaintCategoryDto>>> Create([FromBody] CreateComplaintCategoryRequest request)
        {
            if (!await HasPermission("ManageCategories")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync(); // stored for legacy FK, but category is company-scoped
            if (string.IsNullOrWhiteSpace(request.Name))
                return BadRequest(new ApiResponse<ComplaintCategoryDto> { Success = false, Message = "Name is required." });
            var name = request.Name.Trim();
            if (await _context.ComplaintCategories.AnyAsync(c => c.CompanyId == companyId && c.Name.ToLower() == name.ToLower()))
                return Conflict(new ApiResponse<ComplaintCategoryDto> { Success = false, Message = "Category already exists." });

            var cat = new ComplaintCategory
            {
                CompanyId = companyId,
                LocationId = locationId,
                Name = name,
                IsActive = request.IsActive ?? true,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            _context.ComplaintCategories.Add(cat);
            await _context.SaveChangesAsync();

            var loc = await _context.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.Id == locationId);
            return StatusCode(201, new ApiResponse<ComplaintCategoryDto>
            {
                Data = new ComplaintCategoryDto
                {
                    Id = cat.Id,
                    Name = cat.Name,
                    IsActive = cat.IsActive
                }
            });
        }

        [HttpPatch("{id:int}")]
        public async Task<ActionResult<ApiResponse<ComplaintCategoryDto>>> Update(int id, [FromBody] CreateComplaintCategoryRequest request)
        {
            if (!await HasPermission("ManageCategories")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync();
            var cat = await _context.ComplaintCategories.FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);
            if (cat == null) return NotFound();
            if (!string.IsNullOrWhiteSpace(request.Name))
            {
                var name = request.Name.Trim();
                if (await _context.ComplaintCategories.AnyAsync(c => c.CompanyId == companyId && c.Id != id && c.Name.ToLower() == name.ToLower()))
                    return Conflict(new ApiResponse<ComplaintCategoryDto> { Success = false, Message = "Another category with this name already exists." });
                cat.Name = name;
            }
            if (request.IsActive.HasValue)
            {
                if (!request.IsActive.Value && cat.IsActive)
                {
                    var companyLocationIds = await _context.Locations
                        .Where(l => l.CompanyId == companyId)
                        .Select(l => l.Id)
                        .ToListAsync();

                    var hasActiveTickets = await _context.Complaints.AnyAsync(c =>
                        companyLocationIds.Contains(c.LocationId) &&
                        c.CategoryId == id &&
                        c.Status != ComplaintStatus.Done);

                    if (hasActiveTickets)
                        return BadRequest(new ApiResponse<ComplaintCategoryDto> { Success = false, Message = "Cannot deactivate: this category is used by active tickets." });
                }
                cat.IsActive = request.IsActive.Value;
            }
            cat.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            var loc = await _context.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.Id == locationId);
            return Ok(new ApiResponse<ComplaintCategoryDto>
            {
                Data = new ComplaintCategoryDto
                {
                    Id = cat.Id,
                    Name = cat.Name,
                    IsActive = cat.IsActive
                }
            });
        }

        [HttpPatch("{id:int}/toggle")]
        public async Task<ActionResult<ApiResponse<ComplaintCategoryDto>>> ToggleActive(int id)
        {
            if (!await HasPermission("ManageCategories")) return Forbidden();
            var companyId = await GetCurrentCompanyIdAsync();
            var locationId = await GetCurrentLocationIdAsync();
            var cat = await _context.ComplaintCategories.FirstOrDefaultAsync(c => c.Id == id && c.CompanyId == companyId);
            if (cat == null) return NotFound();

            // Company-scoped master: don't allow inactivating if used by any active ticket in this company.
            if (cat.IsActive)
            {
                var companyLocationIds = await _context.Locations
                    .Where(l => l.CompanyId == companyId)
                    .Select(l => l.Id)
                    .ToListAsync();

                var hasActiveTickets = await _context.Complaints.AnyAsync(c =>
                    companyLocationIds.Contains(c.LocationId) &&
                    c.CategoryId == id &&
                    c.Status != ComplaintStatus.Done);

                if (hasActiveTickets)
                    return BadRequest(new ApiResponse<ComplaintCategoryDto> { Success = false, Message = "Cannot inactivate: this category is used by active tickets." });
            }

            cat.IsActive = !cat.IsActive;
            cat.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            var loc = await _context.Locations.AsNoTracking().FirstOrDefaultAsync(l => l.Id == locationId);
            return Ok(new ApiResponse<ComplaintCategoryDto>
            {
                Data = new ComplaintCategoryDto
                {
                    Id = cat.Id,
                    Name = cat.Name,
                    IsActive = cat.IsActive
                }
            });
        }
    }
}
