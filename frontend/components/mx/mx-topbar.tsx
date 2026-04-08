"use client";

import { useEffect, useMemo, useState } from "react";
import { User, Role } from "@/types";
import { useAppSettings, useCompany, useCurrentUserPermissions } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import { useLogout } from "@/hooks/use-auth-mutations";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Building2, MapPin, ChevronDown, LogOut } from "lucide-react";

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

export function MxTopbar({ user, leftOffsetPx = 0 }: { user: User; leftOffsetPx?: number }) {
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();
  const { selected, allowedAccess, getAllPairs } = useLocationContext();
  const { data: currentCompany, isLoading: isCompanyLoading } = useCompany(selected?.companyId);
  const pairs = getAllPairs(allowedAccess);
  const currentPair = selected
    ? pairs.find((p) => p.companyId === selected.companyId && p.locationId === selected.locationId)
    : null;
  const logoutMutation = useLogout();

  const openSwitch = () => window.dispatchEvent(new CustomEvent("openOrgDialog"));

  const brand = appSettings?.softwareName?.trim() || "MaintenX";

  // Fresh company logo from the API (fallback to allowed-location data)
  const logoPath = !isCompanyLoading && currentCompany !== undefined ? currentCompany.logoUrl : currentPair?.companyLogo;

  const resolvedLogoUrl = useMemo(() => {
    if (!logoPath) return null;
    const normalized = logoPath.replace(/\\/g, "/");
    if (normalized.startsWith("http") || normalized.startsWith("blob:")) return normalized;
    if (normalized.startsWith("/")) return normalized;
    return `/${normalized}`;
  }, [logoPath]);

  const decodedAltLogoUrl = useMemo(() => {
    if (!resolvedLogoUrl) return null;
    const [pathPart, queryPart] = resolvedLogoUrl.split("?");
    if (!pathPart.includes("%")) return null;
    try {
      const decodedPath = decodeURIComponent(pathPart);
      if (decodedPath === pathPart) return null;
      return queryPart ? `${decodedPath}?${queryPart}` : decodedPath;
    } catch {
      return null;
    }
  }, [resolvedLogoUrl]);

  const logoCandidates = useMemo(() => {
    const arr: string[] = [];
    if (resolvedLogoUrl) arr.push(resolvedLogoUrl);
    if (decodedAltLogoUrl && decodedAltLogoUrl !== resolvedLogoUrl) arr.push(decodedAltLogoUrl);
    return arr;
  }, [resolvedLogoUrl, decodedAltLogoUrl]);

  const [logoTryIndex, setLogoTryIndex] = useState(0);
  useEffect(() => {
    setLogoTryIndex(0);
  }, [logoCandidates.join("|")]);

  const logoUrlToRender = logoCandidates[logoTryIndex] ?? null;
  const hasLogo = Boolean(logoUrlToRender);

  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  return (
    <header
      className="mx-topbar sticky top-0 z-40 flex h-20 shrink-0 items-center gap-6 px-6 text-white shadow-md"
      style={{ background: "var(--mx-navy-900)", paddingLeft: 24 + leftOffsetPx }}
    >
      <div className="flex items-center gap-6 min-w-0">
        {hasLogo ? (
          <div className="flex items-center shrink-0 bg-transparent">
            <img
              src={logoUrlToRender!}
              alt=""
              className="max-h-[72px] max-w-[140px] w-auto h-auto object-contain object-center"
              onError={() => {
                setLogoTryIndex((idx) => {
                  if (idx + 1 < logoCandidates.length) return idx + 1;
                  return logoCandidates.length; // force fallback to icon
                });
              }}
            />
          </div>
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center text-white/85">
            <Building2 className="h-9 w-9" />
          </div>
        )}

        <div className="hidden h-10 w-px bg-white/10 lg:block" />

        {currentPair ? (
          <button
            type="button"
            onClick={openSwitch}
            className="flex min-w-0 items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-left shadow-sm transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20"
            title="Switch company or location"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/5 ring-1 ring-white/10">
                <Building2 className="h-3.5 w-3.5 text-white/85" />
              </div>
              <span className="truncate text-xs font-bold text-white max-w-[140px] hidden sm:block">
                {currentPair.companyName}
              </span>
            </div>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/5 ring-1 ring-white/10">
                <MapPin className="h-3.5 w-3.5 text-white/85" />
              </div>
              <span className="truncate text-xs font-bold text-white max-w-[120px] hidden sm:block">
                {currentPair.locationName}
              </span>
            </div>
            {pairs.length > 1 && <ChevronDown className="h-3.5 w-3.5 text-white/60" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={openSwitch}
            className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-white/10"
          >
            <Building2 className="h-4 w-4" />
            Select company/location
            <ChevronDown className="h-3.5 w-3.5 text-white/60" />
          </button>
        )}
      </div>

      <div className="ml-auto flex items-center gap-5">
        <ThemeToggle />
        
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm ring-2 ring-primary-500 ring-offset-2 ring-offset-[#0f172a]"
            style={{
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
          <div className="hidden min-w-0 flex-col md:flex">
            <span className="truncate text-sm font-bold text-white">
              {user.firstName} {user.lastName}
            </span>
            <span className="truncate text-xs" style={{ color: "var(--mx-navy-200)" }}>
              {roleLabel(user.role)}
            </span>
          </div>
        </div>

        {/* Header Logout Button (Only if Horizontal mode is active) */}
        {isHorizontal && (
          <>
            <div className="h-8 w-px bg-white/10 hidden sm:block" />
            <button
              type="button"
              onClick={() => logoutMutation.mutate()}
              className="flex h-9 items-center gap-2 rounded-lg border border-white/15 px-3 text-xs font-bold text-white/80 transition-all hover:border-red-400/50 hover:text-red-300 hover:bg-red-900/10"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign out</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
