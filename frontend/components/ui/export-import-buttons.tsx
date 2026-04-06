"use client";

import { Download, Upload, Loader2 } from "lucide-react";
import { useRef } from "react";

interface ExportImportButtonsProps {
    /** Called when Export is clicked */
    onExport: () => void;
    /** Called with the selected File when Import file is chosen */
    onImport: (file: File) => void;
    exportLoading?: boolean;
    importLoading?: boolean;
    showExport?: boolean;
    showImport?: boolean;
    /** Unique ID suffix for the hidden file input, e.g. "parties" */
    inputId: string;
    accept?: string;
}

export function ExportImportButtons({
    onExport,
    onImport,
    exportLoading = false,
    importLoading = false,
    showExport = true,
    showImport = true,
    inputId,
    accept = ".xlsx,.xls",
}: ExportImportButtonsProps) {
    const fileRef = useRef<HTMLInputElement>(null);

    return (
        <>
            {/* Hidden file input */}
            {showImport && (
                <input
                    ref={fileRef}
                    type="file"
                    id={`import-${inputId}`}
                    className="hidden"
                    accept={accept}
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onImport(file);
                        e.target.value = "";
                    }}
                />
            )}

            {/* Export Button */}
            {showExport && (
                <button
                    type="button"
                    onClick={onExport}
                    disabled={exportLoading}
                    className={`
          inline-flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold
          transition-all duration-200 select-none
          ${exportLoading
                        ? "border-emerald-300 bg-emerald-50 text-emerald-600 cursor-not-allowed opacity-80"
                        : "border-secondary-200 bg-white text-secondary-700 shadow-sm hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-md active:scale-95"
                    }
        `}
                    title="Export to Excel"
                >
                    {exportLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Exporting…
                        </>
                    ) : (
                        <>
                            <Download className="w-4 h-4" />
                            Export
                        </>
                    )}
                </button>
            )}

            {/* Import Button */}
            {showImport && (
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={importLoading}
                    className={`
          inline-flex items-center gap-2 h-10 px-4 rounded-md border text-sm font-semibold
          transition-all duration-200 select-none
          ${importLoading
                        ? "border-violet-300 bg-violet-50 text-violet-600 cursor-not-allowed opacity-80"
                        : "border-secondary-200 bg-white text-secondary-700 shadow-sm hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 hover:shadow-md active:scale-95"
                    }
        `}
                    title="Import from Excel"
                >
                    {importLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Importing…
                        </>
                    ) : (
                        <>
                            <Upload className="w-4 h-4" />
                            Import
                        </>
                    )}
                </button>
            )}
        </>
    );
}
