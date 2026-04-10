"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import {
  ComplaintCategory,
  ComplaintListItem,
  Role,
} from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { AccessDenied } from "@/components/ui/access-denied";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { formatDateTime } from "@/lib/utils";
import { TicketDetailDialog } from "@/components/mx/ticket-detail-dialog";
import { Search, X, Eye } from "lucide-react";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGINATION_VISIBLE_THRESHOLD } from "@/lib/pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toast } from "react-hot-toast";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";

export default function AssignWorkPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"unassigned" | "reassign">("unassigned");

  const [searchInputUn, setSearchInputUn] = useState("");
  const debouncedSearchUn = useDebouncedValue(searchInputUn, 400);
  const [categoryIdUn, setCategoryIdUn] = useState<number | "">("");
  const [pageUn, setPageUn] = useState(1);

  const [searchInputActive, setSearchInputActive] = useState("");
  const debouncedSearchActive = useDebouncedValue(searchInputActive, 400);
  const [categoryIdActive, setCategoryIdActive] = useState<number | "">("");
  const [pageActive, setPageActive] = useState(1);

  const [pageSizeUn, setPageSizeUn] = useState(25);
  const [pageSizeActive, setPageSizeActive] = useState(25);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [handlerPick, setHandlerPick] = useState<Record<number, number | string | "">>({});

  useEffect(() => {
    setPageUn(1);
  }, [debouncedSearchUn, categoryIdUn, pageSizeUn]);

  useEffect(() => {
    setPageActive(1);
  }, [debouncedSearchActive, categoryIdActive, pageSizeActive]);

  const { data: categories = [] } = useQuery({
    queryKey: ["complaint-categories"],
    queryFn: async () => {
      const res = await api.get("/complaint-categories");
      return res.data.data as ComplaintCategory[];
    },
    enabled: !!permissions?.assignComplaints,
  });

  const { data: handlers = [] } = useQuery({
    queryKey: ["location-users", "handlers"],
    queryFn: async () => {
      const res = await api.get("/users/location-users");
      return (res.data.data as { id: number; firstName: string; lastName: string; role: Role }[]).filter(
        (u) => u.role === Role.HANDLER,
      );
    },
    enabled: !!permissions?.assignComplaints,
  });

  const handlerLabel = (h: { firstName?: string | null; lastName?: string | null; id: number }) => {
    const name = `${h.firstName ?? ""} ${h.lastName ?? ""}`.replace(/\s+/g, " ").trim();
    return name || `Handler #${h.id}`;
  };

  const handlerOptions = handlers.map((h) => ({
    value: h.id,
    label: handlerLabel(h),
  }));

  const unParams = {
    search: debouncedSearchUn.trim() || undefined,
    assignmentBucket: "unassigned",
    categoryId: categoryIdUn === "" ? undefined : categoryIdUn,
    page: pageUn,
    pageSize: pageSizeUn,
  };

  const activeParams = {
    search: debouncedSearchActive.trim() || undefined,
    assignmentBucket: "activeReassign",
    categoryId: categoryIdActive === "" ? undefined : categoryIdActive,
    page: pageActive,
    pageSize: pageSizeActive,
  };

  const { data: unData, isLoading: loadingUn } = useQuery({
    queryKey: [
      "complaints",
      "assign-unassigned",
      debouncedSearchUn,
      categoryIdUn,
      pageUn,
      pageSizeUn,
    ],
    queryFn: async () => {
      const res = await api.get("/complaints", { params: unParams });
      return {
        rows: (res.data.data ?? []) as ComplaintListItem[],
        total: res.data.totalCount ?? 0,
      };
    },
    enabled: !!permissions?.assignComplaints,
  });

  const { data: activeData, isLoading: loadingActive } = useQuery({
    queryKey: [
      "complaints",
      "assign-active",
      debouncedSearchActive,
      categoryIdActive,
      pageActive,
      pageSizeActive,
    ],
    queryFn: async () => {
      const res = await api.get("/complaints", { params: activeParams });
      return {
        rows: (res.data.data ?? []) as ComplaintListItem[],
        total: res.data.totalCount ?? 0,
      };
    },
    enabled: !!permissions?.assignComplaints,
  });

  const assignMutation = useMutation({
    mutationFn: async ({ id, handlerUserId }: { id: number; handlerUserId: number }) => {
      await api.post(`/complaints/${id}/assign`, { handlerUserId });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["mx-sidebar-counts"] });
      setHandlerPick((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success("Handler assigned");
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Assign failed"),
  });

  if (permissions && !permissions.assignComplaints) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  const unRows = unData?.rows ?? [];
  const unTotal = unData?.total ?? 0;
  const activeRows = activeData?.rows ?? [];
  const activeTotal = activeData?.total ?? 0;

  const hasUnFilters = searchInputUn.trim() !== "" || categoryIdUn !== "";
  const hasActiveFilters = searchInputActive.trim() !== "" || categoryIdActive !== "";

  const renderTable = (
    rows: ComplaintListItem[],
    total: number,
    page: number,
    onPageChange: (p: number) => void,
    pageSize: number,
    empty: string,
    showAssign: boolean,
    loading: boolean,
  ) => {
    const colCount = showAssign ? 9 : 8;
    return (
      <div className="table-container overflow-x-auto">
        <table className="w-full min-w-[880px] whitespace-nowrap text-left text-sm">
          <thead>
            <tr className="border-b border-primary-200 bg-primary-100 text-primary-900 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
              <th className="w-14 border-r border-primary-200/50 px-4 py-3 text-center font-semibold">Sr.</th>
              <th className="px-4 py-3 font-semibold">Ticket</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">Dept</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Handler</th>
              {showAssign && <th className="min-w-[200px] px-4 py-3 font-semibold">Assign / reassign</th>}
              <th className="px-4 py-3 font-semibold">Updated</th>
              <th className="w-14 px-4 py-3 text-center font-semibold">View</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colCount} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                    <span className="text-xs uppercase tracking-widest text-secondary-400">Loading…</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="py-12 text-center italic text-secondary-500">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className="border-b border-secondary-100 transition-colors hover:bg-primary-50/30"
                >
                  {/*
                    For reassign flows: do not show the currently assigned handler in the picker.
                    (Backend also allows reassignment, but UX should guide the user.)
                  */}
                  <td className="px-4 py-3 text-center text-secondary-500">
                    {total - (page - 1) * pageSize - idx}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{r.complaintNo}</td>
                  <td className="px-4 py-3">{r.categoryName ?? "—"}</td>
                  <td className="px-4 py-3">{r.departmentName ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="mx-badge-status" data-status={r.status}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.assignedHandlerName ?? "—"}</td>
                  {showAssign && (
                    <td
                      className="px-4 py-2 align-middle"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(() => {
                        const currentAssignedId = r.assignedHandlerUserId ?? null;
                        const optionsForRow =
                          currentAssignedId == null
                            ? handlerOptions
                            : handlerOptions.filter((o) => Number(o.value) !== currentAssignedId);
                        const pickerDisabled = optionsForRow.length === 0;
                        return (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-[200px]">
                          <SearchableSelect
                            options={optionsForRow}
                            value={handlerPick[r.id] ?? ""}
                            onChange={(v) => setHandlerPick((prev) => ({ ...prev, [r.id]: v }))}
                            placeholder={pickerDisabled ? "No other handlers" : "Handler…"}
                            searchPlaceholder="Search handler…"
                            className="h-9 text-xs"
                            aria-label="Select handler"
                            portal
                            disabled={pickerDisabled}
                          />
                        </div>
                        <Button
                          size="sm"
                          className="h-9 text-xs"
                          disabled={pickerDisabled || !handlerPick[r.id] || assignMutation.isPending}
                          onClick={() => {
                            const hid = Number(handlerPick[r.id]);
                            if (!hid) return;
                            assignMutation.mutate({ id: r.id, handlerUserId: hid });
                          }}
                        >
                          Apply
                        </Button>
                      </div>
                        );
                      })()}
                    </td>
                  )}
                  <td className="px-4 py-3 text-xs text-secondary-500">
                    {formatDateTime(r.updatedAt)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-primary-600 hover:bg-primary-50 hover:text-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/30"
                      onClick={() => setDetailId(r.id)}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {total > PAGINATION_VISIBLE_THRESHOLD && (
          <TablePagination
            page={page}
            pageSize={pageSize}
            totalCount={total}
            onPageChange={onPageChange}
          />
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-secondary-900">Assign work</h1>
        <p className="font-medium text-secondary-500">
          Unassigned open tickets and active jobs (not done) — assign or reassign handlers for this location.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors " +
              (activeTab === "unassigned"
                ? "border-primary-300 bg-primary-50 text-primary-900"
                : "border-secondary-200 bg-white text-secondary-700 hover:bg-secondary-50")
            }
            onClick={() => setActiveTab("unassigned")}
          >
            Unassigned
            <span className="rounded bg-secondary-100 px-2 py-0.5 text-xs font-bold text-secondary-700">
              {unTotal}
            </span>
          </button>
          <button
            type="button"
            className={
              "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors " +
              (activeTab === "reassign"
                ? "border-primary-300 bg-primary-50 text-primary-900"
                : "border-secondary-200 bg-white text-secondary-700 hover:bg-secondary-50")
            }
            onClick={() => setActiveTab("reassign")}
          >
            Reassign active
            <span className="rounded bg-secondary-100 px-2 py-0.5 text-xs font-bold text-secondary-700">
              {activeTotal}
            </span>
          </button>
        </div>
      </div>

      <Card className="mb-6 border-secondary-200 bg-white shadow-sm">
        <div className="flex flex-col flex-wrap gap-4 p-4 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 flex-col">
            <label className={filterLabelClass}>Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <Input
                placeholder="Ticket no, description…"
                className="h-10 border-secondary-200 pl-9 text-sm focus:ring-primary-500"
                value={activeTab === "unassigned" ? searchInputUn : searchInputActive}
                onChange={(e) =>
                  activeTab === "unassigned"
                    ? setSearchInputUn(e.target.value)
                    : setSearchInputActive(e.target.value)
                }
              />
            </div>
          </div>
          <div className="w-full flex-col sm:w-44">
            <label className={filterLabelClass}>Category</label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
              value={
                activeTab === "unassigned"
                  ? categoryIdUn === ""
                    ? ""
                    : String(categoryIdUn)
                  : categoryIdActive === ""
                    ? ""
                    : String(categoryIdActive)
              }
              onChange={(e) =>
                activeTab === "unassigned"
                  ? setCategoryIdUn(e.target.value ? Number(e.target.value) : "")
                  : setCategoryIdActive(e.target.value ? Number(e.target.value) : "")
              }
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.isActive}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="w-20 max-w-[5.5rem] shrink-0">
            <label className={filterLabelClass}>Rows</label>
            <PageSizeSelect
              value={activeTab === "unassigned" ? pageSizeUn : pageSizeActive}
              onChange={(v) => {
                if (activeTab === "unassigned") {
                  setPageSizeUn(v);
                  setPageUn(1);
                } else {
                  setPageSizeActive(v);
                  setPageActive(1);
                }
              }}
            />
          </div>
          {(activeTab === "unassigned" ? hasUnFilters : hasActiveFilters) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => {
                if (activeTab === "unassigned") {
                  setSearchInputUn("");
                  setCategoryIdUn("");
                  setPageUn(1);
                } else {
                  setSearchInputActive("");
                  setCategoryIdActive("");
                  setPageActive(1);
                }
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      {activeTab === "unassigned" ? (
        <Card className="overflow-hidden border-secondary-200 bg-white shadow-sm">
          <div className="border-b border-secondary-100 px-6 py-4">
            <h3 className="text-lg font-bold text-secondary-900">Unassigned tickets</h3>
            <p className="text-sm text-secondary-500">Open tickets with no handler yet.</p>
          </div>
          {renderTable(
            unRows,
            unTotal,
            pageUn,
            setPageUn,
            pageSizeUn,
            "No unassigned tickets.",
            true,
            loadingUn,
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden border-secondary-200 bg-white shadow-sm">
          <div className="border-b border-secondary-100 px-6 py-4">
            <h3 className="text-lg font-bold text-secondary-900">Reassign active tickets</h3>
            <p className="text-sm text-secondary-500">
              Assigned, accepted, or in progress — reassign to another handler before work is marked done.
            </p>
          </div>
          {renderTable(
            activeRows,
            activeTotal,
            pageActive,
            setPageActive,
            pageSizeActive,
            "No active tickets to reassign.",
            true,
            loadingActive,
          )}
        </Card>
      )}

      <TicketDetailDialog detailId={detailId} onClose={() => setDetailId(null)} />
    </div>
  );
}
