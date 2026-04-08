using net_backend.Models;

namespace net_backend.DTOs
{
    public class ComplaintListItemDto
    {
        public int Id { get; set; }
        public string ComplaintNo { get; set; } = string.Empty;
        public string? DescriptionPreview { get; set; }
        public int LocationId { get; set; }
        public string? LocationName { get; set; }
        public string? CompanyName { get; set; }
        public int CategoryId { get; set; }
        public string? CategoryName { get; set; }
        public int DepartmentId { get; set; }
        public string? DepartmentName { get; set; }
        public ComplaintStatus Status { get; set; }
        public int? AssignedHandlerUserId { get; set; }
        public string? AssignedHandlerName { get; set; }
        public int RaisedByUserId { get; set; }
        public string? RaisedByName { get; set; }
        public List<string>? ImageUrls { get; set; }
        public string? CompletionPhotoUrl { get; set; }
        public List<string>? CompletionImageUrls { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class ComplaintDetailDto : ComplaintListItemDto
    {
        public string Description { get; set; } = string.Empty;
        public List<ComplaintLogDto> Timeline { get; set; } = new();
    }

    public class ComplaintLogDto
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public string? UserName { get; set; }
        public string Message { get; set; } = string.Empty;
        public ComplaintStatus? FromStatus { get; set; }
        public ComplaintStatus ToStatus { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<string>? AttachmentUrls { get; set; }
    }

    public class CreateComplaintRequest
    {
        public string Description { get; set; } = string.Empty;
        public int CategoryId { get; set; }
        public int DepartmentId { get; set; }
        public List<string>? ImageUrls { get; set; }
    }

    public class AssignComplaintRequest
    {
        public int HandlerUserId { get; set; }
    }

    public class UpdateComplaintStatusRequest
    {
        public ComplaintStatus Status { get; set; }
        public string? Message { get; set; }
        /// <summary>
        /// Legacy support. Previously required when handler marks ticket Done.
        /// New flow uses uploaded completion attachments stored on the ticket.
        /// </summary>
        public string? CompletionPhotoUrl { get; set; }
    }

    public class ComplaintCategoryDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class CreateComplaintCategoryRequest
    {
        public string Name { get; set; } = string.Empty;
    }

    public class FacilityDepartmentDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public bool IsActive { get; set; }
    }

    public class CreateFacilityDepartmentRequest
    {
        public string Name { get; set; } = string.Empty;
    }

    public class UpdateFacilityDepartmentRequest
    {
        public string Name { get; set; } = string.Empty;
    }
}
