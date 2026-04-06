using net_backend.Models;

namespace net_backend.DTOs
{
    public class UpdateSettingsRequest
    {
        public string? SoftwareName { get; set; }
    }

    public class UpdateUserPermissionsRequest
    {
        public UserPermission? Permissions { get; set; }
    }
}
