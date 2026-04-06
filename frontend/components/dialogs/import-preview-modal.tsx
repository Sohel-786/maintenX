"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    AlertCircle,
    Copy,
    Database,
    XCircle,
    Info,
    Loader2,
} from "lucide-react";
import { ValidationResult } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

interface ImportPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: ValidationResult | null;
    onConfirm: () => void;
    isLoading: boolean;
    title?: string;
}

type TabType = "valid" | "duplicates" | "alreadyExists" | "invalid";

export function ImportPreviewModal({
    isOpen,
    onClose,
    data,
    onConfirm,
    isLoading,
    title = "Import Preview",
}: ImportPreviewModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>("valid");

    // Reset to valid records tab whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setActiveTab("valid");
        }
    }, [isOpen]);

    if (!data) return null;

    const tabs: { id: TabType; label: string; count: number; icon: any; color: string }[] = [
        {
            id: "valid",
            label: "Valid Records",
            count: data.valid.length,
            icon: CheckCircle2,
            color: "text-green-600",
        },
        {
            id: "duplicates",
            label: "Duplicates (File)",
            count: data.duplicates.length,
            icon: Copy,
            color: "text-amber-600",
        },
        {
            id: "alreadyExists",
            label: "Already Exists",
            count: data.alreadyExists.length,
            icon: Database,
            color: "text-blue-600",
        },
        {
            id: "invalid",
            label: "Invalid Records",
            count: data.invalid.length,
            icon: XCircle,
            color: "text-red-600",
        },
    ];

    const getRecordsForTab = () => {
        switch (activeTab) {
            case "valid":
                return data.valid;
            case "duplicates":
                return data.duplicates;
            case "alreadyExists":
                return data.alreadyExists;
            case "invalid":
                return data.invalid;
            default:
                return [];
        }
    };

    const records = getRecordsForTab();

    return (
        <Dialog isOpen={isOpen} onClose={onClose} title={title} size="full">
            <div className="flex flex-col h-[80vh]">
                {/* Tabs Header */}
                <div className="flex border-b border-secondary-200 mb-4 overflow-x-auto scrollbar-hide">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id
                                ? `border-primary-500 bg-primary-50/50 ${tab.color} font-semibold`
                                : "border-transparent text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50/50"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                            <span
                                className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${activeTab === tab.id
                                    ? "bg-primary-100 text-primary-700"
                                    : "bg-secondary-100 text-secondary-600"
                                    }`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-auto bg-secondary-50/30 rounded-lg border border-secondary-200">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.2 }}
                            className="p-1"
                        >
                            {records.length > 0 ? (
                                <div className="overflow-x-auto overflow-y-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 bg-white border-b border-secondary-200 shadow-sm z-10">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold text-secondary-900 w-16">Row</th>
                                                {records[0].data != null &&
                                                typeof records[0].data === "object" &&
                                                !Array.isArray(records[0].data)
                                                    ? Object.keys(records[0].data as Record<string, unknown>).map((key) => (
                                                          <th key={key} className="px-4 py-3 font-semibold text-secondary-900 capitalize">
                                                              {key.replace(/([A-Z])/g, " $1")}
                                                          </th>
                                                      ))
                                                    : null}
                                                {(activeTab === "invalid" || activeTab === "duplicates" || activeTab === "alreadyExists") && (
                                                    <th className="px-4 py-3 font-semibold text-secondary-900">Message</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white">
                                            {records.map((entry, idx) => (
                                                <tr
                                                    key={idx}
                                                    className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors"
                                                >
                                                    <td className="px-4 py-3 text-secondary-500">{entry.row}</td>
                                                    {entry.data != null &&
                                                    typeof entry.data === "object" &&
                                                    !Array.isArray(entry.data)
                                                        ? Object.values(entry.data as Record<string, unknown>).map((val, vIdx) => (
                                                              <td key={vIdx} className="px-4 py-3 text-secondary-700">
                                                                  {typeof val === "boolean"
                                                                      ? val
                                                                          ? "Yes"
                                                                          : "No"
                                                                      : String(val ?? "—")}
                                                              </td>
                                                          ))
                                                        : null}
                                                    {(activeTab === "invalid" || activeTab === "duplicates" || activeTab === "alreadyExists") && (
                                                        <td className="px-4 py-3 text-red-600 italic flex items-center gap-1.5 font-medium">
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            {entry.message}
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-secondary-400">
                                    {data.valid.length + data.duplicates.length + data.alreadyExists.length + data.invalid.length === 0 ? (
                                        <div className="text-center px-6">
                                            <XCircle className="w-16 h-16 mb-4 mx-auto text-red-400 opacity-50" />
                                            <h3 className="text-xl font-bold text-red-600 mb-2">Invalid Excel File</h3>
                                            <p className="text-secondary-600 max-w-md font-medium">
                                                The imported file doesn't seem to be a valid excel file or is missing required columns.
                                                Please check the file structure and try again.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <Info className="w-12 h-12 mb-3 opacity-20" />
                                            <p className="text-lg font-medium">No records found in this category</p>
                                        </>
                                    )}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border border-secondary-200 shadow-sm">
                    <div className="text-sm text-secondary-600 font-medium">
                        Total rows in file: <span className="font-bold text-secondary-900">{data.totalRows}</span>
                        <span className="mx-2 text-secondary-300">|</span>
                        To be imported: <span className="font-bold text-green-600">{data.valid.length}</span>
                    </div>
                    <div className="flex gap-3 w-full sm:w-auto">
                        <Button variant="ghost" onClick={onClose} className="flex-1 sm:flex-initial rounded-xl hover:bg-secondary-50">
                            Cancel
                        </Button>
                        <Button
                            onClick={onConfirm}
                            disabled={data.valid.length === 0 || isLoading}
                            className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-lg shadow-green-600/20 active:scale-95 transition-all"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Process Import ({data.valid.length})
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </Dialog>
    );
}
