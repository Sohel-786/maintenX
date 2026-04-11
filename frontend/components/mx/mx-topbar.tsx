"use client";

import { useEffect, useMemo, useState } from "react";
import { User, Role } from "@/types";
import { useAppSettings, useCompany, useCurrentUserPermissions } from "@/hooks/use-settings";
import { useLocationContext } from "@/contexts/location-context";
import { useLogout } from "@/hooks/use-auth-mutations";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Building2, MapPin, ChevronDown, LogOut, Menu, Phone, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function roleLabel(role: Role) {
  switch (role) {
    case Role.ADMIN:
      return "Admin";
    case Role.COORDINATOR:
      return "Coordinator";
    case Role.HANDLER:
      return "Handler";
    default:
      return "User";
  }
}

function initials(u: User) {
  return `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`.toUpperCase() || "U";
}

export function MxTopbar({ 
  user, 
  leftOffsetPx = 0, 
  onToggleMobile 
}: { 
  user: User; 
  leftOffsetPx?: number;
  onToggleMobile: () => void;
}) {
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();
  const { selected, allowedAccess, getAllPairs } = useLocationContext();
  const { data: currentCompany, isLoading: isCompanyLoading } = useCompany(selected?.companyId);
  const pairs = getAllPairs(allowedAccess);
  const currentPair = selected
    ? pairs.find((p) => p.companyId === selected.companyId && p.locationId === selected.locationId)
    : null;
  const logoutMutation = useLogout();
  const { theme: currentTheme, setTheme, resolvedTheme } = useTheme();

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
      className="mx-topbar sticky top-0 z-40 flex h-16 lg:h-20 shrink-0 items-center justify-between lg:justify-start gap-2 lg:gap-6 px-3 lg:px-6 text-white shadow-md"
      style={{ background: "var(--mx-navy-900)", paddingLeft: "var(--topbar-padding-left, 12px)" }}
    >
      <style jsx>{`
        header {
          --topbar-padding-left: 12px;
        }
        @media (min-width: 1024px) {
          header {
            --topbar-padding-left: ${24 + leftOffsetPx}px;
          }
        }
      `}</style>
      
      <div className="flex items-center gap-2 lg:gap-6 min-w-0">
        <button
          type="button"
          onClick={onToggleMobile}
          className="rounded-lg border border-white/10 bg-white/5 p-1.5 lg:p-2 text-white shadow-sm transition-all hover:bg-white/10 lg:hidden"
        >
          <Menu className="h-5 w-5 lg:h-6 lg:w-6" />
        </button>

        {hasLogo ? (
          <div className="flex items-center shrink-0 bg-transparent">
            <img
              src={logoUrlToRender!}
              alt=""
              className="max-h-[48px] lg:max-h-[72px] max-w-[100px] lg:max-w-[140px] w-auto h-auto object-contain object-center"
              onError={() => {
                setLogoTryIndex((idx) => {
                  if (idx + 1 < logoCandidates.length) return idx + 1;
                  return logoCandidates.length; // force fallback to icon
                });
              }}
            />
          </div>
        ) : (
          <div className="flex h-12 w-12 lg:h-16 lg:w-16 shrink-0 items-center justify-center text-white/85">
            <Building2 className="h-7 w-7 lg:h-9 lg:w-9" />
          </div>
        )}

        <div className="hidden h-10 w-px bg-white/10 lg:block" />

        {currentPair ? (
          <button
            type="button"
            onClick={openSwitch}
            className="flex min-w-0 items-center gap-2 lg:gap-3 rounded-lg border border-white/10 bg-white/5 px-2 lg:px-3 py-1 lg:py-1.5 text-left shadow-sm transition-all duration-200 hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-white/20"
            title="Switch company or location"
          >
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-6 w-6 lg:h-7 lg:w-7 shrink-0 items-center justify-center rounded bg-white/5 ring-1 ring-white/10">
                <Building2 className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-white/85" />
              </div>
              <span className="truncate text-xs font-bold text-white max-w-[140px] hidden sm:block">
                {currentPair.companyName}
              </span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
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

      <div className="ml-auto flex items-center gap-3 lg:gap-5">
        {/* Desktop-only: ThemeToggle before profile */}
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="group flex items-center gap-3 outline-none transition-all">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow-lg ring-2 ring-primary-500 ring-offset-2 ring-offset-[#0f172a] transition-transform group-hover:scale-105 active:scale-95"
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
              <div className="hidden xl:flex min-w-0 flex-col text-left">
                <span className="truncate text-sm font-bold text-white">
                  {user.firstName} {user.lastName}
                </span>
                <span className="truncate text-[11px] font-medium" style={{ color: "var(--mx-navy-300)" }}>
                  {roleLabel(user.role)}
                </span>
              </div>
              <ChevronDown className="hidden sm:block h-4 w-4 text-white/50 transition-transform group-data-[state=open]:rotate-180" />
            </button>
          </DropdownMenuTrigger>

          {/* New position for Sign Out on Desktop */}
          <DropdownMenuContent align="end" className="w-[280px] p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header with gradient */}
            <div className="bg-gradient-to-br from-[#1c3564] to-[#0f172a] p-6 text-white">
              <div className="flex items-center gap-4">
                <div 
                  className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold ring-4 ring-white/10 shadow-inner"
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
                <div className="min-w-0">
                  <h3 className="font-bold truncate text-lg leading-tight">{user.firstName} {user.lastName}</h3>
                  <div className="mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm text-[10px] font-black uppercase tracking-wider">
                    {roleLabel(user.role)}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-1">
              <div className="px-3 py-3 space-y-3">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em] px-1">Contact Details</p>
                  <div className="flex items-center gap-2.5 px-1 text-xs font-semibold text-foreground py-0.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-50 dark:bg-primary-900/20 text-primary-600">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <span>{user.mobileNumber || "No mobile set"}</span>
                  </div>
                </div>
              </div>

              {/* Mobile-only actions: Theme and Logout */}
              <div className="lg:hidden border-t border-border pt-1.5 mt-1.5 space-y-0.5">
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em] px-4 pb-1">Quick Actions</p>
                <DropdownMenuItem 
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-muted transition-colors mx-1"
                >
                  <div className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center shadow-sm shrink-0",
                    resolvedTheme === 'dark' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-400"
                  )}>
                    {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </div>
                  <span className="font-bold text-[13px]">
                    {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </span>
                </DropdownMenuItem>

                <DropdownMenuItem 
                  onClick={() => logoutMutation.mutate()}
                  className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 mx-1"
                >
                  <div className="h-8 w-8 rounded-md bg-rose-500/10 flex items-center justify-center shrink-0">
                    <LogOut className="h-4 w-4" />
                  </div>
                  <span className="font-bold text-[13px]">Sign Out</span>
                </DropdownMenuItem>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Desktop-only: Sign Out AFTER profile */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="h-8 w-px bg-white/10" />
          <button
            type="button"
            onClick={() => logoutMutation.mutate()}
            className="flex h-9 items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 text-xs font-bold text-rose-400 transition-all hover:bg-rose-500/20 hover:text-rose-300 hover:border-rose-400/50"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}

