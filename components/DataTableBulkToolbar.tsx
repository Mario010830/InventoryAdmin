"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";

export function DefaultBulkToolbar({
  count,
  entityLabel = "elementos",
  onClear,
  onExportSelectedCsv,
  onExportSelectedXlsx,
  onDeleteSelected,
  showDelete = true,
  extra,
}: {
  count: number;
  entityLabel?: string;
  onClear: () => void;
  onExportSelectedCsv: () => void;
  onExportSelectedXlsx: () => void;
  onDeleteSelected?: () => void;
  showDelete?: boolean;
  extra?: React.ReactNode;
}) {
  return (
    <div className="dt-bulk-bar__inner">
      <span className="dt-bulk-bar__count">
        {count} {entityLabel} seleccionados
      </span>
      <div className="dt-bulk-bar__actions">
        {extra}
        {showDelete && onDeleteSelected ? (
          <button type="button" className="dt-bulk-btn dt-bulk-btn--danger" onClick={onDeleteSelected}>
            <Icon name="delete_outline" />
            Eliminar seleccionados
          </button>
        ) : null}
        <button type="button" className="dt-bulk-btn" onClick={onExportSelectedCsv}>
          <Icon name="description" />
          Exportar CSV
        </button>
        <button type="button" className="dt-bulk-btn" onClick={onExportSelectedXlsx}>
          <Icon name="table_chart" />
          Exportar Excel
        </button>
        <button type="button" className="dt-bulk-btn dt-bulk-btn--ghost" onClick={onClear}>
          Cancelar selección
        </button>
      </div>
    </div>
  );
}

function useCloseOnOutside(ref: React.RefObject<HTMLElement | null>, open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open, onClose, ref]);
}

export function ProductsBulkToolbar({
  count,
  onClear,
  onDeleteSelected,
  onSetAvailable,
  onSetForSale,
  exportSelectedCsv,
  exportSelectedXlsx,
  showDelete,
  disableMutations,
}: {
  count: number;
  onClear: () => void;
  onDeleteSelected?: () => void;
  onSetAvailable: (value: boolean) => void;
  onSetForSale: (value: boolean) => void;
  exportSelectedCsv: () => void;
  exportSelectedXlsx: () => void;
  showDelete?: boolean;
  disableMutations?: boolean;
}) {
  const [openA, setOpenA] = useState(false);
  const [openS, setOpenS] = useState(false);
  const refA = useRef<HTMLDivElement>(null);
  const refS = useRef<HTMLDivElement>(null);
  useCloseOnOutside(refA, openA, () => setOpenA(false));
  useCloseOnOutside(refS, openS, () => setOpenS(false));

  return (
    <div className="dt-bulk-bar__inner">
      <span className="dt-bulk-bar__count">{count} productos seleccionados</span>
      <div className="dt-bulk-bar__actions">
        {showDelete && onDeleteSelected ? (
          <button type="button" className="dt-bulk-btn dt-bulk-btn--danger" onClick={onDeleteSelected}>
            <Icon name="delete_outline" />
            Eliminar seleccionados
          </button>
        ) : null}
        <div className="dt-bulk-dropdown" ref={refA}>
          <button
            type="button"
            className="dt-bulk-btn"
            disabled={disableMutations}
            onClick={() => {
              setOpenS(false);
              setOpenA((o) => !o);
            }}
          >
            <Icon name="toggle_on" />
            Cambiar disponibilidad
            <Icon name="arrow_drop_down" />
          </button>
          {openA ? (
            <div className="dt-bulk-dropdown-panel" role="menu">
              <button
                type="button"
                className="dt-dropdown-item"
                onClick={() => {
                  onSetAvailable(true);
                  setOpenA(false);
                }}
              >
                Marcar disponible
              </button>
              <button
                type="button"
                className="dt-dropdown-item"
                onClick={() => {
                  onSetAvailable(false);
                  setOpenA(false);
                }}
              >
                Marcar no disponible
              </button>
            </div>
          ) : null}
        </div>
        <div className="dt-bulk-dropdown" ref={refS}>
          <button
            type="button"
            className="dt-bulk-btn"
            disabled={disableMutations}
            onClick={() => {
              setOpenA(false);
              setOpenS((o) => !o);
            }}
          >
            <Icon name="sell" />
            Cambiar en venta
            <Icon name="arrow_drop_down" />
          </button>
          {openS ? (
            <div className="dt-bulk-dropdown-panel" role="menu">
              <button
                type="button"
                className="dt-dropdown-item"
                onClick={() => {
                  onSetForSale(true);
                  setOpenS(false);
                }}
              >
                Marcar en venta
              </button>
              <button
                type="button"
                className="dt-dropdown-item"
                onClick={() => {
                  onSetForSale(false);
                  setOpenS(false);
                }}
              >
                Marcar no en venta
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className="dt-bulk-btn" onClick={exportSelectedCsv}>
          <Icon name="description" />
          Exportar CSV
        </button>
        <button type="button" className="dt-bulk-btn" onClick={exportSelectedXlsx}>
          <Icon name="table_chart" />
          Exportar Excel
        </button>
        <button type="button" className="dt-bulk-btn dt-bulk-btn--ghost" onClick={onClear}>
          Cancelar selección
        </button>
      </div>
    </div>
  );
}

export function UsersBulkToolbar({
  count,
  onClear,
  onDeleteSelected,
  onActivate,
  onDeactivate,
  exportSelectedCsv,
  exportSelectedXlsx,
  showDelete,
  statusActionsDisabled,
  activateDisabled,
  deactivateDisabled,
}: {
  count: number;
  onClear: () => void;
  onDeleteSelected?: () => void;
  onActivate: () => void;
  onDeactivate: () => void;
  exportSelectedCsv: () => void;
  exportSelectedXlsx: () => void;
  showDelete?: boolean;
  statusActionsDisabled?: boolean;
  activateDisabled?: boolean;
  deactivateDisabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useCloseOnOutside(ref, open, () => setOpen(false));

  return (
    <div className="dt-bulk-bar__inner">
      <span className="dt-bulk-bar__count">{count} usuarios seleccionados</span>
      <div className="dt-bulk-bar__actions">
        {showDelete && onDeleteSelected ? (
          <button type="button" className="dt-bulk-btn dt-bulk-btn--danger" onClick={onDeleteSelected}>
            <Icon name="delete_outline" />
            Eliminar seleccionados
          </button>
        ) : null}
        <div className="dt-bulk-dropdown" ref={ref}>
          <button
            type="button"
            className="dt-bulk-btn"
            disabled={statusActionsDisabled}
            onClick={() => setOpen((o) => !o)}
          >
            <Icon name="swap_horiz" />
            Cambiar estado
            <Icon name="arrow_drop_down" />
          </button>
          {open ? (
            <div className="dt-bulk-dropdown-panel" role="menu">
              <button
                type="button"
                className="dt-dropdown-item"
                disabled={activateDisabled}
                onClick={() => {
                  onActivate();
                  setOpen(false);
                }}
              >
                Activar
              </button>
              <button
                type="button"
                className="dt-dropdown-item"
                disabled={deactivateDisabled}
                onClick={() => {
                  onDeactivate();
                  setOpen(false);
                }}
              >
                Desactivar
              </button>
            </div>
          ) : null}
        </div>
        <button type="button" className="dt-bulk-btn" onClick={exportSelectedCsv}>
          <Icon name="description" />
          Exportar CSV
        </button>
        <button type="button" className="dt-bulk-btn" onClick={exportSelectedXlsx}>
          <Icon name="table_chart" />
          Exportar Excel
        </button>
        <button type="button" className="dt-bulk-btn dt-bulk-btn--ghost" onClick={onClear}>
          Cancelar selección
        </button>
      </div>
    </div>
  );
}
