"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { registerDialog, getScrollLockCount } from "@/lib/dialog-stack";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl" | "full";
  /** Optional class for the overlay (e.g. z-[1100] for nested dialogs to appear above baseline z-1000) */
  overlayClassName?: string;
  /** When false, content area uses overflow-hidden and flex column; use for forms with internal scroll + sticky footer */
  contentScroll?: boolean;
  /** When false, clicking the backdrop does not close the dialog (default true) */
  closeOnBackdropClick?: boolean;
  /** When true, the header close (X) button is disabled */
  closeButtonDisabled?: boolean;
  /** When true, the default header (title and X button) is hidden */
  hideHeader?: boolean;
  /** When true, hides the automatic close button (X) in either header or absolute pos. */
  hideCloseButton?: boolean;
  /** When false, this dialog does not lock body scroll (use for attachment list/viewer to avoid scroll lock issues) */
  lockScroll?: boolean;
  /**
   * When true, pressing Esc will show a confirmation dialog *only if* `isDirty` is true.
   * This does not affect closing via Cancel buttons, X button, or backdrop clicks.
   */
  confirmOnEscWhenDirty?: boolean;
  /** Set true when the form inside the dialog has unsaved changes. */
  isDirty?: boolean;
  /** Optional confirm dialog title (Esc only). */
  escConfirmTitle?: string;
  /** Optional confirm dialog message (Esc only). */
  escConfirmDescription?: string;
  /** Custom class for the dialog container */
  className?: string;
}

export function Dialog({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  overlayClassName,
  contentScroll = true,
  closeOnBackdropClick = false,
  closeButtonDisabled = false,
  hideHeader = false,
  hideCloseButton = false,
  lockScroll = true,
  confirmOnEscWhenDirty = false,
  isDirty = false,
  escConfirmTitle = "Unsaved Changes",
  escConfirmDescription = "You have unsaved changes in the form. Are you sure you want to close? All filled information will be lost.",
  className,
}: DialogProps) {
  // Store the element that had focus before the dialog opened
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const closeButtonDisabledRef = useRef(closeButtonDisabled);
  const isDirtyRef = useRef(isDirty);
  const confirmOnEscWhenDirtyRef = useRef(confirmOnEscWhenDirty);
  const [escConfirmOpen, setEscConfirmOpen] = useState(false);
  const escConfirmOpenRef = useRef(false);
  const stayButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    closeButtonDisabledRef.current = closeButtonDisabled;
  }, [closeButtonDisabled]);
  useEffect(() => {
    isDirtyRef.current = !!isDirty;
  }, [isDirty]);
  useEffect(() => {
    confirmOnEscWhenDirtyRef.current = !!confirmOnEscWhenDirty;
  }, [confirmOnEscWhenDirty]);
  useEffect(() => {
    escConfirmOpenRef.current = escConfirmOpen;
  }, [escConfirmOpen]);
  useEffect(() => {
    // Reset Esc confirm each time the dialog closes/opens
    if (!isOpen) setEscConfirmOpen(false);
  }, [isOpen]);

  // Handle focus storage and return only on open/close transitions
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      // When closing, return focus to previous element if it still exists
      if (previousFocusRef.current && document.body.contains(previousFocusRef.current)) {
        // Small delay to ensure the dialog is gone and no race conditions with other focus events
        const timer = setTimeout(() => {
          previousFocusRef.current?.focus();
          previousFocusRef.current = null;
        }, 30);
        return () => clearTimeout(timer);
      }
    }
  }, [isOpen]);

  // We need a stable function to register in the stack.
  // This ensures that even if the onClose prop changes (causing are-render),
  // the identity of the entry in the stack stays the same, allowing isTopDialog to work.
  const handleClose = useCallback(() => {
    if (closeButtonDisabledRef.current) return;

    // Esc confirm flow: global Esc calls this close fn.
    // Only show confirm when requested + dirty; otherwise close immediately.
    if (escConfirmOpenRef.current) {
      setEscConfirmOpen(false);
      return;
    }
    if (confirmOnEscWhenDirtyRef.current && isDirtyRef.current) {
      setEscConfirmOpen(true);
      return;
    }
    onCloseRef.current();
  }, []);

  // Lock body scroll and handle accessibility event listeners (Esc is handled globally by dialog-stack)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      // If the Esc confirmation sub-dialog is open, it has its own focus/key management
      if (escConfirmOpenRef.current) return;

      // Handle Tab key (Focus Wrap)
      if (e.key === "Tab") {
        if (!dialogRef.current) return;

        const focusableElements = Array.from(dialogRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }) as HTMLElement[];

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) { // Shift + Tab
          if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else { // Tab
          if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (isOpen) {
      // Add this dialog to the stack (optionally without scroll lock for attachment dialogs)
      const cleanup = registerDialog(handleClose, { lockScroll });

      // Lock scroll only when the first scroll-locking dialog opens
      if (lockScroll && getScrollLockCount() === 1) {
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      }

      window.addEventListener("keydown", handleKeyDown, true);

      return () => {
        // Remove from stack
        cleanup();

        // Unlock scroll only when no scroll-locking dialogs remain
        if (getScrollLockCount() === 0) {
          document.body.style.overflow = "";
          document.documentElement.style.overflow = "";
        }

        window.removeEventListener("keydown", handleKeyDown, true);
      };
    }
  }, [isOpen, handleClose, lockScroll]);

  // Handle initial focus only once when dialog opens
  useEffect(() => {
    let focusTimer: NodeJS.Timeout;

    if (isOpen) {
      focusTimer = setTimeout(() => {
        if (dialogRef.current) {
          // Find first focusable element that is NOT the close button in the header
          const focusableElements = Array.from(dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )) as HTMLElement[];

          // Skip header close button if possible
          const firstField = focusableElements.find(el =>
            !el.classList.contains('p-0') &&
            el.getAttribute('title') !== 'Close' &&
            el.tagName !== 'BUTTON' || (el.tagName === 'BUTTON' && !el.querySelector('svg'))
          ) || focusableElements[0];

          firstField?.focus();
        }
      }, 150);
    }

    return () => {
      if (focusTimer) clearTimeout(focusTimer);
    };
  }, [isOpen]);
  
  // Handle focus for the Esc confirmation sub-dialog
  useEffect(() => {
    if (escConfirmOpen) {
      // Small delay to ensure the sub-dialog is rendered
      const timer = setTimeout(() => {
        stayButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [escConfirmOpen]);

  const sizeClasses: Record<NonNullable<DialogProps["size"]>, string> = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
    "3xl": "max-w-7xl",
    "4xl": "max-w-[1500px]",
    "5xl": "max-w-[1750px]",
    full: "w-[98vw] h-[96vh] max-w-none max-h-[96vh]",
  };

  const dialogContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              e.stopPropagation();
              if (closeOnBackdropClick) onClose();
            }}
            className={cn(
              "fixed inset-0 bg-black/60 backdrop-blur-md z-[1000] flex items-center justify-center p-2 sm:p-4 transition-all",
              overlayClassName,
            )}
          >
            <motion.div
              ref={dialogRef}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={cn(
                "bg-white dark:bg-[#0d1117] text-card-foreground rounded-2xl shadow-2xl w-full max-h-[98vh] flex flex-col relative focus:outline-none overflow-hidden border border-secondary-200 dark:border-border",
                size !== "full" && "mx-auto",
                sizeClasses[size],
                className
              )}
            >
              {/* Header */}
              {!hideHeader && (
                <div className="flex items-center justify-between px-4 py-4 sm:px-6 sm:py-5 border-b border-border bg-gray-50/50 dark:bg-gray-900/20">
                  <h2 id="dialog-title" className="text-lg sm:text-xl font-bold tracking-tight text-foreground">{title}</h2>
                  {!hideCloseButton && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        onClose();
                      }}
                      disabled={closeButtonDisabled}
                      className="h-9 w-9 p-0 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
                      title={closeButtonDisabled ? "Please wait" : "Close"}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                  )}
                </div>
              )}

              {hideHeader && !hideCloseButton && (
                <button
                  onClick={onClose}
                  aria-label="Close dialog"
                  disabled={closeButtonDisabled}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-all z-[1010] disabled:opacity-50"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              <div
                className={cn(
                  "flex-1 min-h-0",
                  contentScroll
                    ? "overflow-y-auto p-4 sm:p-6"
                    : "overflow-hidden flex flex-col"
                )}
              >
                {children}
              </div>
            </motion.div>

            {/* Esc-only unsaved changes confirm */}
            <AnimatePresence>
              {escConfirmOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-[1100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
                  onClick={(e) => {
                    e.stopPropagation();
                    // clicking backdrop of confirm = stay (do not close original)
                    setEscConfirmOpen(false);
                  }}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 10 }}
                    className="w-full max-w-md rounded-xl border border-secondary-200 dark:border-secondary-800 bg-white dark:bg-[#06080a] text-card-foreground shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label={escConfirmTitle}
                    onKeyDown={(e) => {
                      // Navigate between the two buttons using Tab or Arrow keys
                      if (e.key === "Tab" || e.key === "ArrowRight" || e.key === "ArrowLeft") {
                        e.preventDefault();
                        if (document.activeElement === stayButtonRef.current) {
                          closeButtonRef.current?.focus();
                        } else {
                          stayButtonRef.current?.focus();
                        }
                      }
                    }}
                  >
                    <div className="p-6 border-b border-secondary-200 dark:border-secondary-800">
                      <h3 className="text-lg font-semibold text-foreground tracking-tight">{escConfirmTitle}</h3>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <p className="text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed">
                        {escConfirmDescription}
                      </p>

                      <div className="flex gap-3 pt-2">
                        <Button
                          ref={stayButtonRef}
                          type="button"
                          variant="outline"
                          className="flex-1 hover:bg-secondary-100 dark:hover:bg-secondary-900/50 dark:border-secondary-700 font-medium focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-[#06080a]"
                          onClick={() => setEscConfirmOpen(false)}
                        >
                          No, Stay
                        </Button>
                        <Button
                          ref={closeButtonRef}
                          type="button"
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-md active:scale-95 focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 dark:focus:ring-offset-[#06080a]"
                          onClick={() => {
                            setEscConfirmOpen(false);
                            onCloseRef.current();
                          }}
                        >
                          Yes, Close
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Portal to document.body so the dialog is above the sidebar (escapes content area z-0 stacking context)
  if (typeof document !== "undefined") {
    return createPortal(dialogContent, document.body);
  }
  return dialogContent;
}
// Exportable sub-components for cleaner usage
export function DialogContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col h-full", className)}>{children}</div>;
}

export function DialogHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}>{children}</div>;
}

export function DialogTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-lg font-semibold leading-none tracking-tight", className)}>{children}</h2>;
}

export function DialogDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("text-sm text-muted-foreground", className)}>{children}</p>;
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}>{children}</div>;
}
