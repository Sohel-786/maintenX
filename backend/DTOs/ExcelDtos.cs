namespace net_backend.DTOs
{
    public class ItemImportDto
    {
        public string PartName { get; set; } = string.Empty;
        public string DisplayName { get; set; } = string.Empty;
        public string AssetType { get; set; } = string.Empty;
        public string? DrawingNo { get; set; }
        public string? Revision { get; set; }
        public string Material { get; set; } = string.Empty;
        public string Ownership { get; set; } = string.Empty;
        public string Condition { get; set; } = string.Empty;
        public string CustodianType { get; set; } = string.Empty; // Location / Vendor
        public string? CustodianName { get; set; }
        public string? IsActive { get; set; }
    }

    public class MasterImportDto
    {
        public string Name { get; set; } = string.Empty;
    }

    public class CompanyImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string GstNo { get; set; } = string.Empty;
        public string? State { get; set; }
        public string? City { get; set; }
        public string? Pincode { get; set; }
        public string? ContactPerson { get; set; }
        public string? ContactNumber { get; set; }
        public DateTime? GstDate { get; set; }
    }

    public class LocationImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string CompanyName { get; set; } = string.Empty;
    }

    public class PartyImportDto
    {
        public string Name { get; set; } = string.Empty;
        public string? PartyCategory { get; set; }
        public string? CustomerType { get; set; }
        public string? Address { get; set; }
        public string? ContactPerson { get; set; }
        public string? PhoneNumber { get; set; }
        public string? Email { get; set; }
        public string? GstNo { get; set; }
        public DateTime? GstDate { get; set; }
    }

    public class RowError
    {
        public int Row { get; set; }
        public string Message { get; set; } = string.Empty;
    }

    public class ExcelRow<T> where T : new()
    {
        public int RowNumber { get; set; }
        public T Data { get; set; } = new T();
    }

    public class ValidationEntry<T> where T : new()
    {
        public int Row { get; set; }
        public T Data { get; set; } = new T();
        public string? Message { get; set; }
    }

    public class ValidationResultDto<T> where T : new()
    {
        public List<ValidationEntry<T>> Valid { get; set; } = new();
        public List<ValidationEntry<T>> Duplicates { get; set; } = new();
        public List<ValidationEntry<T>> AlreadyExists { get; set; } = new();
        public List<ValidationEntry<T>> Invalid { get; set; } = new();
        public int TotalRows { get; set; }
    }

    public class ImportResultDto<T> where T : new()
    {
        public int Imported { get; set; }
        public int TotalRows { get; set; }
        public List<RowError> Errors { get; set; } = new List<RowError>();
        public List<ExcelRow<T>> Data { get; set; } = new List<ExcelRow<T>>();
    }
}
