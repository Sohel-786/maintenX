'use client';

import { useEffect, useMemo, useState } from 'react';
import { User } from '@/types';
import { Avatar } from '@/components/ui/avatar';
import { useAppSettings, useCurrentUserPermissions, useCompany } from '@/hooks/use-settings';
import { useSoftwareProfileDraft } from '@/contexts/software-profile-draft-context';
import { useLocationContext } from '@/contexts/location-context';
import { LogOut, Building2, ChevronDown, ChevronUp, MapPin } from 'lucide-react';
import { useLogout } from '@/hooks/use-auth-mutations';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './theme-toggle';

// API_BASE removed: root-relative paths should be used for assets to work in both Dev (proxied) and Prod (IIS)

interface HeaderProps {
  user: User;
  isNavExpanded: boolean;
  onNavExpandChange: (expanded: boolean) => void;
}

export function Header({ user, isNavExpanded, onNavExpandChange }: HeaderProps) {
  const { data: appSettings } = useAppSettings();
  const { data: permissions } = useCurrentUserPermissions();
  const { selected, allowedAccess, getAllPairs } = useLocationContext();

  // Fetch the latest company details to ensure reactive logo updates from Company Master
  const { data: currentCompany, isLoading: isCompanyLoading } = useCompany(selected?.companyId);

  const pairs = getAllPairs(allowedAccess);
  const currentPair = selected
    ? pairs.find((p) => p.companyId === selected.companyId && p.locationId === selected.locationId)
    : null;

  // Prioritize the fresh company logo from the API once loaded.
  // Fallback to currentPair.companyLogo only during the initial load of the Company query.
  const logoPath = !isCompanyLoading && currentCompany !== undefined ? currentCompany.logoUrl : currentPair?.companyLogo;

  const resolvedLogoUrl = useMemo(() => {
    if (!logoPath) return null;
    const normalized = logoPath.replace(/\\/g, '/');
    if (normalized.startsWith('http') || normalized.startsWith('blob:')) return normalized;
    if (normalized.startsWith('/')) return normalized;
    return `/${normalized}`;
  }, [logoPath]);

  const decodedAltLogoUrl = useMemo(() => {
    if (!resolvedLogoUrl) return null;
    const [pathPart, queryPart] = resolvedLogoUrl.split('?');
    if (!pathPart.includes('%')) return null;
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
  }, [logoCandidates.join('|')]);

  const logoUrlToRender = logoCandidates[logoTryIndex] ?? null;
  const hasLogo = Boolean(logoUrlToRender);
  const hasMultipleLocations = pairs.length > 1;

  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  const logoutMutation = useLogout();
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const openSwitchLocation = () => {
    window.dispatchEvent(new CustomEvent('openOrgDialog'));
  };

  return (
    <header
      className={`border-b border-white/10 flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-lg transition-all duration-300 ${isHorizontal
        ? 'h-16 py-2'
        : hasLogo ? 'min-h-[5rem] py-3' : 'h-16 py-3'
        }`}
      style={{ background: "var(--mx-navy-900)" }}
    >
      <div className="flex items-center min-w-0 shrink-0 gap-6">
        {hasLogo ? (
          <div className="flex items-center shrink-0 bg-transparent">
            <img
              src={logoUrlToRender!}
              alt=""
              className={isHorizontal
                ? "max-w-[85px] max-h-[52px] w-auto h-auto object-contain object-center"
                : "max-w-[110px] max-h-[72px] w-auto h-auto object-contain object-center"
              }
              onError={() => {
                setLogoTryIndex((idx) => {
                  if (idx + 1 < logoCandidates.length) return idx + 1;
                  return logoCandidates.length; // force fallback to icon
                });
              }}
            />
          </div>
        ) : (
          <div className={`flex items-center justify-center shrink-0 text-primary-600 ${isHorizontal ? 'w-[48px] h-[48px]' : 'w-[70px] h-[70px]'
            }`}>
            <Building2 className={isHorizontal ? "h-6 w-6" : "h-9 w-9"} />
          </div>
        )}

        <div className="h-10 w-px bg-white/10 hidden lg:block" />
 
        {currentPair && (
          hasMultipleLocations ? (
            <button
              type="button"
              onClick={openSwitchLocation}
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-white/20 shadow-sm min-w-0"
              title="Switch company or location"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/5 border border-white/10 shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-white/80" />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[140px] hidden sm:block">
                  {currentPair.companyName}
                </span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/5 border border-white/10 shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-white/80" />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[120px] hidden sm:block">
                  {currentPair.locationName}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-white/50" />
            </button>
          ) : (
            <div
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 shadow-sm min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/5 border border-white/10 shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-white/80" />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[140px] hidden sm:block">
                  {currentPair.companyName}
                </span>
              </div>
              <div className="w-px h-5 bg-white/10" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white/5 border border-white/10 shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-white/80" />
                </div>
                <span className="text-xs font-bold text-white truncate max-w-[120px] hidden sm:block">
                  {currentPair.locationName}
                </span>
              </div>
            </div>
          )
        )}
      </div>
 
      <div className="flex items-center gap-4 min-w-0 flex-1 justify-end">
        <ThemeToggle />
        {isHorizontal && (
          <button
            onClick={() => onNavExpandChange(!isNavExpanded)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white bg-white/10 hover:bg-white/20 transition-all font-bold border border-white/10 shadow-sm"
          >
            {isNavExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="text-sm">Hide</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="text-sm">Show</span>
              </>
            )}
          </button>
        )}
        <div className="flex items-center gap-3 pl-2 border-l border-white/10">
          <Avatar user={user} size={isHorizontal ? "sm" : "md"} showName={false} />
          <div className="flex flex-col justify-center min-w-0">
            <span className={`font-semibold text-white truncate ${isHorizontal ? 'text-xs' : 'text-sm'
              }`}>
              {user.firstName} {user.lastName}
            </span>
            <span className={`text-white/60 truncate ${isHorizontal ? 'text-[10px]' : 'text-xs'
              }`}>
              {user.username}
            </span>
          </div>
        </div>
        <div className="border-l border-white/10 pl-4 ml-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="text-rose-400 bg-rose-500/10 border-rose-500/30 hover:text-rose-300 hover:bg-rose-500/20 hover:border-rose-400/50 flex items-center gap-2 px-3 h-9 rounded-lg transition-all duration-200 font-bold"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
