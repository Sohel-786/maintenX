"use client";

import { ComplaintStatus } from "@/types";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { AccessDenied } from "@/components/ui/access-denied";
import { MxTicketsPage } from "@/components/mx/mx-tickets-page";

export default function CloseTicketsPage() {
  const { data: permissions } = useCurrentUserPermissions();

  if (permissions && !permissions.assignComplaints) {
    return <AccessDenied actionLabel="Go to Dashboard" actionHref="/dashboard" />;
  }

  return (
    <MxTicketsPage
      title="Close tickets"
      subtitle="Work marked done by handlers — verify and close, or reopen if needed."
      lockStatus={ComplaintStatus.Done}
      queryKeySuffix="close"
    />
  );
}
