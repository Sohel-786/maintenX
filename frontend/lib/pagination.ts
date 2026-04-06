/**
 * Shared pagination constants and helpers for tables.
 * Page is 1-based. Page size 0 means "ALL" (backend returns all records for current page).
 */

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25" },
  { value: 50, label: "50" },
  { value: 75, label: "75" },
  { value: 100, label: "100" },
  { value: 0, label: "ALL" },
] as const;

/** Only show pagination UI when total count exceeds this (per requirement). */
export const PAGINATION_VISIBLE_THRESHOLD = 25;

export function appendPaginationParams(params: URLSearchParams, page: number, pageSize: number): void {
  params.set("page", String(Math.max(1, page)));
  params.set("pageSize", String(pageSize <= 0 ? 0 : pageSize));
}

export function getTotalCountFromResponse(response: { data?: { totalCount?: number } }): number | undefined {
  return response?.data?.totalCount;
}
