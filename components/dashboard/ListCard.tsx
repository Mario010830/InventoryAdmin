"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { theme } from "./theme";

export interface ListCardItem {
  /** Texto principal (ej. nombre del producto) */
  primary: string;
  /** Texto secundario (ej. "12 ud · Stock bajo") */
  secondary?: string;
}

export interface ListCardProps {
  title: string;
  items: ListCardItem[];
  /** Ruta para "Ver más" (ej. /dashboard/products) */
  href: string;
  /** Icono opcional en el encabezado */
  icon?: string;
  /** Máximo de filas visibles (por defecto 5) */
  maxItems?: number;
}

export function ListCard({
  title,
  items,
  href,
  icon,
  maxItems = 5,
}: ListCardProps) {
  const visible = items.slice(0, maxItems);

  return (
    <div
      className="dashboard-card dashboard-card--list"
      style={{
        background: theme.surface,
        minWidth: 280,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon && (
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#EEF2FF",
              color: theme.accent,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icon name={icon} />
          </div>
        )}
        <h3 className="dashboard-card__title">{title}</h3>
      </div>

      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0,
          flex: 1,
        }}
      >
        {visible.map((item, i) => (
          <li
            key={i}
            style={{
              padding: "10px 0",
              borderBottom:
                i < visible.length - 1 ? `1px solid ${theme.divider}` : "none",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: theme.primaryText,
              }}
            >
              {item.primary}
            </span>
            {item.secondary != null && item.secondary !== "" && (
              <span style={{ fontSize: 12, color: theme.secondaryText }}>
                {item.secondary}
              </span>
            )}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: theme.accent,
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginTop: 4,
        }}
      >
        Ver más
        <Icon name="arrow_forward" />
      </Link>
    </div>
  );
}
