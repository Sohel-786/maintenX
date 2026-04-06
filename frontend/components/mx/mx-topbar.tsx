"use client";

import { User, Role } from "@/types";
import { useAppSettings, useCompany } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import { useLogout } from "@/hooks/use-auth-mutations";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Building2, MapPin } from "lucide-react";

function roleLabel(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "Admin";
    case Role.COORDINATOR:
      return "Coordinator";
    case Role.HANDLER:
      return "Handler";
    default:
      return "Employee";
  }
}

function initials(u: User) {
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() || "U";
}

export function MxTopbar({ user }: { user: User }) {
  const { data: appSettings } = useAppSettings();
  const { selected, allowedAccess, getAllPairs } = useLocationContext();
  const { data: currentCompany } = useCompany(selected?.companyId);
  const pairs = getAllPairs(allowedAccess);
  const currentPair = selected
    ? pairs.find((p) => p.companyId === selected.companyId && p.locationId === selected.locationId)
    : null;
  const logoutMutation = useLogout();

  const openSwitch = () => window.dispatchEvent(new CustomEvent("openOrgDialog"));

  const brand =
    appSettings?.softwareName?.trim() || "MaintenX";

  return (
    <header
      className="mx-topbar flex h-[62px] shrink-0 items-center gap-5 px-6 text-white shadow-md"
      style={{ background: "var(--mx-navy-900)" }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm"
          style={{
            background: "linear-gradient(135deg,#f59e0b,#ef4444)",
          }}
        >
          🔩
        </div>
        <div className="min-w-0">
          <div
            className="truncate font-semibold leading-tight tracking-tight"
            style={{ fontFamily: "var(--font-playfair),serif", fontSize: "1.05rem" }}
          >
            Aira <span style={{ color: "var(--mx-gold)" }}>Maintenance</span>
          </div>
          <div className="truncate text-[10px] uppercase tracking-widest text-white/50">{brand}</div>
        </div>
      </div>
      <div className="h-7 w-px shrink-0 bg-white/10" />
      <div className="hidden min-w-0 text-xs sm:block" style={{ color: "var(--mx-navy-200)" }}>
        {user.role === Role.ADMIN ? (
          <>
            <Building2 className="mr-1 inline h-3.5 w-3.5 opacity-70" />
            <strong className="text-white">System administrator</strong>
          </>
        ) : (
          <>
            <Building2 className="mr-1 inline h-3.5 w-3.5 opacity-70" />
            <strong className="text-white">{currentCompany?.name ?? currentPair?.companyName ?? "Company"}</strong>
          </>
        )}
      </div>
      <div className="h-7 w-px shrink-0 bg-white/10" />
      <div className="hidden min-w-0 text-xs md:block" style={{ color: "var(--mx-navy-200)" }}>
        <MapPin className="mr-1 inline h-3.5 w-3.5 opacity-70" />
        <strong className="text-white">{currentPair?.locationName ?? "Location"}</strong>
        {pairs.length > 1 && (
          <button
            type="button"
            onClick={openSwitch}
            className="ml-2 rounded border border-white/15 px-2 py-0.5 text-[10px] font-semibold text-white/80 hover:bg-white/10"
          >
            Switch
          </button>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <ThemeToggle />
        <div
          className="flex items-center gap-2.5 rounded-full border border-white/10 py-1 pl-1 pr-3"
          style={{ background: "rgba(255,255,255,.06)" }}
        >
          <div
            className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
            style={{
              border: "2px solid var(--mx-gold)",
              background:
                user.role === Role.ADMIN
                  ? "#7c3aed"
                  : user.role === Role.COORDINATOR
                    ? "#b45309"
                    : user.role === Role.HANDLER
                      ? "#1a7a4a"
                      : "#1c3564",
            }}
          >
            {initials(user)}
          </div>
          <div className="min-w-0 text-left">
            <div className="truncate text-xs font-semibold text-white">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-[10px]" style={{ color: "var(--mx-navy-200)" }}>
              {roleLabel(user.role)}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => logoutMutation.mutate()}
          className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-medium transition-colors hover:border-red-400/50 hover:text-red-300"
          style={{ color: "var(--mx-navy-200)" }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
