"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function UsersPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/settings");
  }, [router]);

  return <div className="p-6 text-secondary-500">Redirecting to Settings → User Management…</div>;
}
