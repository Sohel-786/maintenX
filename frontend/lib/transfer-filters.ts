import { appendPaginationParams } from "@/lib/pagination";

export interface TransferFiltersState {
    search: string;
    fromPartyIds: number[];
    toPartyIds: number[];
    itemIds: number[];
    creatorIds: number[];
    dateFrom: string;
    dateTo: string;
    isActive: boolean | null;
    page: number;
    pageSize: number;
}

export const initialTransferFilters: TransferFiltersState = {
    search: "",
    fromPartyIds: [],
    toPartyIds: [],
    itemIds: [],
    creatorIds: [],
    dateFrom: "",
    dateTo: "",
    isActive: null,
    page: 1,
    pageSize: 25,
};

export function hasActiveTransferFilters(f: TransferFiltersState) {
    return (
        f.search !== "" ||
        f.fromPartyIds.length > 0 ||
        f.toPartyIds.length > 0 ||
        f.itemIds.length > 0 ||
        f.creatorIds.length > 0 ||
        f.dateFrom !== "" ||
        f.dateTo !== "" ||
        f.isActive !== null
    );
}

export function buildTransferFilterParams(f: TransferFiltersState): URLSearchParams {
    const params = new URLSearchParams();
    if (f.search) params.set("search", f.search);
    if (f.isActive !== null) params.set("isActive", String(f.isActive));
    if (f.dateFrom) params.set("startDate", f.dateFrom);
    if (f.dateTo) params.set("endDate", f.dateTo);

    f.fromPartyIds.forEach(id => params.append("fromPartyIds", String(id)));
    f.toPartyIds.forEach(id => params.append("toPartyIds", String(id)));
    f.itemIds.forEach(id => params.append("itemIds", String(id)));
    f.creatorIds.forEach(id => params.append("creatorIds", String(id)));

    appendPaginationParams(params, f.page, f.pageSize);
    return params;
}
