"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  Building2, 
  MapPin, 
  LayoutDashboard, 
  Settings, 
  ClipboardList, 
  Tags, 
  List, 
  UserPlus, 
  CheckCircle, 
  Wrench, 
  PlusCircle,
  Layers,
  type LucideIcon 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useMxCounts } from "@/hooks/use-mx-counts";
import { User, Role } from "@/types";

interface NavItem {
  href?: string;
  onClick?: () => void;
  label: string;
  icon: LucideIcon;
  colorBase: string;
  badge?: number;
  condition?: (p: any, u: User) => boolean;
}

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
  sky: { active: "from-sky-600 to-sky-700 dark:from-sky-500 dark:to-sky-600 shadow-sky-500/30", icon: "text-sky-500" },
};

interface HorizontalNavProps {
  isExpanded: boolean;
  user: User;
}

export function HorizontalNav({ isExpanded, user }: HorizontalNavProps) {
  const pathname = usePathname();
  const { data: permissions } = useCurrentUserPermissions();
  const { data: counts } = useMxCounts(user, permissions);

  const navigationSections = {
    dashboard: [
      { 
        href: "/dashboard", 
        label: "Dashboard", 
        icon: LayoutDashboard, 
        colorBase: "blue", 
        condition: (p: any) => p.viewDashboard 
      },
    ],
    complaints: [
      { 
        href: "/my-tickets", 
        label: "My tickets", 
        icon: ClipboardList, 
        colorBase: "teal", 
        condition: (p: any, u: User) => u.role === Role.USER && p.viewComplaints 
      },
      { 
        label: "Raise", 
        icon: PlusCircle, 
        colorBase: "emerald", 
        condition: (p: any, u: User) => u.role === Role.USER && p.raiseComplaint,
        onClick: () => window.dispatchEvent(new CustomEvent("openRaiseTicket"))
      },
      { 
        href: "/all-tickets", 
        label: "All tickets", 
        icon: List, 
        colorBase: "blue", 
        condition: (p: any, u: User) => 
          !!p.viewComplaints && (p.viewAllComplaints || u.role === Role.COORDINATOR || u.role === Role.ADMIN) && u.role !== Role.USER
      },
      { 
        href: "/assign-work", 
        label: "Assign", 
        icon: UserPlus, 
        colorBase: "sky", 
        badge: counts?.open,
        condition: (p: any) => p.assignComplaints 
      },
      { 
        href: "/close-tickets", 
        label: "Close", 
        icon: CheckCircle, 
        colorBase: "violet", 
        badge: counts?.done,
        condition: (p: any) => p.assignComplaints 
      },
      { 
        href: "/my-work", 
        label: "Queue", 
        icon: Wrench, 
        colorBase: "orange", 
        condition: (p: any, u: User) => p.handleComplaints && (u.role === Role.HANDLER || u.role === Role.ADMIN)
      },
    ],
    masters: [
      { 
        href: "/companies", 
        label: "Company Master", 
        icon: Building2, 
        colorBase: "indigo", 
        condition: (p: any) => !!p.viewMaster && p.manageCompany 
      },
      { 
        href: "/locations", 
        label: "Location Master", 
        icon: MapPin, 
        colorBase: "emerald", 
        condition: (p: any) => !!p.viewMaster && p.manageLocation 
      },
      { 
        href: "/categories", 
        label: "Category Master", 
        icon: Tags, 
        colorBase: "purple", 
        condition: (p: any) => p.manageCategories 
      },
      { 
        href: "/departments", 
        label: "Dept Master", 
        icon: Layers, 
        colorBase: "rose", 
        condition: (p: any) => p.manageCategories 
      },
    ],
    other: [
      { 
        href: "/settings", 
        label: "Settings", 
        icon: Settings, 
        colorBase: "slate", 
        condition: (p: any) => p.accessSettings 
      },
    ],
  };

  const filterItems = (items: NavItem[]) => {
    return items.filter((item) => {
      if (!permissions) return false;
      if (item.condition) return item.condition(permissions, user);
      return true;
    });
  };

  const visibleDashboard = filterItems(navigationSections.dashboard);
  const visibleComplaints = filterItems(navigationSections.complaints);
  const visibleMasterEntries = filterItems(navigationSections.masters);
  const visibleOther = filterItems(navigationSections.other);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = item.href ? (pathname === item.href || pathname.startsWith(`${item.href}/`)) : false;
    const colorMap = colorMaps[item.colorBase] || colorMaps.blue;

    const content = (
      <div
        className={cn(
          "flex flex-col items-center gap-2 px-4 py-3 rounded-[16px] transition-all duration-500 min-w-[100px] group cursor-pointer relative",
          "border-[1.5px]",
          isActive
            ? cn("bg-gradient-to-br shadow-[0_10px_35px_-5px] scale-105 -translate-y-1.5 border-white/40 z-10", colorMap.active)
            : "border-secondary-100 dark:border-white/5 bg-secondary-50/50 dark:bg-white/[0.03] hover:border-primary-500/30 hover:bg-white dark:hover:border-white/20 dark:hover:bg-white/[0.08] hover:-translate-y-1 active:scale-95",
        )}
      >
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent pointer-events-none opacity-50 rounded-[14px]" />
        )}
        
        <div className={cn("transition-all duration-500 flex items-center justify-center relative", isActive ? "scale-110" : "group-hover:scale-110")}>
          <Icon
            className={cn(
              "w-7 h-7 transition-all duration-500", 
              isActive ? "text-white" : colorMap.icon,
              isActive && "drop-shadow-[0_0_15px_rgba(255,255,255,0.7)]"
            )}
            strokeWidth={isActive ? 2.5 : 1.5}
          />
          {item.badge != null && item.badge > 0 && (
            <span className="absolute -top-3 -right-3 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-black text-white shadow-xl ring-2 ring-white dark:ring-[#0d1117]">
              {item.badge}
            </span>
          )}
        </div>
        <span className={cn(
          "text-[9px] uppercase font-black text-center whitespace-nowrap transition-colors tracking-[0.12em]",
          isActive ? "text-white" : "text-secondary-500 dark:text-secondary-400 group-hover:text-primary-600 dark:group-hover:text-white",
        )}>
          {item.label}
        </span>
      </div>
    );

    if (item.onClick) {
      return (
        <button key={item.label} onClick={item.onClick}>
          {content}
        </button>
      );
    }

    return (
      <Link key={item.href} href={item.href || "#"}>
        {content}
      </Link>
    );
  };

  const renderDivider = () => <div className="self-center w-px h-8 bg-secondary-100 dark:bg-white/5 mx-3 mt-4" />;

  const renderSectionLabel = (label: string) => (
    <div className="flex flex-col items-center w-full mb-1.5">
       <h3 className="text-[9px] font-black text-secondary-300 dark:text-blue-400/40 uppercase tracking-[0.3em]">{label}</h3>
    </div>
  );

  return (
    <nav className="w-full bg-white dark:bg-[#0d1117] border-b border-secondary-100 dark:border-white/5 sticky top-0 z-30 shadow-none dark:shadow-2xl">
      <div className={cn(
        "transition-all duration-500 ease-in-out",
        isExpanded
          ? "max-h-[160px] opacity-100 translate-y-0 py-4"
          : "max-h-0 opacity-0 -translate-y-10 overflow-hidden py-0",
      )}>
        <div className="overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex items-end gap-3 min-w-max px-6 pt-2">

            {visibleDashboard.length > 0 && (
              <>
                <div className="flex flex-col items-center gap-1">
                  <div className="h-4" />
                  <div className="flex gap-3">{visibleDashboard.map(renderNavItem)}</div>
                </div>
                {renderDivider()}
              </>
            )}

            {visibleComplaints.length > 0 && (
              <>
                <div className="flex flex-col items-center gap-1">
                  {renderSectionLabel("Complaints")}
                  <div className="flex gap-3">{visibleComplaints.map(renderNavItem)}</div>
                </div>
                {renderDivider()}
              </>
            )}

            {visibleMasterEntries.length > 0 && (
              <>
                <div className="flex flex-col items-center gap-1">
                  {renderSectionLabel("Master Entry")}
                   <div className="flex gap-3">{visibleMasterEntries.map(renderNavItem)}</div>
                </div>
                {renderDivider()}
              </>
            )}

            {visibleOther.length > 0 && (
               <div className="flex flex-col items-center gap-1">
                 <div className="h-4" />
                 <div className="flex gap-3">{visibleOther.map(renderNavItem)}</div>
               </div>
            )}

          </div>
        </div>
      </div>
    </nav>
  );
}



