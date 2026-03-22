"use client";

import { useEffect, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import "./grid-filter-bar.css";

function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <button type="button" className="grid-filter-bar__clear" onClick={onClear}>
      <X size={14} strokeWidth={2.25} aria-hidden />
      Limpiar filtros
    </button>
  );
}

export function GridFilterBar({
  children,
  onClear,
  showClear = true,
}: {
  children: React.ReactNode;
  onClear: () => void;
  /** Por defecto true: el botón «Limpiar filtros» siempre visible en pantallas con filtros */
  showClear?: boolean;
}) {
  const [filtersExpanded, setFiltersExpanded] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setFiltersExpanded(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <div className="grid-filter-bar">
      <div className="grid-filter-bar__toolbar">
        <button
          type="button"
          className="grid-filter-bar__mobile-toggle"
          aria-expanded={filtersExpanded}
          onClick={() => setFiltersExpanded((v) => !v)}
        >
          Filtros
          <ChevronDown
            className={`grid-filter-bar__mobile-chevron ${filtersExpanded ? "grid-filter-bar__mobile-chevron--open" : ""}`}
            aria-hidden
            size={16}
          />
        </button>
        {showClear ? (
          <span className="grid-filter-bar__clear-wrap grid-filter-bar__clear-wrap--mobile">
            <ClearButton onClear={onClear} />
          </span>
        ) : (
          <span aria-hidden className="grid-filter-bar__toolbar-placeholder" />
        )}
      </div>

      <div
        className={`grid-filter-bar__row ${filtersExpanded ? "grid-filter-bar__row--expanded" : ""}`}
      >
        <div className="grid-filter-bar__filters">{children}</div>
        {showClear ? (
          <span className="grid-filter-bar__clear-wrap grid-filter-bar__clear-wrap--desktop">
            <ClearButton onClear={onClear} />
          </span>
        ) : null}
      </div>
    </div>
  );
}
