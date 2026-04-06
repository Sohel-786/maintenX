using Microsoft.AspNetCore.Hosting;

namespace net_backend.Utils
{
    public static class AttachmentStoragePaths
    {
        public static string GetWebRootPath(IWebHostEnvironment env)
        {
            // In IIS published scenarios WebRootPath points to the deployed wwwroot.
            return env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");
        }

        // Must match the way `CompaniesController` stores logos under:
        // `/storage/company-logos/{safeName}/...`
        // i.e. strip invalid filename chars, but keep spaces (folder names can contain spaces).
        public static string SanitizeFolderName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name)) return "unknown";
            return string.Concat(name.Trim().Split(Path.GetInvalidFileNameChars())).Trim();
        }

        public static string GetModuleTempDirRel(string companyDir, string locationDir, string moduleKey)
            => Path.Combine("storage", companyDir, locationDir, moduleKey, "temp", "files");

        public static string GetModuleFinalDirRel(string companyDir, string locationDir, string moduleKey, string entryKey)
            => Path.Combine("storage", companyDir, locationDir, moduleKey, entryKey, "files");

        public static string UrlFromRelPath(string relPath)
            => "/" + relPath.Replace("\\", "/").TrimStart('/');

        public static string ToPhysicalPath(string webRootPath, string urlOrRelPath)
        {
            var cleaned = (urlOrRelPath ?? string.Empty).Trim();
            cleaned = cleaned.TrimStart('/');
            cleaned = cleaned.Replace('/', Path.DirectorySeparatorChar).Replace('\\', Path.DirectorySeparatorChar);
            return Path.Combine(webRootPath, cleaned);
        }
    }
}

