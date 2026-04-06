"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Company } from "@/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState } from "react";
import { Save, X, Building2, ImagePlus, Trash2 } from "lucide-react";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { cn } from "@/lib/utils";

const hexColor = z
  .string()
  .min(1)
  .refine((v) => /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(v), "Use a hex colour e.g. #0D6EFD");

const schema = z.object({
  name: z.string().min(1, "Company name is required").max(200),
  logoUrl: z.string().optional(),
  themeColor: hexColor,
  isActive: z.boolean(),
});

export type CompanyFormValues = z.infer<typeof schema>;

interface CompanyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CompanyFormValues) => void;
  item?: Company | null;
  isLoading?: boolean;
  readOnly?: boolean;
}

function resolveLogoSrc(logoUrl: string) {
  if (logoUrl.startsWith("http") || logoUrl.startsWith("blob:")) return logoUrl;
  return logoUrl.startsWith("/") ? logoUrl : `/${logoUrl}`;
}

export function CompanyDialog({ isOpen, onClose, onSubmit, item, isLoading, readOnly }: CompanyDialogProps) {
  const isReadOnly = !!readOnly;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
    setValue,
    watch,
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      logoUrl: "",
      themeColor: "#0d6efd",
      isActive: true,
    },
  });

  const logoUrl = watch("logoUrl");
  const themeColor = watch("themeColor");
  const isActive = watch("isActive");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingLogoRemoval, setPendingLogoRemoval] = useState(false);
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [localLogoPreviewUrl, setLocalLogoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (item && isOpen) {
      reset({
        name: item.name,
        logoUrl: item.logoUrl ?? "",
        themeColor:
          item.themeColor && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/i.test(item.themeColor)
            ? item.themeColor
            : "#0d6efd",
        isActive: item.isActive,
      });
      setPendingLogoRemoval(false);
      setPendingLogoFile(null);
      setLocalLogoPreviewUrl(null);
    } else if (isOpen) {
      reset({ name: "", logoUrl: "", themeColor: "#0d6efd", isActive: true });
      setPendingLogoRemoval(false);
      setPendingLogoFile(null);
      setLocalLogoPreviewUrl(null);
    }
  }, [item, reset, isOpen]);

  useEffect(() => {
    return () => {
      if (localLogoPreviewUrl?.startsWith("blob:")) {
        try {
          URL.revokeObjectURL(localLogoPreviewUrl);
        } catch {
          /* noop */
        }
      }
    };
  }, [localLogoPreviewUrl]);

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return null;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return null;
    }
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const currentName = watch("name")?.trim() || "unknown";
      const res = await api.post(`/companies/upload-logo?companyName=${encodeURIComponent(currentName)}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const data = res.data as Record<string, unknown>;
      const url = (data?.data as Record<string, unknown> | undefined)?.logoUrl as string | undefined;
      if (!url) {
        toast.error((res.data as { message?: string })?.message || "Upload failed.");
        return null;
      }
      return url as string;
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message || "Logo upload failed.");
      return null;
    } finally {
      setLogoUploading(false);
    }
  };

  const stageLogo = (file: File) => {
    if (isReadOnly) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB.");
      return;
    }
    if (pendingLogoRemoval) setPendingLogoRemoval(false);
    setPendingLogoFile(file);
    const preview = URL.createObjectURL(file);
    if (localLogoPreviewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(localLogoPreviewUrl);
      } catch {
        /* noop */
      }
    }
    setLocalLogoPreviewUrl(preview);
    setValue("logoUrl", preview, { shouldValidate: false });
  };

  const dialogTitle = item ? "Edit company" : "Register company";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={dialogTitle}
      size="lg"
      contentScroll={false}
      confirmOnEscWhenDirty={!isReadOnly}
      isDirty={!isReadOnly && isDirty}
    >
      <form
        onSubmit={handleSubmit(async (data) => {
          if (isReadOnly) return;
          if (pendingLogoRemoval) {
            setPendingLogoFile(null);
            if (localLogoPreviewUrl?.startsWith("blob:")) {
              try {
                URL.revokeObjectURL(localLogoPreviewUrl);
              } catch {
                /* noop */
              }
            }
            setLocalLogoPreviewUrl(null);
            onSubmit({ ...data, logoUrl: "" });
            return;
          }
          if (pendingLogoFile) {
            const uploadedUrl = await uploadLogo(pendingLogoFile);
            if (!uploadedUrl) return;
            setPendingLogoFile(null);
            if (localLogoPreviewUrl?.startsWith("blob:")) {
              try {
                URL.revokeObjectURL(localLogoPreviewUrl);
              } catch {
                /* noop */
              }
            }
            setLocalLogoPreviewUrl(null);
            setValue("logoUrl", uploadedUrl, { shouldValidate: true });
            onSubmit({ ...data, logoUrl: uploadedUrl });
            return;
          }
          onSubmit(data);
        })}
        className="flex flex-col"
      >
        <fieldset disabled={isReadOnly} className="min-h-0 flex-1">
          <div className="max-h-[min(70vh,560px)] space-y-5 overflow-y-auto px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="company-name" className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Company name <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="company-name"
                  {...register("name")}
                  className="h-11 pl-10"
                  placeholder="e.g. Aira Euro Automation Pvt Ltd"
                />
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Logo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) stageLogo(file);
                  e.target.value = "";
                }}
              />
              <div
                onDragOver={(e) => {
                  if (isReadOnly) return;
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  if (isReadOnly) return;
                  e.preventDefault();
                  setDragActive(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) stageLogo(file);
                }}
                onClick={() => !isReadOnly && fileInputRef.current?.click()}
                className={cn(
                  "relative flex min-h-[120px] cursor-pointer items-center justify-center rounded-xl border-2 border-dashed transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-border bg-muted/30 hover:bg-muted/50",
                  (logoUploading || isReadOnly) && "pointer-events-none opacity-60",
                )}
              >
                {logoUrl && !pendingLogoRemoval ? (
                  <>
                    <img src={resolveLogoSrc(logoUrl)} alt="" className="max-h-24 max-w-[85%] object-contain" />
                    {!isReadOnly && !logoUploading && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute -right-1 -top-1 h-8 w-8 rounded-full border bg-background p-0 text-destructive shadow-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPendingLogoFile(null);
                          if (localLogoPreviewUrl?.startsWith("blob:")) {
                            try {
                              URL.revokeObjectURL(localLogoPreviewUrl);
                            } catch {
                              /* noop */
                            }
                          }
                          setLocalLogoPreviewUrl(null);
                          setPendingLogoRemoval(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    {logoUploading ? (
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    ) : (
                      <ImagePlus className="h-8 w-8" />
                    )}
                    <span className="text-xs font-medium">{logoUploading ? "Uploading…" : "Drop image or click to upload"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Company branding</Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Colour"
                  value={themeColor?.startsWith("#") && themeColor.length >= 4 ? themeColor : "#0d6efd"}
                  onChange={(e) => setValue("themeColor", e.target.value, { shouldValidate: true })}
                  className="h-11 w-14 cursor-pointer rounded-lg border border-border bg-background p-1"
                />
                <Input {...register("themeColor")} className="h-11 flex-1 font-mono text-sm uppercase" placeholder="#0D6EFD" />
              </div>
              {errors.themeColor && <p className="text-xs text-destructive">{errors.themeColor.message}</p>}
            </div>

            <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/20 px-4 py-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setValue("isActive", !isActive, { shouldDirty: true })}
                className={cn(
                  "relative h-7 w-12 shrink-0 rounded-full transition-colors",
                  isActive ? "bg-primary" : "bg-muted-foreground/30",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform",
                    isActive ? "left-[26px]" : "left-0.5",
                  )}
                />
              </button>
              <div>
                <p className="text-sm font-semibold">Active</p>
                <p className="text-xs text-muted-foreground">Inactive companies are hidden from new operational use.</p>
              </div>
            </div>
          </div>
        </fieldset>

        <div className="flex gap-3 border-t border-border px-6 py-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          {!isReadOnly && (
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                "Saving…"
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {item ? "Update" : "Save"}
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Dialog>
  );
}
