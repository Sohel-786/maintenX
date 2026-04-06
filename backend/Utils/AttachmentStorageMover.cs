using System.Collections.Generic;

namespace net_backend.Utils
{
    public static class AttachmentStorageMover
    {
        public static async Task<List<string>> MoveTempUrlsToFinalAsync(
            string webRootPath,
            IEnumerable<string> urls,
            string moduleKey,
            string companyDir,
            string locationDir,
            string entryKey)
        {
            var finalDirRel = AttachmentStoragePaths.GetModuleFinalDirRel(companyDir, locationDir, moduleKey, entryKey);
            var finalDirAbs = Path.Combine(webRootPath, finalDirRel);
            Directory.CreateDirectory(finalDirAbs);

            var finalUrls = new List<string>();
            var tempMarker = "/" + moduleKey.Trim('/') + "/temp/files/";

            foreach (var url in urls)
            {
                if (string.IsNullOrWhiteSpace(url))
                    continue;

                var shouldMove = url.IndexOf(tempMarker, StringComparison.OrdinalIgnoreCase) >= 0;

                if (!shouldMove)
                {
                    finalUrls.Add(url);
                    continue;
                }

                var oldAbs = AttachmentStoragePaths.ToPhysicalPath(webRootPath, url);
                if (!File.Exists(oldAbs))
                {
                    finalUrls.Add(url);
                    continue;
                }

                var fileName = Path.GetFileName(oldAbs);
                var newAbs = Path.Combine(finalDirAbs, fileName);

                // If file already exists (rare), overwrite.
                if (File.Exists(newAbs))
                    File.Delete(newAbs);

                File.Move(oldAbs, newAbs);

                // Best-effort cleanup of guid folder under temp.
                var guidDir = Path.GetDirectoryName(oldAbs);
                try
                {
                    if (!string.IsNullOrWhiteSpace(guidDir) && Directory.Exists(guidDir) &&
                        !Directory.EnumerateFileSystemEntries(guidDir).Any())
                    {
                        Directory.Delete(guidDir);
                    }
                }
                catch
                {
                    // Cleanup is non-critical for request success.
                }

                var newRel = Path.Combine(finalDirRel, fileName);
                finalUrls.Add(AttachmentStoragePaths.UrlFromRelPath(newRel));
            }

            return await Task.FromResult(finalUrls);
        }
    }
}

