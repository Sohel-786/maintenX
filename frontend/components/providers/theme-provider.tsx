"use client";

import { useEffect } from "react";
import api from "@/lib/api";
import { applyPrimaryColor } from "@/lib/theme";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

/**
 * Combined ThemeProvider that handles:
 * 1. Dark/Light mode switching via next-themes (class-based)
 * 2. Dynamic Primary Color application from App Settings
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  useEffect(() => {
    const updatePrimaryColor = () => {
      const selRaw = localStorage.getItem("selectedOrgContext");
      if (selRaw) {
        try {
          const sel = JSON.parse(selRaw);
          if (sel?.companyId) {
            api.get(`/companies/${sel.companyId}`).then(res => {
              const color = res.data?.data?.themeColor;
              applyPrimaryColor(color || "#0d6efd");
            }).catch(() => {
              applyPrimaryColor("#0d6efd");
            });
            return;
          }
        } catch { }
      }
      applyPrimaryColor("#0d6efd");
    };

    updatePrimaryColor();
    window.addEventListener("orgContextChanged", updatePrimaryColor);
    return () => window.removeEventListener("orgContextChanged", updatePrimaryColor);
  }, []);

  return (
    <NextThemesProvider 
      attribute="class" 
      defaultTheme="light" 
      enableSystem 
      disableTransitionOnChange
      storageKey="aira-dpm-theme"
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
