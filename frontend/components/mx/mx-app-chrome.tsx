"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User, Role } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import api from "@/lib/api";
import { MxTopbar } from "./mx-topbar";
import { MxSidebar } from "./mx-sidebar";
import { ComplaintStatus } from "@/types";

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

  const { data: counts } = useQuery({
    queryKey: ["mx-sidebar-counts", selected?.locationId],
    queryFn: async () => {
      const [openRes, doneRes] = await Promise.all([
        api.get("/complaints", { params: { status: ComplaintStatus.Open, page: 1, pageSize: 200 } }),
        api.get("/complaints", { params: { status: ComplaintStatus.Done, page: 1, pageSize: 200 } }),
      ]);
      return {
        open: (openRes.data.totalCount as number) ?? 0,
        done: (doneRes.data.totalCount as number) ?? 0,
      };
    },
    enabled:
      !!selected &&
      !!permissions?.assignComplaints &&
      (user.role === Role.COORDINATOR || user.role === Role.ADMIN || permissions.viewAllComplaints),
    staleTime: 30_000,
  });

  return (
    <div className="h-screen overflow-hidden" style={{ background: "var(--mx-off)" }}>
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
