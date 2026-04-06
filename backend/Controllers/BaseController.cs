using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using System.Security.Claims;

namespace net_backend.Controllers
{
    public abstract class BaseController : ControllerBase
    {
        protected readonly ApplicationDbContext _context;
        private const string LocationIdHeader = "X-Location-Id";
        private const string CompanyIdHeader = "X-Company-Id";
        private const string PermissionCacheKey = "__perm_ctx";

        protected BaseController(ApplicationDbContext context)
        {
            _context = context;
        }

        protected int CurrentUserId
        {
            get
            {
                var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                    return 0;
                return userId;
            }
        }

        protected async Task<(int companyId, int locationId)> GetCurrentLocationAndCompanyAsync()
        {
            var locStr = Request.Headers[LocationIdHeader].FirstOrDefault();
            var compStr = Request.Headers[CompanyIdHeader].FirstOrDefault();
            if (string.IsNullOrEmpty(locStr) || !int.TryParse(locStr, out int locationId) ||
                string.IsNullOrEmpty(compStr) || !int.TryParse(compStr, out int companyId))
            {
                var single = await GetSingleLocationAccessAsync();
                if (single.HasValue)
                    return (single.Value.companyId, single.Value.locationId);
                throw new UnauthorizedAccessException("X-Location-Id and X-Company-Id headers are required when user has multiple locations.");
            }
            var allowed = await GetAllowedLocationIdsAsync();
            if (!allowed.Contains((companyId, locationId)))
                throw new UnauthorizedAccessException("You do not have access to this location.");
            return (companyId, locationId);
        }

        protected async Task<int> GetCurrentLocationIdAsync()
        {
            var (_, locationId) = await GetCurrentLocationAndCompanyAsync();
            return locationId;
        }

        protected async Task<int> GetCurrentCompanyIdAsync()
        {
            var (companyId, _) = await GetCurrentLocationAndCompanyAsync();
            return companyId;
        }

        protected async Task<HashSet<(int companyId, int locationId)>> GetAllowedLocationIdsAsync()
        {
            var list = await _context.UserLocationAccess
                .Where(ula => ula.UserId == CurrentUserId)
                .Select(ula => new { ula.CompanyId, ula.LocationId })
                .ToListAsync();
            var result = new HashSet<(int, int)>();
            foreach (var x in list) result.Add((x.CompanyId, x.LocationId));
            return result;
        }

        private async Task<(int companyId, int locationId)?> GetSingleLocationAccessAsync()
        {
            if (await IsAdmin())
                return null;
            var list = await _context.UserLocationAccess
                .Where(ula => ula.UserId == CurrentUserId)
                .Select(ula => new { ula.CompanyId, ula.LocationId })
                .ToListAsync();
            if (list.Count != 1) return null;
            var x = list[0];
            return (x.CompanyId, x.LocationId);
        }

        protected async Task<bool> IsAdmin()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            return user?.Role == Role.ADMIN;
        }

        protected async Task<bool> IsCoordinator()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            return user?.Role == Role.COORDINATOR;
        }

        protected async Task<bool> IsHandler()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            return user?.Role == Role.HANDLER;
        }

        protected async Task<bool> IsEmployee()
        {
            var user = await _context.Users.FindAsync(CurrentUserId);
            return user?.Role == Role.EMPLOYEE;
        }

        private async Task<(Role role, UserPermission? permission)> GetPermissionContextAsync()
        {
            if (HttpContext.Items.TryGetValue(PermissionCacheKey, out var cached) &&
                cached is ValueTuple<Role, UserPermission?> tuple)
                return tuple;

            var user = await _context.Users
                .Include(u => u.Permission)
                .FirstOrDefaultAsync(u => u.Id == CurrentUserId);

            var ctx = (user?.Role ?? Role.EMPLOYEE, user?.Permission);
            HttpContext.Items[PermissionCacheKey] = ctx;
            return ctx;
        }

        protected async Task<bool> HasPermission(string permission)
        {
            var (role, p) = await GetPermissionContextAsync();
            if (role == Role.ADMIN) return true;
            if (p == null) return false;

            var perm = p!;
            return permission switch
            {
                "ViewDashboard" => perm.ViewDashboard,
                "ViewComplaints" => perm.ViewComplaints,
                "RaiseComplaint" => perm.RaiseComplaint,
                "ViewAllComplaints" => perm.ViewAllComplaints,
                "AssignComplaints" => perm.AssignComplaints,
                "HandleComplaints" => perm.HandleComplaints,
                "ManageCategories" => perm.ManageCategories,
                "ViewMaster" => perm.ViewMaster,
                "AddMaster" => perm.AddMaster,
                "EditMaster" => perm.EditMaster,
                "ImportMaster" => perm.ImportMaster,
                "ExportMaster" => perm.ExportMaster,
                "ManageCompany" => perm.ManageCompany,
                "ManageLocation" => perm.ManageLocation,
                "AccessSettings" => perm.AccessSettings,
                _ => false
            };
        }

        protected async Task<bool> HasAllPermissions(params string[] permissions)
        {
            foreach (var perm in permissions)
            {
                if (!await HasPermission(perm)) return false;
            }
            return true;
        }

        protected async Task<bool> CanCreateMaster(string managePermission)
            => await HasAllPermissions("ViewMaster", "AddMaster", managePermission);

        protected async Task<bool> CanEditMaster(string managePermission)
            => await HasAllPermissions("ViewMaster", "EditMaster", managePermission);

        protected ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "Access denied: Missing required permission." });
        }
    }
}
