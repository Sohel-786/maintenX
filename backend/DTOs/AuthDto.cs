namespace net_backend.DTOs
{
    public class LoginRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        /// <summary>Display department for maintenance tickets (optional).</summary>
        public string? ProfileDepartment { get; set; }
    }

    /// <summary>One location within a company for location selector.</summary>
    public class LocationOptionDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    /// <summary>Company with its locations for post-login company/location selection.</summary>
    public class CompanyLocationAccessDto
    {
        public int CompanyId { get; set; }
        public string CompanyName { get; set; } = string.Empty;
        public string? CompanyLogo { get; set; }
        public List<LocationOptionDto> Locations { get; set; } = new();
    }

    public class LoginResponse
    {
        public bool Success { get; set; }
        public string Token { get; set; } = string.Empty;
        public UserDto? User { get; set; }
        public string? Message { get; set; }
        /// <summary>For post-login location (and company) selection. Empty if no access.</summary>
        public List<CompanyLocationAccessDto> AllowedLocationAccess { get; set; } = new();
    }
}
