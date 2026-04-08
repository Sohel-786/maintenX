"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Eye, Upload, X } from "lucide-react";
import api from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AttachmentListDialog } from "@/components/ui/attachment-list-dialog";
import { CameraPhotoInput, type CameraPhotoInputRef } from "@/components/ui/camera-photo-input";
import { toast } from "react-hot-toast";

export function CompletionAttachmentsDialog({
  open,
  onClose,
  complaintId,
  onCompleted,
}: {
  open: boolean;
  onClose: () => void;
  complaintId: number | null;
  onCompleted: () => void | Promise<void>;
}) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const cameraRef = useRef<CameraPhotoInputRef | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const discardKeepRef = useRef<HTMLButtonElement | null>(null);
  const discardDiscardRef = useRef<HTMLButtonElement | null>(null);

  const effectiveCount = pendingFiles.length;

  const title = useMemo(() => "Mark done — completion attachments", []);

  useEffect(() => {
    if (!discardConfirmOpen) return;
    const t = setTimeout(() => discardKeepRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [discardConfirmOpen]);

  const closeNow = () => {
    setPendingFiles([]);
    setIsDragging(false);
    setAttachmentsOpen(false);
    setSubmitting(false);
    setDiscardConfirmOpen(false);
    onClose();
  };

  const requestClose = () => {
    if (submitting) return;
    if (pendingFiles.length > 0) {
      setDiscardConfirmOpen(true);
      return;
    }
    closeNow();
  };

  const uploadAll = async () => {
    if (!complaintId) return;
    if (pendingFiles.length === 0) {
      toast.error("Add at least one completion photo");
      return;
    }
    setSubmitting(true);
    try {
      for (const file of pendingFiles) {
        const fd = new FormData();
        fd.append("file", file);
        await api.post(`/complaints/${complaintId}/completion-photo`, fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      await api.patch(`/complaints/${complaintId}/status`, { status: "Done" });
      await onCompleted();
      toast.success("Marked done");
      closeNow();
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Mark done failed");
      setSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
        isOpen={open}
        onClose={requestClose}
        title={title}
        size="md"
        closeOnBackdropClick
        lockScroll={false}
        closeButtonDisabled={submitting}
      >
        <div className="space-y-3">
          <div className="text-sm text-secondary-600 leading-relaxed">
            Completion photos are <span className="font-semibold text-secondary-900">mandatory</span> to mark work as done.
          </div>

          <div
            className={[
              "mt-1 rounded-xl border border-dashed bg-white p-4 transition-colors",
              isDragging ? "border-primary-400 bg-primary-50/40" : "border-secondary-200",
            ].join(" ")}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsDragging(false);
              const incoming = Array.from(e.dataTransfer.files ?? []).filter((f) => f.type.startsWith("image/"));
              if (incoming.length) setPendingFiles((prev) => [...prev, ...incoming]);
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-secondary-700">
                <div className="font-semibold">Drag & drop, use camera, or choose files</div>
                <div className="text-xs text-secondary-500 mt-0.5">You can attach multiple images.</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => cameraRef.current?.open()} disabled={submitting}>
                  <Camera className="mr-1.5 h-4 w-4" />
                  Camera
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                >
                  <Upload className="mr-1.5 h-4 w-4" />
                  Choose files
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAttachmentsOpen(true)}
                  disabled={effectiveCount === 0}
                  title={effectiveCount === 0 ? "No attachments" : "View attachments"}
                >
                  <Eye className="mr-1.5 h-4 w-4" />
                  View ({effectiveCount})
                </Button>
                {effectiveCount > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setPendingFiles([])} disabled={submitting}>
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
                if (incoming.length) setPendingFiles((prev) => [...prev, ...incoming]);
                e.currentTarget.value = "";
              }}
            />
          </div>

          <CameraPhotoInput
            ref={cameraRef}
            previewUrl={null}
            onCapture={(f) => {
              if (f) setPendingFiles((prev) => [...prev, f]);
            }}
            hideDefaultTrigger
          />
        </div>

        <div className="mt-4 flex shrink-0 justify-end gap-2 border-t border-secondary-100 pt-4">
          <Button type="button" variant="outline" disabled={submitting} onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" disabled={submitting} onClick={uploadAll}>
            {submitting ? "Submitting…" : "Mark done"}
          </Button>
        </div>
      </Dialog>

      <AttachmentListDialog
        open={attachmentsOpen}
        onClose={() => setAttachmentsOpen(false)}
        urls={[]}
        urlsToDelete={[]}
        pendingFiles={pendingFiles}
        onRemoveUrl={() => {}}
        onRemovePending={(idx) => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
        isEditing={false}
        title="Completion photo attachments"
      />

      <Dialog
        isOpen={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        title="Discard attachments?"
        size="sm"
        closeOnBackdropClick
        lockScroll={false}
      >
        <div
          className="space-y-5"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              const active = document.activeElement;
              if (active === discardKeepRef.current) discardDiscardRef.current?.focus();
              else discardKeepRef.current?.focus();
            }
          }}
        >
          <p className="text-sm text-secondary-600 leading-relaxed">
            You already attached {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"}. If you close now, they will be lost.
          </p>
          <div className="flex gap-3">
            <Button
              ref={discardKeepRef}
              type="button"
              variant="outline"
              className="flex-1 font-semibold"
              onClick={() => setDiscardConfirmOpen(false)}
            >
              Keep editing
            </Button>
            <Button
              ref={discardDiscardRef}
              type="button"
              className="flex-1 font-semibold bg-rose-600 text-white hover:bg-rose-700"
              onClick={closeNow}
            >
              Discard
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

