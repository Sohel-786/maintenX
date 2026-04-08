"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { formatDate, formatDateTime } from "@/lib/utils";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Ticket,
  CircleDot,
  Zap,
  CheckCircle2,
  Download,
  X,
  Search,
  BarChart3,
  PlusCircle,
} from "lucide-react";
import api from "@/lib/api";
import {
  ComplaintCategory,
  ComplaintListItem,
  ComplaintStatus,
  DashboardMetrics,
} from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGINATION_VISIBLE_THRESHOLD } from "@/lib/pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { downloadCsv } from "@/lib/csv-export";
import { TicketDetailDialog } from "@/components/mx/ticket-detail-dialog";
import { RaiseTicketDialog } from "@/components/mx/raise-ticket-dialog";

const filterLabelClass =
  "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";

type StatusGroup = "open" | "inprogress" | "completed" | null;

function groupLabel(g: StatusGroup): string {
  if (g === "open") return "Open tickets";
  if (g === "inprogress") return "In progress tickets";
  if (g === "completed") return "Completed tickets";
  return "All tickets";
}

export function MxDashboardView() {
  const { data: permissions } = useCurrentUserPermissions();
  const { selected } = useLocationContext();
  const { user } = useCurrentUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [statusGroup, setStatusGroup] = useState<StatusGroup>(null);
  const [statusExtra, setStatusExtra] = useState<ComplaintStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [raiseOpen, setRaiseOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (searchParams.get("raise") === "1") {
      setRaiseOpen(true);
      router.replace(pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, statusGroup, statusExtra, pageSize]);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["dashboard-metrics", selected?.locationId],
    queryFn: async () => {
      const res = await api.get("/dashboard/metrics");
      return res.data.data as DashboardMetrics;
    },
    enabled: !!permissions?.viewDashboard && !!selected,
  });

  const showCompany = metrics?.scope === "location";

  const { data: categories = [] } = useQuery({
    queryKey: ["complaint-categories"],
    queryFn: async () => {
      const res = await api.get("/complaint-categories");
      return res.data.data as ComplaintCategory[];
    },
    enabled: !!permissions?.viewDashboard && !!permissions?.viewComplaints,
  });

  const listParams = {
    search: debouncedSearch.trim() || undefined,
    categoryId: categoryId === "" ? undefined : categoryId,
    statusGroup: statusGroup ?? undefined,
    status: !statusGroup && statusExtra ? statusExtra : undefined,
    page,
    pageSize,
  };

  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: [
      "complaints",
      "dashboard-table",
      selected?.locationId,
      debouncedSearch,
      categoryId,
      statusGroup,
      statusExtra,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const res = await api.get("/complaints", { params: listParams });
      return {
        rows: (res.data.data ?? []) as ComplaintListItem[],
        total: res.data.totalCount ?? 0,
      };
    },
    enabled: !!permissions?.viewDashboard && !!permissions?.viewComplaints && !!selected,
  });

  const rows = listRes?.rows ?? [];
  const totalCount = listRes?.total ?? 0;
  const s = metrics?.summary;

  const kpiContext =
    metrics?.scope === "location"
      ? "This location"
      : metrics?.scope === "personalAssigned"
        ? "Assigned to you"
        : "Tickets you raised";

  const hasCardFilter = statusGroup != null;
  const hasAdvancedFilters =
    searchInput.trim() !== "" || categoryId !== "" || statusExtra !== "";

  const clearCardFilter = () => setStatusGroup(null);

  const onExport = useCallback(async () => {
    if (!selected) return;
    setExporting(true);
    try {
      const res = await api.get("/complaints", {
        params: {
          ...listParams,
          page: 1,
          pageSize: 0,
        },
      });
      const data = (res.data.data ?? []) as ComplaintListItem[];
      const headers = showCompany
        ? ["Ticket", "Category", "Department", "Company", "Status", "Handler", "Updated"]
        : ["Ticket", "Category", "Department", "Status", "Handler", "Updated"];
      const csvRows = data.map((r) => {
        if (showCompany) {
          return [
            r.complaintNo,
            r.categoryName ?? "",
            r.departmentName ?? "",
            r.companyName ?? "",
            r.status,
            r.assignedHandlerName ?? "—",
            formatDateTime(r.updatedAt),
          ];
        }
        return [
          r.complaintNo,
          r.categoryName ?? "",
          r.departmentName ?? "",
          r.status,
          r.assignedHandlerName ?? "—",
          formatDateTime(r.updatedAt),
        ];
      });
      downloadCsv(`dashboard-tickets-${format(new Date(), "yyyyMMdd-HHmm")}.csv`, headers, csvRows);
    } finally {
      setExporting(false);
    }
  }, [listParams, selected, showCompany]);

  const colCount = (showCompany ? 1 : 0) + 7;

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-secondary-900">Dashboard</h1>
          <p className="font-medium text-secondary-500">
            Welcome back, {user?.firstName ?? "there"} — click a summary card to filter the table below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {permissions?.raiseComplaint && (
            <Button
              type="button"
              className="gap-2 bg-primary-600 font-semibold hover:bg-primary-700"
              onClick={() => setRaiseOpen(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Raise ticket
            </Button>
          )}
        </div>
      </div>

      {metricsLoading || !metrics ? (
        <div className="flex justify-center py-16 text-secondary-500">Loading dashboard…</div>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                key: "total" as const,
                label: "Total tickets",
                value: s?.total ?? 0,
                icon: Ticket,
                baseBg: "bg-amber-50/40",
                shadowColor: "shadow-amber-500/20",
                iconColor: "text-amber-600",
              },
              {
                key: "open" as const,
                label: "Open",
                value: s?.open ?? 0,
                icon: CircleDot,
                baseBg: "bg-sky-50/40",
                shadowColor: "shadow-sky-500/20",
                iconColor: "text-sky-600",
              },
              {
                key: "inprogress" as const,
                label: "In progress",
                value: s?.inProgress ?? 0,
                icon: Zap,
                baseBg: "bg-orange-50/40",
                shadowColor: "shadow-orange-500/20",
                iconColor: "text-orange-600",
              },
              {
                key: "completed" as const,
                label: "Completed",
                value: s?.completed ?? 0,
                icon: CheckCircle2,
                baseBg: "bg-emerald-50/40",
                shadowColor: "shadow-emerald-500/20",
                iconColor: "text-emerald-600",
              },
            ].map((c) => {
              const Icon = c.icon;
              const active =
                (c.key === "total" && statusGroup === null) ||
                (c.key === "open" && statusGroup === "open") ||
                (c.key === "inprogress" && statusGroup === "inprogress") ||
                (c.key === "completed" && statusGroup === "completed");
              return (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => {
                    setStatusExtra("");
                    if (c.key === "total") setStatusGroup(null);
                    else if (c.key === "open") setStatusGroup("open");
                    else if (c.key === "inprogress") setStatusGroup("inprogress");
                    else setStatusGroup("completed");
                  }}
                  className={[
                    "relative h-full overflow-hidden rounded-2xl border border-secondary-100/60 p-5 text-left shadow-xl transition-all duration-500 ease-out",
                    c.baseBg,
                    c.shadowColor,
                    "hover:shadow-2xl hover:-translate-y-0.5",
                    active ? "ring-2 ring-primary-200 ring-offset-2" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-secondary-500">{c.label}</p>
                      <p className="mt-1 text-3xl font-extrabold tabular-nums text-secondary-900">{c.value}</p>
                    </div>
                    <div className="rounded-xl bg-secondary-50 p-3 shadow-sm transition-all duration-300 hover:scale-105">
                      <Icon className={`h-5 w-5 ${c.iconColor}`} />
                    </div>
                  </div>
                  <div className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full ${c.iconColor} opacity-[0.06] pointer-events-none transition-opacity duration-500`} />
                </button>
              );
            })}
          </div>

          {permissions?.viewComplaints ? (
          <Card className="mb-6 border-secondary-200 bg-white shadow-sm">
            <div className="flex flex-col flex-wrap gap-4 border-b border-secondary-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-bold text-secondary-900">
                  {groupLabel(statusGroup)} [{totalCount} {totalCount === 1 ? "record" : "records"}]
                </h3>
                <p className="text-xs text-secondary-500">{kpiContext}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {hasCardFilter && (
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={clearCardFilter}>
                    <X className="h-3.5 w-3.5" />
                    Clear filter
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={exporting || rows.length === 0}
                  onClick={() => void onExport()}
                >
                  <Download className="h-3.5 w-3.5" />
                  {exporting ? "Exporting…" : "Export CSV"}
                </Button>
              </div>
            </div>
            <div className="flex flex-col flex-wrap gap-4 p-4 lg:flex-row lg:items-end">
              <div className="min-w-0 flex-1 flex-col">
                <label className={filterLabelClass}>Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
                  <Input
                    placeholder="Ticket no, description…"
                    className="h-10 border-secondary-200 pl-9 text-sm focus:ring-primary-500"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="w-full flex-col sm:w-44">
                <label className={filterLabelClass}>Category</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
                  value={categoryId === "" ? "" : String(categoryId)}
                  onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">All</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.isActive}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-full flex-col sm:w-44">
                <label className={filterLabelClass}>Status</label>
                <select
                  className="mt-1 flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
                  value={statusExtra}
                  onChange={(e) => {
                    const v = (e.target.value || "") as ComplaintStatus | "";
                    setStatusExtra(v);
                    if (v) setStatusGroup(null);
                  }}
                >
                  <option value="">All (use cards for groups)</option>
                  {Object.values(ComplaintStatus).map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-20 max-w-[5.5rem] shrink-0">
                <label className={filterLabelClass}>Rows</label>
                <PageSizeSelect value={pageSize} onChange={(v) => { setPageSize(v); setPage(1); }} />
              </div>
              {(hasAdvancedFilters || hasCardFilter) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-10"
                  onClick={() => {
                    setSearchInput("");
                    setCategoryId("");
                    setStatusExtra("");
                    setStatusGroup(null);
                    setPage(1);
                  }}
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Clear all
                </Button>
              )}
            </div>
            <div className="table-container overflow-x-auto px-0 pb-4">
              <table className="w-full min-w-[880px] whitespace-nowrap text-left text-sm">
                <thead>
                  <tr className="border-b border-primary-200 bg-primary-100 text-primary-900 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                    <th className="w-14 border-r border-primary-200/50 px-4 py-3 text-center font-semibold">Sr.</th>
                    <th className="px-4 py-3 font-semibold">Ticket</th>
                    {showCompany && <th className="px-4 py-3 font-semibold">Company</th>}
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Dept</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Handler</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {listLoading ? (
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
                        No tickets match your filters.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r, idx) => (
                      <tr
                        key={r.id}
                        className="cursor-pointer border-b border-secondary-100 transition-colors hover:bg-primary-50/30"
                        onClick={() => setDetailId(r.id)}
                      >
                        <td className="px-4 py-3 text-center text-secondary-500">
                          {totalCount - (page - 1) * pageSize - idx}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs font-semibold">{r.complaintNo}</td>
                        {showCompany && <td className="px-4 py-3">{r.companyName ?? "—"}</td>}
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-900">
                            {r.categoryName ?? "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">{r.departmentName ?? "—"}</td>
                        <td className="px-4 py-3">
                          <span className="mx-badge-status" data-status={r.status}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">{r.assignedHandlerName ?? "—"}</td>
                        <td className="px-4 py-3 text-xs text-secondary-600">
                          {formatDate(r.updatedAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {totalCount > PAGINATION_VISIBLE_THRESHOLD && (
                <TablePagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />
              )}
            </div>
          </Card>
          ) : (
          <Card className="mb-6 border-secondary-200 bg-white p-8 text-center text-sm text-secondary-600 shadow-sm">
            You need <span className="font-semibold text-secondary-800">View complaints</span> permission to filter,
            export, and browse tickets on this screen. Summary cards and KPIs above still reflect your access.
          </Card>
          )}

          <div className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-secondary-900">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              KPI overview — all time
            </h2>
            <p className="mb-4 text-sm text-secondary-500">{kpiContext}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Total tickets", value: metrics.kpi.totalTickets, sub: "In scope" },
                { label: "With handler", value: metrics.kpi.ticketsWithHandler, sub: "Assigned field set" },
                { label: "Closed", value: metrics.kpi.ticketsClosed, sub: `${metrics.kpi.closeRatePercent}% close rate` },
                { label: "Pending closure", value: metrics.kpi.pendingClosure, sub: "Done, not closed" },
                { label: "Reopened", value: metrics.kpi.reopened, sub: "Coordinator reopen" },
                { label: "Reassigned", value: metrics.kpi.reassigned, sub: "Handler changed" },
              ].map((k) => (
                <Card key={k.label} className="border-secondary-200 p-4 shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-secondary-500">{k.label}</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-secondary-900">{k.value}</p>
                  <p className="mt-1 text-xs text-secondary-500">{k.sub}</p>
                </Card>
              ))}
            </div>
          </div>

          {metrics.handlerPerformance.length > 0 && (
            <Card className="overflow-hidden border-secondary-200 bg-white shadow-sm">
              <div className="border-b border-secondary-100 px-6 py-4">
                <h3 className="text-lg font-bold text-secondary-900">Handler performance</h3>
                <p className="text-sm text-secondary-500">Workload at this location (tickets with an assigned handler).</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-primary-200 bg-primary-100 text-primary-900">
                      <th className="px-4 py-3 font-semibold">Handler</th>
                      <th className="px-4 py-3 font-semibold">Assigned</th>
                      <th className="px-4 py-3 font-semibold">Completed</th>
                      <th className="px-4 py-3 font-semibold">Reopened</th>
                      <th className="px-4 py-3 font-semibold">Completion rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.handlerPerformance.map((h) => (
                      <tr key={h.handlerUserId} className="border-b border-secondary-100">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-secondary-900">{h.handlerName}</p>
                          {h.companyName && (
                            <p className="text-xs text-secondary-500">{h.companyName}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 tabular-nums">{h.assignedTotal}</td>
                        <td className="px-4 py-3 tabular-nums">{h.completed}</td>
                        <td className="px-4 py-3 tabular-nums">{h.reopened}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary-100">
                              <div
                                className="h-full rounded-full bg-orange-400 transition-all"
                                style={{ width: `${Math.min(100, h.completionRatePercent)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-secondary-700">
                              {h.completionRatePercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <TicketDetailDialog detailId={detailId} onClose={() => setDetailId(null)} />
      <RaiseTicketDialog open={raiseOpen} onClose={() => setRaiseOpen(false)} />
    </div>
  );
}
