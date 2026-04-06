"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Role } from "@/types";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { MxTicketsPage } from "@/components/mx/mx-tickets-page";

export default function AllTicketsPage() {
  const router = useRouter();
  const { user } = useCurrentUser();
  const { data: permissions } = useCurrentUserPermissions();

  useEffect(() => {
    if (!user || !permissions) return;
    const narrow = user.role === Role.EMPLOYEE && !permissions.viewAllComplaints;
    if (narrow) router.replace("/my-tickets");
  }, [user, permissions, router]);

  if (!user || !permissions) {
    return (
      <div className="mx-page flex items-center justify-center py-24" style={{ color: "var(--mx-muted)" }}>
        Loading…
      </div>
    );
  }

  const narrow = user.role === Role.EMPLOYEE && !permissions.viewAllComplaints;
  if (narrow) return null;

  return (
    <MxTicketsPage
      title="All tickets"
      subtitle="Full queue for this location (coordinator / admin view)."
      showCompanyColumn
      queryKeySuffix="all"
    />
  );
}
