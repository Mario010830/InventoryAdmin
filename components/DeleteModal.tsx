"use client";

import { Icon } from "@/components/ui/Icon";

interface DeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Main title, e.g. "¿Eliminar producto?" */
  title?: string;
  /** The name/label of the item being deleted */
  itemName?: string;
  /** Extra description override — replaces the default "Se eliminará X permanentemente." */
  description?: string;
  error?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Si true, solo se muestra el botón de confirmar (ej. "Entendido") y se oculta Cancelar. */
  singleAction?: boolean;
}

export function DeleteModal({
  open,
  onClose,
  onConfirm,
  title = "¿Eliminar registro?",
  itemName,
  description,
  error,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  singleAction = false,
}: DeleteModalProps) {
  if (!open) return null;

  const message =
    description ??
    (itemName
      ? `Se eliminará "${itemName}" permanentemente.`
      : "Esta acción no se puede deshacer.");

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-icon">
          <Icon name="delete_outline" />
        </div>
        <div className="">
          <h3 className="confirm-title">{title}</h3>
          <p className="confirm-msg">{message}</p>
        </div>

        {error && (
          <p className="form-error" style={{ textAlign: "center" }}>
            {error}
          </p>
        )}

        <div className="confirm-actions">
          {!singleAction && (
            <button
              type="button"
              className="confirm-btn confirm-btn--cancel"
              onClick={onClose}
            >
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className="confirm-btn confirm-btn--danger"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}