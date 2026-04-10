using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;
using net_backend.Services;
using Microsoft.Extensions.Configuration;

namespace net_backend.Controllers
{
    [Route("api/users")]
    [ApiController]
    public class UsersController : BaseController
    {
        private readonly string _aesKey;

        public UsersController(ApplicationDbContext context, IConfiguration configuration) : base(context)
        {
            _aesKey = configuration["PasswordEncryption:Key"]
                ?? throw new InvalidOperationException("PasswordEncryption:Key is not configured.");
        }

        private void WithDecryptedPassword(User user, bool isAdmin)
        {
            if (!isAdmin) return;
            if (string.IsNullOrEmpty(user.EncryptedPassword)) return;

            try
            {
                user.DecryptedPassword = AesHelper.Decrypt(user.EncryptedPassword, _aesKey);
            }
            catch
            {
                user.DecryptedPassword = null;
            }
        }

        [HttpGet]
        public async Task<ActionResult<ApiResponse<IEnumerable<User>>>> GetAll()
        {
            if (!await HasPermission("AccessSettings")) return Forbidden();
            var users = await _context.Users.ToListAsync();
            var isAdmin = await IsAdmin();
            if (isAdmin)
            {
                foreach (var u in users) WithDecryptedPassword(u, true);
            }
            return Ok(new ApiResponse<IEnumerable<User>> { Data = users });
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<ApiResponse<User>>> GetById(int id)
        {
            if (!await HasPermission("AccessSettings")) return Forbidden();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            
            if (user == null) return NotFound();
            var isAdmin = await IsAdmin();
            WithDecryptedPassword(user, isAdmin);
            return Ok(new ApiResponse<User> { Data = user });
        }

        [HttpPost]
        public async Task<ActionResult<ApiResponse<User>>> Create([FromBody] CreateUserRequest request)
        {
            if (!await HasPermission("AccessSettings")) return Forbidden();
            if (await _context.Users.AnyAsync(u => u.Username == request.Username))
                return Conflict(new ApiResponse<User> { Success = false, Message = "Username already exists" });

            var location = await _context.Locations
                .Include(l => l.Company)
                .FirstOrDefaultAsync(l => l.Id == request.LocationId && l.CompanyId == request.CompanyId);
            if (location == null)
                return BadRequest(new ApiResponse<User> { Success = false, Message = "Location must belong to the selected company. Invalid Company or Location." });

            var role = Enum.Parse<Role>(request.Role);

            if ((role == Role.COORDINATOR || role == Role.HANDLER) && string.IsNullOrEmpty(request.MobileNumber))
            {
                return BadRequest(new ApiResponse<User> { Success = false, Message = "Mobile number is mandatory for Coordinator and Handler roles." });
            }

            if (!string.IsNullOrEmpty(request.MobileNumber))
            {
                var indianPhoneRegex = new System.Text.RegularExpressions.Regex(@"^[6-9]\d{9}$");
                if (!indianPhoneRegex.IsMatch(request.MobileNumber))
                {
                    return BadRequest(new ApiResponse<User> { Success = false, Message = "Please provide a valid 10-digit Indian mobile number." });
                }
            }

            var user = new User
            {
                Username = request.Username,
                Password = BCrypt.Net.BCrypt.HashPassword(request.Password),
                EncryptedPassword = AesHelper.Encrypt(request.Password, _aesKey),
                FirstName = request.FirstName,
                LastName = request.LastName,
                Role = role,
                IsActive = request.IsActive,
                MobileNumber = request.MobileNumber,
                DefaultCompanyId = request.CompanyId,
                DefaultLocationId = request.LocationId,
                ProfileDepartment = string.IsNullOrWhiteSpace(request.ProfileDepartment) ? null : request.ProfileDepartment.Trim(),
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            _context.UserLocationAccess.Add(new UserLocationAccess
            {
                UserId = user.Id,
                CompanyId = request.CompanyId,
                LocationId = request.LocationId,
                CreatedAt = DateTime.Now
            });

            // Grant default View + Add permissions for non-admin users (Master, Core Ops, Transfer, Purchasing, Reports)
            if (role != Role.ADMIN)
            {
                var defaultPermission = MaintenanceDefaultPermissions.ForRole(user.Id, role);
                _context.UserPermissions.Add(defaultPermission);
            }

            await _context.SaveChangesAsync();

            var isAdmin = await IsAdmin();
            WithDecryptedPassword(user, isAdmin);
            return StatusCode(201, new ApiResponse<User> { Data = user });
        }

        [HttpPatch("{id}")]
        [HttpPut("{id}")]
        public async Task<ActionResult<ApiResponse<User>>> Update(int id, [FromBody] UpdateUserRequest request)
        {
            if (!await HasPermission("AccessSettings")) return Forbidden();
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            
            if (user == null) return NotFound();

            if (!string.IsNullOrEmpty(request.Username) && request.Username != user.Username)
            {
                if (await _context.Users.AnyAsync(u => u.Username == request.Username && u.Id != id))
                {
                    return Conflict(new ApiResponse<User> { Success = false, Message = "Username already exists" });
                }
                user.Username = request.Username;
            }

            if (!string.IsNullOrEmpty(request.FirstName)) user.FirstName = request.FirstName;
            if (!string.IsNullOrEmpty(request.LastName)) user.LastName = request.LastName;
            if (!string.IsNullOrEmpty(request.Role)) user.Role = Enum.Parse<Role>(request.Role);
            if (request.IsActive.HasValue) user.IsActive = request.IsActive.Value;
            if (!string.IsNullOrEmpty(request.Password))
            {
                user.Password = BCrypt.Net.BCrypt.HashPassword(request.Password);
                user.EncryptedPassword = AesHelper.Encrypt(request.Password, _aesKey);
            }
            if (request.MobileNumber != null) user.MobileNumber = request.MobileNumber;
            if (request.ProfileDepartment != null)
                user.ProfileDepartment = string.IsNullOrWhiteSpace(request.ProfileDepartment) ? null : request.ProfileDepartment.Trim();

            // Validation for MobileNumber
            if ((user.Role == Role.COORDINATOR || user.Role == Role.HANDLER) && string.IsNullOrEmpty(user.MobileNumber))
            {
                return BadRequest(new ApiResponse<User> { Success = false, Message = "Mobile number is mandatory for Coordinator and Handler roles." });
            }

            if (!string.IsNullOrEmpty(user.MobileNumber))
            {
                var indianPhoneRegex = new System.Text.RegularExpressions.Regex(@"^[6-9]\d{9}$");
                if (!indianPhoneRegex.IsMatch(user.MobileNumber))
                {
                    return BadRequest(new ApiResponse<User> { Success = false, Message = "Please provide a valid 10-digit Indian mobile number." });
                }
            }

            if (request.CompanyId.HasValue && request.LocationId.HasValue)
            {
                var location = await _context.Locations
                    .Include(l => l.Company)
                    .FirstOrDefaultAsync(l => l.Id == request.LocationId.Value && l.CompanyId == request.CompanyId.Value);
                if (location == null)
                    return BadRequest(new ApiResponse<User> { Success = false, Message = "Location must belong to the selected company. Invalid Company or Location." });
                user.DefaultCompanyId = request.CompanyId.Value;
                user.DefaultLocationId = request.LocationId.Value;
                var hasAccess = await _context.UserLocationAccess.AnyAsync(ula => ula.UserId == id && ula.CompanyId == request.CompanyId.Value && ula.LocationId == request.LocationId.Value);
                if (!hasAccess)
                {
                    _context.UserLocationAccess.Add(new UserLocationAccess
                    {
                        UserId = id,
                        CompanyId = request.CompanyId.Value,
                        LocationId = request.LocationId.Value,
                    });
                }
            }

            user.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            var isAdmin = await IsAdmin();
            WithDecryptedPassword(user, isAdmin);
            return Ok(new ApiResponse<User> { Data = user });
        }

        [HttpGet("{id}/permissions")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> GetPermissions(int id)
        {
            if (!await HasPermission("AccessSettings")) return Forbidden();
            var permission = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == id);
            if (permission == null)
            {
                var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id);
                if (user != null && user.Role != Role.ADMIN)
                {
                    permission = MaintenanceDefaultPermissions.ForRole(id, user.Role);
                    _context.UserPermissions.Add(permission);
                }
                else
                {
                    permission = MaintenanceDefaultPermissions.ForAdmin(id);
                    _context.UserPermissions.Add(permission);
                }
                await _context.SaveChangesAsync();
            }
            return Ok(new ApiResponse<UserPermission> { Data = permission });
        }

        [HttpPut("{id}/permissions")]
        public async Task<ActionResult<ApiResponse<UserPermission>>> UpdatePermissions(int id, [FromBody] UserPermission request)
        {
            if (!await HasPermission("AccessSettings")) return Forbidden();
            var permission = await _context.UserPermissions.FirstOrDefaultAsync(p => p.UserId == id);
            if (permission == null) return NotFound();

            permission.ViewDashboard = request.ViewDashboard;
            permission.ViewComplaints = request.ViewComplaints;
            permission.RaiseComplaint = request.RaiseComplaint;
            permission.ViewAllComplaints = request.ViewAllComplaints;
            permission.AssignComplaints = request.AssignComplaints;
            permission.HandleComplaints = request.HandleComplaints;
            permission.ViewMaster = request.ViewMaster;
            permission.AddMaster = request.AddMaster;
            permission.EditMaster = request.EditMaster;
            permission.ImportMaster = request.ImportMaster;
            permission.ExportMaster = request.ExportMaster;
            permission.ManageCompany = request.ManageCompany;
            permission.ManageLocation = request.ManageLocation;
            permission.ManageCategories = request.ManageCategories;
            permission.ManageDepartment = request.ManageDepartment;
            permission.AccessSettings = request.AccessSettings;
            permission.NavigationLayout = request.NavigationLayout;
            
            permission.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(new ApiResponse<UserPermission> { Data = permission });
        }

        [HttpGet("{id}/location-access")]
        public async Task<ActionResult<ApiResponse<List<CompanyLocationAccessDto>>>> GetLocationAccess(int id)
        {
            if (!await HasPermission("AccessSettings")) return Forbidden();
            var access = await _context.UserLocationAccess
                .Include(ula => ula.Company)
                .Include(ula => ula.Location)
                .Where(ula => ula.UserId == id && ula.Company != null && ula.Location != null)
                .OrderBy(ula => ula.Company!.Name).ThenBy(ula => ula.Location!.Name)
                .ToListAsync();
            var grouped = access.GroupBy(ula => new { ula.CompanyId, CompanyName = ula.Company!.Name }).ToList();
            var list = grouped.Select(g => new CompanyLocationAccessDto
            {
                CompanyId = g.Key.CompanyId,
                CompanyName = g.Key.CompanyName,
                Locations = g.Select(ula => new LocationOptionDto { Id = ula.LocationId, Name = ula.Location!.Name }).ToList()
            }).ToList();
            return Ok(new ApiResponse<List<CompanyLocationAccessDto>> { Data = list });
        }

        [HttpPut("{id}/location-access")]
        public async Task<ActionResult<ApiResponse<bool>>> UpdateLocationAccess(int id, [FromBody] List<UserLocationAccessItemDto> request)
        {
            if (!await HasPermission("AccessSettings")) return Forbidden();
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound();
            var existing = await _context.UserLocationAccess.Where(ula => ula.UserId == id).ToListAsync();
            foreach (var item in request)
            {
                var loc = await _context.Locations.FirstOrDefaultAsync(l => l.Id == item.LocationId && l.CompanyId == item.CompanyId);
                if (loc == null) continue;
                if (existing.Any(e => e.CompanyId == item.CompanyId && e.LocationId == item.LocationId)) continue;
                _context.UserLocationAccess.Add(new UserLocationAccess
                {
                    UserId = id,
                    CompanyId = item.CompanyId,
                    LocationId = item.LocationId,
                    CreatedAt = DateTime.Now
                });
            }
            var toRemove = existing.Where(e => !request.Any(r => r.CompanyId == e.CompanyId && r.LocationId == e.LocationId)).ToList();
            _context.UserLocationAccess.RemoveRange(toRemove);
            if (request.Count > 0 && !request.Any(r => r.CompanyId == user.DefaultCompanyId && r.LocationId == user.DefaultLocationId))
            {
                var first = request[0];
                user.DefaultCompanyId = first.CompanyId;
                user.DefaultLocationId = first.LocationId;
                user.UpdatedAt = DateTime.Now;
            }
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Data = true });
        }

        [HttpDelete("{id}")]
        public async Task<ActionResult<ApiResponse<bool>>> Delete(int id)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == id);
            
            if (user == null) return NotFound();

            if (user.Username.ToLower() == "qc_admin")
            {
                return BadRequest(new ApiResponse<bool> { Success = false, Message = "Main admin user cannot be deleted." });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();
            return Ok(new ApiResponse<bool> { Success = true, Data = true });
        }

        [HttpGet("location-users")]
        public async Task<ActionResult<ApiResponse<IEnumerable<User>>>> GetLocationUsers()
        {
            var locationId = await GetCurrentLocationIdAsync();
            var userIdsByLocation = await _context.UserLocationAccess
                .Where(ula => ula.LocationId == locationId)
                .Select(ula => ula.UserId)
                .ToListAsync();

            var users = await _context.Users
                .Where(u => u.IsActive && userIdsByLocation.Contains(u.Id))
                .OrderBy(u => u.FirstName).ThenBy(u => u.LastName)
                .ToListAsync();

            return Ok(new ApiResponse<IEnumerable<User>> { Data = users });
        }
    }
}
