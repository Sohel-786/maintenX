"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

export interface SoftwareProfileDraft {
  softwareName: string;
}

type ContextValue = {
  draft: SoftwareProfileDraft | null;
  setDraft: (draft: SoftwareProfileDraft | null) => void;
};

const SoftwareProfileDraftContext = createContext<ContextValue | null>(null);

export function useSoftwareProfileDraft() {
  return useContext(SoftwareProfileDraftContext);
}

export function SoftwareProfileDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraftState] = useState<SoftwareProfileDraft | null>(null);
  const setDraft = useCallback((value: SoftwareProfileDraft | null) => {
    setDraftState(value);
  }, []);
  return (
    <SoftwareProfileDraftContext.Provider value={{ draft, setDraft }}>
      {children}
    </SoftwareProfileDraftContext.Provider>
  );
}
