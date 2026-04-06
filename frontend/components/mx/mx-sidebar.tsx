"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Role } from "@/types";
import type { UserPermission } from "@/types";
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  List,
  UserPlus,
  CheckCircle,
  Wrench,
  Tags,
  Building2,
  MapPin,
  Users,
  Settings,
  Layers,
} from "lucide-react";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number };

export function MxSidebar({
  role,
  permissions,
  openAssignCount,
  pendingCloseCount,
}: {
  role: Role;
  permissions: UserPermission | null | undefined;
  openAssignCount?: number;
  pendingCloseCount?: number;
}) {
  const pathname = usePathname();

  const primary: Item[] = [];
  if (permissions?.viewDashboard) primary.push({ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard });
  if (role === Role.EMPLOYEE && permissions?.viewComplaints) {
    primary.push({ href: "/my-tickets", label: "My tickets", icon: ClipboardList });
  }
  if (role === Role.EMPLOYEE && permissions?.raiseComplaint) {
    primary.push({ href: "/dashboard?raise=1", label: "Raise ticket", icon: PlusCircle });
  }
  const canSeeAllTickets =
    !!permissions?.viewComplaints &&
    (permissions.viewAllComplaints || role === Role.COORDINATOR || role === Role.ADMIN) &&
    role !== Role.EMPLOYEE;
  if (canSeeAllTickets) {
    primary.push({ href: "/all-tickets", label: "All tickets", icon: List });
  }
  if (permissions?.assignComplaints) {
    primary.push({
      href: "/assign-work",
      label: "Assign work",
      icon: UserPlus,
      badge: openAssignCount && openAssignCount > 0 ? openAssignCount : undefined,
    });
    primary.push({
      href: "/close-tickets",
      label: "Close tickets",
      icon: CheckCircle,
      badge: pendingCloseCount && pendingCloseCount > 0 ? pendingCloseCount : undefined,
    });
  }
  if (permissions?.handleComplaints && (role === Role.HANDLER || role === Role.ADMIN)) {
    primary.push({ href: "/my-work", label: "My work queue", icon: Wrench });
  }

  const master: Item[] = [];
  const showMaster =
    !!permissions?.viewMaster && (permissions.manageCompany || permissions.manageLocation);
  if (showMaster && permissions.manageCompany) {
    master.push({ href: "/companies", label: "Companies", icon: Building2 });
  }
  if (showMaster && permissions.manageLocation) {
    master.push({ href: "/locations", label: "Locations", icon: MapPin });
  }
  if (permissions?.manageCategories) {
    master.push({ href: "/categories", label: "Categories", icon: Tags });
    master.push({ href: "/departments", label: "Departments", icon: Layers });
  }

  const admin: Item[] = [];
  if (permissions?.accessSettings) admin.push({ href: "/users", label: "Users", icon: Users });
  if (permissions?.accessSettings) admin.push({ href: "/settings", label: "Settings", icon: Settings });

  const linkClass = (href: string) => {
    const active = pathname === href || pathname.startsWith(`${href}/`);
    return (
      "mx-nav-item flex items-center gap-2.5 rounded-lg border border-transparent px-3 py-2.5 text-[13px] transition-colors " +
      (active
        ? "border-white/[0.08] bg-white/10 text-white"
        : "text-[#90a9cc] hover:bg-white/[0.06] hover:text-white")
    );
  };

  const renderItems = (items: Item[]) =>
    items.map((item) => {
      const Icon = item.icon;
      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return (
        <Link key={item.href} href={item.href} className={linkClass(item.href)}>
          <Icon className={`h-[15px] w-[15px] shrink-0 ${active ? "text-[var(--mx-gold)]" : ""}`} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge != null && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{ background: "var(--mx-gold)", color: "var(--mx-navy-900)" }}
            >
              {item.badge}
            </span>
          )}
        </Link>
      );
    });

  return (
    <aside
      className="mx-sidebar flex w-[230px] shrink-0 flex-col overflow-y-auto py-4 pl-3 pr-2"
      style={{ background: "var(--mx-navy-800)", top: 62, height: "calc(100vh - 62px)" }}
    >
      <div className="px-2.5 pb-2 text-[9px] font-bold uppercase tracking-[1.2px] text-[#2d518f]">Navigation</div>
      <nav className="flex flex-col gap-0.5">{renderItems(primary)}</nav>

      {master.length > 0 && (
        <>
          <div className="mb-1 mt-5 px-2.5 text-[9px] font-bold uppercase tracking-[1.2px] text-[#2d518f]">
            Master entry
          </div>
          <nav className="flex flex-col gap-0.5">{renderItems(master)}</nav>
        </>
      )}

      {admin.length > 0 && (
        <>
          <div className="mb-1 mt-5 px-2.5 text-[9px] font-bold uppercase tracking-[1.2px] text-[#2d518f]">Administration</div>
          <nav className="flex flex-col gap-0.5">{renderItems(admin)}</nav>
        </>
      )}

      <div className="mt-auto border-t border-white/[0.08] px-2 py-3 text-center text-[11px] text-[#2d518f]">
        MaintenX Facility Portal
      </div>
    </aside>
  );
}
