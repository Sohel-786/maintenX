"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, MapPin, LayoutDashboard, Settings, ClipboardList, Tags, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUserPermissions } from "@/hooks/use-settings";

const navigationSections = {
  dashboard: [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, colorBase: "blue", permission: "viewDashboard" },
  ],
  complaints: [
    { href: "/my-tickets", label: "My tickets", icon: ClipboardList, colorBase: "teal", permission: "viewComplaints" },
    { href: "/dashboard?raise=1", label: "Raise", icon: ClipboardList, colorBase: "emerald", permission: "raiseComplaint" },
    { href: "/categories", label: "Categories", icon: Tags, colorBase: "purple", permission: "manageCategories" },
    { href: "/departments", label: "Departments", icon: Building2, colorBase: "indigo", permission: "manageCategories" },
  ],
  masterEntries: [
    { href: "/companies", label: "Companies", icon: Building2, colorBase: "violet", permission: "manageCompany" },
    { href: "/locations", label: "Locations", icon: MapPin, colorBase: "emerald", permission: "manageLocation" },
  ],
  other: [
    { href: "/settings", label: "Settings", icon: Settings, colorBase: "slate", permission: "accessSettings" },
  ],
};

const colorMaps: Record<string, { active: string; icon: string }> = {
  blue: { active: "from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 shadow-blue-500/30", icon: "text-blue-500" },
  violet: { active: "from-violet-600 to-violet-700 dark:from-violet-500 dark:to-violet-600 shadow-violet-500/30", icon: "text-violet-500" },
  emerald: { active: "from-emerald-600 to-emerald-700 dark:from-emerald-500 dark:to-emerald-600 shadow-emerald-500/30", icon: "text-emerald-500" },
  orange: { active: "from-orange-600 to-orange-700 dark:from-orange-500 dark:to-orange-600 shadow-orange-500/30", icon: "text-orange-500" },
  indigo: { active: "from-indigo-600 to-indigo-700 dark:from-indigo-500 dark:to-indigo-600 shadow-indigo-500/30", icon: "text-indigo-500" },
  teal: { active: "from-teal-600 to-teal-700 dark:from-teal-500 dark:to-teal-600 shadow-teal-500/30", icon: "text-teal-500" },
  amber: { active: "from-amber-600 to-amber-700 dark:from-amber-500 dark:to-amber-600 shadow-amber-500/30", icon: "text-amber-500" },
  rose: { active: "from-rose-600 to-rose-700 dark:from-rose-500 dark:to-rose-600 shadow-rose-500/30", icon: "text-rose-500" },
  green: { active: "from-green-600 to-green-700 dark:from-green-500 dark:to-green-600 shadow-green-500/30", icon: "text-green-500" },
  purple: { active: "from-purple-600 to-purple-700 dark:from-purple-500 dark:to-purple-600 shadow-purple-500/30", icon: "text-purple-500" },
  slate: { active: "from-slate-600 to-slate-700 dark:from-slate-500 dark:to-slate-600 shadow-slate-500/30", icon: "text-slate-500" },
};

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  colorBase: string;
  permission: string;
}

interface HorizontalNavProps {
  isExpanded: boolean;
}

export function HorizontalNav({ isExpanded }: HorizontalNavProps) {
  const pathname = usePathname();
  const { data: permissions } = useCurrentUserPermissions();

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!permissions) return false;
      const key = item.permission as keyof typeof permissions;
      return !!permissions[key];
    });
  };

  const visibleDashboard = filterItems(navigationSections.dashboard);
  const visibleComplaints = filterItems(navigationSections.complaints);
  const visibleMasterEntries = filterItems(navigationSections.masterEntries);
  const visibleOther = filterItems(navigationSections.other);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

    const colorMap = colorMaps[item.colorBase] || colorMaps.blue;

    return (
      <Link key={item.href} href={item.href}>
        <div
          className={cn(
            "flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-2xl transition-all duration-500 min-w-[80px] group cursor-pointer relative overflow-hidden",
            "border-[1.5px]",
            isActive
              ? cn("bg-gradient-to-br shadow-xl scale-105 -translate-y-1.5 border-white/20 dark:border-white/10", colorMap.active)
              : "border-secondary-200 dark:border-white/5 hover:border-primary-600/40 hover:bg-card hover:shadow-2xl hover:-translate-y-1 active:scale-95",
          )}
        >
          {isActive && (
            <>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.2),transparent_70%)] pointer-events-none" />
            </>
          )}
          <div className={cn("transition-all duration-500 flex items-center justify-center", isActive ? "scale-110" : "group-hover:scale-110")}>
            <Icon
              className={cn(
                "w-7 h-7 transition-all duration-500", 
                isActive ? "text-white" : colorMap.icon,
                isActive && "drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]"
              )}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
          </div>
          <span className={cn(
            "text-[10px] uppercase font-black text-center whitespace-nowrap transition-colors tracking-widest",
            isActive ? "text-white" : "text-foreground group-hover:text-primary-600 dark:group-hover:text-primary-400",
          )}>
            {item.label}
          </span>
          {isActive && (
            <motion.div
              layoutId="activeTabIndicatorDP"
              className="absolute -bottom-1.5 inset-x-0 mx-auto w-10 h-1 rounded-full bg-gradient-to-r from-primary-400 via-primary-500 to-primary-400 shadow-[0_0_15px_rgba(59,130,246,0.5)] dark:shadow-[0_0_20px_rgba(59,130,246,0.7)]"
              transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
            />
          )}
        </div>
      </Link>
    );
  };

  const renderDivider = () => <div className="self-stretch w-px bg-border mx-1 my-3" />;

  const renderSectionLabel = (label: string) => (
    <h3 className="text-[10px] font-bold text-primary-600 uppercase tracking-widest px-3 mb-1">{label}</h3>
  );

  return (
    <nav className="w-full bg-card border-b border-border shadow-sm sticky top-14 z-30">
      <div className={cn(
        "transition-all duration-300 ease-in-out px-4",
        isExpanded
          ? "max-h-[400px] opacity-100 translate-y-0 py-3"
          : "max-h-0 opacity-0 -translate-y-4 overflow-hidden py-0",
      )}>
        <div className="overflow-x-auto pb-2 scrollbar-hide pl-2 pr-2">
          <div className="flex items-end gap-3 min-w-max">

            {/* Dashboard */}
            {visibleDashboard.length > 0 && (
              <div className="flex items-center gap-3">
                {visibleDashboard.map(renderNavItem)}
                {(visibleComplaints.length > 0 || visibleMasterEntries.length > 0 || visibleOther.length > 0) && renderDivider()}
              </div>
            )}

            {visibleComplaints.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                {renderSectionLabel("Complaints")}
                <div className="flex items-center gap-3">
                  <div className="flex gap-3">{visibleComplaints.map(renderNavItem)}</div>
                  {(visibleMasterEntries.length > 0 || visibleOther.length > 0) && renderDivider()}
                </div>
              </div>
            )}

            {visibleMasterEntries.length > 0 && (
              <div className="flex flex-col items-center gap-1">
                {renderSectionLabel("Masters")}
                <div className="flex items-center gap-3">
                  <div className="flex gap-3">{visibleMasterEntries.map(renderNavItem)}</div>
                  {visibleOther.length > 0 && renderDivider()}
                </div>
              </div>
            )}

            {visibleOther.length > 0 && <div className="flex gap-3">{visibleOther.map(renderNavItem)}</div>}

          </div>
        </div>
      </div>
    </nav>
  );
}
