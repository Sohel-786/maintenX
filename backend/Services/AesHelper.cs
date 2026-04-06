using System.Security.Cryptography;
using System.Text;

namespace net_backend.Services
{
    /// <summary>
    /// AES-256 helper for encrypting/decrypting sensitive fields (e.g. user passwords for admin viewing).
    /// Key is loaded from configuration — never hardcoded here.
    /// </summary>
    public static class AesHelper
    {
        // AES-256 requires exactly 32 bytes; pad/truncate the key if needed.
        private static byte[] DeriveKey(string rawKey)
        {
            var keyBytes = new byte[32];
            var src = Encoding.UTF8.GetBytes(rawKey);
            Buffer.BlockCopy(src, 0, keyBytes, 0, Math.Min(src.Length, keyBytes.Length));
            return keyBytes;
        }

        /// <summary>Encrypts <paramref name="plainText"/> and returns a Base64 string (IV prepended).</summary>
        public static string Encrypt(string plainText, string key)
        {
            using var aes = Aes.Create();
            aes.Key = DeriveKey(key);
            aes.GenerateIV();

            using var encryptor = aes.CreateEncryptor();
            var plain = Encoding.UTF8.GetBytes(plainText);
            var cipher = encryptor.TransformFinalBlock(plain, 0, plain.Length);

            // Prepend the 16-byte IV so decryption is self-contained
            var result = new byte[aes.IV.Length + cipher.Length];
            Buffer.BlockCopy(aes.IV, 0, result, 0, aes.IV.Length);
            Buffer.BlockCopy(cipher, 0, result, aes.IV.Length, cipher.Length);

            return Convert.ToBase64String(result);
        }

        /// <summary>Decrypts a Base64 string produced by <see cref="Encrypt"/>.</summary>
        public static string Decrypt(string cipherBase64, string key)
        {
            var data = Convert.FromBase64String(cipherBase64);

            using var aes = Aes.Create();
            aes.Key = DeriveKey(key);

            var iv = new byte[16];
            var cipher = new byte[data.Length - 16];
            Buffer.BlockCopy(data, 0, iv, 0, 16);
            Buffer.BlockCopy(data, 16, cipher, 0, cipher.Length);
            aes.IV = iv;

            using var decryptor = aes.CreateDecryptor();
            var plain = decryptor.TransformFinalBlock(cipher, 0, cipher.Length);
            return Encoding.UTF8.GetString(plain);
        }
    }
}

