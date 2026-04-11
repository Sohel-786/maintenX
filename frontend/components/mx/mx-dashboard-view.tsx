"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
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
  Eye,
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
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (searchParams.get("raise") === "1") {
      window.dispatchEvent(new CustomEvent("openRaiseTicket"));
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
    status: statusExtra || undefined,
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

  const clearAdvancedFilters = () => {
    setSearchInput("");
    setCategoryId("");
    setStatusExtra("");
    setPage(1);
  };

  const onExport = useCallback(async () => {
    if (!selected || exporting) return;
    setExporting(true);
    try {
      const res = await api.get("/complaints/export", {
        params: listParams,
        responseType: "blob",
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      const dateStr = format(new Date(), "yyyyMMdd_HHmm");
      link.setAttribute("download", `Tickets_Export_${dateStr}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed", err);
    } finally {
      setExporting(false);
    }
  }, [listParams, selected, exporting]);

  const colCount = (showCompany ? 1 : 0) + 8;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="mb-2 text-2xl sm:text-3xl font-bold tracking-tight text-secondary-900">Dashboard</h1>
          <p className="text-xs sm:text-sm font-medium text-secondary-500">
            Welcome back, {user?.firstName ?? "there"} — click a summary card to filter the table below.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          {permissions?.raiseComplaint && (
            <Button
              type="button"
              className="gap-2 bg-primary-600 font-semibold hover:bg-primary-700 w-full lg:w-auto h-11 lg:h-10"
              onClick={() => window.dispatchEvent(new CustomEvent("openRaiseTicket"))}
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
          <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:gap-6">
            {[
              {
                key: "total" as const,
                label: "Total tickets",
                value: s?.total ?? 0,
                icon: Ticket,
                theme: {
                  id: "blue",
                  border: "dark:border-blue-500/40 border-amber-200",
                  active: "bg-blue-600 text-white shadow-blue-500/40 border-blue-400",
                  inactive: "bg-white dark:bg-slate-900/40 dark:backdrop-blur-md",
                  iconWrapper: "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  shadow: "shadow-blue-500/10"
                }
              },
              {
                key: "open" as const,
                label: "Open",
                value: s?.open ?? 0,
                icon: CircleDot,
                theme: {
                  id: "sky",
                  border: "dark:border-sky-500/40 border-sky-200",
                  active: "bg-sky-600 text-white shadow-sky-500/40 border-sky-400",
                  inactive: "bg-white dark:bg-slate-900/40 dark:backdrop-blur-md",
                  iconWrapper: "bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400",
                  shadow: "shadow-sky-500/10"
                }
              },
              {
                key: "inprogress" as const,
                label: "In progress",
                value: s?.inProgress ?? 0,
                icon: Zap,
                theme: {
                  id: "orange",
                  border: "dark:border-orange-500/40 border-orange-200",
                  active: "bg-orange-600 text-white shadow-orange-500/40 border-orange-400",
                  inactive: "bg-white dark:bg-slate-900/40 dark:backdrop-blur-md",
                  iconWrapper: "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400",
                  shadow: "shadow-orange-500/10"
                }
              },
              {
                key: "completed" as const,
                label: "Completed",
                value: s?.completed ?? 0,
                icon: CheckCircle2,
                theme: {
                  id: "emerald",
                  border: "dark:border-emerald-500/40 border-emerald-200",
                  active: "bg-emerald-600 text-white shadow-emerald-500/40 border-emerald-400",
                  inactive: "bg-white dark:bg-slate-900/40 dark:backdrop-blur-md",
                  iconWrapper: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                  shadow: "shadow-emerald-500/10"
                }
              },
            ].map((c) => {
              const Icon = c.icon;
              const active =
                (c.key === "total" && statusGroup === null) ||
                (c.key === "open" && statusGroup === "open") ||
                (c.key === "inprogress" && statusGroup === "inprogress") ||
                (c.key === "completed" && statusGroup === "completed");
              
              const theme = c.theme;

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
                  className={cn(
                    "group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border p-3 sm:p-4 lg:p-5 text-left transition-all duration-500 ease-out",
                    theme.border,
                    active ? theme.active : cn(theme.inactive, theme.shadow, "hover:scale-[1.02] hover:shadow-2xl hover:border-white/20")
                  )}
                >
                  {/* Glass highlight effect */}
                  {!active && (
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                  
                  <div className="relative flex items-start justify-between gap-2 sm:gap-4">
                    <div className="min-w-0">
                      <p className={cn(
                        "text-[8px] xs:text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] sm:tracking-[0.15em]",
                        active ? "text-white/80" : "text-secondary-500 dark:text-secondary-400"
                      )}>
                        {c.label}
                      </p>
                      <p className={cn(
                        "mt-0.5 sm:mt-1 text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums tracking-tighter truncate",
                        active ? "text-white" : "text-secondary-900 dark:text-white"
                      )}>
                        {c.value}
                      </p>
                    </div>
                    <div className={cn(
                      "rounded-lg sm:rounded-xl p-2 sm:p-3 shadow-lg transition-transform duration-500 group-hover:rotate-12 shrink-0",
                      active ? "bg-white/20 text-white backdrop-blur-sm" : theme.iconWrapper
                    )}>
                      <Icon className="h-4 w-4 sm:h-5 w-5" />
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5">
                     <span className={cn(
                       "text-[11px] font-bold tracking-tight",
                       active ? "text-white/70" : "text-secondary-400 dark:text-secondary-500 hover:text-secondary-300"
                     )}>
                       {active ? "Currently filtered" : "View table →"}
                     </span>
                  </div>

                  {/* Decorative corner shape */}
                  <div className={cn(
                    "absolute -right-6 -bottom-6 h-24 w-24 rounded-full pointer-events-none transition-all duration-700",
                    active ? "bg-white/10 scale-150" : "bg-white/5 opacity-0 group-hover:opacity-100 group-hover:scale-110"
                  )} />
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
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {permissions?.exportDashboard && (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-2 bg-primary-600 font-bold text-white shadow-md hover:bg-primary-700 disabled:opacity-70 w-full sm:w-auto h-11 sm:h-9"
                    disabled={exporting || rows.length === 0}
                    loading={exporting}
                    onClick={() => void onExport()}
                  >
                    {!exporting && <Download className="h-4 w-4" />}
                    {exporting ? "Exporting Excel…" : "Export Excel"}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-row flex-wrap items-end gap-3 lg:gap-4 p-4">
              <div className="w-full sm:flex-1 min-w-0 flex flex-col">
                <label className={filterLabelClass}>Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
                  <Input
                    placeholder="Ticket no, description…"
                    className="h-11 lg:h-10 border-secondary-200 pl-9 text-sm focus:ring-primary-500"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex-[2] min-w-[120px] sm:flex-none sm:w-44 flex flex-col">
                <label className={filterLabelClass}>Category</label>
                <select
                  className="mt-1 flex h-11 lg:h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
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
              {statusGroup !== "open" && (
                <div className="flex-[2] min-w-[120px] sm:flex-none sm:w-44 flex flex-col">
                  <label className={filterLabelClass}>Status</label>
                  <select
                    className="mt-1 flex h-11 lg:h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
                    value={statusExtra}
                    onChange={(e) => {
                      const v = (e.target.value || "") as ComplaintStatus | "";
                      setStatusExtra(v);
                    }}
                  >
                    <option value="">{statusGroup === null ? "All statuses" : `All ${statusGroup} statuses`}</option>
                    {Object.values(ComplaintStatus)
                      .filter((st) => {
                        if (statusGroup === "inprogress") {
                           return [ComplaintStatus.Assigned, ComplaintStatus.Accepted, ComplaintStatus.InProgress].includes(st);
                        }
                        if (statusGroup === "completed") {
                           return [ComplaintStatus.Done, ComplaintStatus.Closed].includes(st);
                        }
                        return true;
                      })
                      .map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              <div className="flex-1 min-w-[80px] sm:flex-none sm:w-20 lg:w-24 shrink-0 flex flex-col">
                <label className={filterLabelClass}>Rows</label>
                <div className="h-11 lg:h-10">
                  <PageSizeSelect value={pageSize} onChange={(v) => { setPageSize(v); setPage(1); }} />
                </div>
              </div>
              {hasAdvancedFilters && (
                <div className="w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-11 lg:h-10 border-secondary-200 text-secondary-600 hover:bg-secondary-50 w-full sm:w-auto"
                    onClick={() => {
                      setSearchInput("");
                      setCategoryId("");
                      setStatusExtra("");
                      setPage(1);
                    }}
                  >
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Clear filters
                  </Button>
                </div>
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
                    <th className="w-14 px-4 py-3 text-center font-semibold">View</th>
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
                        className="border-b border-secondary-100 transition-colors hover:bg-primary-50/30"
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Total tickets", value: metrics.kpi.totalTickets, sub: "In scope" },
                { label: "With handler", value: metrics.kpi.ticketsWithHandler, sub: "Assigned field set" },
                { label: "Closed", value: metrics.kpi.ticketsClosed, sub: `${metrics.kpi.closeRatePercent}% close rate` },
                { label: "Pending closure", value: metrics.kpi.pendingClosure, sub: "Done, not closed" },
                { label: "Reopened", value: metrics.kpi.reopened, sub: "Coordinator reopen" },
                { label: "Reassigned", value: metrics.kpi.reassigned, sub: "Handler changed" },
              ].map((k) => (
                <Card 
                  key={k.label} 
                  className="group border-secondary-200 bg-white/50 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/30 hover:shadow-lg dark:border-border dark:bg-slate-900/40 dark:backdrop-blur-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-widest text-secondary-500 dark:text-secondary-400">{k.label}</p>
                  <p className="mt-1.5 text-2xl font-black tabular-nums tracking-tight text-secondary-900 dark:text-white">{k.value}</p>
                  <p className="mt-1 text-[11px] font-medium text-secondary-400 dark:text-secondary-500">{k.sub}</p>
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
    </div>
  );
}
