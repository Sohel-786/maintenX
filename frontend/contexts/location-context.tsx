"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type LocationOption = { id: number; name: string };
export type CompanyLocationAccess = {
  companyId: number;
  companyName: string;
  companyLogo?: string;
  locations: LocationOption[];
};

export type SelectedOrgContext = {
  companyId: number;
  locationId: number;
};

const LS_ALLOWED = "allowedLocationAccess";
const LS_SELECTED = "selectedOrgContext";

type ContextValue = {
  allowedAccess: CompanyLocationAccess[];
  selected: SelectedOrgContext | null;
  setAllowedAccess: (access: CompanyLocationAccess[]) => void;
  setSelected: (selected: SelectedOrgContext | null) => void;
  clearSelected: () => void;
  isSelectedValid: (selected: SelectedOrgContext | null, access?: CompanyLocationAccess[]) => boolean;
  getAllPairs: (access?: CompanyLocationAccess[]) => Array<{ companyId: number; companyName: string; companyLogo?: string; locationId: number; locationName: string }>;
};

const LocationContext = createContext<ContextValue | null>(null);

export function useLocationContext() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocationContext must be used within LocationProvider");
  return ctx;
}

function safeParseJson<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [allowedAccess, setAllowedAccessState] = useState<CompanyLocationAccess[]>([]);
  const [selected, setSelectedState] = useState<SelectedOrgContext | null>(null);

  useEffect(() => {
    // hydrate from localStorage
    const allowed = safeParseJson<CompanyLocationAccess[]>(localStorage.getItem(LS_ALLOWED));
    if (Array.isArray(allowed)) setAllowedAccessState(allowed);
    const sel = safeParseJson<SelectedOrgContext>(localStorage.getItem(LS_SELECTED));
    if (sel && typeof sel.companyId === "number" && typeof sel.locationId === "number") setSelectedState(sel);
  }, []);

  const isSelectedValid = useCallback(
    (sel: SelectedOrgContext | null, access: CompanyLocationAccess[] = allowedAccess) => {
      if (!sel) return false;
      return access.some((c) => c.companyId === sel.companyId && c.locations.some((l) => l.id === sel.locationId));
    },
    [allowedAccess],
  );

  const getAllPairs = useCallback((access: CompanyLocationAccess[] = allowedAccess) => {
    const pairs: Array<{ companyId: number; companyName: string; companyLogo?: string; locationId: number; locationName: string }> = [];
    for (const c of access) {
      for (const l of c.locations || []) {
        pairs.push({ companyId: c.companyId, companyName: c.companyName, companyLogo: c.companyLogo, locationId: l.id, locationName: l.name });
      }
    }
    return pairs;
  }, [allowedAccess]);

  const setAllowedAccess = useCallback((access: CompanyLocationAccess[]) => {
    setAllowedAccessState(access || []);
    localStorage.setItem(LS_ALLOWED, JSON.stringify(access || []));
  }, []);

  const setSelected = useCallback((sel: SelectedOrgContext | null) => {
    setSelectedState(sel);
    if (sel) localStorage.setItem(LS_SELECTED, JSON.stringify(sel));
    else localStorage.removeItem(LS_SELECTED);
    // Notify any listeners (e.g., header, api) that context changed
    window.dispatchEvent(new CustomEvent("orgContextChanged", { detail: sel }));
  }, []);

  const clearSelected = useCallback(() => {
    setSelected(null);
  }, [setSelected]);

  const value = useMemo<ContextValue>(() => ({
    allowedAccess,
    selected,
    setAllowedAccess,
    setSelected,
    clearSelected,
    isSelectedValid,
    getAllPairs,
  }), [allowedAccess, selected, setAllowedAccess, setSelected, clearSelected, isSelectedValid, getAllPairs]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

