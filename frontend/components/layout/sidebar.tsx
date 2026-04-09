"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  ClipboardList,
  Tags,
} from "lucide-react";
import { Role } from "@/types";
import { useAppSettings, useCurrentUserPermissions, useCompany } from "@/hooks/use-settings";
import { useLogout } from "@/hooks/use-auth-mutations";
import { useLocationContext } from "@/contexts/location-context";

interface SidebarProps {
  userRole: Role;
  currentUser?: unknown;
  expanded: boolean;
  onExpandChange: (expanded: boolean) => void;
  sidebarWidth: number;
}

const SidebarText = ({ show, children, className = "" }: { show: boolean; children: React.ReactNode; className?: string }) => (
  <AnimatePresence>
    {show && (
      <motion.span
        initial={{ opacity: 0, x: -5 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -5 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`whitespace-nowrap ml-3 ${className}`}
      >
        {children}
      </motion.span>
    )}
  </AnimatePresence>
);

export function Sidebar({ userRole, expanded, onExpandChange, sidebarWidth }: SidebarProps) {
  const pathname = usePathname();
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();
  const { selected, allowedAccess, getAllPairs } = useLocationContext();
  const { data: currentCompany } = useCompany(selected?.companyId);
  const pairs = getAllPairs(allowedAccess);
  const currentPair = selected ? pairs.find((p) => p.companyId === selected.companyId && p.locationId === selected.locationId) : null;

  const [isHovered, setIsHovered] = useState(false);
  const HOVER_EXPANDED_WIDTH = 256;
  const showFullSidebar = expanded || isHovered;
  const currentWidth = expanded ? sidebarWidth : isHovered ? HOVER_EXPANDED_WIDTH : sidebarWidth;

  const logoutMutation = useLogout();
  const handleLogout = () => logoutMutation.mutate();

  const portalLabel =
    userRole === Role.ADMIN
      ? "Admin"
      : userRole === Role.COORDINATOR
        ? "Coordinator"
        : userRole === Role.HANDLER
          ? "Handler"
          : "User";

  const linkClass = (href: string, iconOnly = false) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    const base =
      "flex items-center gap-2 rounded-md transition-all text-sm cursor-pointer overflow-hidden " +
      (isActive
        ? "bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-medium shadow-sm"
        : "text-secondary-600 dark:[color:#c9d1d9] hover:bg-secondary-50 dark:hover:bg-[#21262d] hover:text-primary-600 dark:hover:text-primary-400");
    return iconOnly ? `${base} justify-center px-2 py-2.5` : `${base} px-4 py-2.5`;
  };

  const renderMenuItem = (href: string, label: string, icon: React.ComponentType<{ className?: string }>) => {
    const Icon = icon;
    return (
      <Link href={href} key={href}>
        <motion.div whileHover={showFullSidebar ? { x: 2 } : {}} className={linkClass(href, !showFullSidebar)}>
          <Icon className="w-5 h-5 shrink-0" />
          <SidebarText show={showFullSidebar} className="-ml-1">
            {label}
          </SidebarText>
        </motion.div>
      </Link>
    );
  };

  const masterVisible =
    permissions?.viewMaster &&
    (permissions.manageCompany || permissions.manageLocation);

  return (
    <aside
      className="h-screen fixed left-0 top-0 flex flex-col bg-white dark:bg-card border-r border-secondary-200 dark:border-border shadow-lg z-50 overflow-hidden transition-[width,background-color,border-color] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
      style={{ width: currentWidth }}
      onMouseEnter={() => !expanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`shrink-0 border-b border-secondary-200 bg-gradient-to-r from-primary-600 to-primary-700 flex transition-all duration-300 ${showFullSidebar ? "min-h-[5.5rem] px-4 py-3 items-center gap-3" : "min-h-[3.5rem] px-2 py-2 items-center justify-center"}`}
      >
        {showFullSidebar ? (
          <>
            <div className="min-w-0 flex-1 flex flex-col justify-center gap-0.5 overflow-hidden">
              <SidebarText show={showFullSidebar} className="!ml-0 text-base font-bold text-white/90 truncate leading-tight block">
                {currentCompany?.name || currentPair?.companyName || "Company"}
              </SidebarText>
              <SidebarText show={showFullSidebar} className="!ml-0 text-sm font-semibold text-white truncate leading-tight block">
                {appSettings?.softwareName || "MaintenX"}
              </SidebarText>
              <SidebarText show={showFullSidebar} className="!ml-0 text-xs text-white/90 leading-tight block">
                {portalLabel}
              </SidebarText>
            </div>
            <button
              type="button"
              onClick={() => onExpandChange(!expanded)}
              className="shrink-0 p-1.5 rounded-md hover:bg-white/20 text-white transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onExpandChange(true)}
            className="shrink-0 p-2 rounded-md hover:bg-white/20 text-white transition-colors"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 scrollbar-hide">
        <div className="space-y-0.5">
          {permissions?.viewDashboard && renderMenuItem("/dashboard", "Dashboard", LayoutDashboard)}
          {permissions?.viewComplaints && renderMenuItem("/complaints", "Complaints", ClipboardList)}
          {permissions?.raiseComplaint && renderMenuItem("/complaints/raise", "Raise complaint", ClipboardList)}
          {permissions?.manageCategories && renderMenuItem("/categories", "Categories", Tags)}

          {masterVisible && (
            <div className={`pt-1 ${showFullSidebar ? "border-t border-secondary-100 dark:border-[#21262d] mt-1" : ""} space-y-0.5`}>
              {permissions?.manageCompany && renderMenuItem("/companies", "Company master", Building2)}
              {permissions?.manageLocation && renderMenuItem("/locations", "Location master", MapPin)}
            </div>
          )}

          <div className={`pt-1 ${showFullSidebar ? "border-t border-secondary-100 dark:border-[#21262d] mt-1" : ""} space-y-0.5`}>
            {permissions?.accessSettings && renderMenuItem("/settings", "Settings", Settings)}
          </div>
        </div>
      </nav>

      <div className="shrink-0 p-3 border-t border-secondary-200 dark:border-[#21262d] bg-secondary-50 dark:bg-[#0d1117]">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-all text-red-600 dark:[color:#f87171] hover:bg-red-50 dark:hover:bg-red-950/20 ${!showFullSidebar ? "justify-center" : "justify-start"}`}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <SidebarText show={showFullSidebar} className="-ml-1">
            Logout
          </SidebarText>
        </button>
      </div>
    </aside>
  );
}

