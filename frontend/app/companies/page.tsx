"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Company } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit2, Ban, CheckCircle, X } from "lucide-react";
import { ExportImportButtons } from "@/components/ui/export-import-buttons";
import { toast } from "react-hot-toast";
import { CompanyDialog, type CompanyFormValues } from "@/components/masters/company-dialog";
import { useMasterExportImport } from "@/hooks/use-master-export-import";
import { ImportPreviewModal } from "@/components/dialogs/import-preview-modal";
import { Dialog } from "@/components/ui/dialog";
import { useCurrentUserPermissions, useAppSettings } from "@/hooks/use-settings";
import { AccessDenied } from "@/components/ui/access-denied";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGINATION_VISIBLE_THRESHOLD } from "@/lib/pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";

export default function CompaniesPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const canManage = permissions?.manageCompany ?? false;
  const canAdd = canManage && (permissions?.addMaster ?? false);
  const canEdit = canManage && (permissions?.editMaster ?? false);
  const canExport = canManage && (permissions?.exportMaster ?? false);
  const canImport = canManage && (permissions?.importMaster ?? false);

  if (permissions && !permissions.viewMaster) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Company | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 400);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [dialogKey, setDialogKey] = useState(0);
  const [inactiveTarget, setInactiveTarget] = useState<Company | null>(null);

  const queryClient = useQueryClient();
  const {
    handleExport,
    handleImport,
    confirmImport,
    closePreview,
    exportLoading,
    importLoading,
    isPreviewOpen,
    validationData,
  } = useMasterExportImport("companies", ["companies"]);

  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  const hasActiveFilters = search.trim() !== "" || activeFilter !== "all";

  const { data: companiesData, isLoading } = useQuery<{ list: Company[]; totalCount: number }>({
    queryKey: ["companies", search, activeFilter, page, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = { page, pageSize };
      if (search.trim()) params.search = search.trim();
      if (activeFilter === "active") params.isActive = true;
      if (activeFilter === "inactive") params.isActive = false;
      const res = await api.get("/companies", { params });
      return { list: res.data?.data ?? [], totalCount: res.data?.totalCount ?? 0 };
    },
  });
  const companies = companiesData?.list ?? [];
  const totalCount = companiesData?.totalCount ?? 0;

  const createMutation = useMutation({
    mutationFn: (data: CompanyFormValues) =>
      api.post("/companies", {
        name: data.name.trim(),
        logoUrl: data.logoUrl?.trim() || undefined,
        themeColor: data.themeColor,
        isActive: data.isActive,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company registered successfully");
      setSelectedItem(null);
      setDialogKey(prev => prev + 1); // Reset for next entry
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Registration failed")
  });

  const updateMutation = useMutation({
    mutationFn: (data: CompanyFormValues) =>
      api.put(`/companies/${selectedItem!.id}`, {
        name: data.name.trim(),
        logoUrl: data.logoUrl?.trim() ?? "",
        themeColor: data.themeColor,
        isActive: data.isActive,
      }),
    onSuccess: () => {
      const updatedId = selectedItem?.id;
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      if (updatedId) {
        queryClient.invalidateQueries({ queryKey: ["companies", updatedId] });

        // If the updated company is the currently selected one, trigger a theme refresh
        const selRaw = localStorage.getItem("selectedOrgContext");
        if (selRaw) {
          try {
            const sel = JSON.parse(selRaw);
            if (sel?.companyId === updatedId) {
              window.dispatchEvent(new CustomEvent("orgContextChanged", { detail: sel }));
            }
          } catch (e) { }
        }
      }
      toast.success("Details updated successfully");
      setIsDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.put(`/companies/${id}`, { isActive }),
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      setInactiveTarget(null);
      toast.success(isActive ? "Company activated" : "Company deactivated");
    },
    onError: (err: any) => toast.error(err.response?.data?.message || "Update failed")
  });

  const handleEdit = (item: Company) => {
    setSelectedItem(item);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setIsDialogOpen(true);
  };

  const toggleStatus = (item: Company) => {
    if (item.isActive) {
      setInactiveTarget(item);
    } else {
      toggleActiveMutation.mutate({ id: item.id, isActive: true });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-secondary-900 tracking-tight mb-2">Company Master</h1>
          <p className="text-secondary-500 font-medium">Manage master data for various companies</p>
        </div>
        <div className="flex items-center gap-2">
          {(canExport || canImport) && (
            <ExportImportButtons
              onExport={handleExport}
              onImport={handleImport}
              exportLoading={exportLoading}
              importLoading={importLoading}
              inputId="companies"
              showExport={canExport}
              showImport={canImport}
            />
          )}
          {canAdd && (
            <Button
              onClick={handleAdd}
              className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Company
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm border-secondary-200 bg-white mb-6">
        <div className="p-4 flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap">
          <div className="flex flex-col flex-1 min-w-0">
            <label className={filterLabelClass}>Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
              <Input
                placeholder="Search by company name…"
                className="pl-9 h-10 border-secondary-200 focus:ring-primary-500 text-sm"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col">
              <label className={filterLabelClass}>Status</label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="flex h-10 w-full sm:w-40 rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 transition-all appearance-none cursor-pointer pr-8"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="w-20 shrink-0 max-w-[5.5rem]">
              <label className={filterLabelClass}>Rows</label>
              <PageSizeSelect value={pageSize} onChange={(v) => { setPageSize(v); setPage(1); }} />
            </div>
            {hasActiveFilters && (
              <div className="flex flex-col justify-end">
                <span className={`${filterLabelClass} invisible`}>Clear</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => { setSearchInput(""); setActiveFilter("all"); setPage(1); }}
                  className="h-10 px-4 text-xs font-medium rounded-lg whitespace-nowrap border-secondary-300 text-secondary-700 hover:bg-secondary-50 hover:border-secondary-400"
                >
                  <X className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  Clear Filter
                </Button>
              </div>
            )}
          </div>
        </div>
      </Card>

      <Card className="shadow-sm border-secondary-200 overflow-hidden bg-white">
        <div className="px-6 py-4 border-b border-secondary-100">
          <h3 className="text-lg font-bold text-secondary-900">
            All Companies ({totalCount})
          </h3>
        </div>
        <div className="table-container">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-primary-200 dark:border-primary-800 bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:text-primary-200">
                <th className="px-4 py-3 font-semibold w-16 text-center border-r border-primary-200/50 dark:border-primary-800/50">Sr.No</th>
                <th className="px-4 py-3 font-semibold w-20">Logo</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Brand</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr className="border-0 hover:bg-transparent">
                  <td colSpan={6} className="h-64 text-center border-0">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin" />
                      <p className="text-xs font-medium text-secondary-400 dark:text-secondary-500 uppercase tracking-widest">Loading...</p>
                    </div>
                  </td>
                </tr>
              ) : companies.length > 0 ? (
                companies.map((company, idx) => (
                  <tr
                    key={company.id}
                    className="border-b border-secondary-100 hover:bg-primary-50/30 transition-colors group"
                  >
                    <td className="px-4 py-3 text-secondary-500 font-medium text-center">{totalCount - (page - 1) * pageSize - idx}</td>
                    <td className="px-4 py-3">
                      {company.logoUrl ? (
                        <img
                          src={
                            company.logoUrl.startsWith("http")
                              ? company.logoUrl
                              : company.logoUrl.startsWith("/")
                                ? company.logoUrl
                                : `/${company.logoUrl}`
                          }
                          alt=""
                          className="h-10 w-10 rounded-lg border border-border object-contain bg-white"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                          —
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-bold text-secondary-900 tracking-tight">{company.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-8 w-8 rounded-md border border-border shadow-sm"
                          style={{ backgroundColor: company.themeColor || "#0d6efd" }}
                          title={company.themeColor || "#0d6efd"}
                        />
                        <span className="font-mono text-xs text-secondary-600">{company.themeColor || "#0d6efd"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${company.isActive
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                        {company.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(company)}
                            className="h-8 w-8 p-0 text-secondary-500 hover:text-primary-600 hover:bg-white border border-transparent hover:border-primary-100 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(company)}
                            className={`h-8 w-8 p-0 border border-transparent rounded-lg transition-all ${company.isActive
                              ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-100'
                              : 'text-green-500 hover:text-green-600 hover:bg-green-50 hover:border-green-100'
                              }`}
                            title={company.isActive ? "Deactivate" : "Activate"}
                          >
                            {company.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-secondary-500 italic">
                    No companies found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalCount > PAGINATION_VISIBLE_THRESHOLD && (
            <TablePagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
            />
          )}
        </div>
      </Card>

      <CompanyDialog
        key={dialogKey}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onSubmit={(data) => (selectedItem ? updateMutation.mutate(data) : createMutation.mutate(data))}
        isLoading={createMutation.isPending || updateMutation.isPending}
        readOnly={!!selectedItem && !canEdit}
      />

      <Dialog
        isOpen={!!inactiveTarget}
        onClose={() => setInactiveTarget(null)}
        title="Confirm Deactivation"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-secondary-600">
            Are you sure you want to deactivate <span className="font-bold text-secondary-900">{inactiveTarget?.name}</span>?
            This company will no longer appear in new master or transaction entries.
          </p>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setInactiveTarget(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-bold"
              onClick={() => inactiveTarget && toggleActiveMutation.mutate({ id: inactiveTarget.id, isActive: false })}
              disabled={toggleActiveMutation.isPending}
            >
              {toggleActiveMutation.isPending ? "Deactivating..." : "Deactivate"}
            </Button>
          </div>
        </div>
      </Dialog>

      <ImportPreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        data={validationData}
        onConfirm={confirmImport}
        isLoading={importLoading}
        title="Import Companies Preview"
      />
    </div>
  );
}
