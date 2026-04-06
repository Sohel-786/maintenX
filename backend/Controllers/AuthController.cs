using Microsoft.AspNetCore.Authorization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using net_backend.Data;
using net_backend.DTOs;
using net_backend.Models;

namespace net_backend.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (string.IsNullOrEmpty(request.Username) || string.IsNullOrEmpty(request.Password))
            {
                return BadRequest(new { success = false, message = "Username and password are required" });
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == request.Username);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.Password))
            {
                return Unauthorized(new { success = false, message = "Invalid credentials" });
            }

            if (!user.IsActive)
            {
                return StatusCode(403, new { success = false, message = "User account is inactive" });
            }

            var token = GenerateJwtToken(user);

            // Set cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                // Match request scheme so cookies work correctly behind IIS (HTTP/HTTPS).
                Secure = HttpContext.Request.IsHttps,
                SameSite = SameSiteMode.Lax,
                Expires = DateTime.UtcNow.AddDays(7),
                Path = "/"
            };

            Response.Cookies.Append("access_token", token, cookieOptions);

            var allowedAccess = await GetLocationAccessForUserAsync(user.Id, user.Role == Role.ADMIN);
            return Ok(new LoginResponse
            {
                Success = true,
                Token = token,
                User = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role.ToString(),
                    Avatar = user.Avatar,
                    ProfileDepartment = user.ProfileDepartment
                },
                AllowedLocationAccess = allowedAccess
            });
        }

        [HttpPost("logout")]
        public IActionResult Logout()
        {
            Response.Cookies.Delete("access_token");
            return Ok(new { success = true, message = "Logged out successfully" });
        }

        [Authorize]
        [HttpPost("validate")]
        public async Task<IActionResult> Validate()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdStr) || !int.TryParse(userIdStr, out int userId))
            {
                return Unauthorized(new { success = false, message = "Invalid token claims" });
            }

            var user = await _context.Users.FindAsync(userId);
            if (user == null || !user.IsActive)
            {
                return Unauthorized(new { success = false, message = "User not found or inactive" });
            }

            var allowedAccess = await GetLocationAccessForUserAsync(user.Id, user.Role == Role.ADMIN);
            return Ok(new
            {
                success = true,
                valid = true,
                user = new UserDto
                {
                    Id = user.Id,
                    Username = user.Username,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Role = user.Role.ToString(),
                    Avatar = user.Avatar,
                    ProfileDepartment = user.ProfileDepartment
                },
                allowedLocationAccess = allowedAccess
            });
        }

        /// <summary>Returns company/location options for the selector and scope. All users (including admin) see only locations they have in UserLocationAccess.</summary>
        private async Task<List<CompanyLocationAccessDto>> GetLocationAccessForUserAsync(int userId, bool isAdmin)
        {
            var access = await _context.UserLocationAccess
                .Include(ula => ula.Company)
                .Include(ula => ula.Location)
                .Where(ula => ula.UserId == userId && ula.Company != null && ula.Location != null)
                .OrderBy(ula => ula.Company!.Name).ThenBy(ula => ula.Location!.Name)
                .ToListAsync();
            var grouped = access.GroupBy(ula => new { ula.CompanyId, CompanyName = ula.Company!.Name, CompanyLogo = ula.Company.LogoUrl }).ToList();
            return grouped.Select(g => new CompanyLocationAccessDto
            {
                CompanyId = g.Key.CompanyId,
                CompanyName = g.Key.CompanyName,
                CompanyLogo = g.Key.CompanyLogo,
                Locations = g.Select(ula => new LocationOptionDto { Id = ula.LocationId, Name = ula.Location!.Name }).Distinct().ToList()
            }).ToList();
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Role, user.Role.ToString())
            };

            var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key is not configured.");
            var issuer = _configuration["Jwt:Issuer"] ?? throw new InvalidOperationException("Jwt:Issuer is not configured.");
            var audience = _configuration["Jwt:Audience"] ?? throw new InvalidOperationException("Jwt:Audience is not configured.");

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddDays(7);

            var token = new JwtSecurityToken(
                issuer,
                audience,
                claims,
                expires: expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
