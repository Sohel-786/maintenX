"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ComplaintCategory, ComplaintPriority, FacilityDepartment, Role } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "react-hot-toast";

const schema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().min(10, "Please add more detail (at least 10 characters)"),
  categoryId: z.coerce.number().min(1, "Select a category"),
  departmentId: z.coerce.number().optional(),
  priority: z.nativeEnum(ComplaintPriority),
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
  const [files, setFiles] = useState<File[]>([]);

  const form = useForm<RaiseTicketFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      priority: ComplaintPriority.Medium,
      categoryId: 0,
      departmentId: undefined,
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      priority: ComplaintPriority.Medium,
      categoryId: 0,
      departmentId: undefined,
      title: "",
      description: "",
    });
    setFiles([]);
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

  const mutation = useMutation({
    mutationFn: async (values: RaiseTicketFormValues) => {
      const urls: string[] = [];
      for (const f of files) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await api.post("/complaints/attachments", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const url = (res.data?.data as { url?: string })?.url;
        if (url) urls.push(url);
      }
      const titleTrim = values.title?.trim();
      await api.post("/complaints", {
        title: titleTrim && titleTrim.length > 0 ? titleTrim : undefined,
        description: values.description,
        categoryId: values.categoryId,
        departmentId:
          values.departmentId != null && values.departmentId > 0 ? values.departmentId : undefined,
        priority: values.priority,
        imageUrls: urls.length ? urls : undefined,
      });
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
      confirmOnEscWhenDirty={form.formState.isDirty || files.length > 0}
      isDirty={form.formState.isDirty || files.length > 0}
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
            <Label htmlFor="raise-title">Title (optional)</Label>
            <Input
              id="raise-title"
              className="mt-1"
              placeholder="Defaults to category name if empty"
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="raise-desc">Description</Label>
            <Textarea id="raise-desc" className="mt-1 min-h-[120px]" {...form.register("description")} />
            {form.formState.errors.description && (
              <p className="mt-1 text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>
          <div>
            <Label>Category</Label>
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
            <Label>Department (optional)</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
              {...form.register("departmentId", { valueAsNumber: true })}
            >
              <option value={0}>— None —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Photos (optional)</Label>
            <input
              type="file"
              accept="image/*"
              multiple
              className="mt-1 block w-full text-sm text-secondary-700 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary-800"
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            />
            <p className="mt-1 text-xs text-muted-foreground">Images only, max 5MB each.</p>
          </div>
          <div>
            <Label>Priority</Label>
            <select
              className="mt-1 flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm"
              {...form.register("priority")}
            >
              {Object.values(ComplaintPriority).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
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
    </Dialog>
  );
}
