"use client";

import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { AccessDenied } from "@/components/ui/access-denied";
import { MxTicketsPage } from "@/components/mx/mx-tickets-page";

export default function MyWorkPage() {
  const { data: permissions } = useCurrentUserPermissions();

  if (permissions && !permissions.handleComplaints) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  return (
    <MxTicketsPage
      title="My work queue"
      subtitle="Tickets assigned to you at this location."
      queryKeySuffix="work"
      rowActions="handlerWork"
    />
  );
}
