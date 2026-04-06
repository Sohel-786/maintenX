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
    const res = await api.post("/complaints/attachments", fd, {
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
      title={detail ? detail.complaintNo : "Ticket"}
      size="xl"
    >
      {detail && (
        <div className="mx-panel space-y-4 p-2 max-h-[75vh] overflow-y-auto">
          <div>
            <h3 className="font-semibold text-lg" style={{ color: "var(--mx-navy-900)" }}>
              {detail.title}
            </h3>
            <p className="text-sm mt-1 whitespace-pre-wrap" style={{ color: "var(--mx-muted)" }}>
              {detail.description}
            </p>
          </div>

          {detail.imageUrls && detail.imageUrls.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--mx-navy-400)" }}>
                Photos (raised)
              </h4>
              <div className="flex flex-wrap gap-2">
                {detail.imageUrls.map((u, i) => (
                  <a key={i} href={assetUrl(u)} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={assetUrl(u)}
                      alt=""
                      className="h-24 w-24 rounded-lg border object-cover"
                      style={{ borderColor: "var(--mx-border)" }}
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span style={{ color: "var(--mx-muted)" }}>Status</span>
              <p className="font-medium">{detail.status}</p>
            </div>
            <div>
              <span style={{ color: "var(--mx-muted)" }}>Priority</span>
              <p className="font-medium">{detail.priority}</p>
            </div>
            <div>
              <span style={{ color: "var(--mx-muted)" }}>Category</span>
              <p className="font-medium">{detail.categoryName ?? "—"}</p>
            </div>
            <div>
              <span style={{ color: "var(--mx-muted)" }}>Department</span>
              <p className="font-medium">{detail.departmentName ?? "—"}</p>
            </div>
            <div>
              <span style={{ color: "var(--mx-muted)" }}>Handler</span>
              <p className="font-medium">{detail.assignedHandlerName ?? "—"}</p>
            </div>
            <div>
              <span style={{ color: "var(--mx-muted)" }}>Raised by</span>
              <p className="font-medium">{detail.raisedByName ?? "—"}</p>
            </div>
          </div>

          {detail.completionPhotoUrl && (
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--mx-navy-400)" }}>
                Completion photo
              </h4>
              <a href={assetUrl(detail.completionPhotoUrl)} target="_blank" rel="noreferrer">
                <img
                  src={assetUrl(detail.completionPhotoUrl)}
                  alt="Completion"
                  className="max-h-48 rounded-lg border object-contain"
                  style={{ borderColor: "var(--mx-border)" }}
                />
              </a>
            </div>
          )}

          {canAssign && (
            <div className="flex flex-wrap gap-2 items-end border-t pt-4" style={{ borderColor: "var(--mx-border)" }}>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs" style={{ color: "var(--mx-muted)" }}>
                  Assign / reassign handler
                </label>
                <select
                  className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  style={{ borderColor: "var(--mx-border)" }}
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
          )}

          <div className="flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: "var(--mx-border)" }}>
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

          <div className="border-t pt-4" style={{ borderColor: "var(--mx-border)" }}>
            <h4 className="text-sm font-semibold mb-3" style={{ color: "var(--mx-navy-900)" }}>
              Timeline
            </h4>
            <ul className="space-y-3">
              {detail.timeline?.map((t) => (
                <li key={t.id} className="text-sm border-l-2 pl-3" style={{ borderColor: "var(--mx-gold)" }}>
                  <p className="text-xs" style={{ color: "var(--mx-muted)" }}>
                    {format(new Date(t.createdAt), "dd MMM yyyy HH:mm")} · {t.userName ?? "User"}
                  </p>
                  <p>{t.message}</p>
                  {t.fromStatus != null && (
                    <p className="text-xs" style={{ color: "var(--mx-muted)" }}>
                      {t.fromStatus} → {t.toStatus}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Dialog>
  );
}
