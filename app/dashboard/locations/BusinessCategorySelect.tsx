"use client";

import { ChevronDown, CircleOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { BusinessCategoryLucideGlyph } from "@/components/dashboard/BusinessCategoryLucideGlyph";
import type { BusinessCategoryResponse } from "@/lib/dashboard-types";

export function BusinessCategorySelect({
  value,
  onChange,
  categories,
  loading,
  disabled,
}: {
  value: number | null;
  onChange: (id: number | null) => void;
  categories: BusinessCategoryResponse[];
  loading?: boolean;
  disabled?: boolean;
}) {
  const labelId = useId();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = categories.find((c) => c.id === value) ?? null;
  const busy = Boolean(disabled || loading);

  return (
    <div className="modal-field field-full business-cat-select" ref={rootRef}>
      <label id={labelId}>Tipo de negocio</label>
      <button
        type="button"
        className="business-cat-select__trigger"
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        onClick={() => !busy && setOpen((o) => !o)}
      >
        {loading ? (
          <span className="business-cat-select__muted">
            Cargando categorías…
          </span>
        ) : selected ? (
          <>
            <span
              className="business-cat-select__icon-wrap business-cat-select__icon-wrap--lucide"
              aria-hidden
            >
              <BusinessCategoryLucideGlyph
                categoryName={selected.name}
                size={16}
                strokeWidth={2}
              />
            </span>
            <span className="business-cat-select__text">{selected.name}</span>
          </>
        ) : (
          <span className="business-cat-select__muted">Sin especificar</span>
        )}
        <ChevronDown
          className="business-cat-select__chevron"
          size={18}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {open && !busy && (
        <ul className="business-cat-select__menu" aria-label="Tipo de negocio">
          <li role="presentation">
            <button
              type="button"
              role="option"
              aria-selected={value == null}
              className={`business-cat-select__option${value == null ? " business-cat-select__option--active" : ""}`}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              <span
                className="business-cat-select__icon-wrap business-cat-select__icon-wrap--muted business-cat-select__icon-wrap--lucide"
                aria-hidden
              >
                <CircleOff size={16} strokeWidth={2} />
              </span>
              <span>Sin especificar</span>
            </button>
          </li>
          {categories.map((c) => {
            const active = c.id === value;
            return (
              <li key={c.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`business-cat-select__option${active ? " business-cat-select__option--active" : ""}`}
                  onClick={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <span
                    className="business-cat-select__icon-wrap business-cat-select__icon-wrap--lucide"
                    aria-hidden
                  >
                    <BusinessCategoryLucideGlyph
                      categoryName={c.name}
                      size={16}
                      strokeWidth={2}
                    />
                  </span>
                  <span>{c.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
