"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ComplaintCategory, FacilityDepartment, Role } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";
import { CameraPhotoInput, type CameraPhotoInputRef } from "@/components/ui/camera-photo-input";
import { AttachmentListDialog } from "@/components/ui/attachment-list-dialog";
import { Camera, Upload, Eye, X } from "lucide-react";

const schema = z.object({
  description: z.string().min(5, "Description is required"),
  categoryId: z.coerce.number().min(1, "Select a category"),
  departmentId: z.coerce.number().min(1, "Select a department"),
});

export type RaiseTicketFormValues = z.infer<typeof schema>;

export function RaiseTicketDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const { data: permissions } = useCurrentUserPermissions();
  const { user: currentUser } = useCurrentUser();
  const [pendingPhotoFiles, setPendingPhotoFiles] = useState<File[]>([]);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraRef = useRef<CameraPhotoInputRef>(null);

  const form = useForm<RaiseTicketFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: 0,
      departmentId: 0,
      description: "",
    },
  });

  const effectiveAttachmentCount = pendingPhotoFiles.length;

  useEffect(() => {
    if (!open) return;
    form.reset({
      categoryId: 0,
      departmentId: 0,
      description: "",
    });
    setPendingPhotoFiles([]);
  }, [open, form]);

  const { data: categories = [] } = useQuery({
    queryKey: ["complaint-categories"],
    queryFn: async () => {
      const res = await api.get("/complaint-categories");
      return res.data.data as ComplaintCategory[];
    },
    enabled: open && !!permissions?.raiseComplaint,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["facility-departments"],
    queryFn: async () => {
      const res = await api.get("/facility-departments");
      return res.data.data as FacilityDepartment[];
    },
    enabled: open && !!permissions?.raiseComplaint,
  });

  // Default department selection from user's profileDepartment (name -> id mapping)
  useEffect(() => {
    if (!open) return;
    if (!departments.length) return;
    const current = form.getValues("departmentId");
    if (current && current > 0) return;
    const pref = currentUser?.profileDepartment?.trim();
    if (!pref) return;
    const match = departments.find((d) => d.name.trim().toLowerCase() === pref.toLowerCase());
    if (match) form.setValue("departmentId", match.id, { shouldValidate: true });
  }, [open, departments, currentUser?.profileDepartment, form]);

  const mutation = useMutation({
    mutationFn: async (values: RaiseTicketFormValues) => {
      const createRes = await api.post("/complaints", {
        description: values.description,
        categoryId: values.categoryId,
        departmentId: values.departmentId,
      });
      const created = createRes.data?.data as { id?: number } | undefined;
      const id = created?.id;
      if (id && pendingPhotoFiles.length) {
        for (const f of pendingPhotoFiles) {
          const fd = new FormData();
          fd.append("file", f);
          await api.post(`/complaints/${id}/raised-photo`, fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaints"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["mx-sidebar-counts"] });
      toast.success("Ticket raised");
      onClose();
    },
    onError: (e: unknown) =>
      toast.error(
        (e as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed to raise ticket",
      ),
  });

  if (!permissions?.raiseComplaint) return null;

  return (
    <Dialog
      isOpen={open}
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
      title="Raise ticket"
      size="lg"
      contentScroll
      confirmOnEscWhenDirty={form.formState.isDirty || pendingPhotoFiles.length > 0}
      isDirty={form.formState.isDirty || pendingPhotoFiles.length > 0}
      escConfirmTitle="Discard ticket?"
      escConfirmDescription="You have unsaved changes. Close without saving?"
    >
      <form
        className="flex min-h-0 flex-1 flex-col"
        onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
      >
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-1 py-1">
          <p className="text-sm text-secondary-500">
            Creates a maintenance ticket for the currently selected location. Attachments are optional.
          </p>
          <div>
            <Label>
              Category <span className="text-red-600">*</span>
            </Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
              {...form.register("categoryId", { valueAsNumber: true })}
            >
              <option value={0}>Select…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} disabled={!c.isActive}>
                  {c.name}
                </option>
              ))}
            </select>
            {form.formState.errors.categoryId && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
            )}
          </div>
          <div>
            <Label>
              Department <span className="text-red-600">*</span>
            </Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
              {...form.register("departmentId", { valueAsNumber: true })}
            >
              <option value={0}>Select…</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            {form.formState.errors.departmentId && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.departmentId.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="raise-desc">
              Description <span className="text-red-600">*</span>
            </Label>
            <Textarea id="raise-desc" className="mt-1 min-h-[120px]" {...form.register("description")} />
            {form.formState.errors.description && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div>
            <Label>Photo (optional)</Label>
            <div
              className={[
                "mt-1 rounded-xl border border-dashed bg-white p-4 transition-colors",
                isDragging ? "border-primary-400 bg-primary-50/40" : "border-secondary-200",
              ].join(" ")}
              onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);
                const incoming = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
                if (incoming.length) setPendingPhotoFiles((prev) => [...prev, ...incoming]);
              }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-secondary-700">
                  <div className="font-semibold">Drag & drop, use camera, or choose a file</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.open()}>
                    <Camera className="mr-1.5 h-4 w-4" />
                    Camera
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-4 w-4" />
                    Choose file
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setAttachmentsOpen(true)}
                    disabled={effectiveAttachmentCount === 0}
                    title={effectiveAttachmentCount === 0 ? "No attachments" : "View attachments"}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    View ({effectiveAttachmentCount})
                  </Button>
                  {effectiveAttachmentCount > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setPendingPhotoFiles([])}>
                      <X className="mr-1.5 h-4 w-4" />
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
                onChange={(e) => {
                  const incoming = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/"));
                  if (incoming.length) setPendingPhotoFiles((prev) => [...prev, ...incoming]);
                  e.currentTarget.value = "";
                }}
              />
            </div>
            <CameraPhotoInput
              ref={cameraRef}
              previewUrl={null}
              onCapture={(f) => {
                if (f) setPendingPhotoFiles((prev) => [...prev, f]);
              }}
              hideDefaultTrigger
            />
          </div>
        </div>
        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-secondary-100 pt-4">
          <Button type="button" variant="outline" disabled={mutation.isPending} onClick={() => onClose()}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Submitting…" : "Submit ticket"}
          </Button>
        </div>
      </form>

      <AttachmentListDialog
        open={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        urls={[]}
        urlsToDelete={[]}
        pendingFiles={pendingPhotoFiles}
        onRemoveUrl={() => {}}
        onRemovePending={(idx) => setPendingPhotoFiles((prev) => prev.filter((_, i) => i !== idx))}
        isEditing={false}
        title="Ticket photo attachments"
      />
    </Dialog>
  );
}
