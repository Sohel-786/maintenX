"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ComplaintDetail, ComplaintStatus, Role } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { formatDate, formatDateTime } from "@/lib/utils";
import { AttachmentListDialog } from "@/components/ui/attachment-list-dialog";
import { Building2, MapPin, Tags, Layers, User as UserIcon, Wrench, X, CalendarDays, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { CompletionAttachmentsDialog } from "./completion-attachments-dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";

function statusMeta(status: ComplaintStatus) {
  switch (status) {
    case ComplaintStatus.Open:
      return { label: "Open", pill: "bg-amber-950/60 text-amber-50 border-amber-200/20", dot: "bg-amber-300" };
    case ComplaintStatus.Assigned:
      return { label: "Assigned", pill: "bg-sky-950/60 text-sky-50 border-sky-200/20", dot: "bg-sky-300" };
    case ComplaintStatus.Accepted:
      return { label: "Accepted", pill: "bg-indigo-950/60 text-indigo-50 border-indigo-200/20", dot: "bg-indigo-300" };
    case ComplaintStatus.InProgress:
      return { label: "In progress", pill: "bg-orange-950/60 text-orange-50 border-orange-200/20", dot: "bg-orange-300" };
    case ComplaintStatus.Done:
      return { label: "Done", pill: "bg-emerald-950/60 text-emerald-50 border-emerald-200/20", dot: "bg-emerald-300" };
    case ComplaintStatus.Closed:
      return { label: "Closed", pill: "bg-secondary-950/70 text-secondary-50 border-secondary-200/20", dot: "bg-secondary-200" };
    default:
      return { label: String(status), pill: "bg-secondary-950/70 text-secondary-50 border-secondary-200/20", dot: "bg-secondary-200" };
  }
}

function InfoTile({
  icon,
  label,
  value,
  iconClassName,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  iconClassName?: string;
}) {
  const Icon = icon;
  return (
    <div className="rounded-xl border border-secondary-100 bg-white px-3 py-2 shadow-sm transition-all hover:border-secondary-200">
      <div className="flex items-center gap-2.5">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-50/80 ${iconClassName ?? ""}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[9px] font-bold uppercase tracking-widest text-secondary-500/80">{label}</div>
          <div className="truncate text-sm font-bold text-secondary-900 leading-tight">{value || "—"}</div>
        </div>
      </div>
    </div>
  );
}

export function TicketDetailDialog({
  detailId,
  onClose,
}: {
  detailId: number | null;
  onClose: () => void;
}) {
  const { data: permissions } = useCurrentUserPermissions();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [assignHandlerId, setAssignHandlerId] = useState("");
  const [attachmentsState, setAttachmentsState] = useState<{ open: boolean; type: "raised" | "completion" }>({
    open: false,
    type: "raised",
  });
  const [completionUrlsForViewer, setCompletionUrlsForViewer] = useState<string[]>([]);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<null | { type: "close" | "reopen" }>(null);
  const confirmCancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmOkRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!confirmAction) return;
    const t = setTimeout(() => confirmCancelRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [confirmAction]);

  const { data: detail } = useQuery({
    queryKey: ["complaint", detailId],
    queryFn: async () => {
      const res = await api.get(`/complaints/${detailId}`);
      return res.data.data as ComplaintDetail;
    },
    enabled: detailId != null,
  });

  const { data: locationUsers = [] } = useQuery({
    queryKey: ["location-users"],
    queryFn: async () => {
      const res = await api.get("/users/location-users");
      return res.data.data as { id: number; firstName: string; lastName: string; role: Role }[];
    },
    enabled: !!permissions?.assignComplaints && detailId != null,
  });

  const handlers = useMemo(() => locationUsers.filter((u) => u.role === Role.HANDLER), [locationUsers]);
  const handlerOptions = useMemo(
    () =>
      handlers
        .filter((h) => h.id !== detail?.assignedHandlerUserId)
        .map((h) => ({
          value: h.id,
          label: `${h.firstName} ${h.lastName}`.trim(),
        })),
    [handlers, detail?.assignedHandlerUserId],
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["complaints"] });
    queryClient.invalidateQueries({ queryKey: ["complaint", detailId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    queryClient.invalidateQueries({ queryKey: ["mx-sidebar-counts"] });
  };

  const assignMutation = useMutation({
    mutationFn: async ({ id, handlerUserId }: { id: number; handlerUserId: number }) => {
      await api.post(`/complaints/${id}/assign`, { handlerUserId });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assignment updated");
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Assign failed"),
  });

  const reopenMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/complaints/${id}/reopen`);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Ticket reopened");
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Reopen failed"),
  });

  const statusMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      message,
    }: {
      id: number;
      status: ComplaintStatus;
      message?: string;
    }) => {
      await api.patch(`/complaints/${id}/status`, { status, message });
    },
    onSuccess: () => {
      invalidate();
      toast.success("Updated");
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Update failed"),
  });

  const handleClose = () => {
    setAssignHandlerId("");
    onClose();
  };

  const canAssign =
    !!permissions?.assignComplaints &&
    detail &&
    (detail.status === ComplaintStatus.Open ||
      detail.status === ComplaintStatus.Assigned ||
      detail.status === ComplaintStatus.Accepted ||
      detail.status === ComplaintStatus.InProgress);

  const isHandler = !!permissions?.handleComplaints && detail?.assignedHandlerUserId === user?.id;

  const canReopen =
    !!permissions?.assignComplaints &&
    !!detail &&
    (((detail.status as ComplaintStatus) === ComplaintStatus.Done ||
      (detail.status as ComplaintStatus) === ComplaintStatus.Closed));

  const openConfirm = (type: "close" | "reopen") => setConfirmAction({ type });
  const closeConfirm = () => setConfirmAction(null);

  const confirmTitle =
    confirmAction?.type === "close"
      ? "Close ticket?"
      : confirmAction?.type === "reopen"
        ? "Reopen for handler?"
        : "";
  const confirmDescription =
    confirmAction?.type === "close"
      ? "This will move the ticket to Closed status. This action is typically final."
      : confirmAction?.type === "reopen"
        ? "This will move the ticket back to Assigned so the handler can work on it again."
        : "";

  return (
    <Dialog
      isOpen={detailId != null}
      onClose={handleClose}
      title=""
      size="xl"
      hideHeader
      hideCloseButton
      contentScroll={false}
    >
      {detail && (
        <div className="flex max-h-[85vh] min-h-0 flex-col overflow-hidden">
          {/* Custom Header with Gradient - Touches all edges */}
          <div className="shrink-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 px-6 py-3.5 text-white shadow-md relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none" />
            <div className="relative flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="font-mono text-xl font-black tracking-tighter drop-shadow-sm">{detail.complaintNo}</div>
                  <span
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider",
                      statusMeta(detail.status).pill,
                    ].join(" ")}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${statusMeta(detail.status).dot}`} />
                    {statusMeta(detail.status).label}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-white/70">
                  <span className="inline-flex items-center gap-1.5 grayscale opacity-80">
                    <CalendarDays className="h-3 w-3" />
                    {formatDate(detail.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-white/90">{detail.categoryName ?? "Uncategorized"}</span>
                    <span className="text-white/40 font-normal">/</span>
                    <span className="text-white/90">{detail.departmentName ?? "General"}</span>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 w-9 shrink-0 rounded-full p-0 text-white/90 hover:bg-white/20 hover:text-white transition-all transform active:scale-95"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Scrolling Content Area */}
          <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-5 scrollbar-thin scrollbar-thumb-secondary-200">
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoTile icon={Building2} label="Company" value={detail.companyName ?? "—"} iconClassName="text-sky-600 bg-sky-50" />
              <InfoTile icon={MapPin} label="Location" value={detail.locationName ?? "—"} iconClassName="text-indigo-600 bg-indigo-50" />
              <InfoTile icon={Layers} label="Department" value={detail.departmentName ?? "—"} iconClassName="text-emerald-600 bg-emerald-50" />
              <InfoTile icon={Tags} label="Category" value={detail.categoryName ?? "—"} iconClassName="text-amber-600 bg-amber-50" />
              <InfoTile icon={UserIcon} label="Raised by" value={detail.raisedByName ?? "—"} iconClassName="text-violet-600 bg-violet-50" />
              <InfoTile icon={Wrench} label="Handler" value={detail.assignedHandlerName ?? "—"} iconClassName="text-orange-600 bg-orange-50" />
            </div>

            <div className="rounded-xl border border-secondary-100 bg-white p-3.5 shadow-sm">
              <div className="text-[10px] font-bold uppercase tracking-widest text-secondary-500/80">Issue description</div>
              <div className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-secondary-900 font-medium">
                {detail.description}
              </div>
            </div>

          {/* Raised attachments are shown in timeline (View button with count). */}

          {/* Completion attachments are shown in timeline (View button with count). */}

          {canAssign && (
            <div className="rounded-xl border border-secondary-100 bg-white p-3.5 shadow-sm">
              <div className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-secondary-500/80">Assign / reassign handler</div>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                <div className="flex-1 min-w-[220px]">
                  <SearchableSelect
                    options={handlerOptions}
                    value={assignHandlerId ? Number(assignHandlerId) : ""}
                    onChange={(v) => setAssignHandlerId(String(v))}
                    placeholder="Select handler"
                    searchPlaceholder="Search handler…"
                    disabled={assignMutation.isPending}
                    portal
                  />
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="h-9 px-6 font-bold"
                  disabled={!assignHandlerId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate({ id: detail.id, handlerUserId: Number(assignHandlerId) })}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}

          {(() => {
            const showAccept = detail.status === ComplaintStatus.Assigned && isHandler;
            const showStartWork = detail.status === ComplaintStatus.Accepted && isHandler;
            const showMarkDone = detail.status === ComplaintStatus.InProgress && isHandler;
            const showClose = detail.status === ComplaintStatus.Done && !!permissions?.assignComplaints;
            const showReopen = canReopen;

            if (!showAccept && !showStartWork && !showMarkDone && !showClose && !showReopen) return null;

            return (
              <div className="rounded-xl border border-secondary-100 bg-white p-3.5 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {showAccept && (
                    <Button size="sm" variant="secondary" className="px-5 font-bold" onClick={() => statusMutation.mutate({ id: detail.id, status: ComplaintStatus.Accepted })}>
                      Accept
                    </Button>
                  )}
                  {showStartWork && (
                    <Button size="sm" variant="secondary" className="px-5 font-bold" onClick={() => statusMutation.mutate({ id: detail.id, status: ComplaintStatus.InProgress })}>
                      Start work
                    </Button>
                  )}
                  {showMarkDone && (
                    <Button
                      size="sm"
                      className="bg-emerald-600 text-white hover:bg-emerald-700 px-6 font-bold"
                      disabled={statusMutation.isPending}
                      onClick={() => setCompletionDialogOpen(true)}
                    >
                      Mark done
                    </Button>
                  )}
                  {showClose && (
                    <Button size="sm" variant="outline" className="px-6 font-bold" disabled={statusMutation.isPending} onClick={() => openConfirm("close")}>
                      Close ticket
                    </Button>
                  )}
                  {showReopen && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="px-6 font-bold"
                      disabled={reopenMutation.isPending}
                      onClick={() => openConfirm("reopen")}
                    >
                      Reopen for handler
                    </Button>
                  )}
                </div>
              </div>
            );
          })()}

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
                      confirmAction?.type === "close"
                        ? "bg-secondary-900 hover:bg-secondary-950"
                        : "bg-indigo-600 hover:bg-indigo-700",
                    ].join(" ")}
                    disabled={statusMutation.isPending || reopenMutation.isPending}
                    onClick={() => {
                      const t = confirmAction?.type;
                      closeConfirm();
                      if (!detail || !t) return;
                      if (t === "close") statusMutation.mutate({ id: detail.id, status: ComplaintStatus.Closed });
                      else reopenMutation.mutate(detail.id);
                    }}
                  >
                    {confirmAction?.type === "close" ? "Close ticket" : "Reopen"}
                  </Button>
                </div>
              </div>
            </Dialog>

            <div className="rounded-xl border border-secondary-100 bg-white p-4 shadow-sm">
              <div className="mb-3.5 text-[10px] font-bold uppercase tracking-widest text-secondary-500/80">Activity timeline</div>
              <div className="relative pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-secondary-100" />
                <div className="space-y-3">
                  {(detail.timeline ?? []).map((t) => {
                    const isStatusChange = t.fromStatus != null;
                    const Icon = isStatusChange
                      ? t.toStatus === ComplaintStatus.Closed
                        ? CheckCircle2
                        : AlertCircle
                      : Activity;
                    const iconColor =
                      t.toStatus === ComplaintStatus.Closed
                        ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                        : isStatusChange
                          ? "text-sky-600 bg-sky-50 border-sky-100"
                          : "text-secondary-600 bg-secondary-50 border-secondary-100";
                    return (
                      <div key={t.id} className="relative">
                        <div className={`absolute -left-6 top-0 flex h-7 w-7 items-center justify-center rounded-full border ${iconColor} z-10`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="rounded-xl border border-secondary-50 bg-secondary-50/30 px-3.5 py-2.5 transition-colors hover:bg-secondary-50/50">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[13px] font-bold text-secondary-900">{t.message}</div>
                            <div className="text-[10px] font-bold text-secondary-400 uppercase tracking-tighter">
                              {formatDateTime(t.createdAt)}
                            </div>
                          </div>
                          <div className="mt-0.5 text-[11px] font-medium text-secondary-500">
                            {t.userName ?? "User"}
                            {t.fromStatus != null && (
                              <span className="ml-2 inline-flex items-center gap-1 opacity-80">
                                <span className="font-bold text-secondary-600">{t.fromStatus}</span>
                                <span className="text-secondary-300">→</span>
                                <span className="font-bold text-secondary-600">{t.toStatus}</span>
                              </span>
                            )}
                          </div>
                          {(() => {
                            const isRaised = /ticket raised/i.test(t.message ?? "");
                            const isDone = String(t.toStatus).toLowerCase() === "done" || (t.message ?? "").toLowerCase().includes("status → done");
                            const hasRaisedImages = (detail.imageUrls?.length ?? 0) > 0;
                            const doneUrlsFromLog = (t.attachmentUrls ?? []).filter(Boolean);
                            const hasDoneImages = doneUrlsFromLog.length > 0;
                            const legacyHasDoneImages = (detail.completionImageUrls?.length ?? 0) > 0;

                            if ((isRaised && hasRaisedImages) || (isDone && (hasDoneImages || legacyHasDoneImages))) {
                              return (
                                <div className="mt-2.5">
                                  {isRaised && hasRaisedImages && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[10px] font-bold uppercase tracking-wider px-3 bg-white hover:bg-secondary-50"
                                      onClick={() => setAttachmentsState({ open: true, type: "raised" })}
                                    >
                                      View attachments ({detail.imageUrls?.length})
                                    </Button>
                                  )}
                                  {isDone && (hasDoneImages || legacyHasDoneImages) && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-[10px] font-bold uppercase tracking-wider px-3 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50"
                                      onClick={() => {
                                        // Prefer the snapshot stored on this timeline entry (supports multiple completion stages).
                                        // Fallback for older data: use current ticket-level completionImageUrls.
                                        setCompletionUrlsForViewer(doneUrlsFromLog.length ? doneUrlsFromLog : (detail.completionImageUrls ?? []));
                                        setAttachmentsState({ open: true, type: "completion" });
                                      }}
                                    >
                                      View completion attachments ({doneUrlsFromLog.length ? doneUrlsFromLog.length : (detail.completionImageUrls?.length ?? 0)})
                                    </Button>
                                  )}
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <AttachmentListDialog
              open={attachmentsState.open}
              onClose={() => {
                setAttachmentsState((s) => ({ ...s, open: false }));
                setCompletionUrlsForViewer([]);
              }}
              urls={
                (attachmentsState.type === "raised"
                  ? (detail.imageUrls ?? [])
                  : (completionUrlsForViewer.length ? completionUrlsForViewer : (detail.completionImageUrls ?? []))) as string[]
              }
              urlsToDelete={[]}
              pendingFiles={[]}
              onRemoveUrl={() => {}}
              onRemovePending={() => {}}
              isEditing={false}
              title={attachmentsState.type === "raised" ? "Ticket attachments" : "Completion attachments"}
            />

            <CompletionAttachmentsDialog
              open={completionDialogOpen}
              onClose={() => setCompletionDialogOpen(false)}
              complaintId={detail.id}
              onCompleted={async () => {
                invalidate();
              }}
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}
