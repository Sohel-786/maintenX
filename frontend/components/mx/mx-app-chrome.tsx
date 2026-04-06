"use client";

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
    <div className="flex min-h-screen flex-col" style={{ background: "var(--mx-off)" }}>
      <MxTopbar user={user} />
      <div className="flex min-h-0 flex-1">
        <MxSidebar
          role={user.role}
          permissions={permissions}
          openAssignCount={counts?.open}
          pendingCloseCount={counts?.done}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
