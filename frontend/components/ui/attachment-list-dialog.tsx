"use client";

import { useState, useEffect } from "react";
import { Eye, Trash2, FileText } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AttachmentViewerModal } from "./attachment-viewer-modal";

function BlobAttachmentViewer({ file, onClose }: { file: File; onClose: () => void }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    useEffect(() => {
        const url = URL.createObjectURL(file);
        setObjectUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    return (
        <AttachmentViewerModal
            isOpen={!!objectUrl}
            onClose={onClose}
            url={objectUrl}
            fileName={file.name}
        />
    );
}

export interface AttachmentListDialogProps {
    open: boolean;
    onClose: () => void;
    /** Already-uploaded URLs (from server when editing) */
    urls: string[];
    /** URLs user chose to remove in edit mode (still shown in urls but will be deleted on save) */
    urlsToDelete: string[];
    /** Files selected but not yet uploaded */
    pendingFiles: File[];
    onRemoveUrl: (url: string) => void;
    onRemovePending: (index: number) => void;
    isEditing: boolean;
    title?: string;
}

function fileNameFromUrl(url: string): string {
    const part = url.split("/").pop() || "";
    return decodeURIComponent(part);
}

export function AttachmentListDialog({
    open,
    onClose,
    urls,
    urlsToDelete,
    pendingFiles,
    onRemoveUrl,
    onRemovePending,
    isEditing,
    title = "Uploaded attachments"
}: AttachmentListDialogProps) {
    const [viewUrl, setViewUrl] = useState<string | null>(null);
    const [viewFile, setViewFile] = useState<File | null>(null);

    const displayUrls = urls.filter((u) => !urlsToDelete.includes(u));
    const total = displayUrls.length + pendingFiles.length;

    return (
        <>
            <Dialog isOpen={open} onClose={onClose} title={title} size="md" lockScroll={false}>
                <div className="space-y-3 max-h-[60vh] overflow-auto">
                    {total === 0 ? (
                        <p className="text-sm text-secondary-500 py-4 text-center">No attachments added yet.</p>
                    ) : (
                        <>
                            {displayUrls.map((url) => (
                                <div
                                    key={url}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-secondary-200 bg-secondary-50/50 px-3 py-2"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-secondary-400 shrink-0" />
                                        <span className="text-sm font-medium text-secondary-900 truncate" title={fileNameFromUrl(url)}>
                                            {fileNameFromUrl(url)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setViewUrl(url)}
                                            title="View"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        {isEditing && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                onClick={() => onRemoveUrl(url)}
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {pendingFiles.map((file, idx) => (
                                <div
                                    key={`${file.name}-${idx}`}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-primary-200 bg-primary-50/30 px-3 py-2"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                                        <span className="text-sm font-medium text-secondary-900 truncate" title={file.name}>
                                            {file.name}
                                        </span>
                                        <span className="text-[10px] font-semibold text-primary-600 uppercase shrink-0">Pending</span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0"
                                            onClick={() => setViewFile(file)}
                                            title="Preview"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                        {isEditing && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                onClick={() => onRemovePending(idx)}
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </>
                    )}
                </div>
                <div className="flex justify-end pt-4 border-t border-secondary-100">
                    <Button variant="outline" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </Dialog>
            <AttachmentViewerModal isOpen={!!viewUrl} onClose={() => setViewUrl(null)} url={viewUrl} />
            {viewFile && (
                <BlobAttachmentViewer file={viewFile} onClose={() => setViewFile(null)} />
            )}
        </>
    );
}
