"use client";

import { useEffect, useState } from "react";
import { useMxCounts } from "@/hooks/use-mx-counts";
import { User, Role } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { MxTopbar } from "./mx-topbar";
import { MxSidebar } from "./mx-sidebar";

export function MxAppChrome({ user, children }: { user: User; children: React.ReactNode }) {
  const { data: permissions } = useCurrentUserPermissions();
  const { selected } = useLocationContext();
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const COLLAPSED_W = 64;
  const EXPANDED_W = 280;
  
  const isVertical = permissions?.navigationLayout !== 'HORIZONTAL';

  // Reliable viewport check to separate mobile/tablet drawer logic from desktop static layout
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("mxSidebarPinned");
      if (raw === "1") setSidebarPinned(true);
    } catch {
      // ignore
    }
  }, []);

  const setPinned = (pinned: boolean) => {
    setSidebarPinned(pinned);
    try {
      localStorage.setItem("mxSidebarPinned", pinned ? "1" : "0");
    } catch {
      // ignore
    }
  };

  const { data: counts } = useMxCounts(user, permissions);
  const layoutWidth = !isMobile && isVertical ? (sidebarPinned ? EXPANDED_W : COLLAPSED_W) : 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Overlay Backdrop */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[49] bg-black/60 backdrop-blur-md lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Spacer to reserve space for the sidebar on desktop vertical layout */}
      {!isMobile && isVertical && (
        <div 
          className="shrink-0 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ width: layoutWidth }}
        />
      )}

      {/* Sidebar - Fixed to allow hover overlap without shifting layout */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]",
        // Desktop Logic
        !isMobile ? (
          isVertical ? "translate-x-0" : "hidden"
        ) : (
          // Mobile/Tablet Drawer Logic
          cn(
            "shadow-2xl",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )
        )
      )}>
        <MxSidebar
          role={user.role}
          permissions={permissions}
          openAssignCount={counts?.open}
          pendingCloseCount={counts?.done}
          expanded={sidebarPinned}
          onExpandChange={setPinned}
          onCloseMobile={() => setMobileOpen(false)}
          isMobileDrawer={isMobile}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        <MxTopbar 
          user={user} 
          leftOffsetPx={0} 
          onToggleMobile={() => setMobileOpen(!mobileOpen)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 bg-gray-50/30 dark:bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
