using System.Text.RegularExpressions;

namespace net_backend.Utils
{
    public static class PathUtils
    {
        public static string SanitizeSerialForPath(string serial)
        {
            if (string.IsNullOrWhiteSpace(serial)) return "unknown";
            var sanitized = Regex.Replace(serial, "[^a-zA-Z0-9]", "_").ToLower();
            return sanitized.Length > 120 ? sanitized.Substring(0, 120) : sanitized;
        }

        public static string SanitizeFolderName(string name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "unknown";
            var sanitized = Regex.Replace(name.Trim(), "[^a-zA-Z0-9]", "_").ToLower();
            sanitized = Regex.Replace(sanitized, "_+", "_").Trim('_');
            return string.IsNullOrEmpty(sanitized) ? "unknown" : sanitized;
        }

        public static string GetItemFolderPath(string divisionName, string serialNumber)
        {
            var div = SanitizeFolderName(divisionName);
            var serial = SanitizeSerialForPath(serialNumber);
            return Path.Combine("wwwroot", "storage", div, "items", serial);
        }

        public static string GetInwardFolderPath(string divisionName, string serialNumber)
        {
            return Path.Combine(GetItemFolderPath(divisionName, serialNumber), "inward");
        }



        public static string GetMasterRelativePath(string divisionName, string serialNumber, string fileName)
        {
            var div = SanitizeFolderName(divisionName);
            var serial = SanitizeSerialForPath(serialNumber);
            return $"{div}/items/{serial}/{fileName}";
        }

        public static string GetInwardRelativePath(string divisionName, string serialNumber, string fileName)
        {
            var div = SanitizeFolderName(divisionName);
            var serial = SanitizeSerialForPath(serialNumber);
            return $"{div}/items/{serial}/inward/{fileName}";
        }


    }
}
