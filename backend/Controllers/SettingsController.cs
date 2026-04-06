using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using System.Security.Claims;
using Microsoft.Extensions.Configuration;

namespace net_backend.Controllers
{
    [Route("api/settings")]
    [ApiController]
    [Authorize]
    public class SettingsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly string _aesKey;

        public SettingsController(ApplicationDbContext context, IWebHostEnvironment env, IConfiguration configuration)
        {
            _context = context;
            _env = env;
            _aesKey = configuration["PasswordEncryption:Key"]
                ?? throw new InvalidOperationException("PasswordEncryption:Key is not configured.");
        }

        [AllowAnonymous]
        [HttpGet("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> GetSoftwareSettings()
        {
            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings { SoftwareName = "MaintenX – Facility Maintenance Portal" };
                _context.AppSettings.Add(settings);
                await _context.SaveChangesAsync();
            }
            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpPatch("software")]
        [HttpPut("software")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> UpdateSoftwareSettings([FromBody] UpdateSettingsRequest request)
        {
            if (!await CheckPermission("AccessSettings"))
                return Forbidden();

            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings();
                _context.AppSettings.Add(settings);
            }

            if (request.SoftwareName != null) settings.SoftwareName = request.SoftwareName;

            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpPost("software/logo")]
        public async Task<ActionResult<ApiResponse<AppSettings>>> UploadSoftwareLogo([FromForm] IFormFile? logo)
        {
            if (!await CheckPermission("AccessSettings"))
                return Forbidden();

            var file = logo ?? Request.Form.Files.FirstOrDefault(f => f.Name == "logo" || f.Length > 0);
            if (file == null || file.Length == 0)
                return BadRequest(new ApiResponse<AppSettings> { Success = false, Message = "No file uploaded." });

            var ext = Path.GetExtension(file.FileName)?.ToLowerInvariant();
            var allowed = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
            if (string.IsNullOrEmpty(ext) || !allowed.Contains(ext))
                return BadRequest(new ApiResponse<AppSettings> { Success = false, Message = "Only image files are allowed." });

            var webRoot = _env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot");
            var dir = Path.Combine(webRoot, "storage", "software");
            Directory.CreateDirectory(dir);
            var fileName = $"logo{ext}";
            var fullPath = Path.GetFullPath(Path.Combine(dir, fileName));
            if (!fullPath.StartsWith(Path.GetFullPath(dir), StringComparison.OrdinalIgnoreCase))
                return BadRequest(new ApiResponse<AppSettings> { Success = false, Message = "Invalid path." });

            await using (var stream = System.IO.File.Create(fullPath))
                await file.CopyToAsync(stream);

            var url = $"/storage/software/{fileName}?v={DateTimeOffset.UtcNow.ToUnixTimeSeconds()}";
            var settings = await _context.AppSettings.FirstOrDefaultAsync();
            if (settings == null)
            {
                settings = new AppSettings();
                _context.AppSettings.Add(settings);
            }
            settings.LogoUrl = url;
            settings.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<AppSettings> { Data = settings });
        }

        [HttpGet("permissions/me")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> GetMyPermissions()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
                return Unauthorized(new ApiResponse<UserPermission> { Success = false, Message = "User ID not found" });

            var user = await _context.Users.FindAsync(userId);
            if (user == null)
                return NotFound(new ApiResponse<UserPermission> { Success = false, Message = "User not found" });

            if (user.Role == Role.ADMIN)
            {
                var dbRow = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
                var adminPerms = dbRow != null ? dbRow : net_backend.Services.MaintenanceDefaultPermissions.ForAdmin(userId);
                if (dbRow == null && string.IsNullOrEmpty(adminPerms.NavigationLayout))
                    adminPerms.NavigationLayout = "SIDEBAR";
                return Ok(new ApiResponse<UserPermission> { Success = true, Data = adminPerms });
            }

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
                permissions = net_backend.Services.MaintenanceDefaultPermissions.ForRole(user.Id, user.Role);
                _context.UserPermissions.Add(permissions);
                await _context.SaveChangesAsync();
            }

            return Ok(new ApiResponse<UserPermission> { Success = true, Data = permissions });
        }

        [HttpGet("permissions/user/{userId}")]
        public async Task<ActionResult<ApiResponse<object>>> GetUserPermissions(int userId)
        {
            var currentUserIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int currentUserId = 0;
            int.TryParse(currentUserIdStr, out currentUserId);
            if (!await CheckPermission("AccessSettings") && userId != currentUserId)
                return Forbidden();

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (targetUser == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "User not found" });

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
                permissions = net_backend.Services.MaintenanceDefaultPermissions.ForRole(userId, targetUser.Role);

            return Ok(new ApiResponse<object>
            {
                Data = new { Permissions = permissions }
            });
        }

        [HttpPut("permissions/user/{userId}")]
        public async Task<ActionResult<ApiResponse<object>>> UpdatePermissions(int userId, [FromBody] UpdateUserPermissionsRequest request)
        {
            if (!await CheckPermission("AccessSettings"))
                return Forbidden();

            if (request.Permissions == null)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Permissions data is required" });

            var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);
            if (targetUser == null)
                return NotFound(new ApiResponse<object> { Success = false, Message = "User not found" });

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null)
            {
                permissions = new UserPermission { UserId = userId };
                _context.UserPermissions.Add(permissions);
            }

            var u = request.Permissions;
            permissions.ViewDashboard = u.ViewDashboard;
            permissions.ViewComplaints = u.ViewComplaints;
            permissions.RaiseComplaint = u.RaiseComplaint;
            permissions.ViewAllComplaints = u.ViewAllComplaints;
            permissions.AssignComplaints = u.AssignComplaints;
            permissions.HandleComplaints = u.HandleComplaints;
            permissions.ManageCategories = u.ManageCategories;
            permissions.ViewMaster = u.ViewMaster;
            permissions.AddMaster = u.AddMaster;
            permissions.EditMaster = u.EditMaster;
            permissions.ImportMaster = u.ImportMaster;
            permissions.ExportMaster = u.ExportMaster;
            permissions.ManageCompany = u.ManageCompany;
            permissions.ManageLocation = u.ManageLocation;
            permissions.AccessSettings = u.AccessSettings;
            permissions.NavigationLayout = u.NavigationLayout ?? "SIDEBAR";
            permissions.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<object> { Data = permissions });
        }

        [HttpPost("reset-system")]
        public async Task<IActionResult> ResetSystem()
        {
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            if (role != nameof(Role.ADMIN)) return Forbidden();

            await using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.ComplaintLogs.RemoveRange(_context.ComplaintLogs);
                _context.Complaints.RemoveRange(_context.Complaints);
                _context.ComplaintCategories.RemoveRange(_context.ComplaintCategories);
                _context.FacilityDepartments.RemoveRange(_context.FacilityDepartments);
                await _context.SaveChangesAsync();

                var seedLocId = await _context.Locations.OrderBy(l => l.Id).Select(l => l.Id).FirstOrDefaultAsync();
                if (seedLocId > 0)
                {
                    var defaults = new[] { "HVAC", "Electrical", "Plumbing", "Cleaning", "IT / AV", "Safety", "General" };
                    foreach (var name in defaults)
                    {
                        _context.ComplaintCategories.Add(new ComplaintCategory
                        {
                            LocationId = seedLocId,
                            Name = name,
                            IsActive = true,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        });
                    }

                    var deptDefaults = new[] { "Production", "Store", "Inward", "Gate", "QC", "CNC", "Purchase", "IT", "Admin" };
                    foreach (var name in deptDefaults)
                    {
                        _context.FacilityDepartments.Add(new FacilityDepartment
                        {
                            LocationId = seedLocId,
                            Name = name,
                            IsActive = true,
                            CreatedAt = DateTime.Now,
                            UpdatedAt = DateTime.Now
                        });
                    }

                    await _context.SaveChangesAsync();
                }

                await transaction.CommitAsync();
                return Ok(new ApiResponse<string> { Success = true, Message = "Complaint data reset.", Data = "Success" });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new ApiResponse<string> { Success = false, Message = ex.Message });
            }
        }

        private async Task<bool> CheckPermission(string permissionKey)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId)) return false;

            var user = await _context.Users.FindAsync(userId);
            if (user?.Role == Role.ADMIN) return true;

            var permissions = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == userId);
            if (permissions == null) return false;

            return permissionKey switch
            {
                "ViewDashboard" => permissions.ViewDashboard,
                "ViewComplaints" => permissions.ViewComplaints,
                "RaiseComplaint" => permissions.RaiseComplaint,
                "ViewAllComplaints" => permissions.ViewAllComplaints,
                "AssignComplaints" => permissions.AssignComplaints,
                "HandleComplaints" => permissions.HandleComplaints,
                "ManageCategories" => permissions.ManageCategories,
                "ViewMaster" => permissions.ViewMaster,
                "AddMaster" => permissions.AddMaster,
                "EditMaster" => permissions.EditMaster,
                "ImportMaster" => permissions.ImportMaster,
                "ExportMaster" => permissions.ExportMaster,
                "ManageCompany" => permissions.ManageCompany,
                "ManageLocation" => permissions.ManageLocation,
                "AccessSettings" => permissions.AccessSettings,
                _ => false
            };
        }

        private ActionResult Forbidden()
        {
            return StatusCode(403, new ApiResponse<object> { Success = false, Message = "You do not have permission to perform this action." });
        }
    }
}
