"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL = "__grid_filter_all__";

export function GridFilterSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
  active,
  className,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  active?: boolean;
  className?: string;
  "aria-label"?: string;
}) {
  const inner = value === "" ? ALL : value;
  return (
    <Select
      value={inner}
      onValueChange={(v) => onChange(v === ALL ? "" : v)}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        size="sm"
        className={cn(
          "grid-filter-bar__control grid-filter-bar__select-trigger !h-9 w-full min-w-0 rounded-md border border-[#e2e8f0] !bg-white shadow-none",
          "text-[0.8125rem] text-[#0f172a]",
          "focus-visible:border-[#4f6ef7] focus-visible:ring-1 focus-visible:ring-[rgba(79,110,247,0.35)]",
          "hover:border-[#cbd5e1] data-[placeholder]:text-[#94a3b8]",
          active && "grid-filter-bar__control--active border-[#4f6ef7] !bg-white",
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent position="popper" className="z-[100]">
        {options.map((o) => (
          <SelectItem key={o.value === "" ? ALL : o.value} value={o.value === "" ? ALL : o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
