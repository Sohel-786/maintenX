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
      className={`bg-white dark:bg-card border-b border-secondary-200 dark:border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-40 shadow-sm transition-colors duration-300 ${isHorizontal
        ? 'h-16 py-2'
        : hasLogo ? 'min-h-[5rem] py-3' : 'h-16 py-3'
        }`}
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

        <div className="h-10 w-px bg-secondary-200 dark:bg-border hidden lg:block" />

        {currentPair && (
          hasMultipleLocations ? (
            <button
              type="button"
              onClick={openSwitchLocation}
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-border bg-secondary-50/30 dark:bg-card hover:bg-secondary-50 dark:hover:bg-muted hover:border-primary-300 dark:hover:border-primary-500/30 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500/20 shadow-sm min-w-0"
              title="Switch company or location"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-xs font-bold text-secondary-900 dark:text-white truncate max-w-[140px] hidden sm:block">
                  {currentPair.companyName}
                </span>
              </div>
              <div className="w-px h-5 bg-secondary-200 dark:bg-secondary-700" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-xs font-bold text-secondary-900 dark:text-white truncate max-w-[120px] hidden sm:block">
                  {currentPair.locationName}
                </span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-secondary-400 dark:text-secondary-500" />
            </button>
          ) : (
            <div
              className="flex items-center gap-3 px-3 py-1.5 rounded-lg border border-secondary-200 dark:border-border bg-secondary-50/30 dark:bg-card shadow-sm min-w-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shrink-0">
                  <Building2 className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-xs font-bold text-secondary-900 dark:text-white truncate max-w-[140px] hidden sm:block">
                  {currentPair.companyName}
                </span>
              </div>
              <div className="w-px h-5 bg-secondary-200 dark:bg-secondary-700" />
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex items-center justify-center w-7 h-7 rounded bg-white dark:bg-secondary-800 border border-secondary-100 dark:border-secondary-700 shrink-0">
                  <MapPin className="h-3.5 w-3.5 text-primary-600 dark:text-primary-400" />
                </div>
                <span className="text-xs font-bold text-secondary-900 dark:text-white truncate max-w-[120px] hidden sm:block">
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
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-secondary-900 dark:text-primary-300 bg-secondary-100/50 dark:bg-primary-950/20 hover:bg-secondary-200 dark:hover:bg-primary-900/30 hover:text-primary-700 dark:hover:text-primary-300 transition-all font-bold border border-secondary-300 dark:border-primary-500/30 shadow-sm"
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
        <div className="flex items-center gap-3">
          <Avatar user={user} size={isHorizontal ? "sm" : "md"} showName={false} />
          <div className="flex flex-col justify-center min-w-0">
            <span className={`font-semibold text-secondary-900 dark:text-white truncate ${isHorizontal ? 'text-xs' : 'text-sm'
              }`}>
              {user.firstName} {user.lastName}
            </span>
            <span className={`text-secondary-500 dark:text-secondary-400 truncate ${isHorizontal ? 'text-[10px]' : 'text-xs'
              }`}>
              {user.username}
            </span>
          </div>
        </div>
        {isHorizontal && (
          <div className="border-l border-secondary-200 dark:border-border pl-4 ml-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-secondary-900 dark:text-rose-300 bg-secondary-100/50 dark:bg-rose-950/20 border-secondary-300 dark:border-rose-900/30 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center gap-2 px-3 h-9 rounded-lg transition-all duration-200 font-bold"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Logout</span>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
