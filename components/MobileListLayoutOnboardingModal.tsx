"use client";

import {
  MOBILE_LIST_COMFORTABLE_PREVIEW_URL,
  MOBILE_LIST_TABLE_PREVIEW_URL,
  type MobileListLayoutValue,
} from "@/lib/mobileListLayout";
import "./mobile-list-layout-onboarding.css";

interface MobileListLayoutOnboardingModalProps {
  open: boolean;
  onPick: (value: MobileListLayoutValue) => void;
  onDecideLater: () => void;
}

export function MobileListLayoutOnboardingModal({
  open,
  onPick,
  onDecideLater,
}: MobileListLayoutOnboardingModalProps) {
  if (!open) return null;

  return (
    <div
      className="mllo-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mllo-title"
      aria-describedby="mllo-desc"
    >
      <div className="mllo-panel" onClick={(e) => e.stopPropagation()}>
        <h2 id="mllo-title" className="mllo-title">
          ¿Cómo prefieres ver las listas?
        </h2>
        <p id="mllo-desc" className="mllo-lead">
          Parece que entras desde el móvil. Elige cómo mostrar tablas y listas
          (productos, pedidos, inventario…). Podrás cambiarlo cuando quieras en
          Configuración.
        </p>

        <div className="mllo-grid">
          <button
            type="button"
            className="mllo-choice"
            onClick={() => onPick("table")}
          >
            {/* biome-ignore lint/performance/noImgElement: assets estáticos en /public */}
            <img src={MOBILE_LIST_TABLE_PREVIEW_URL} alt="" />
            <div className="mllo-choice-body">
              <span className="mllo-choice-title">Tabla</span>
              <span className="mllo-choice-desc">
                Más columnas e información densa; puedes desplazar horizontalmente.
              </span>
            </div>
          </button>
          <button
            type="button"
            className="mllo-choice"
            onClick={() => onPick("comfortable")}
          >
            {/* biome-ignore lint/performance/noImgElement: assets estáticos en /public */}
            <img src={MOBILE_LIST_COMFORTABLE_PREVIEW_URL} alt="" />
            <div className="mllo-choice-body">
              <span className="mllo-choice-title">Cómoda</span>
              <span className="mllo-choice-desc">
                Tarjetas o lista ampliada, menos columnas a la vista; ideal para
                pulsar con el dedo.
              </span>
            </div>
          </button>
        </div>

        <div className="mllo-footer">
          <button type="button" className="mllo-later" onClick={onDecideLater}>
            Decidir después
          </button>
        </div>
      </div>
    </div>
  );
}
