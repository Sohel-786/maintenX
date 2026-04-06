"use client";

import * as React from "react";
import { useRef, useEffect, useState, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { Search, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";

export interface MultiSelectSearchOption {
  value: number | string;
  label: string;
}

export interface MultiSelectSearchProps {
  options: MultiSelectSearchOption[];
  value: (number | string)[];
  onChange: (value: (number | string)[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  id?: string;
  label?: string;
  className?: string;
  "aria-label"?: string;
  /** Optional callback for server-side search. When provided, internal filtering is disabled. */
  onSearchChange?: (term: string) => void;
  /** Optional callback for loading more items (infinite scroll) */
  onLoadMore?: () => void;
  /** Whether more pages are available to load */
  hasNextPage?: boolean;
  /** Whether currently loading more items */
  isLoadingMore?: boolean;
}

export function MultiSelectSearch({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  disabled = false,
  id,
  label,
  className,
  "aria-label": ariaLabel,
  onSearchChange,
  onLoadMore,
  hasNextPage,
  isLoadingMore,
}: MultiSelectSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = React.useDeferredValue(searchTerm);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (onSearchChange) return options; // Backend handles filtering
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(term));
  }, [options, searchTerm, onSearchChange]);

  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, onSearchChange]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  const updateDropdownRect = React.useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
  }, []);

  useLayoutEffect(() => {
    if (isOpen) updateDropdownRect();
    else setDropdownRect(null);
  }, [isOpen, updateDropdownRect]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updateDropdownRect();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updateDropdownRect]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const toggle = (v: number | string) => {
    const set = new Set(value);
    if (set.has(v)) set.delete(v);
    else set.add(v);
    onChange(Array.from(set));
  };

  const displayText =
    value.length === 0
      ? placeholder
      : value.length === 1
        ? options.find((o) => o.value === value[0])?.label ?? placeholder
        : `${value.length} selected`;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <Label htmlFor={id} className="block mb-1.5 text-sm font-medium text-secondary-700 dark:text-secondary-100">
          {label}
        </Label>
      )}
      <button
        type="button"
        id={id}
        aria-label={ariaLabel ?? label ?? placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-secondary-300 dark:border-secondary-200 bg-white dark:bg-secondary-900/50 px-3 py-1 text-left text-sm ring-offset-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
        )}
      >
        <span className={cn("min-w-0 flex-1 break-words text-left", value.length ? "text-text dark:text-foreground" : "text-secondary-500 dark:text-secondary-400")}>
          {displayText}
        </span>
        <svg
          className={cn("h-4 w-4 shrink-0 text-secondary-500 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        dropdownRect &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] max-h-[min(70vh,320px)] min-w-[200px] max-w-[min(100vw-2rem,420px)] rounded-lg border border-secondary-200 dark:border-border bg-white dark:bg-card shadow-lg"
            style={{
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
            }}
          >
            <div className="border-b border-secondary-200 dark:border-border p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-9 pl-8 border-secondary-200 text-sm"
                />
              </div>
            </div>

            <ul className="max-h-60 overflow-auto py-1 scrollbar-thin" role="listbox">
              {filteredOptions.length === 0 && !isLoadingMore ? (
                <li className="px-3 py-2 text-sm text-secondary-500">No matches</li>
              ) : (
                filteredOptions.map((opt) => {
                  const selected = value.includes(opt.value);
                  return (
                      <li
                        key={String(opt.value)}
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 px-3 py-2 text-sm transition-colors",
                          "text-secondary-900 dark:text-secondary-800 hover:bg-secondary-50 dark:hover:bg-primary-600 dark:hover:text-white",
                          selected && "bg-primary-50 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300",
                        )}
                        onClick={() => toggle(opt.value)}
                      >
                      <span
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          selected
                            ? "border-primary-500 bg-primary-500 text-white"
                            : "border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800",
                        )}
                      >
                        {selected ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="min-w-0 flex-1 break-words text-left">{opt.label}</span>
                    </li>
                  );
                })
              )}
              {/* Infinite Scroll Trigger */}
              {onLoadMore && hasNextPage && (
                <InfiniteScrollTrigger onVisible={onLoadMore} />
              )}
              {isLoadingMore && (
                <li className="px-3 py-4 flex items-center justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}

function InfiniteScrollTrigger({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onVisible();
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [onVisible]);

  return <div ref={ref} className="h-4 w-full" />;
}
