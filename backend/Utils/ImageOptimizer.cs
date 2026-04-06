using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace net_backend.Utils
{
    public static class ImageOptimizer
    {
        public static bool IsImageExtension(string? extension)
        {
            var ext = (extension ?? string.Empty).ToLowerInvariant();
            return ext is ".png" or ".jpg" or ".jpeg" or ".gif" or ".webp";
        }

        public static async Task OptimizeImageToWebpAsync(Stream inputStream, string destinationPhysicalPath, int maxWidth = 2560, int quality = 85)
        {
            // Resize (only if larger) + convert to WebP.
            using var image = await Image.LoadAsync(inputStream);

            if (image.Width > maxWidth)
            {
                var newHeight = (int)(image.Height * ((float)maxWidth / image.Width));
                image.Mutate(x => x.Resize(maxWidth, newHeight));
            }

            var directory = Path.GetDirectoryName(destinationPhysicalPath);
            if (!string.IsNullOrWhiteSpace(directory))
                Directory.CreateDirectory(directory);

            await image.SaveAsWebpAsync(destinationPhysicalPath, new WebpEncoder
            {
                Quality = quality
            });
        }
    }
}

