"use client";

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDestructiveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDestructiveDialog({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  isLoading = false,
}: ConfirmDestructiveDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    // Parent should close dialog on success (e.g. after mutation succeeds)
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <p className="text-sm text-secondary-600 whitespace-pre-line flex-1">
            {description}
          </p>
        </div>
        <p className="text-sm text-secondary-500">
          This action cannot be undone.
        </p>
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            className="flex-1"
            disabled={isLoading}
          >
            {isLoading ? "Deleting…" : confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
