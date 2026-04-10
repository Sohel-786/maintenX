"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Role } from "@/types";
import type { UserPermission } from "@/types";
import { useAppSettings } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import { useLogout } from "@/hooks/use-auth-mutations";
import { cn } from "@/lib/utils";
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
  Settings,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";

type Item = { href?: string; onClick?: () => void; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number };

export function MxSidebar({
  role,
  permissions,
  openAssignCount,
  pendingCloseCount,
  expanded,
  onExpandChange,
  onCloseMobile,
  isMobileDrawer = false,
}: {
  role: Role;
  permissions: UserPermission | null | undefined;
  openAssignCount?: number;
  pendingCloseCount?: number;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  onCloseMobile: () => void;
  isMobileDrawer?: boolean;
}) {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const { data: appSettings } = useAppSettings();
  const { selected, allowedAccess, getAllPairs } = useLocationContext();
  const logoutMutation = useLogout();

  const brand = appSettings?.softwareName?.trim() || "MaintenX";
  const pairs = getAllPairs(allowedAccess);
  const currentPair = selected
    ? pairs.find((p) => p.companyId === selected.companyId && p.locationId === selected.locationId)
    : null;
  const companyName = currentPair?.companyName || "Select Company";

  const COLLAPSED_WIDTH = 64;
  const EXPANDED_WIDTH = 280;

  const showFull = isMobileDrawer || expanded || isHovered;
  const width = showFull ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const primaryItems: Item[] = [];
  if (permissions?.viewDashboard) primaryItems.push({ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard });
  if (role === Role.USER && permissions?.viewComplaints) {
    primaryItems.push({ href: "/my-tickets", label: "My tickets", icon: ClipboardList });
  }
  if (role === Role.USER && permissions?.raiseComplaint) {
    primaryItems.push({ 
      label: "Raise new tickets", 
      icon: PlusCircle,
      onClick: () => window.dispatchEvent(new CustomEvent("openRaiseTicket"))
    });
  }
  const canSeeAllTickets =
    !!permissions?.viewComplaints &&
    (permissions.viewAllComplaints || role === Role.COORDINATOR || role === Role.ADMIN) &&
    role !== Role.USER;
  if (canSeeAllTickets) {
    primaryItems.push({ href: "/all-tickets", label: "All tickets", icon: List });
  }
  if (permissions?.assignComplaints) {
    primaryItems.push({
      href: "/assign-work",
      label: "Assign work",
      icon: UserPlus,
      badge: openAssignCount && openAssignCount > 0 ? openAssignCount : undefined,
    });
    primaryItems.push({
      href: "/close-tickets",
      label: "Close tickets",
      icon: CheckCircle,
      badge: pendingCloseCount && pendingCloseCount > 0 ? pendingCloseCount : undefined,
    });
  }
  if (permissions?.handleComplaints && (role === Role.HANDLER || role === Role.ADMIN)) {
    primaryItems.push({ href: "/my-work", label: "My work queue", icon: Wrench });
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
  if (permissions?.accessSettings) admin.push({ href: "/settings", label: "Settings", icon: Settings });

  const renderItems = (items: Item[]) =>
    items.map((item, idx) => {
      const Icon = item.icon;
      const active = item.href ? (pathname === item.href || pathname.startsWith(`${item.href}/`)) : false;
      const content = (
        <>
          <Icon className={cn(
            "h-5 w-5 shrink-0 transition-colors duration-200", 
            active ? "text-primary-400" : "group-hover:text-primary-300",
            !showFull && "mx-auto"
          )} />
          <div className={cn(
            "flex-1 ml-3 overflow-hidden transition-all duration-300",
            showFull ? "opacity-100 w-auto" : "opacity-0 w-0 pointer-events-none"
          )}>
            <span className="whitespace-nowrap">{item.label}</span>
          </div>
          {item.badge != null && (
            <span
              className={cn(
                "rounded-full bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm transition-opacity duration-300",
                showFull ? "opacity-100" : "opacity-0 invisible"
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      );

      const commonClass = cn(
        "mx-nav-item flex items-center rounded-lg border border-transparent text-[14px] font-semibold transition-all duration-300 overflow-hidden group px-3 py-3 w-full text-left",
        active
          ? "border-white/[0.08] bg-white/10 text-white shadow-sm"
          : "text-[#b1c5e0] hover:bg-white/[0.06] hover:text-white"
      );

      if (item.onClick) {
        return (
          <button
            key={item.label + idx}
            onClick={(e) => {
              item.onClick?.();
              onCloseMobile();
            }}
            className={commonClass}
          >
            {content}
          </button>
        );
      }

      return (
        <Link
          key={item.href || item.label + idx}
          href={item.href || "#"}
          onClick={onCloseMobile}
          className={commonClass}
        >
          {content}
        </Link>
      );
    });

  const isVertical = permissions?.navigationLayout !== 'HORIZONTAL';

  return (
    <aside
      className="mx-sidebar h-screen border-r border-white/[0.06] shadow-2xl transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden relative shrink-0"
      style={{ background: "var(--mx-navy-800)", width }}
      onMouseEnter={() => !expanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        className="flex items-center shadow-lg h-20 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 relative overflow-hidden transition-all duration-300"
      >
        {/* Fixed contents revealed by overflow-hidden parent */}
        <div className="absolute top-0 right-0 -mr-10 -mt-10 h-28 w-28 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        
        <div className={cn(
          "flex items-center min-w-[280px] px-4",
          !showFull ? "justify-center" : "justify-between"
        )}>
          <div className={cn(
            "flex-1 flex flex-col min-w-0 transition-opacity duration-200 delay-75",
            showFull ? "opacity-100" : "opacity-0 pointer-events-none"
          )}>
            <div className="text-[14px] font-black text-white leading-tight whitespace-nowrap overflow-hidden text-ellipsis">
              {brand}
            </div>
            <div className="text-[11px] font-bold text-white/80 leading-normal mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
              {companyName}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onExpandChange(!expanded);
              }}
              className="rounded-md border border-white/20 bg-white/10 p-2 text-white shadow-sm transition-all hover:bg-white/20 shrink-0"
              title={expanded ? "Collapse sidebar" : "Expand sidebar"}
            >
              {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div
        className="pb-0 overflow-y-auto overflow-x-hidden relative flex flex-col mt-2"
        style={{ height: "calc(100vh - 80px)" }}
      >
        <div className="flex-1 px-2">
          <nav className="flex flex-col gap-1">{renderItems(primaryItems)}</nav>
        
          {master.length > 0 && (
            <div className="pt-6 mt-6 border-t border-white/[0.04] px-0">
              <div className={cn(
                "mb-3 px-3 text-[10px] font-bold uppercase tracking-[2px] text-[#4d6ea5] transition-opacity duration-300",
                showFull ? "opacity-100" : "opacity-0 invisible h-0 mb-0"
              )}>
                Master entry
              </div>
              <nav className="flex flex-col gap-1">{renderItems(master)}</nav>
            </div>
          )}

          {admin.length > 0 && (
            <div className="pt-6 mt-6 border-t border-white/[0.04] px-0">
              <div className={cn(
                "mb-3 px-3 text-[10px] font-bold uppercase tracking-[2px] text-[#4d6ea5] transition-opacity duration-300",
                showFull ? "opacity-100" : "opacity-0 invisible h-0 mb-0"
              )}>
                Settings
              </div>
              <nav className="flex flex-col gap-1">{renderItems(admin)}</nav>
            </div>
          )}
        </div>

      </div>
    </aside>
  );
}

