"use client";

import * as React from "react";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";

export interface SearchableSelectOption {
  value: number | string;
  label: string;
  disabled?: boolean;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: number | string | "";
  onChange: (value: number | string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  id?: string;
  label?: string;
  error?: string;
  className?: string;
  "aria-label"?: string;
  /** When true, dropdown renders in a fixed-position portal (prevents clipping inside tables/scroll areas). */
  portal?: boolean;
  /** Optional callback for server-side search. When provided, internal filtering is disabled. */
  onSearchChange?: (term: string) => void;
  /** Optional callback for loading more items (infinite scroll) */
  onLoadMore?: () => void;
  /** Whether more pages are available to load */
  hasNextPage?: boolean;
  /** Whether currently loading more items */
  isLoadingMore?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  searchPlaceholder = "Search...",
  id,
  label,
  error,
  className,
  "aria-label": ariaLabel,
  portal = false,
  onSearchChange,
  onLoadMore,
  hasNextPage,
  isLoadingMore,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredOptions = React.useMemo(() => {
    if (onSearchChange) return options; // Server-side filtering
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(term),
    );
  }, [options, searchTerm, onSearchChange]);

  const selectedLabel = value !== undefined && value !== null && value !== ""
    ? options.find((o) => o.value === value)?.label ?? ""
    : "";

  const lastInteractionRef = useRef<"click" | "key" | "tab" | "select" | null>(null);

  const focusNext = () => {
    const focusable = Array.from(
      document.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    const index = focusable.indexOf(triggerRef.current!);
    if (index > -1 && index < focusable.length - 1) {
      focusable[index + 1].focus();
    }
  };

  const selectOption = (opt: SearchableSelectOption) => {
    if (opt.disabled) return;
    lastInteractionRef.current = "select";
    onChange(opt.value);
    setIsOpen(false);
    // Professional touch: Move to next field after selection
    setTimeout(() => focusNext(), 50);
  };

  useEffect(() => {
    if (isOpen) {
      setSearchTerm("");
      setHighlightIndex(0);
      lastInteractionRef.current = null;
      const timer = setTimeout(() => searchInputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      // Return focus to the trigger button when closing, 
      // UNLESS it was closed by Tabbing away, selection (which handles its own focus), 
      // or focus already moved elsewhere
      if (lastInteractionRef.current !== "tab" && lastInteractionRef.current !== "select") {
        const timeout = setTimeout(() => {
          if (
            document.activeElement === document.body ||
            containerRef.current?.contains(document.activeElement)
          ) {
            triggerRef.current?.focus();
          }
        }, 10);
        return () => clearTimeout(timeout);
      }
    }
  }, [isOpen]);

  const moveHighlight = (delta: number) => {
    setHighlightIndex((i) => {
      let next = i + delta;
      if (next < 0) next = 0;
      if (next >= filteredOptions.length) next = filteredOptions.length - 1;
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    const el = listRef.current;
    if (!el) return;
    const item = el.children[highlightIndex] as HTMLElement;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      // When dropdown is rendered in a portal (fixed), clicks inside it should NOT close the select.
      if (containerRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setIsOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        lastInteractionRef.current = "key";
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Infinite Scroll Observer
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (!isOpen || !onLoadMore || !hasNextPage) return;

    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isLoadingMore) {
        onLoadMore();
      }
    });

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [isOpen, hasNextPage, isLoadingMore, onLoadMore]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveHighlight(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveHighlight(-1);
        break;
      case "Enter":
        e.preventDefault();
        const opt = filteredOptions[highlightIndex];
        if (opt) selectOption(opt);
        break;
      case "Escape":
        e.preventDefault();
        lastInteractionRef.current = "key";
        setIsOpen(false);
        break;
      case "Tab":
        lastInteractionRef.current = "tab";
        setIsOpen(false);
        break;
    }
  };

  const listboxId = id ? `${id}-listbox` : "searchable-select-listbox";
  const activeOptionId = id ? `${id}-option-${highlightIndex}` : `searchable-select-option-${highlightIndex}`;

  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const updateDropdownRect = React.useCallback(() => {
    if (!portal) return;
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownRect({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 200) });
  }, [portal]);

  useLayoutEffect(() => {
    if (!portal) return;
    if (isOpen) updateDropdownRect();
    else setDropdownRect(null);
  }, [portal, isOpen, updateDropdownRect]);

  useEffect(() => {
    if (!portal || !isOpen) return;
    const handleScrollOrResize = () => updateDropdownRect();
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [portal, isOpen, updateDropdownRect]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {label && (
        <Label htmlFor={id} className="block mb-1 text-sm font-medium text-secondary-700 dark:text-secondary-100">
          {label}
        </Label>
      )}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        aria-label={ariaLabel ?? label ?? placeholder}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-secondary-300 dark:border-secondary-200 bg-white dark:bg-secondary-900/50 px-3 py-2 text-left text-sm ring-offset-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-red-500",
        )}
      >
        <span className={cn("truncate", selectedLabel ? "text-slate-900 dark:text-foreground font-medium" : "text-secondary-500 dark:text-secondary-400")}>
          {selectedLabel || placeholder}
        </span>
        <svg
          className={cn("h-4 w-4 text-secondary-500 transition-transform", isOpen && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen &&
        (!portal ? (
          <div className="absolute z-50 mt-1 w-full rounded-md border border-secondary-200 dark:border-border bg-white dark:bg-card shadow-lg overflow-hidden">
            <div className="border-b border-secondary-200 dark:border-border p-2 bg-secondary-50 dark:bg-secondary-900/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  autoComplete="off"
                  value={searchTerm}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchTerm(val);
                    setHighlightIndex(0);
                    if (onSearchChange) onSearchChange(val);
                  }}
                  placeholder={searchPlaceholder}
                  className="h-9 pl-8 border-secondary-200 dark:border-secondary-700 bg-white dark:bg-input focus:ring-1 focus:ring-primary-500 shadow-sm font-medium"
                  onKeyDown={handleKeyDown}
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded="true"
                  aria-haspopup="listbox"
                  aria-controls={listboxId}
                  aria-activedescendant={activeOptionId}
                />
              </div>
            </div>
            <ul
              ref={listRef}
              id={listboxId}
              className="max-h-60 overflow-auto py-1"
              role="listbox"
              aria-label={label ?? placeholder}
            >
              {filteredOptions.length === 0 ? (
                <li className="px-3 py-2 text-sm text-secondary-500 italic font-medium">No matches</li>
              ) : (
                filteredOptions.map((opt, index) => (
                  <li
                    key={opt.value}
                    id={id ? `${id}-option-${index}` : `searchable-select-option-${index}`}
                    role="option"
                    aria-selected={value === opt.value}
                    aria-disabled={opt.disabled}
                    className={cn(
                      "px-3 py-2 text-sm transition-colors font-medium",
                      opt.disabled
                        ? "cursor-not-allowed bg-secondary-50 dark:bg-secondary-900/50 text-secondary-400 dark:text-muted-foreground"
                        : "cursor-pointer",
                      !opt.disabled && value === opt.value
                        ? "bg-primary-50 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 shadow-sm"
                        : !opt.disabled && index === highlightIndex
                          ? "bg-secondary-100 dark:bg-primary-600 text-slate-900 dark:text-white outline-none font-bold"
                          : !opt.disabled && "text-slate-700 dark:text-secondary-800 hover:bg-secondary-50 dark:hover:bg-primary-600 dark:hover:text-white",
                    )}
                    onClick={() => {
                      selectOption(opt);
                    }}
                    onMouseEnter={() => !opt.disabled && setHighlightIndex(index)}
                  >
                    {opt.label}
                  </li>
                ))
              )}
              {hasNextPage && (
                <li ref={loadMoreRef} className="px-3 py-2 flex justify-center">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                </li>
              )}
            </ul>
          </div>
        ) : (
          dropdownRect &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={dropdownRef}
              className="fixed z-[9999] max-h-[min(70vh,320px)] min-w-[200px] rounded-md border border-secondary-200 dark:border-border bg-white dark:bg-card shadow-lg overflow-hidden"
              style={{ top: dropdownRect.top, left: dropdownRect.left, width: dropdownRect.width }}
            >
              <div className="border-b border-secondary-200 dark:border-border p-2 bg-secondary-50 dark:bg-secondary-900/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-400" />
                  <Input
                    ref={searchInputRef}
                    type="text"
                    autoComplete="off"
                    value={searchTerm}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearchTerm(val);
                      setHighlightIndex(0);
                      if (onSearchChange) onSearchChange(val);
                    }}
                    placeholder={searchPlaceholder}
                    className="h-9 pl-8 border-secondary-200 dark:border-secondary-700 bg-white dark:bg-input focus:ring-1 focus:ring-primary-500 shadow-sm font-medium"
                    onKeyDown={handleKeyDown}
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded="true"
                    aria-haspopup="listbox"
                    aria-controls={listboxId}
                    aria-activedescendant={activeOptionId}
                  />
                </div>
              </div>
              <ul
                ref={listRef}
                id={listboxId}
                className="max-h-60 overflow-auto py-1"
                role="listbox"
                aria-label={label ?? placeholder}
              >
                {filteredOptions.length === 0 ? (
                  <li className="px-3 py-2 text-sm text-secondary-500 italic font-medium">No matches</li>
                ) : (
                  filteredOptions.map((opt, index) => (
                    <li
                      key={opt.value}
                      id={id ? `${id}-option-${index}` : `searchable-select-option-${index}`}
                      role="option"
                      aria-selected={value === opt.value}
                      aria-disabled={opt.disabled}
                      className={cn(
                        "px-3 py-2 text-sm transition-colors font-medium",
                        opt.disabled
                          ? "cursor-not-allowed bg-secondary-50 dark:bg-secondary-900/50 text-secondary-400 dark:text-muted-foreground"
                          : "cursor-pointer",
                        !opt.disabled && value === opt.value
                          ? "bg-primary-50 dark:bg-primary-900/40 text-primary-800 dark:text-primary-300 shadow-sm"
                          : !opt.disabled && index === highlightIndex
                            ? "bg-secondary-100 dark:bg-primary-600 text-slate-900 dark:text-white outline-none font-bold"
                            : !opt.disabled && "text-slate-700 dark:text-secondary-800 hover:bg-secondary-50 dark:hover:bg-primary-600 dark:hover:text-white",
                      )}
                      onClick={() => {
                        selectOption(opt);
                      }}
                      onMouseEnter={() => !opt.disabled && setHighlightIndex(index)}
                    >
                      {opt.label}
                    </li>
                  ))
                )}
                {hasNextPage && (
                  <li ref={loadMoreRef} className="px-3 py-2 flex justify-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                  </li>
                )}
              </ul>
            </div>,
            document.body,
          )
        ))}

      {error && (
        <p className="text-sm font-medium text-rose-500 mt-1" role="alert">{error}</p>
      )}
    </div>
  );
}
