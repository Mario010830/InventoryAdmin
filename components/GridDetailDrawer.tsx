"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import "./grid-detail-drawer.css";

export interface GridDetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  statusBadge?: React.ReactNode;
  children: React.ReactNode;
  /** 1-based index for counter */
  currentPosition: number;
  total: number;
  entityLabelPlural: string;
  onPrev: () => void;
  onNext: () => void;
  onEdit?: () => void;
  showEditButton?: boolean;
}

export function GridDetailDrawer({
  open,
  onClose,
  title,
  statusBadge,
  children,
  currentPosition,
  total,
  entityLabelPlural,
  onPrev,
  onNext,
  onEdit,
  showEditButton = true,
}: GridDetailDrawerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [open, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  const canPrev = total > 1 && currentPosition > 1;
  const canNext = total > 1 && currentPosition < total;

  const node = (
    <div
      className={`gd-drawer-root${open ? " gd-drawer-root--open" : ""}`}
      aria-hidden={!open}
    >
      <button
        type="button"
        className="gd-drawer-overlay"
        aria-label="Cerrar panel"
        onClick={onClose}
        tabIndex={open ? 0 : -1}
      />
      <aside
        className="gd-drawer-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gd-drawer-title"
      >
        <header className="gd-drawer-header">
          <div className="gd-drawer-header__title-row">
            <h2 id="gd-drawer-title" className="gd-drawer-title">
              {title}
            </h2>
            {statusBadge ? (
              <span className="gd-drawer-header__badge">{statusBadge}</span>
            ) : null}
          </div>
          <div className="gd-drawer-header__actions">
            {showEditButton && onEdit ? (
              <button
                type="button"
                className="gd-drawer-icon-btn"
                title="Editar"
                aria-label="Editar"
                onClick={onEdit}
              >
                <Icon name="edit" />
              </button>
            ) : null}
            <button
              type="button"
              className="gd-drawer-icon-btn"
              title="Cerrar"
              aria-label="Cerrar"
              onClick={onClose}
            >
              <Icon name="close" />
            </button>
          </div>
        </header>
        <div className="gd-drawer-divider" role="presentation" />
        <div className="gd-drawer-body">{children}</div>
        <footer className="gd-drawer-footer">
          <button
            type="button"
            className="gd-drawer-nav-btn"
            disabled={!canPrev}
            onClick={onPrev}
            aria-label="Registro anterior"
            title="Anterior"
          >
            <Icon name="chevron_left" />
          </button>
          <span className="gd-drawer-footer__counter">
            {currentPosition} / {total} {entityLabelPlural}
          </span>
          <button
            type="button"
            className="gd-drawer-nav-btn"
            disabled={!canNext}
            onClick={onNext}
            aria-label="Siguiente registro"
            title="Siguiente"
          >
            <Icon name="chevron_right" />
          </button>
        </footer>
      </aside>
    </div>
  );

  return createPortal(node, document.body);
}
