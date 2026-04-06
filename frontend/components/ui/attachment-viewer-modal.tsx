"use client";

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FullScreenImageViewer } from "@/components/ui/full-screen-image-viewer";
import { registerDialog, applyScrollLockState } from "@/lib/dialog-stack";

interface AttachmentViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string | null;
    fileName?: string | null;
}

function isPdf(url: string, fileName?: string | null): boolean {
    const name = (fileName ?? url).split("?")[0];
    return name.toLowerCase().endsWith(".pdf");
}

function isImage(url: string, fileName?: string | null): boolean {
    const name = (fileName ?? url).split("?")[0].toLowerCase();
    return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].some((ext) => name.endsWith(ext));
}

export function AttachmentViewerModal({ isOpen, onClose, url, fileName }: AttachmentViewerModalProps) {
    if (!url) return null;

    // Backend returns URLs like `/storage/...` (same IIS port in production). Prefixing with
    // `NEXT_PUBLIC_API_URL` breaks production (turns `/storage/...` into `/api/storage/...`).
    const fullUrl =
        url.startsWith("http") || url.startsWith("blob:")
            ? url
            : url.startsWith("/")
                ? url
                : `/${url}`;
    const showPdf = isPdf(url, fileName);
    const showImage = isImage(url, fileName);

    const onCloseRef = useRef(onClose);
    const unregisterRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    const handleClose = useCallback(() => {
        unregisterRef.current?.();
        unregisterRef.current = null;
        onCloseRef.current();
        requestAnimationFrame(() => {
            applyScrollLockState();
            if (document.body && typeof document.body.focus === "function") {
                document.body.setAttribute("tabindex", "-1");
                document.body.focus({ preventScroll: true });
            }
        });
    }, []);

    useEffect(() => {
        if (isOpen) {
            const cleanup = registerDialog(handleClose, { lockScroll: false });
            unregisterRef.current = cleanup;
            return () => {
                unregisterRef.current = null;
                cleanup();
            };
        }
    }, [isOpen, handleClose]);

    useEffect(() => {
        if (!isOpen) {
            requestAnimationFrame(() => {
                if (document.body && typeof document.body.focus === "function") {
                    document.body.setAttribute("tabindex", "-1");
                    document.body.focus({ preventScroll: true });
                }
            });
        }
    }, [isOpen]);

    if (showImage) {
        return (
            <FullScreenImageViewer
                isOpen={isOpen}
                imageSrc={fullUrl}
                onClose={handleClose}
                alt="Attachment"
                skipDialogStack
                disableNoScroll
            />
        );
    }

    if (showPdf && isOpen) {
        const pdfContent = (
            <div
                className="fixed inset-0 z-[2000] flex flex-col bg-black/95"
                role="dialog"
                aria-modal="true"
                aria-label="View attachment PDF"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 shrink-0">
                    <span className="text-sm font-medium text-white truncate max-w-[60%]">{fileName || url.split("/").pop() || "Attachment"}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={handleClose} className="text-white hover:bg-white/10 h-9 w-9 p-0 rounded-lg" title="Close (Esc)">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
                    <iframe src={fullUrl} title="Attachment PDF" className="w-full h-full min-h-[80vh] rounded-lg bg-white" />
                </div>
            </div>
        );
        if (typeof document !== "undefined") return createPortal(pdfContent, document.body);
        return pdfContent;
    }

    if (isOpen && !showPdf && !showImage) {
        const fallbackContent = (
            <div className="fixed inset-0 z-[2000] flex flex-col bg-black/95" role="dialog" aria-modal="true">
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/50 shrink-0">
                    <span className="text-sm font-medium text-white truncate">{fileName || url.split("/").pop() || "Attachment"}</span>
                    <Button type="button" variant="ghost" size="sm" onClick={handleClose} className="text-white hover:bg-white/10 h-9 w-9 p-0 rounded-lg">
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <div className="flex-1 flex items-center justify-center p-4 text-white/80 text-center">
                    <div>
                        <p className="font-medium">Preview not available for this file type.</p>
                        <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-primary-400 hover:underline">
                            Open in new tab
                        </a>
                    </div>
                </div>
            </div>
        );
        if (typeof document !== "undefined") return createPortal(fallbackContent, document.body);
        return fallbackContent;
    }

    return null;
}
