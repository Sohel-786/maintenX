"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Raise ticket is opened from the dashboard dialog; keep this route for old links. */
export default function RaiseComplaintRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/dashboard?raise=1");
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6 text-secondary-500">
      Opening raise ticket…
    </div>
  );
}
