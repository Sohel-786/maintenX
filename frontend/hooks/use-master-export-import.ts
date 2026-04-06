import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { ValidationResult } from "@/types";

export function useMasterExportImport(endpoint: string, queryKey: string[]) {
  const queryClient = useQueryClient();
  const [validationData, setValidationData] = useState<ValidationResult | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get(`/${endpoint}/export`, {
        responseType: "blob",
      });
      return res;
    },
    onSuccess: (res) => {
      const disposition = res.headers?.["content-disposition"];
      const match = disposition?.match(/filename="?([^";\n]+)"?/);
      const filename =
        match?.[1] ?? `${endpoint}-export-${new Date().toISOString().split("T")[0]}.xlsx`;
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Export failed.";
      toast.error(msg);
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (file: File) => {
      setLastFile(file);
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/${endpoint}/validate`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data?.data as ValidationResult;
    },
    onSuccess: (data) => {
      setValidationData(data);
      setIsPreviewOpen(true);
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Validation failed.";
      toast.error(msg);
    },
  });

  const importMutation = useMutation({
    mutationFn: async () => {
      if (!lastFile) throw new Error("No file selected");
      const formData = new FormData();
      formData.append("file", lastFile);
      const res = await api.post(`/${endpoint}/import`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data?.data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey });
      const imported = data.imported ?? 0;
      const totalRows = data.totalRows ?? 0;
      toast.success(
        imported === totalRows
          ? `Successfully imported all ${imported} records.`
          : `Imported ${imported} from ${totalRows} records.`
      );
      setIsPreviewOpen(false);
      setValidationData(null);
      setLastFile(null);
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Import failed.";
      toast.error(msg);
    },
  });

  const closePreview = () => {
    setIsPreviewOpen(false);
    setValidationData(null);
    setLastFile(null);
  };

  return {
    handleExport: () => exportMutation.mutate(),
    handleImport: (file: File) => validateMutation.mutate(file),
    confirmImport: () => importMutation.mutate(),
    exportLoading: exportMutation.isPending,
    importLoading: validateMutation.isPending || importMutation.isPending,
    validationData,
    isPreviewOpen,
    setIsPreviewOpen,
    closePreview,
  };
}
