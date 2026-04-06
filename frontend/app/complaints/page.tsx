"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentUserPermissions } from "@/hooks/use-settings";
import { ticketListPath } from "@/lib/ticket-routes";

/** Legacy route: sends users to the role-appropriate ticket list. */
export default function ComplaintsRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useCurrentUser();
  const { data: permissions } = useCurrentUserPermissions();

  useEffect(() => {
    if (!user || !permissions) return;
    const base = ticketListPath(user, permissions);
    const status = searchParams.get("status");
    const dest = status ? `${base}?status=${encodeURIComponent(status)}` : base;
    router.replace(dest);
  }, [user, permissions, router, searchParams]);

  return (
    <div className="mx-page flex items-center justify-center py-24" style={{ color: "var(--mx-muted)" }}>
      Redirecting…
    </div>
  );
}
