namespace net_backend.Services
{
    /// <summary>
    /// Central pagination constants and helpers for scalable server-side pagination.
    /// Use pageSize 0 or below for "ALL" (no limit); backend caps at MaxPageSizeForAll for safety.
    /// </summary>
    public static class PaginationHelper
    {
        public const int DefaultPageSize = 25;
        public const int MaxPageSizeForAll = 100_000;

        /// <summary>
        /// Normalize page (1-based) and pageSize. Returns (skip, take) for use with Skip().Take().
        /// When pageSize is 0 or negative, treat as "ALL" and take up to MaxPageSizeForAll.
        /// </summary>
        public static (int skip, int take) GetSkipTake(int page, int pageSize)
        {
            int p = page < 1 ? 1 : page;
            int size = pageSize <= 0 ? MaxPageSizeForAll : (pageSize > MaxPageSizeForAll ? MaxPageSizeForAll : pageSize);
            return ((p - 1) * size, size);
        }
    }
}
