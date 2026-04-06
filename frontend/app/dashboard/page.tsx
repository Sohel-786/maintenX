"use client";

import { Suspense } from "react";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { AccessDenied } from "@/components/ui/access-denied";
import { ticketListPath } from "@/lib/ticket-routes";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MxDashboardView } from "@/components/mx/mx-dashboard-view";

export default function DashboardPage() {
  const { data: permissions } = useCurrentUserPermissions();
  const { user } = useCurrentUser();

  if (permissions && !permissions.viewDashboard) {
    return <AccessDenied actionLabel="Go to tickets" actionHref={ticketListPath(user ?? undefined, permissions)} />;
  }

  return (
    <Suspense fallback={<div className="p-6 text-secondary-500">Loading dashboard…</div>}>
      <MxDashboardView />
    </Suspense>
  );
}
