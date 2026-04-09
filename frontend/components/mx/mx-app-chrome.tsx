"use client";

import { useEffect, useState } from "react";
import { useMxCounts } from "@/hooks/use-mx-counts";
import { User, Role } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import { MxTopbar } from "./mx-topbar";
import { MxSidebar } from "./mx-sidebar";

export function MxAppChrome({ user, children }: { user: User; children: React.ReactNode }) {
  const { data: permissions } = useCurrentUserPermissions();
  const { selected } = useLocationContext();
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const COLLAPSED_W = 64;
  const EXPANDED_W = 280;
  const contentLeftOffset = sidebarPinned ? EXPANDED_W : COLLAPSED_W;

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

  return (
    <div className="h-screen overflow-hidden bg-background">
      <MxSidebar
        role={user.role}
        permissions={permissions}
        openAssignCount={counts?.open}
        pendingCloseCount={counts?.done}
        expanded={sidebarPinned}
        onExpandChange={setPinned}
      />

      <div className="flex h-full flex-col transition-[padding-left] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]" style={{ paddingLeft: contentLeftOffset }}>
        <MxTopbar user={user} leftOffsetPx={0} />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
