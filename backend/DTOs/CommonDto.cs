namespace net_backend.DTOs
{
    public class ApiResponse<T>
    {
        public bool Success { get; set; } = true;
        public T? Data { get; set; }
        public string? Message { get; set; }
        /// <summary>When set, indicates server-side pagination total record count (so client can show pagination UI).</summary>
        public int? TotalCount { get; set; }
    }

    public class CompanyDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Address { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Pincode { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactNumber { get; set; }
        public string? LogoUrl { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public bool UseAsParty { get; set; }
        public string ThemeColor { get; set; } = "#0d6efd";
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    /// <summary>Company master: name, branding, and active flag. Legacy import/API may still send address, GST, etc.</summary>
    public class CreateCompanyRequest
    {
        public string Name { get; set; } = string.Empty;
        public string? LogoUrl { get; set; }
        public string ThemeColor { get; set; } = "#0d6efd";
        public bool IsActive { get; set; } = true;
        /// <summary>Optional — used by Excel import / legacy clients only.</summary>
        public string? Address { get; set; }
        public string? GstNo { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Pincode { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactNumber { get; set; }
        public DateTime? GstDate { get; set; }
        public bool UseAsParty { get; set; } = false;
    }

    public class LocationDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public string? CompanyName { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateLocationRequest
    {
        public string Name { get; set; } = string.Empty;
        public int CompanyId { get; set; }
        public bool? IsActive { get; set; }
        /// <summary>Optional; stored as empty when omitted.</summary>
        public string? Address { get; set; }
    }

    public class UpdateCompanyRequest
    {
        public string? Name { get; set; }
        public string? Address { get; set; }
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Pincode { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactNumber { get; set; }
        public string? LogoUrl { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public bool? UseAsParty { get; set; }
        public string? ThemeColor { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdateLocationRequest
    {
        public string? Name { get; set; }
        public string? Address { get; set; }
        public int? CompanyId { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdatePartyRequest
    {
        public string? Name { get; set; }
        public string? PartyCategory { get; set; }
        public string? CustomerType { get; set; }
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
        public bool IsActive { get; set; }
    }

    public class UpdateMasterRequest
    {
        public string? Name { get; set; }
        public bool IsActive { get; set; }
    }

    public class TransferRuleLocationDto
    {
        public int LocationId { get; set; }
        public string LocationName { get; set; } = string.Empty;
        public string? CompanyName { get; set; }
        public bool AllowVendorToVendorTransfer { get; set; }
    }

    public class UpdateTransferRuleItemDto
    {
        public int LocationId { get; set; }
        public bool AllowVendorToVendorTransfer { get; set; }
    }

    public class CurrentTransferRuleDto
    {
        public bool AllowVendorToVendorTransfer { get; set; }
    }
}
