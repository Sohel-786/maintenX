"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  Save,
  X,
  LayoutDashboard,
  Settings,
  AlertTriangle,
  Building2,
  MapPin,
  Plus,
  Edit,
  ClipboardList,
  UserPlus,
  ListChecks,
  Wrench,
  Tags,
  Layers,
} from "lucide-react";
import api from "@/lib/api";
import { UserPermission } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";

interface PermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  userName: string;
}

const PermissionToggle = ({
  label,
  checked,
  onChange,
  icon: Icon,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}) => (
  <div className="group flex items-center justify-between p-6 rounded-[2rem] bg-secondary-50/50 dark:bg-secondary-900/10 hover:bg-white dark:hover:bg-secondary-800/50 border border-transparent hover:border-gray-100 dark:hover:border-secondary-800 transition-all hover:shadow-xl hover:shadow-black/5">
    <div className="flex items-center gap-4">
      <div
        className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${checked ? "bg-primary-600 text-white shadow-lg shadow-primary/30" : "bg-gray-100 dark:bg-secondary-800 text-gray-400 dark:text-secondary-400"}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="font-black text-gray-900 dark:text-white tracking-tight">{label}</p>
        {description && (
          <p className="text-[10px] font-bold text-gray-400 dark:text-secondary-500 uppercase tracking-widest">
            {description}
          </p>
        )}
      </div>
    </div>
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative w-16 h-8 rounded-full transition-all flex items-center px-1 ${checked ? "bg-primary-600" : "bg-gray-200 dark:bg-secondary-800"}`}
    >
      <motion.div
        animate={{ x: checked ? 32 : 0 }}
        className="h-6 w-6 rounded-full bg-white dark:bg-secondary-100 shadow-md shadow-black/10"
      />
    </button>
  </div>
);

export function PermissionDialog({ isOpen, onClose, userId, userName }: PermissionDialogProps) {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState<UserPermission | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["user-permissions", userId],
    queryFn: async () => {
      const res = await api.get(`/users/${userId}/permissions`);
      return res.data.data;
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (data) setPermissions(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: (data: UserPermission) => api.put(`/users/${userId}/permissions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions", userId] });
      queryClient.invalidateQueries({ queryKey: ["settings", "permissions", "me"] });
      queryClient.invalidateQueries({ queryKey: ["settings", "permissions", userId] });
      toast.success("Permissions saved.");
      onClose();
    },
    onError: (err: unknown) => {
      const m = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(m || "Failed to save permissions");
    },
  });

  const updatePermission = (key: keyof UserPermission, value: boolean) => {
    if (!permissions) return;
    setPermissions({ ...permissions, [key]: value });
  };

  if (!isOpen) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title=""
      hideHeader
      size="2xl"
      className="rounded-[4rem] bg-white dark:bg-secondary-950 border-none shadow-2xl overflow-hidden p-0"
    >
      <div className="flex flex-col h-[85vh] -m-6 bg-white dark:bg-secondary-950 overflow-hidden">
        <div className="bg-gray-900 p-12 shrink-0 relative">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-3xl bg-primary-500 flex items-center justify-center text-white shadow-2xl">
                <ShieldCheck className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight leading-none uppercase">Access control</h2>
                <p className="text-primary-200 font-bold text-sm tracking-widest mt-2">USER: @{userName}</p>
              </div>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-white/40 hover:text-white hover:bg-white/10 h-14 w-14 rounded-2xl">
              <X className="w-8 h-8" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
          {isLoading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-100 border-t-primary-500" />
              <p className="font-black text-gray-400 uppercase text-xs tracking-widest">Loading…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-full">
                <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4 mb-6">MaintenX</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PermissionToggle
                    label="Dashboard"
                    checked={permissions?.viewDashboard ?? false}
                    onChange={(v) => updatePermission("viewDashboard", v)}
                    icon={LayoutDashboard}
                  />
                  <PermissionToggle
                    label="View complaints"
                    checked={permissions?.viewComplaints ?? false}
                    onChange={(v) => updatePermission("viewComplaints", v)}
                    icon={ClipboardList}
                  />
                  <PermissionToggle
                    label="Raise complaints"
                    checked={permissions?.raiseComplaint ?? false}
                    onChange={(v) => updatePermission("raiseComplaint", v)}
                    icon={UserPlus}
                  />
                  <PermissionToggle
                    label="View all complaints"
                    checked={permissions?.viewAllComplaints ?? false}
                    onChange={(v) => updatePermission("viewAllComplaints", v)}
                    icon={ListChecks}
                  />
                  <PermissionToggle
                    label="Assign & status"
                    checked={permissions?.assignComplaints ?? false}
                    onChange={(v) => updatePermission("assignComplaints", v)}
                    icon={ShieldCheck}
                  />
                  <PermissionToggle
                    label="Handle work"
                    checked={permissions?.handleComplaints ?? false}
                    onChange={(v) => updatePermission("handleComplaints", v)}
                    icon={Wrench}
                  />
                  <PermissionToggle
                    label="Manage Categories"
                    checked={permissions?.manageCategories ?? false}
                    onChange={(v) => updatePermission("manageCategories", v)}
                    icon={Tags}
                  />
                  <PermissionToggle
                    label="Manage Departments"
                    checked={permissions?.manageDepartment ?? false}
                    onChange={(v) => updatePermission("manageDepartment", v)}
                    icon={Layers}
                  />
                </div>
              </div>

              <div className="col-span-full mt-6">
                <h3 className="text-xs font-black text-gray-300 uppercase tracking-[0.3em] border-b border-gray-50 pb-4 mb-6">Masters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <PermissionToggle label="View master" checked={permissions?.viewMaster ?? false} onChange={(v) => updatePermission("viewMaster", v)} icon={ClipboardList} />
                  <PermissionToggle label="Add master" checked={permissions?.addMaster ?? false} onChange={(v) => updatePermission("addMaster", v)} icon={Plus} />
                  <PermissionToggle label="Edit master" checked={permissions?.editMaster ?? false} onChange={(v) => updatePermission("editMaster", v)} icon={Edit} />
                  <PermissionToggle label="Import" checked={permissions?.importMaster ?? false} onChange={(v) => updatePermission("importMaster", v)} icon={Plus} />
                  <PermissionToggle label="Export" checked={permissions?.exportMaster ?? false} onChange={(v) => updatePermission("exportMaster", v)} icon={Plus} />
                  <PermissionToggle label="Company master" checked={permissions?.manageCompany ?? false} onChange={(v) => updatePermission("manageCompany", v)} icon={Building2} />
                  <PermissionToggle label="Location master" checked={permissions?.manageLocation ?? false} onChange={(v) => updatePermission("manageLocation", v)} icon={MapPin} />
                </div>
              </div>

              <div className="col-span-full mt-6">
                <h3 className="text-xs font-black text-rose-500/30 uppercase tracking-[0.3em] border-b border-rose-50 pb-4 mb-6">Administration</h3>
                <PermissionToggle
                  label="System settings"
                  checked={permissions?.accessSettings ?? false}
                  onChange={(v) => updatePermission("accessSettings", v)}
                  icon={Settings}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-12 shrink-0 border-t border-gray-50 flex justify-between items-center bg-secondary-50/10">
          <div className="flex items-center gap-3 text-amber-600 font-bold bg-amber-50 px-6 py-3 rounded-2xl border border-amber-100">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest">Changes apply on next navigation</span>
          </div>
          <div className="flex gap-4">
            <Button variant="ghost" onClick={onClose} className="h-16 px-8 rounded-[1.5rem] font-black text-gray-400">
              Cancel
            </Button>
            <Button
              onClick={() => permissions && mutation.mutate(permissions)}
              disabled={mutation.isPending || !permissions}
              className="h-16 px-12 rounded-[1.5rem] bg-gray-900 text-white font-black flex items-center gap-3"
            >
              <Save className="w-5 h-5" />
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
