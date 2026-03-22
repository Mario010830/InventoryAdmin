"use client";

import { StarburstCanvas } from "./StarburstCanvas";
import { Icon } from "@/components/ui/Icon";

const STATS = [
  {
    value: "5 min",
    label: "para configurar tu inventario desde cero",
  },
  {
    value: "100%",
    label: "gratis para empezar, sin tarjeta de crédito",
  },
  {
    value: "24/7",
    label: "acceso en la nube desde cualquier dispositivo",
  },
  {
    value: "∞",
    label: "productos, movimientos y reportes sin límite",
  },
];

const FEATURES_MINI = [
  "Multi-almacén",
  "Roles y permisos",
  "Alertas de stock",
  "Proveedores",
  "Reportes",
  "Auditoría",
  "Categorías",
  "Movimientos",
];

export function StatsSection() {
  return (
    <section className="stats-section">
      <StarburstCanvas />
      <div className="stats-section__overlay">
        <div className="container">
          <div className="stats-section__header">
            <h2 className="stats-section__title">
              La infraestructura
              <br />
              de tu inventario
            </h2>
          </div>

          <div className="stats-section__grid">
            {STATS.map((stat) => (
              <div key={stat.value} className="stats-card">
                <span className="stats-card__value">{stat.value}</span>
                <span className="stats-card__label">{stat.label}</span>
              </div>
            ))}
          </div>

          <div className="stats-section__features">
            {FEATURES_MINI.map((feat) => (
              <span key={feat} className="stats-feature-tag">
                <Icon name="check_circle" />
                {feat}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
