"use client";

import { useRef, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { ComplaintCategory, ComplaintListItem, ComplaintStatus } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { AccessDenied } from "@/components/ui/access-denied";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { TicketDetailDialog } from "./ticket-detail-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Search, X } from "lucide-react";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGINATION_VISIBLE_THRESHOLD } from "@/lib/pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { toast } from "react-hot-toast";
import { CompletionAttachmentsDialog } from "./completion-attachments-dialog";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";

export function MxTicketsPage({
  title,
  subtitle,
  statusFilter = "",
  lockStatus,
  showCompanyColumn = false,
  showRaiseLink = false,
  queryKeySuffix = "list",
  rowActions,
}: {
  title: string;
  subtitle?: string;
  statusFilter?: ComplaintStatus | "";
  lockStatus?: ComplaintStatus;
  showCompanyColumn?: boolean;
  showRaiseLink?: boolean;
  queryKeySuffix?: string;
  rowActions?: "handlerWork";
}) {
  const { data: permissions } = useCurrentUserPermissions();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const urlStatusRaw = searchParams.get("status");
  const urlStatus =
    urlStatusRaw && (Object.values(ComplaintStatus) as string[]).includes(urlStatusRaw)
      ? (urlStatusRaw as ComplaintStatus)
      : "";

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 400);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [localStatus, setLocalStatus] = useState<ComplaintStatus | "">(
    () => lockStatus ?? (urlStatus || statusFilter),
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [detailId, setDetailId] = useState<number | null>(null);

  const isHandlerWorkActions = rowActions === "handlerWork" && !!permissions?.handleComplaints;
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completionDialogTargetId, setCompletionDialogTargetId] = useState<number | null>(null);

  const [confirmAction, setConfirmAction] = useState<null | { id: number; type: "accept" | "start" | "done"; label: string }>(null);
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmOkRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (lockStatus) return;
    if (urlStatus) setLocalStatus(urlStatus);
  }, [lockStatus, urlStatus]);

  const effectiveStatus = lockStatus ?? localStatus;

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, categoryId, effectiveStatus, pageSize]);

  const { data: categories = [] } = useQuery({
    queryKey: ["complaint-categories"],
    queryFn: async () => {
      const res = await api.get("/complaint-categories");
      return res.data.data as ComplaintCategory[];
    },
    enabled: !!permissions?.viewComplaints,
  });

  const { data: listRes, isLoading } = useQuery({
    queryKey: [
      "complaints",
      queryKeySuffix,
      debouncedSearch,
      effectiveStatus,
      categoryId,
      page,
      pageSize,
    ],
    queryFn: async () => {
      const res = await api.get("/complaints", {
        params: {
          search: debouncedSearch.trim() || undefined,
          status: effectiveStatus || undefined,
          categoryId: categoryId === "" ? undefined : categoryId,
          page,
          pageSize,
        },
      });
      return {
        rows: (res.data.data ?? []) as ComplaintListItem[],
        total: res.data.totalCount ?? 0,
      };
    },
    enabled: !!permissions?.viewComplaints,
  });

  if (permissions && !permissions.viewComplaints) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  const rows = listRes?.rows ?? [];
  const totalCount = listRes?.total ?? 0;

  const hasActiveFilters =
    searchInput.trim() !== "" ||
    categoryId !== "" ||
    (!lockStatus && localStatus !== "");

  const colCount = (showCompanyColumn ? 1 : 0) + 7 + (isHandlerWorkActions ? 1 : 0);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["complaints"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["mx-sidebar-counts"] });
  };

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: ComplaintStatus }) => {
      await api.patch(`/complaints/${id}/status`, { status });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Updated");
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Update failed"),
  });

  const openConfirm = (a: { id: number; type: "accept" | "start" | "done"; label: string }) => {
    setConfirmAction(a);
    setTimeout(() => confirmCancelRef.current?.focus(), 50);
  };

  const closeConfirm = () => setConfirmAction(null);

  const confirmTitle = confirmAction
    ? confirmAction.type === "accept"
      ? "Accept ticket?"
      : confirmAction.type === "start"
        ? "Start work on ticket?"
        : "Mark ticket as done?"
    : "";

  const confirmDescription = confirmAction
    ? confirmAction.type === "accept"
      ? "This will move the ticket to Accepted status."
      : confirmAction.type === "start"
        ? "This will move the ticket to In progress status."
        : "You will be asked to upload completion photos (mandatory) to mark it as Done."
    : "";

  return (
    <div className="p-6">
      <div className="mb-6 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-secondary-900">{title}</h1>
          {subtitle && <p className="font-medium text-secondary-500">{subtitle}</p>}
        </div>
        {showRaiseLink && permissions?.raiseComplaint && (
          <Link
            href="/dashboard?raise=1"
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary-600 px-4 text-sm font-bold text-white shadow-md hover:bg-primary-700"
          >
            Raise ticket
          </Link>
        )}
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
          {!lockStatus && (
            <div className="w-full flex-col sm:w-44">
              <label className={filterLabelClass}>Status</label>
              <select
                className="mt-1 flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
                value={localStatus}
                onChange={(e) => setLocalStatus((e.target.value || "") as ComplaintStatus | "")}
              >
                <option value="">All</option>
                {Object.values(ComplaintStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="w-20 max-w-[5.5rem] shrink-0">
            <label className={filterLabelClass}>Rows</label>
            <PageSizeSelect value={pageSize} onChange={(v) => { setPageSize(v); setPage(1); }} />
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => {
                setSearchInput("");
                setCategoryId("");
                if (!lockStatus) setLocalStatus("");
                setPage(1);
              }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden border-secondary-200 bg-white shadow-sm">
        <div className="border-b border-secondary-100 px-6 py-4">
          <h3 className="text-lg font-bold text-secondary-900">Tickets ({totalCount})</h3>
        </div>
        <div className="table-container overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-primary-200 bg-primary-100 text-primary-900 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                <th className="w-14 border-r border-primary-200/50 px-4 py-3 text-center font-semibold">Sr.</th>
                <th className="px-4 py-3 font-semibold">Ticket</th>
                {showCompanyColumn && <th className="px-4 py-3 font-semibold">Company</th>}
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Dept</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Handler</th>
                {isHandlerWorkActions && (
                  <th className="px-4 py-3 font-semibold text-right w-[140px]">
                    Actions
                  </th>
                )}
                <th className="px-4 py-3 font-semibold">Updated</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={colCount} className="h-48 text-center">
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
                    {showCompanyColumn && <td className="px-4 py-3">{r.companyName ?? "—"}</td>}
                    <td className="px-4 py-3">{r.categoryName ?? "—"}</td>
                    <td className="px-4 py-3">{r.departmentName ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="mx-badge-status" data-status={r.status}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">{r.assignedHandlerName ?? "—"}</td>
                    {isHandlerWorkActions && (
                      <td className="px-4 py-2 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        {r.status === ComplaintStatus.Assigned ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-[118px] justify-center text-xs font-bold bg-sky-600 text-white hover:bg-sky-700"
                            disabled={statusMutation.isPending}
                            onClick={() => openConfirm({ id: r.id, type: "accept", label: "Accept" })}
                          >
                            Accept
                          </Button>
                        ) : r.status === ComplaintStatus.Accepted ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 w-[118px] justify-center text-xs font-bold bg-orange-600 text-white hover:bg-orange-700"
                            disabled={statusMutation.isPending}
                            onClick={() => openConfirm({ id: r.id, type: "start", label: "Start work" })}
                          >
                            Start work
                          </Button>
                        ) : r.status === ComplaintStatus.InProgress ? (
                          <Button
                            size="sm"
                            className="h-8 w-[118px] justify-center text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                            disabled={statusMutation.isPending}
                            onClick={() => openConfirm({ id: r.id, type: "done", label: "Mark done" })}
                          >
                            Mark done
                          </Button>
                        ) : (
                          <span className="text-xs text-secondary-400">—</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-xs text-secondary-500">
                      {formatDateTime(r.updatedAt)}
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

      <TicketDetailDialog detailId={detailId} onClose={() => setDetailId(null)} />

      {/* Confirm dialog for handler actions (keyboard accessible) */}
      <Dialog
        isOpen={confirmAction != null}
        onClose={closeConfirm}
        title={confirmTitle}
        size="sm"
        closeOnBackdropClick
      >
        <div
          className="space-y-5"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              const active = document.activeElement;
              if (active === confirmCancelRef.current) confirmOkRef.current?.focus();
              else confirmCancelRef.current?.focus();
            }
          }}
        >
          <p className="text-sm text-secondary-600 leading-relaxed">{confirmDescription}</p>
          <div className="flex gap-3">
            <Button
              ref={confirmCancelRef}
              type="button"
              variant="outline"
              className="flex-1 font-semibold"
              onClick={closeConfirm}
            >
              Cancel
            </Button>
            <Button
              ref={confirmOkRef}
              type="button"
              className={[
                "flex-1 font-semibold text-white",
                confirmAction?.type === "accept"
                  ? "bg-sky-600 hover:bg-sky-700"
                  : confirmAction?.type === "start"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-emerald-600 hover:bg-emerald-700",
              ].join(" ")}
              onClick={() => {
                if (!confirmAction) return;
                const { id, type } = confirmAction;
                closeConfirm();
                if (type === "accept") statusMutation.mutate({ id, status: ComplaintStatus.Accepted });
                else if (type === "start") statusMutation.mutate({ id, status: ComplaintStatus.InProgress });
                else {
                  setCompletionDialogTargetId(id);
                  setCompletionDialogOpen(true);
                }
              }}
            >
              {confirmAction?.label ?? "Confirm"}
            </Button>
          </div>
        </div>
      </Dialog>

      {isHandlerWorkActions && (
        <CompletionAttachmentsDialog
          open={completionDialogOpen}
          onClose={() => {
            setCompletionDialogOpen(false);
            setCompletionDialogTargetId(null);
          }}
          complaintId={completionDialogTargetId}
          onCompleted={async () => {
            invalidate();
          }}
        />
      )}
    </div>
  );
}
