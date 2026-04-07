namespace net_backend.DTOs
{
    public class CreateUserRequest
    {
        public string Username { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FirstName { get; set; } = string.Empty;
        public string LastName { get; set; } = string.Empty;
        public string Role { get; set; } = "EMPLOYEE";
        public bool IsActive { get; set; } = true;
        public string? MobileNumber { get; set; }
        public string? ProfileDepartment { get; set; }
        public int? CreatedBy { get; set; }
        /// <summary>Company for the user's initial access (required at creation).</summary>
        public int CompanyId { get; set; }
        /// <summary>Location for the user's initial access (required at creation). Must belong to CompanyId.</summary>
        public int LocationId { get; set; }
    }

    /// <summary>One (CompanyId, LocationId) pair for user location access.</summary>
    public class UserLocationAccessItemDto
    {
        public int CompanyId { get; set; }
        public int LocationId { get; set; }
    }

    public class UpdateUserRequest
    {
        public string? Username { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? Role { get; set; }
        public bool? IsActive { get; set; }
        public string? Password { get; set; }
        public string? MobileNumber { get; set; }
        public string? ProfileDepartment { get; set; }
        /// <summary>Default company for the user (optional on update).</summary>
        public int? CompanyId { get; set; }
        /// <summary>Default location for the user; must belong to CompanyId (optional on update).</summary>
        public int? LocationId { get; set; }
    }
}
