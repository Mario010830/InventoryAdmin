"use client";

import type { LocationResponse, UserResponse } from "@/lib/auth-types";
import type {
  InventoryMovementResponse,
  InventoryResponse,
  LogResponse,
  ProductCategoryResponse,
  ProductResponse,
  RoleResponse,
  SupplierResponse,
} from "@/lib/dashboard-types";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import { displayDash, formatDetailDate, formatDetailDateTime } from "@/lib/formatDetailDate";
import { formatMovementReason, movementTypeLabel } from "@/lib/inventoryMovementUi";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import { Icon } from "@/components/ui/Icon";
import { BoolBadge, DetailField, DetailSection } from "./DetailPrimitives";
function marginPercent(row: ProductResponse): string {
  const p = Number(row.precio);
  const c = Number(row.costo);
  if (!Number.isFinite(p) || !Number.isFinite(c)) return "—";
  if (p <= 0) return "—";
  return `${(((p - c) / p) * 100).toFixed(1)}%`;
}

export function ProductDetailBody({
  row,
  categoryName,
}: {
  row: ProductResponse;
  categoryName: string;
}) {
  const { formatCup } = useDisplayCurrency();
  const stock = row.totalStock;
  const imgSrc = row.imagenUrl?.trim()
    ? getProxiedImageSrc(row.imagenUrl) ?? row.imagenUrl
    : null;
  return (
    <>
      {imgSrc ? (
        <div className="gd-detail-photo-block">
          <img
            src={imgSrc}
            alt={row.name ? `Foto de ${row.name}` : "Foto del producto"}
            className="gd-detail-photo"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="gd-detail-photo-block gd-detail-photo-block--empty">
          <Icon name="inventory_2" aria-hidden />
          <span>Sin foto</span>
        </div>
      )}
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Código" value={displayDash(row.code)} />
          <DetailField label="Nombre" value={displayDash(row.name)} />
          <DetailField
            label="Descripción"
            value={displayDash(row.description?.trim() ? row.description : null)}
          />
          <DetailField label="Categoría" value={displayDash(categoryName)} />
        </div>
      </DetailSection>
      <DetailSection title="Precios">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Precio" value={formatCup(Number(row.precio))} />
          <DetailField label="Costo" value={formatCup(Number(row.costo))} />
          <DetailField label="Margen %" value={marginPercent(row)} />
        </div>
      </DetailSection>
      <DetailSection title="Estado">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Disponible"
            value={<BoolBadge value={row.isAvailable} trueLabel="Sí" falseLabel="No" />}
          />
          <DetailField
            label="En venta"
            value={<BoolBadge value={row.isForSale} trueLabel="Sí" falseLabel="No" />}
          />
          <DetailField
            label="Stock actual"
            value={stock != null && Number.isFinite(Number(stock)) ? String(stock) : "—"}
          />
        </div>
      </DetailSection>
      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
          <DetailField label="Última actualización" value={formatDetailDate(row.modifiedAt)} />
        </div>
      </DetailSection>
    </>
  );
}

export function CategoryDetailBody({
  row,
  productCount,
}: {
  row: ProductCategoryResponse;
  productCount: number | null;
}) {
  return (
    <>
      <DetailField label="Nombre" value={displayDash(row.name)} />
      <DetailField
        label="Descripción"
        value={displayDash(row.description?.trim() ? row.description : null)}
      />
      <DetailField
        label="Estado"
        value={<span className="dt-tag dt-tag--green">Activo</span>}
      />
      <DetailField
        label="Total productos en categoría"
        value={productCount != null ? String(productCount) : "—"}
      />
      <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
      <DetailField label="Última actualización" value={formatDetailDate(row.modifiedAt)} />
    </>
  );
}

export function SupplierDetailBody({ row }: { row: SupplierResponse }) {
  return (
    <>
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Nombre" value={displayDash(row.name)} />
          <DetailField label="Contacto" value={displayDash(row.contactPerson)} />
          <DetailField label="Email" value={displayDash(row.email)} />
          <DetailField label="Teléfono" value={displayDash(row.phone)} />
        </div>
      </DetailSection>
      <DetailSection title="Estado">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Estado"
            value={
              <BoolBadge value={row.isActive} trueLabel="Activo" falseLabel="Inactivo" />
            }
          />
          <DetailField label="País" value="—" />
        </div>
      </DetailSection>
      <DetailSection title="Fechas">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
          <DetailField label="Última actualización" value={formatDetailDate(row.modifiedAt)} />
        </div>
      </DetailSection>
    </>
  );
}

export function LocationDetailBody({ row }: { row: LocationResponse }) {
  const photo = row.photoUrl?.trim();
  const imgSrc = photo ? getProxiedImageSrc(photo) ?? photo : null;
  return (
    <>
      {imgSrc ? (
        <div className="gd-detail-photo-block">
          <img
            src={imgSrc}
            alt={row.name ? `Foto de ${row.name}` : "Foto de la ubicación"}
            className="gd-detail-photo"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="gd-detail-photo-block gd-detail-photo-block--empty">
          <Icon name="location_on" aria-hidden />
          <span>Sin foto</span>
        </div>
      )}
      <DetailField label="Nombre" value={displayDash(row.name)} />
      <DetailField label="Código" value={displayDash(row.code)} />
      <DetailField label="Tipo" value="—" />
      <DetailField label="Capacidad" value="—" />
      <DetailField
        label="Estado"
        value={<span className="dt-tag dt-tag--green">Activo</span>}
      />
      <DetailField label="Creado" value={formatDetailDate(row.createdAt)} />
      <DetailField label="Última actualización" value={formatDetailDate(row.modifiedAt)} />
    </>
  );
}

export function InventoryDetailBody({
  row,
  categoryName,
}: {
  row: InventoryResponse;
  categoryName: string;
}) {
  const max = row.maximumStock;
  return (
    <>
      <div className="gd-detail-section__grid gd-detail-section__grid--two">
        <DetailField label="Producto" value={displayDash(row.productName)} />
        <DetailField label="Categoría" value={displayDash(categoryName)} />
        <DetailField label="Ubicación" value={displayDash(row.locationName)} />
        <DetailField label="Stock actual" value={String(row.currentStock)} />
        <DetailField label="Stock mínimo" value={String(row.minimumStock)} />
        <DetailField
          label="Stock máximo"
          value={max != null && Number.isFinite(max) ? String(max) : "—"}
        />
        <DetailField label="Última actualización" value={formatDetailDate(row.modifiedAt)} />
        <DetailField label="Actualizado por" value={displayDash(row.modifiedByUserName)} />
      </div>
    </>
  );
}

function movementUserLabel(
  row: InventoryMovementResponse,
  userIdToName: Map<number, string>,
): string {
  const uid = row.userId;
  if (uid == null || uid <= 0) return "—";
  const fromApi = (row.userFullName ?? row.userName)?.trim();
  if (fromApi) return fromApi;
  return userIdToName.get(uid) ?? "—";
}

function movementProductLabel(
  row: InventoryMovementResponse,
  productLabelById: Map<number, string>,
): string {
  if (row.productName?.trim()) return row.productName.trim();
  const fallback = productLabelById.get(row.productId);
  return fallback ?? String(row.productId);
}

export function MovementDetailBody({
  row,
  userIdToName,
  productLabelById,
}: {
  row: InventoryMovementResponse;
  userIdToName: Map<number, string>;
  productLabelById: Map<number, string>;
}) {
  const typeLabel = movementTypeLabel(row.type);
  return (
    <>
      <DetailSection title="General">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="ID" value={String(row.id)} />
          <DetailField label="Tipo" value={typeLabel} />
          <DetailField
            label="Producto"
            value={movementProductLabel(row, productLabelById)}
          />
          <DetailField label="Cantidad" value={String(row.quantity)} />
        </div>
      </DetailSection>
      <DetailSection title="Stock">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField
            label="Stock anterior"
            value={row.previousStock != null ? String(row.previousStock) : "—"}
          />
          <DetailField
            label="Stock nuevo"
            value={row.newStock != null ? String(row.newStock) : "—"}
          />
        </div>
      </DetailSection>
      <DetailSection title="Contexto">
        <div className="gd-detail-section__grid gd-detail-section__grid--two">
          <DetailField label="Ubicación" value={displayDash(row.locationName)} />
          <DetailField
            label="Razón"
            value={formatMovementReason(row.reason)}
          />
          <DetailField label="Usuario" value={movementUserLabel(row, userIdToName)} />
          <DetailField label="Fecha" value={formatDetailDate(row.createdAt)} />
        </div>
      </DetailSection>
    </>
  );
}

export function UserDetailBody({
  row,
  roleName,
}: {
  row: UserResponse;
  roleName: string;
}) {
  const active = String(row.status ?? "").toUpperCase() === "ACTIVE";
  const ext = row as UserResponse & {
    lastLoginAt?: string;
    lastAccessAt?: string;
    lastLogin?: string;
  };
  const last = ext.lastLoginAt ?? ext.lastAccessAt ?? ext.lastLogin;
  return (
    <>
      <DetailField label="Nombre" value={displayDash(row.fullName)} />
      <DetailField label="Email" value={displayDash(row.email)} />
      <DetailField label="Rol" value={displayDash(roleName)} />
      <DetailField
        label="Estado"
        value={<BoolBadge value={active} trueLabel="Activo" falseLabel="Inactivo" />}
      />
      <DetailField label="Último acceso" value={last ? formatDetailDateTime(String(last)) : "—"} />
      <DetailField label="Creado" value="—" />
      <DetailField label="Última actualización" value="—" />
    </>
  );
}

export function RoleDetailBody({
  row,
  userCount,
  permissionNames,
}: {
  row: RoleResponse;
  userCount: number;
  permissionNames: string[];
}) {
  return (
    <>
      <DetailField label="Nombre" value={displayDash(row.name)} />
      <DetailField
        label="Descripción"
        value={displayDash(row.description?.trim() ? row.description : null)}
      />
      <DetailField
        label="Estado"
        value={
          <span className={`dt-tag ${row.isSystem ? "dt-tag--red" : "dt-tag--green"}`}>
            {row.isSystem ? "Sistema" : "Personalizado"}
          </span>
        }
      />
      <DetailField label="Total usuarios con este rol" value={String(userCount)} />
      <DetailField
        label="Permisos asignados"
        value={
          permissionNames.length === 0 ? (
            "—"
          ) : (
            <ul className="gd-detail-list">
              {permissionNames.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )
        }
      />
    </>
  );
}

export function LogDetailBody({
  row,
  userLabel,
}: {
  row: LogResponse;
  userLabel: string;
}) {
  const ext = row as LogResponse & { ip?: string; ipAddress?: string };
  const ip = ext.ipAddress ?? ext.ip;
  return (
    <>
      <DetailField label="ID" value={String(row.id)} />
      <DetailField label="Tipo de acción" value={displayDash(row.logType)} />
      <DetailField label="Descripción" value={displayDash(row.description)} />
      <DetailField label="Usuario" value={displayDash(userLabel)} />
      <DetailField label="Fecha y hora exacta" value={formatDetailDateTime(row.createdAt)} />
      <DetailField label="IP" value={ip ? displayDash(ip) : "—"} />
    </>
  );
}
