import { appendPaginationParams } from "@/lib/pagination";

/**
 * PI list filter state and API param builder.
 */
export interface PIFiltersState {
  search: string;
  status: string;
  createdDateFrom: string;
  createdDateTo: string;
  itemIds: number[];
  creatorIds: number[];
  isActive: boolean | null;
  page: number;
  pageSize: number;
}

export const defaultPIFilters: PIFiltersState = {
  search: "",
  status: "",
  createdDateFrom: "",
  createdDateTo: "",
  itemIds: [],
  creatorIds: [],
  isActive: null,
  page: 1,
  pageSize: 25,
};

export function buildPIFilterParams(f: PIFiltersState): URLSearchParams {
  const params = new URLSearchParams();
  const search = (f.search || "").trim();
  if (search) params.set("search", search);
  if (f.status) params.set("status", f.status);
  if (f.createdDateFrom) params.set("createdDateFrom", f.createdDateFrom);
  if (f.createdDateTo) params.set("createdDateTo", f.createdDateTo);
  if (f.isActive !== null) params.set("isActive", String(f.isActive));
  f.itemIds.forEach(id => params.append("itemIds", String(id)));
  f.creatorIds.forEach(id => params.append("creatorIds", String(id)));
  appendPaginationParams(params, f.page, f.pageSize);
  return params;
}

export function hasActivePIFilters(f: PIFiltersState): boolean {
  return (
    !!(f.search || "").trim() ||
    !!f.status ||
    !!f.createdDateFrom ||
    !!f.createdDateTo ||
    f.itemIds.length > 0 ||
    f.creatorIds.length > 0 ||
    f.isActive !== null
  );
}
