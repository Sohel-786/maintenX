"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Users, UserPlus, Shield,
    Search, MoreVertical, ShieldCheck, ShieldAlert,
    Trash2, Edit3, Key, Mail, Phone, Lock,
    Database, Activity, ChevronRight, UserCheck
} from "lucide-react";
import api from "@/lib/api";
import { User, Role } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";
import { toast } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { UserDialog } from "@/components/users/user-dialog";
import { PermissionDialog } from "@/components/users/permission-dialog";

export default function UsersPage() {
    const [search, setSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
    const queryClient = useQueryClient();

    const { data: users = [], isLoading } = useQuery<User[]>({
        queryKey: ["users"],
        queryFn: async () => {
            const res = await api.get("/users");
            return res.data.data;
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => api.delete(`/users/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            toast.success("Identity revoked successfully");
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Purge failed")
    });

    const handleEdit = (user: User) => {
        setSelectedUser(user);
        setIsUserDialogOpen(true);
    };

    const handlePermissions = (user: User) => {
        setSelectedUser(user);
        setIsPermissionDialogOpen(true);
    };

    const filteredUsers = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return users;
        return users.filter(u =>
            u.username.toLowerCase().includes(q) ||
            u.firstName.toLowerCase().includes(q) ||
            u.lastName.toLowerCase().includes(q)
        );
    }, [users, search]);

    return (
        <div className="p-6 space-y-6">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-secondary-900 dark:text-foreground tracking-tight mb-2">Access Management</h1>
                        <p className="text-secondary-500 dark:text-secondary-400 font-medium">Govern system identities and granular permissions</p>
                    </div>
                    <Button
                        onClick={() => { setSelectedUser(null); setIsUserDialogOpen(true); }}
                        className="bg-primary-600 hover:bg-primary-700 text-white shadow-md font-bold"
                    >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add User
                    </Button>
                </div>

                <Card className="shadow-sm border-secondary-200 dark:border-border bg-white dark:bg-card mb-6">
                    <div className="p-4 flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary-400" />
                            <Input
                                placeholder="Search by name, username, or role..."
                                className="pl-9 h-10 border-secondary-200 dark:border-border focus:ring-primary-500 text-sm bg-white dark:bg-secondary-900"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </Card>

                <Card className="shadow-sm border-secondary-200 dark:border-border overflow-hidden bg-white dark:bg-card">
                    <div className="px-6 py-4 border-b border-secondary-100 dark:border-border">
                        <h3 className="text-lg font-bold text-secondary-900 dark:text-foreground">
                            Authorized Personnel ({filteredUsers.length})
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-primary-200 dark:border-primary-800 bg-primary-100 dark:bg-primary-900/40 text-primary-900 dark:text-primary-200">
                                    <th className="px-4 py-3 font-semibold w-16 text-center border-r border-primary-200/50 dark:border-primary-800/50">Sr.No</th>
                                    <th className="px-4 py-3 font-semibold">Name</th>
                                    <th className="px-4 py-3 font-semibold">System Role</th>
                                    <th className="px-4 py-3 font-semibold">Contact</th>
                                    <th className="px-4 py-3 font-semibold text-center">Status</th>
                                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence mode="wait">
                                    {isLoading ? (
                                        <tr className="border-0 hover:bg-transparent">
                                            <td colSpan={6} className="h-64 text-center border-0">
                                                <div className="flex flex-col items-center justify-center gap-3">
                                                    <div className="w-8 h-8 border-4 border-primary-200 dark:border-primary-800 border-t-primary-600 dark:border-t-primary-400 rounded-full animate-spin" />
                                                    <p className="text-xs font-medium text-secondary-400 dark:text-secondary-500 uppercase tracking-widest">Loading...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length > 0 ? (
                                        filteredUsers.map((user, idx) => (
                                            <motion.tr
                                                key={user.id}
                                                initial={{ opacity: 0, y: 4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ delay: idx * 0.02, duration: 0.2 }}
                                                className="border-b border-secondary-100 dark:border-border hover:bg-primary-50/30 dark:hover:bg-primary-900/10 transition-colors group"
                                            >
                                                <td className="px-4 py-3 text-secondary-500 dark:text-secondary-400 font-medium text-center">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-lg bg-secondary-900 dark:bg-secondary-800 flex items-center justify-center text-white shadow-sm overflow-hidden border border-secondary-800 dark:border-secondary-700 shrink-0">
                                                            {user.avatar ? (
                                                                <img src={user.avatar} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-[10px] font-black tracking-widest">{user.firstName[0]}{user.lastName[0]}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-secondary-900 dark:text-secondary-100 group-hover:text-primary-700 dark:group-hover:text-primary-400 transition-colors uppercase tracking-tight leading-none mb-1">
                                                                {user.firstName} {user.lastName}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-secondary-400 dark:text-secondary-500 uppercase tracking-widest">@{user.username}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                                            user.role === Role.ADMIN
                                                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-500 dark:border-rose-800/50"
                                                                : user.role === Role.COORDINATOR
                                                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/50"
                                                                  : user.role === Role.HANDLER
                                                                    ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/50"
                                                                    : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-500 dark:border-emerald-800/50"
                                                        }`}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Phone className="w-3.5 h-3.5 text-primary-500" />
                                                        <span className="text-xs font-bold text-secondary-600 dark:text-secondary-400 uppercase">{user.mobileNumber || "No Contact"}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${user.isActive ? 'bg-green-50 text-green-700 border-green-200 dark:bg-emerald-950/20 dark:text-emerald-500 dark:border-emerald-800/50' : 'bg-red-50 text-red-700 border-red-200 dark:bg-rose-950/20 dark:text-rose-500 dark:border-rose-800/50'}`}>
                                                        {user.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handlePermissions(user)}
                                                            className="h-8 w-8 p-0 text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 hover:border-amber-100 dark:hover:border-amber-900/50 rounded-lg transition-all"
                                                            title="Permissions"
                                                        >
                                                            <Shield className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleEdit(user)}
                                                            className="h-8 w-8 p-0 text-secondary-500 dark:text-secondary-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:border-primary-100 dark:hover:border-primary-900/50 rounded-lg transition-all"
                                                            title="Edit"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </Button>
                                                        {user.username.toLowerCase() !== 'qc_admin' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    if (confirm(`Confirm deactivation of @${user.username}?`)) {
                                                                        deleteMutation.mutate(user.id);
                                                                    }
                                                                }}
                                                                className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-100 dark:hover:border-rose-900/50 rounded-lg transition-all"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-secondary-500 dark:text-secondary-400 italic">
                                                No users found matching your criteria.
                                            </td>
                                        </tr>
                                    )}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </Card>
            </motion.div>

            <UserDialog
                isOpen={isUserDialogOpen}
                onClose={() => { setIsUserDialogOpen(false); setSelectedUser(null); }}
                user={selectedUser}
            />

            {selectedUser && (
                <PermissionDialog
                    isOpen={isPermissionDialogOpen}
                    onClose={() => { setIsPermissionDialogOpen(false); setSelectedUser(null); }}
                    userId={selectedUser.id}
                    userName={selectedUser.username}
                />
            )}
        </div>
    );
}
