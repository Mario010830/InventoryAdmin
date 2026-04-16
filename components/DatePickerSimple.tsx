"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Icon } from "./ui/Icon";

function parseLocalDate(dateStr: string): Date | undefined {
  if (!dateStr?.trim()) return undefined;
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n)))
    return undefined;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}

export function DatePickerSimple({
  date,
  setDate,
  className,
  emptyLabel = "Seleccionar fecha",
  buttonClassName,
  triggerId,
  triggerAriaLabel,
}: {
  date: string;
  setDate: (date: string) => void;
  className?: string;
  /** Texto cuando no hay fecha (p. ej. registro en inglés) */
  emptyLabel?: string;
  /** Clases del trigger (p. ej. filtros de grilla) */
  buttonClassName?: string;
  /** Evitar ids duplicados si hay varios pickers en el mismo formulario */
  triggerId?: string;
  /** Accesibilidad cuando el label visible no basta (p. ej. varias fechas en fila) */
  triggerAriaLabel?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseLocalDate(date);
  const displayLabel = selected
    ? selected.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : date?.trim()
      ? date
      : emptyLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          id={triggerId ?? "date-picker-trigger"}
          aria-label={triggerAriaLabel ?? undefined}
          className={cn(
            "input-wrapper h-9 w-full justify-start gap-2 px-3 font-normal shadow-none",
            buttonClassName,
            className,
          )}
        >
          <Icon name="calendar_today" />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          captionLayout="dropdown"
          onSelect={(d) => {
            setDate(d ? d.toISOString().split("T")[0] : "");
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
