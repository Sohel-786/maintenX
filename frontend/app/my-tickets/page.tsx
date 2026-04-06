"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { MxTicketsPage } from "@/components/mx/mx-tickets-page";

export default function MyTicketsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { data: permissions } = useCurrentUserPermissions();

  useEffect(() => {
    if (!user || !permissions) return;
    const wide =
      permissions.viewAllComplaints || user.role === Role.COORDINATOR || user.role === Role.ADMIN;
    if (wide) router.replace("/all-tickets");
  }, [user, permissions, router]);

  if (!user || !permissions) {
    return (
      <div className="mx-page flex items-center justify-center py-24" style={{ color: "var(--mx-muted)" }}>
        Loading…
      </div>
    );
  }

  const wide =
    permissions.viewAllComplaints || user.role === Role.COORDINATOR || user.role === Role.ADMIN;
  if (wide) return null;

  return (
    <MxTicketsPage
      title="My tickets"
      subtitle="Tickets you raised at this location."
      showRaiseLink
      queryKeySuffix="my"
    />
  );
}
