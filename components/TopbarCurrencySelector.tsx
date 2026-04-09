"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import "./topbar-currency.css";

export function TopbarCurrencySelector() {
  const { selectedCurrency, activeCurrencies, setCurrencyId, isLoading } =
    useDisplayCurrency();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const list =
    activeCurrencies.length > 0 ? activeCurrencies : [selectedCurrency];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onPick = useCallback(
    (id: number) => {
      setCurrencyId(id);
      setOpen(false);
    },
    [setCurrencyId],
  );

  return (
    <div className="topbar-currency" ref={rootRef}>
      <button
        type="button"
        className="topbar-currency__trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={isLoading && list.length === 0}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="topbar-currency__code">{selectedCurrency.code}</span>
        <span className="topbar-currency__caret" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul
          className="topbar-currency__menu"
          aria-label="Moneda de visualización"
        >
          {list.map((c) => {
            const active = c.id === selectedCurrency.id;
            return (
              <li key={c.id} aria-selected={active}>
                <button
                  type="button"
                  className="topbar-currency__option"
                  onClick={() => onPick(c.id)}
                >
                  <span className="topbar-currency__check" aria-hidden>
                    {active ? "✓" : ""}
                  </span>
                  <span className="topbar-currency__label">
                    {c.code} — {c.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
