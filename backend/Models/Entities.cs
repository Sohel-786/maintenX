using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace net_backend.Models
{
    [Table("app_settings")]
    public class AppSettings
    {
        public int Id { get; set; }
        [MaxLength(255)]
        public string? SoftwareName { get; set; }
        [MaxLength(20)]
        public string? PrimaryColor { get; set; }
        public string? LogoUrl { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;
    }

    [Table("audit_logs")]
    public class AuditLog
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        [Required]
        public string Action { get; set; } = string.Empty;
        [Required]
        public string EntityType { get; set; } = string.Empty;
        public int? EntityId { get; set; }
        public string? OldValues { get; set; }
        public string? NewValues { get; set; }
        public string? IpAddress { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }

    [Table("companies")]
    public class Company
    {
        public int Id { get; set; }
        [Required]
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        [MaxLength(100)]
        public string? State { get; set; }
        [MaxLength(100)]
        public string? City { get; set; }
        [MaxLength(20)]
        public string? Pincode { get; set; }
        [MaxLength(100)]
        public string? ContactPerson { get; set; }
        [MaxLength(30)]
        public string? ContactNumber { get; set; }
        public string? LogoUrl { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public bool UseAsParty { get; set; }
        [MaxLength(20)]
        public string ThemeColor { get; set; } = "#0d6efd";
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [JsonIgnore]
        public virtual ICollection<Location> Locations { get; set; } = new List<Location>();
    }

    [Table("locations")]
    public class Location
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(200)]
        public string Name { get; set; } = string.Empty;
        [Required]
        public string Address { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }
    }

    [Table("mx_ticket_categories")]
    public class ComplaintCategory
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int LocationId { get; set; }
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
    }

    [Table("mx_facility_departments")]
    public class FacilityDepartment
    {
        public int Id { get; set; }
        public int CompanyId { get; set; }
        public int LocationId { get; set; }
        [Required]
        [MaxLength(120)]
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
    }

    [Table("mx_maintenance_tickets")]
    public class Complaint
    {
        public int Id { get; set; }
        [Required]
        [MaxLength(40)]
        public string ComplaintNo { get; set; } = string.Empty;
        [Required]
        [MaxLength(200)]
        public string Title { get; set; } = string.Empty;
        [Required]
        public string Description { get; set; } = string.Empty;
        public int LocationId { get; set; }
        public int CategoryId { get; set; }
        public int DepartmentId { get; set; }
        public ComplaintPriority Priority { get; set; } = ComplaintPriority.Medium;
        public ComplaintStatus Status { get; set; } = ComplaintStatus.Open;
        public int? AssignedHandlerUserId { get; set; }
        public int RaisedByUserId { get; set; }
        public string? ImageUrlsJson { get; set; }
        [Column(TypeName = "nvarchar(max)")]
        public string? CompletionPhotoUrl { get; set; }
        [Column(TypeName = "nvarchar(max)")]
        public string? CompletionImageUrlsJson { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
        [ForeignKey("CategoryId")]
        public virtual ComplaintCategory? Category { get; set; }
        [ForeignKey("DepartmentId")]
        public virtual FacilityDepartment? Department { get; set; }
        [ForeignKey("RaisedByUserId")]
        public virtual User? RaisedBy { get; set; }
        [ForeignKey("AssignedHandlerUserId")]
        public virtual User? AssignedHandler { get; set; }
        public virtual ICollection<ComplaintLog> Logs { get; set; } = new List<ComplaintLog>();
    }

    [Table("mx_ticket_timeline")]
    public class ComplaintLog
    {
        public int Id { get; set; }
        public int ComplaintId { get; set; }
        public int UserId { get; set; }
        [Required]
        [MaxLength(500)]
        public string Message { get; set; } = string.Empty;
        public ComplaintStatus? FromStatus { get; set; }
        public ComplaintStatus ToStatus { get; set; }
        [Column(TypeName = "nvarchar(max)")]
        public string? AttachmentUrlsJson { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("ComplaintId")]
        public virtual Complaint? Complaint { get; set; }
        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }

    [Table("users")]
    public class User
    {
        public int Id { get; set; }
        [Required]
        public string Username { get; set; } = string.Empty;
        [Required]
        public string Password { get; set; } = string.Empty;
        public string? EncryptedPassword { get; set; }

        [NotMapped]
        public string? DecryptedPassword { get; set; }
        [Required]
        public string FirstName { get; set; } = string.Empty;
        [Required]
        public string LastName { get; set; } = string.Empty;
        public Role Role { get; set; } = Role.USER;
        public bool IsActive { get; set; } = true;
        public string? Avatar { get; set; }
        public string? MobileNumber { get; set; }
        public int? DefaultCompanyId { get; set; }
        public int? DefaultLocationId { get; set; }
        [MaxLength(120)]
        public string? ProfileDepartment { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("DefaultCompanyId")]
        public virtual Company? DefaultCompany { get; set; }
        [ForeignKey("DefaultLocationId")]
        public virtual Location? DefaultLocation { get; set; }
        public virtual UserPermission? Permission { get; set; }
        public virtual ICollection<UserLocationAccess> LocationAccess { get; set; } = new List<UserLocationAccess>();
        public virtual ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
    }

    [Table("user_location_access")]
    public class UserLocationAccess
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public int CompanyId { get; set; }
        public int LocationId { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
        [ForeignKey("CompanyId")]
        public virtual Company? Company { get; set; }
        [ForeignKey("LocationId")]
        public virtual Location? Location { get; set; }
    }

    [Table("user_permissions")]
    public class UserPermission
    {
        public int Id { get; set; }
        public int UserId { get; set; }

        public bool ViewDashboard { get; set; } = true;
        public bool ExportDashboard { get; set; } = false;

        public bool ViewComplaints { get; set; } = true;
        public bool RaiseComplaint { get; set; } = true;
        public bool ViewAllComplaints { get; set; }
        public bool AssignComplaints { get; set; }
        public bool HandleComplaints { get; set; }

        public bool ViewMaster { get; set; }
        public bool AddMaster { get; set; }
        public bool EditMaster { get; set; }
        public bool ImportMaster { get; set; }
        public bool ExportMaster { get; set; }
        public bool ManageCompany { get; set; }
        public bool ManageLocation { get; set; }
        public bool ManageCategories { get; set; }
        public bool ManageDepartment { get; set; }

        public bool AccessSettings { get; set; }

        public string NavigationLayout { get; set; } = "SIDEBAR";

        public DateTime CreatedAt { get; set; } = DateTime.Now;
        public DateTime UpdatedAt { get; set; } = DateTime.Now;

        [ForeignKey("UserId")]
        public virtual User? User { get; set; }
    }
}
