"use client";

import {
  setMobileListLayout,
  type MobileListLayoutValue,
} from "@/lib/mobileListLayout";
import { useMobileListLayoutPreference } from "@/lib/useMobileListLayoutPreference";

export function MobileListLayoutSettingsSection() {
  const stored = useMobileListLayoutPreference();
  const selectValue: MobileListLayoutValue = stored ?? "comfortable";

  return (
    <div className="settings-field settings-field--full">
      <label htmlFor="mll-layout-select">Vista en móvil (listas y tablas)</label>
      <p className="settings-helper">
        Solo aplica cuando el ancho es ≤768px. Si aún no eliges, se usa la vista
        cómoda hasta que lo indiques en este selector o en el aviso al entrar.
      </p>
      <select
        id="mll-layout-select"
        className="settings-input--dropdown"
        value={selectValue}
        onChange={(e) => {
          const v = e.target.value as MobileListLayoutValue;
          setMobileListLayout(v);
        }}
      >
        <option value="comfortable">Cómoda — tarjetas, menos columnas</option>
        <option value="table">Tabla — más columnas, desplazamiento horizontal</option>
      </select>
    </div>
  );
}
