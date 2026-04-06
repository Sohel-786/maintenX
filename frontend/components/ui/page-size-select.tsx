"use client";

import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";

const filterLabelClass = "text-[11px] font-medium text-secondary-500 uppercase tracking-wider mb-1 block";

export interface PageSizeSelectProps {
  value: number;
  onChange: (pageSize: number) => void;
  label?: string;
  className?: string;
}

/**
 * Compact row count selector (25, 50, 75, 100, ALL). Stays narrow so it never forces a new row.
 */
export function PageSizeSelect({ value, onChange, label = "Rows", className }: PageSizeSelectProps) {
  return (
    <div className={cn("min-w-0 w-20 shrink-0 max-w-[5.5rem]", className)}>
      <label className={filterLabelClass}>{label}</label>
      <Select
        value={value.toString()}
        onValueChange={(v) => onChange(Number(v))}
        className="h-9 w-full min-w-0"
        aria-label={label}
      >
        {PAGE_SIZE_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value.toString()}>
            {opt.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

export { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS };
