"use client";

import { Icon } from "@/components/ui/Icon";

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon?: string;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
  /** Muestra un cargador centrado en el cuerpo del modal en lugar del contenido */
  loading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  /** Botones u otros controles entre «Cancelar» y el envío principal (p. ej. acción secundaria). */
  extraFooterActions?: React.ReactNode;
  error?: string;
  maxWidth?: string;
  /** Si es false, no se muestra el botón principal de envío del pie (acciones custom vía extraFooterActions). */
  showSubmitButton?: boolean;
  children: React.ReactNode;
}

export function FormModal({
  open,
  onClose,
  title,
  icon = "edit",
  onSubmit,
  submitting = false,
  loading = false,
  submitLabel = "Guardar",
  cancelLabel = "Cancelar",
  extraFooterActions,
  error,
  maxWidth = "560px",
  showSubmitButton = true,
  children,
}: FormModalProps) {
  if (!open) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-box" style={{ maxWidth }}>
        <div className="modal-header">
          <div className="modal-header__icon">
            <Icon name={icon} />
          </div>
          <h2 className="modal-header__title">{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <Icon name="close" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="modal-body">
          {loading ? (
            <div className="modal-body-loading">
              <div
                className="dt-state__spinner"
                style={{ width: 32, height: 32, borderWidth: 3 }}
              />
              <span>Cargando…</span>
            </div>
          ) : (
            <div className="modal-form-grid">{children}</div>
          )}

          {error && (
            <p className="form-error" style={{ marginTop: 12 }}>
              {error}
            </p>
          )}

          <div className="modal-footer">
            <button
              type="button"
              className="modal-btn modal-btn--ghost"
              onClick={onClose}
            >
              {cancelLabel}
            </button>
            {extraFooterActions}
            {showSubmitButton ? (
              <button
                type="submit"
                className="modal-btn modal-btn--primary"
                disabled={submitting || loading}
              >
                {submitting ? (
                  <div
                    className="dt-state__spinner"
                    style={{ width: 16, height: 16, borderWidth: 2 }}
                  />
                ) : (
                  submitLabel
                )}
              </button>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
