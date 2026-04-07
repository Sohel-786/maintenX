"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ComplaintCategory } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Edit2, Ban, CheckCircle, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { Dialog } from "@/components/ui/dialog";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { AccessDenied } from "@/components/ui/access-denied";
import { PageSizeSelect } from "@/components/ui/page-size-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGINATION_VISIBLE_THRESHOLD } from "@/lib/pagination";
import { Label } from "@/components/ui/label";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";

export default function CategoriesPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const canManage = permissions?.manageCategories ?? false;
  const canAdd = canManage && (permissions?.addMaster ?? false);
  const canEdit = canManage && (permissions?.editMaster ?? false);

  if (permissions && !permissions.manageCategories) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<ComplaintCategory | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput, 400);
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [inactiveTarget, setInactiveTarget] = useState<ComplaintCategory | null>(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  const hasActiveFilters = search.trim() !== "" || activeFilter !== "all";

  const { data, isLoading } = useQuery({
    queryKey: ["complaint-categories", "paged", search, activeFilter, page, pageSize],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        pageSize,
        includeInactive: true,
      };
      if (search.trim()) params.search = search.trim();
      if (activeFilter === "active") params.isActive = true;
      if (activeFilter === "inactive") params.isActive = false;
      const res = await api.get("/complaint-categories", { params });
      return {
        list: (res.data?.data ?? []) as ComplaintCategory[],
        total: res.data?.totalCount ?? 0,
      };
    },
    enabled: !!permissions?.manageCategories,
  });

  const rows = data?.list ?? [];
  const totalCount = data?.total ?? 0;

  const createMut = useMutation({
    mutationFn: (name: string) => api.post("/complaint-categories", { name: name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaint-categories"] });
      toast.success("Category added");
      setDialogOpen(false);
      setNameDraft("");
      setEditItem(null);
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.patch(`/complaint-categories/${id}`, { name: name.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaint-categories"] });
      toast.success("Category updated");
      setDialogOpen(false);
      setEditItem(null);
      setNameDraft("");
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed"),
  });

  const toggleMut = useMutation({
    mutationFn: (id: number) => api.patch(`/complaint-categories/${id}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["complaint-categories"] });
      setInactiveTarget(null);
      toast.success("Status updated");
    },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } }).response?.data?.message || "Failed"),
  });

  const openAdd = () => {
    setEditItem(null);
    setNameDraft("");
    setDialogOpen(true);
  };

  const openEdit = (c: ComplaintCategory) => {
    setEditItem(c);
    setNameDraft(c.name);
    setDialogOpen(true);
  };

  const toggleRow = (c: ComplaintCategory) => {
    if (c.isActive) setInactiveTarget(c);
    else toggleMut.mutate(c.id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight text-secondary-900">Ticket categories</h1>
          <p className="font-medium text-secondary-500">Categories for the currently selected location (maintenance ticket types).</p>
        </div>
        {canAdd && (
          <Button onClick={openAdd} className="bg-primary-600 font-bold text-white shadow-md hover:bg-primary-700">
            <Plus className="mr-2 h-4 w-4" />
            Add category
          </Button>
        )}
      </div>

      <Card className="mb-6 border-secondary-200 bg-white shadow-sm">
        <div className="flex flex-col flex-wrap gap-4 p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 flex-col">
            <label className={filterLabelClass}>Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
              <Input
                placeholder="Search by name…"
                className="h-10 border-secondary-200 pl-9 text-sm focus:ring-primary-500"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className={filterLabelClass}>Status</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
              className="flex h-10 w-full rounded-md border border-secondary-200 bg-white px-3 py-2 text-sm sm:w-40"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="w-20 max-w-[5.5rem] shrink-0">
            <label className={filterLabelClass}>Rows</label>
            <PageSizeSelect value={pageSize} onChange={(v) => { setPageSize(v); setPage(1); }} />
          </div>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => { setSearchInput(""); setActiveFilter("all"); setPage(1); }}
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden border-secondary-200 bg-white shadow-sm">
        <div className="border-b border-secondary-100 px-6 py-4">
          <h3 className="text-lg font-bold text-secondary-900">All categories ({totalCount})</h3>
        </div>
        <div className="table-container overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm">
            <thead>
              <tr className="border-b border-primary-200 bg-primary-100 text-primary-900 dark:border-primary-800 dark:bg-primary-900/40 dark:text-primary-200">
                <th className="w-16 border-r border-primary-200/50 px-4 py-3 text-center font-semibold">Sr.</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
                      <span className="text-xs uppercase tracking-widest text-secondary-400">Loading…</span>
                    </div>
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((c, idx) => (
                  <tr key={c.id} className="border-b border-secondary-100 transition-colors hover:bg-primary-50/30">
                    <td className="px-4 py-3 text-center text-secondary-500">{totalCount - (page - 1) * pageSize - idx}</td>
                    <td className="px-4 py-3 font-semibold text-secondary-900">{c.name}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          c.isActive
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {c.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {canManage && (
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openEdit(c)} disabled={!canEdit}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => toggleRow(c)}
                            title={c.isActive ? "Deactivate" : "Activate"}
                          >
                            {c.isActive ? <Ban className="h-4 w-4 text-amber-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center italic text-secondary-500">
                    No categories match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {totalCount > PAGINATION_VISIBLE_THRESHOLD && (
            <TablePagination page={page} pageSize={pageSize} totalCount={totalCount} onPageChange={setPage} />
          )}
        </div>
      </Card>

      <Dialog
        isOpen={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditItem(null); setNameDraft(""); }}
        title={editItem ? "Edit category" : "Add category"}
        size="sm"
      >
        <form
          className="space-y-4 p-1"
          onSubmit={(e) => {
            e.preventDefault();
            if (!nameDraft.trim() || createMut.isPending || updateMut.isPending) return;
            if (editItem) updateMut.mutate({ id: editItem.id, name: nameDraft });
            else createMut.mutate(nameDraft);
          }}
        >
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              className="mt-1"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="e.g. Electrical, HVAC"
              autoFocus
            />
            {!nameDraft.trim() && (
              <p className="mt-1 text-xs text-red-600 font-medium">Name is required</p>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={!nameDraft.trim() || createMut.isPending || updateMut.isPending}
            >
              Save
            </Button>
            <Button variant="outline" type="button" className="flex-1" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={!!inactiveTarget} onClose={() => setInactiveTarget(null)} title="Deactivate category" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-secondary-600">
            Deactivate <span className="font-semibold text-secondary-900">{inactiveTarget?.name}</span>? It will be hidden from new tickets.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setInactiveTarget(null)}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={toggleMut.isPending}
              onClick={() => inactiveTarget && toggleMut.mutate(inactiveTarget.id)}
            >
              Deactivate
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
