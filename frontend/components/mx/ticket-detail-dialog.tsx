"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ComplaintDetail, ComplaintStatus, Role } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { AttachmentListDialog } from "@/components/ui/attachment-list-dialog";
import { Building2, MapPin, Tags, Layers, User as UserIcon, Wrench, X, CalendarDays, Activity, CheckCircle2, AlertCircle } from "lucide-react";

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
    <div className="rounded-xl border border-secondary-100 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary-50 ${iconClassName ?? ""}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-secondary-500">{label}</div>
          <div className="mt-0.5 truncate text-sm font-semibold text-secondary-900">{value || "—"}</div>
        </div>
      </div>
    </div>
  );
}

function assetUrl(path: string) {
  if (path.startsWith("http") || path.startsWith("blob:")) return path;
  return path.startsWith("/") ? path : `/${path}`;
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
  const [completionFile, setCompletionFile] = useState<File | null>(null);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerSrc, setImageViewerSrc] = useState<string | null>(null);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);

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
      completionPhotoUrl,
    }: {
      id: number;
      status: ComplaintStatus;
      message?: string;
      completionPhotoUrl?: string;
    }) => {
      await api.patch(`/complaints/${id}/status`, { status, message, completionPhotoUrl });
    },
    onSuccess: () => {
      invalidate();
      setCompletionFile(null);
      toast.success("Updated");
    },
    onError: (e: unknown) =>
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Update failed"),
  });

  const uploadCompletion = async (): Promise<string | null> => {
    if (!completionFile) return null;
    const fd = new FormData();
    fd.append("file", completionFile);
    const res = await api.post(`/complaints/${detailId}/completion-photo`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const url = (res.data?.data as { url?: string })?.url;
    return url ?? null;
  };

  const handleClose = () => {
    setAssignHandlerId("");
    setCompletionFile(null);
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
        <div className="flex flex-col h-full overflow-hidden">
          {/* Custom Header with Gradient - Touches all edges */}
          <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-primary-800 px-7 py-6 text-white shadow-lg shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="font-mono text-lg font-black tracking-wider">{detail.complaintNo}</div>
                  <span
                    className={[
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[11px] font-black uppercase tracking-tight",
                      statusMeta(detail.status).pill,
                    ].join(" ")}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${statusMeta(detail.status).dot}`} />
                    {statusMeta(detail.status).label}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-white/80">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {format(new Date(detail.createdAt), "dd MMM yyyy")}
                  </span>
                </div>
                <div className="mt-3 text-sm font-bold text-white">
                  {detail.categoryName ?? "Uncategorized"} 
                  <span className="mx-2 text-white/50">→</span> 
                  {detail.departmentName ?? "General"}
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 w-10 shrink-0 rounded-full p-0 text-white/90 hover:bg-white/20 hover:text-white transition-all transform active:scale-95"
                onClick={handleClose}
                title="Close"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
          </div>

          {/* Scrolling Content Area */}
          <div className="flex-1 overflow-y-auto space-y-7 p-7">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoTile icon={Building2} label="Company" value={detail.companyName ?? "—"} iconClassName="text-sky-700" />
              <InfoTile icon={MapPin} label="Location" value={detail.locationName ?? "—"} iconClassName="text-indigo-700" />
              <InfoTile icon={Layers} label="Department" value={detail.departmentName ?? "—"} iconClassName="text-emerald-700" />
              <InfoTile icon={Tags} label="Category" value={detail.categoryName ?? "—"} iconClassName="text-amber-700" />
              <InfoTile icon={UserIcon} label="Raised by" value={detail.raisedByName ?? "—"} iconClassName="text-violet-700" />
              <InfoTile icon={Wrench} label="Handler" value={detail.assignedHandlerName ?? "—"} iconClassName="text-orange-700" />
            </div>

            <div className="rounded-2xl border border-secondary-100 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-wider text-secondary-500">Issue description</div>
              <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-secondary-900">
                {detail.description}
              </div>
            </div>

          {/* Raised attachments are shown in timeline (View button with count). */}

          {detail.completionPhotoUrl && (
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-secondary-500">Completion photo</div>
              <button
                type="button"
                className="mt-3 block w-full overflow-hidden rounded-2xl border border-secondary-100 bg-secondary-50"
                onClick={() => {
                  setImageViewerSrc(assetUrl(detail.completionPhotoUrl!));
                  setImageViewerOpen(true);
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={assetUrl(detail.completionPhotoUrl)} alt="Completion" className="max-h-56 w-full object-contain" />
              </button>
            </div>
          )}

          {canAssign && (
            <div className="rounded-2xl border border-secondary-100 bg-white p-4 shadow-sm">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-secondary-500">Assign / reassign handler</div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 min-w-[220px]">
                  <select
                    className="h-10 w-full rounded-md border border-secondary-200 bg-white px-3 text-sm"
                    value={assignHandlerId}
                    onChange={(e) => setAssignHandlerId(e.target.value)}
                  >
                    <option value="">Select handler</option>
                    {handlers.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.firstName} {h.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <Button
                  disabled={!assignHandlerId || assignMutation.isPending}
                  onClick={() => assignMutation.mutate({ id: detail.id, handlerUserId: Number(assignHandlerId) })}
                >
                  Apply
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-secondary-100 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {detail.status === ComplaintStatus.Assigned && isHandler && (
                <Button variant="secondary" onClick={() => statusMutation.mutate({ id: detail.id, status: ComplaintStatus.Accepted })}>
                  Accept
                </Button>
              )}
            {detail.status === ComplaintStatus.Accepted && isHandler && (
              <Button variant="secondary" onClick={() => statusMutation.mutate({ id: detail.id, status: ComplaintStatus.InProgress })}>
                Start work
              </Button>
            )}
            {detail.status === ComplaintStatus.InProgress && isHandler && (
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="text-xs" style={{ color: "var(--mx-muted)" }}>
                    Completion photo (required to mark done)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    className="mt-1 block w-full text-sm"
                    onChange={(e) => setCompletionFile(e.target.files?.[0] ?? null)}
                  />
                </div>
                <Button
                  disabled={statusMutation.isPending}
                  onClick={async () => {
                    try {
                      const url = await uploadCompletion();
                      if (!url) {
                        toast.error("Choose a completion photo");
                        return;
                      }
                      statusMutation.mutate({ id: detail.id, status: ComplaintStatus.Done, completionPhotoUrl: url });
                    } catch {
                      toast.error("Upload failed");
                    }
                  }}
                >
                  Mark done
                </Button>
              </div>
            )}
            {detail.status === ComplaintStatus.Done && permissions?.assignComplaints && (
              <Button variant="outline" onClick={() => statusMutation.mutate({ id: detail.id, status: ComplaintStatus.Closed })}>
                Close ticket
              </Button>
            )}
            {(detail.status === ComplaintStatus.Done || detail.status === ComplaintStatus.Closed) &&
              permissions?.assignComplaints && (
                <Button variant="secondary" disabled={reopenMutation.isPending} onClick={() => reopenMutation.mutate(detail.id)}>
                  Reopen for handler
                </Button>
              )}
            </div>
          </div>

            <div className="rounded-2xl border border-secondary-100 bg-white p-5 shadow-sm">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-wider text-secondary-500">Activity timeline</div>
              <div className="relative pl-6">
                <div className="absolute left-2 top-1 bottom-1 w-px bg-secondary-200" />
                <div className="space-y-4">
                  {(detail.timeline ?? []).map((t) => {
                    const isStatusChange = t.fromStatus != null;
                    const Icon = isStatusChange
                      ? t.toStatus === ComplaintStatus.Closed
                        ? CheckCircle2
                        : AlertCircle
                      : Activity;
                    const iconColor =
                      t.toStatus === ComplaintStatus.Closed
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : isStatusChange
                          ? "text-sky-700 bg-sky-50 border-sky-200"
                          : "text-secondary-700 bg-secondary-50 border-secondary-200";
                    return (
                      <div key={t.id} className="relative">
                        <div className={`absolute -left-6 top-0.5 flex h-8 w-8 items-center justify-center rounded-full border ${iconColor}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="rounded-xl border border-secondary-100 bg-white px-4 py-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-secondary-900">{t.message}</div>
                            <div className="text-xs text-secondary-500">
                              {format(new Date(t.createdAt), "dd MMM yyyy, HH:mm")}
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-secondary-500">
                            {t.userName ?? "User"}
                            {t.fromStatus != null && (
                              <span className="ml-2">
                                <span className="font-semibold text-secondary-700">{t.fromStatus}</span>
                                <span className="mx-1">→</span>
                                <span className="font-semibold text-secondary-700">{t.toStatus}</span>
                              </span>
                            )}
                          </div>
                          {detail.imageUrls && detail.imageUrls.length > 0 && /ticket raised/i.test(t.message ?? "") && (
                            <div className="mt-3">
                              <Button type="button" variant="outline" size="sm" onClick={() => setAttachmentsOpen(true)}>
                                View attachments ({detail.imageUrls.length})
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <FullScreenImageViewer
              isOpen={imageViewerOpen}
              onClose={() => setImageViewerOpen(false)}
              imageSrc={imageViewerSrc}
              alt="Ticket photo"
              disableNoScroll
            />

            <AttachmentListDialog
              open={attachmentsOpen}
              onClose={() => setAttachmentsOpen(false)}
              urls={(detail.imageUrls ?? []) as string[]}
              urlsToDelete={[]}
              pendingFiles={[]}
              onRemoveUrl={() => {}}
              onRemovePending={() => {}}
              isEditing={false}
              title="Ticket attachments"
            />
          </div>
        </div>
      )}
    </Dialog>
  );
}
