'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { HorizontalNav } from '@/components/layout/horizontal-nav';
import { User, UserPermission, Role } from '@/types';
import { SoftwareProfileDraftProvider } from '@/contexts/software-profile-draft-context';
import { useCurrentUserPermissions } from '@/hooks/use-settings';
import { AccessDenied } from '@/components/ui/access-denied';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useLocationContext, CompanyLocationAccess } from "@/contexts/location-context";
import { OrgContextDialog } from "@/components/auth/org-context-dialog";
import { MxAppChrome } from "@/components/mx/mx-app-chrome";

/** Query key prefixes that depend on current company/location; refetch when user switches location. */
const LOCATION_SCOPED_QUERY_KEYS: readonly string[] = [
  'dashboard-metrics',
  'companies',
  'locations',
  'complaints',
  'complaint-categories',
  'facility-departments',
  'mx-sidebar-counts',
];

function checkRouteAccess(pathname: string, permissions: UserPermission, user: User): boolean {
  if (pathname.startsWith('/complaints/raise')) return permissions.raiseComplaint;
  if (pathname.startsWith('/all-tickets')) {
    return !!(
      permissions.viewComplaints &&
      (permissions.viewAllComplaints || user.role === Role.COORDINATOR || user.role === Role.ADMIN)
    );
  }
  if (pathname.startsWith('/my-tickets')) return permissions.viewComplaints;
  if (pathname.startsWith('/assign-work') || pathname.startsWith('/close-tickets'))
    return permissions.assignComplaints;
  if (pathname.startsWith('/my-work'))
    return permissions.handleComplaints && permissions.viewComplaints;
  if (pathname.startsWith('/departments')) return permissions.manageCategories;

  const routes = (
    [
      { route: "/dashboard", key: "viewDashboard" },
      { route: "/complaints", key: "viewComplaints" },
      { route: "/categories", key: "manageCategories" },
      { route: "/companies", key: "manageCompany" },
      { route: "/locations", key: "manageLocation" },
      { route: "/settings", key: "accessSettings" },
      { route: "/users", key: "accessSettings" },
    ] as const satisfies readonly { route: string; key: keyof UserPermission }[]
  )
    .slice()
    .sort((a, b) => b.route.length - a.route.length);

  const match = routes.find((r) => pathname === r.route || pathname.startsWith(`${r.route}/`));
  if (!match) return true;
  return !!permissions[match.key];
}

function getFirstAllowedRoute(permissions: UserPermission | null | undefined, user: User | null): string {
  if (!permissions) return '/dashboard';
  if (permissions.viewDashboard) return '/dashboard';
  if (user?.role === Role.EMPLOYEE && permissions.viewComplaints) return '/my-tickets';
  if (
    permissions.viewComplaints &&
    (permissions.viewAllComplaints || user?.role === Role.COORDINATOR || user?.role === Role.ADMIN)
  )
    return '/all-tickets';
  if (permissions.viewComplaints) return '/my-tickets';
  if (permissions.raiseComplaint) return '/dashboard';
  if (permissions.assignComplaints) return '/assign-work';
  if (permissions.handleComplaints && permissions.viewComplaints) return '/my-work';
  if (permissions.manageCategories) return '/categories';
  if (permissions.manageCompany) return '/companies';
  if (permissions.manageLocation) return '/locations';
  if (permissions.accessSettings) return '/settings';
  return '/dashboard';
}

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/my-tickets': 'My tickets',
  '/all-tickets': 'All tickets',
  '/assign-work': 'Assign work',
  '/close-tickets': 'Close tickets',
  '/my-work': 'My work',
  '/complaints': 'Tickets',
  '/complaints/raise': 'Raise ticket',
  '/categories': 'Categories',
  '/departments': 'Departments',
  '/companies': 'Companies',
  '/locations': 'Locations',
  '/settings': 'Settings',
  '/users': 'Users',
};

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [navExpanded, setNavExpanded] = useState(true);
  const queryClient = useQueryClient();
  const { allowedAccess, selected, setAllowedAccess, setSelected, clearSelected, isSelectedValid, getAllPairs } = useLocationContext();
  const [orgDialogOpen, setOrgDialogOpen] = useState(false);

  // When current user updates their profile (name, avatar, username), refresh header without reload
  useEffect(() => {
    const onCurrentUserUpdated = (e: Event) => {
      const detail = (e as CustomEvent<User>).detail;
      if (detail) setUser(detail);
    };
    window.addEventListener('currentUserUpdated', onCurrentUserUpdated);
    return () => window.removeEventListener('currentUserUpdated', onCurrentUserUpdated);
  }, []);

  // When user switches company/location, invalidate all location-scoped data so current page refetches without reload
  useEffect(() => {
    const onOrgContextChanged = () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const firstKey = query.queryKey[0];
          return typeof firstKey === 'string' && LOCATION_SCOPED_QUERY_KEYS.includes(firstKey);
        },
      });
    };
    window.addEventListener('orgContextChanged', onOrgContextChanged);
    return () => window.removeEventListener('orgContextChanged', onOrgContextChanged);
  }, [queryClient]);

  const isFixedLayout =
    pathname.startsWith('/companies') ||
    pathname.startsWith('/locations') ||
    pathname.startsWith('/complaints') ||
    pathname.startsWith('/categories') ||
    pathname.startsWith('/departments') ||
    pathname.startsWith('/my-tickets') ||
    pathname.startsWith('/all-tickets') ||
    pathname.startsWith('/assign-work') ||
    pathname.startsWith('/close-tickets') ||
    pathname.startsWith('/my-work');

  const { data: permissions, isLoading: permissionsLoading } = useCurrentUserPermissions(
    pathname !== '/login' && !loading && !!user
  );

  const isHorizontal = permissions?.navigationLayout === 'HORIZONTAL';

  const validateAndGetUser = useCallback(async () => {
    if (pathname === '/login') {
      setLoading(false);
      return;
    }

    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }

    try {
      const response = await api.post('/auth/validate');
      if (response.data.user) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      // allowed location access can come as AllowedLocationAccess (Pascal) or allowedLocationAccess (camel)
      const rawAccess =
        response.data?.allowedLocationAccess ??
        response.data?.AllowedLocationAccess ??
        response.data?.data?.allowedLocationAccess ??
        response.data?.data?.AllowedLocationAccess ??
        [];
      if (Array.isArray(rawAccess)) {
        const access = rawAccess as CompanyLocationAccess[];
        setAllowedAccess(access);
      }
    } catch (err) {
      localStorage.removeItem('user');
      setUser(null);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [pathname, router, setAllowedAccess]);

  useEffect(() => {
    validateAndGetUser();
  }, [validateAndGetUser]);

  // If backend rejects request due to missing/invalid org context, show selector
  useEffect(() => {
    const onOrgRequired = () => {
      if (pathname !== "/login") setOrgDialogOpen(true);
    };
    const onOpenOrgDialog = () => setOrgDialogOpen(true);
    const onRefreshAccess = () => {
      validateAndGetUser();
    };
    window.addEventListener("orgContextRequired", onOrgRequired as any);
    window.addEventListener("openOrgDialog", onOpenOrgDialog);
    window.addEventListener("refreshLocationAccess", onRefreshAccess);
    return () => {
      window.removeEventListener("orgContextRequired", onOrgRequired as any);
      window.removeEventListener("openOrgDialog", onOpenOrgDialog);
      window.removeEventListener("refreshLocationAccess", onRefreshAccess);
    };
  }, [pathname, validateAndGetUser]);

  // Ensure we have a selected (company, location) context when needed.
  useEffect(() => {
    if (pathname === "/login") return;
    if (!user) return;
    if (!allowedAccess || allowedAccess.length === 0) return;

    const pairs = getAllPairs(allowedAccess);
    if (pairs.length === 0) {
      clearSelected();
      setOrgDialogOpen(true);
      return;
    }

    if (pairs.length === 1) {
      const only = pairs[0];
      if (!isSelectedValid(selected, allowedAccess)) {
        setSelected({ companyId: only.companyId, locationId: only.locationId });
      }
      setOrgDialogOpen(false);
      return;
    }

    // multiple: default to first pair so API always has headers; user can switch via header
    if (!isSelectedValid(selected, allowedAccess)) {
      setSelected({ companyId: pairs[0].companyId, locationId: pairs[0].locationId });
      setOrgDialogOpen(false);
    } else {
      setOrgDialogOpen(false);
    }
  }, [pathname, user, allowedAccess, selected, isSelectedValid, setSelected, clearSelected, getAllPairs]);

  if (loading || (permissionsLoading && pathname !== '/login')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (pathname === '/login' || !user) {
    return <>{children}</>;
  }

  const pairs = getAllPairs(allowedAccess);
  const needOrgSelection =
    allowedAccess &&
    allowedAccess.length > 0 &&
    (pairs.length > 1 ? !isSelectedValid(selected, allowedAccess) : false);

  // Require company/location selection before rendering app (so API calls get headers)
  if (needOrgSelection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <OrgContextDialog
          open
          access={allowedAccess}
          onSelect={(sel) => setSelected(sel)}
          closeDisabled
        />
      </div>
    );
  }

  // No access edge case: user exists but has no location access rows configured
  if (allowedAccess && allowedAccess.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md w-full bg-card text-card-foreground rounded-2xl shadow-lg border border-border p-6">
          <h1 className="text-xl font-semibold text-foreground">No location access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account does not have any company/location access configured. Please contact an admin.
          </p>
          <div className="mt-5 flex justify-end">
            <Button onClick={() => (window.location.href = "/login")} variant="outline">
              Back to login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  let hasPermission = true;
  if (permissions && user) {
    hasPermission = checkRouteAccess(pathname, permissions, user);
  }



  if (!hasPermission) {
    const firstAllowed = getFirstAllowedRoute(permissions, user);
    return (
      <SoftwareProfileDraftProvider>
        <OrgContextDialog
          open={orgDialogOpen}
          access={allowedAccess}
          onSelect={(sel) => {
            setSelected(sel);
            setOrgDialogOpen(false);
          }}
          onClose={() => setOrgDialogOpen(false)}
          closeDisabled={false}
        />
        {!isHorizontal ? (
          <MxAppChrome user={user}>
            <main className={cn("flex flex-1 items-center justify-center p-6", isFixedLayout ? "min-h-0 overflow-y-auto" : "")}>
              <AccessDenied
                actionLabel={`Go to ${ROUTE_LABELS[firstAllowed] ?? "Dashboard"}`}
                actionHref={firstAllowed}
              />
            </main>
          </MxAppChrome>
        ) : (
          <div className="min-h-screen bg-background">
            <Header user={user} isNavExpanded={navExpanded} onNavExpandChange={setNavExpanded} />
            <HorizontalNav isExpanded={navExpanded} />
            <main className={cn("flex flex-1 items-center justify-center p-6", isFixedLayout ? "min-h-0 overflow-y-auto" : "")}>
              <AccessDenied
                actionLabel={`Go to ${ROUTE_LABELS[firstAllowed] ?? "Dashboard"}`}
                actionHref={firstAllowed}
              />
            </main>
          </div>
        )}
      </SoftwareProfileDraftProvider>
    );
  }

  return (
    <SoftwareProfileDraftProvider>
      <OrgContextDialog
        open={orgDialogOpen}
        access={allowedAccess}
        onSelect={(sel) => {
          setSelected(sel);
          setOrgDialogOpen(false);
        }}
        onClose={() => setOrgDialogOpen(false)}
        closeDisabled={false}
      />
      {!isHorizontal ? (
        <MxAppChrome user={user}>
          <main
            className={cn(
              "flex flex-1 flex-col",
              isFixedLayout ? "min-h-0 overflow-y-auto" : "overflow-visible min-h-0",
            )}
          >
            {children}
          </main>
        </MxAppChrome>
      ) : (
        <div className="min-h-screen bg-background">
          <Header user={user} isNavExpanded={navExpanded} onNavExpandChange={setNavExpanded} />
          <HorizontalNav isExpanded={navExpanded} />
          <main
            className={cn(
              "flex flex-1 flex-col",
              isFixedLayout ? "min-h-0 overflow-y-auto" : "overflow-visible",
            )}
          >
            {children}
          </main>
        </div>
      )}
    </SoftwareProfileDraftProvider>
  );
}


