"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGINATION_VISIBLE_THRESHOLD } from "@/lib/pagination";
import { cn } from "@/lib/utils";

export interface TablePaginationProps {
  /** 1-based current page */
  page: number;
  /** Page size (rows per page). 0 = ALL. */
  pageSize: number;
  /** Total number of records (from API TotalCount) */
  totalCount: number;
  onPageChange: (page: number) => void;
  /** Optional class for container */
  className?: string;
}

/**
 * Renders pagination controls below a table.
 * Only visible when totalCount > PAGINATION_VISIBLE_THRESHOLD (25).
 */
export function TablePagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  className,
}: TablePaginationProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (totalCount <= PAGINATION_VISIBLE_THRESHOLD) return null;

  const totalPages = pageSize <= 0 ? 1 : Math.max(1, Math.ceil(totalCount / pageSize));
  const start = pageSize <= 0 ? 1 : (page - 1) * pageSize + 1;
  const end = pageSize <= 0 ? totalCount : Math.min(page * pageSize, totalCount);

  const handlePageChange = (newPage: number) => {
    onPageChange(newPage);

    // After triggering page change, scroll the nearest scrollable parent to top
    // Use requestAnimationFrame to ensure it happens after the next render cycle starts
    requestAnimationFrame(() => {
      let parent = containerRef.current?.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        const overflowY = style.overflowY;
        const isScrollable = overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay";

        // If the element is actually scrollable, scroll it to top
        if (isScrollable && parent.scrollHeight > parent.clientHeight) {
          parent.scrollTo({ top: 0, behavior: "instant" });
          return;
        }
        parent = parent.parentElement;
      }

      // If no scrollable parent found (e.g. main window scrolling), scroll the window
      window.scrollTo({ top: 0, behavior: "instant" });
    });
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 border-t border-secondary-200 bg-secondary-50/50 text-sm text-secondary-600",
        className
      )}
    >
      <span className="font-medium">
        Showing <span className="text-secondary-900">{start}</span>–<span className="text-secondary-900">{end}</span> of{" "}
        <span className="text-secondary-900">{totalCount}</span>
      </span>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-secondary-200"
          onClick={() => handlePageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[80px] text-center font-medium">
          Page {page} of {totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 border-secondary-200"
          onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
