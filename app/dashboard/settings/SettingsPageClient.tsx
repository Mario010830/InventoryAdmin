"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Switch from "@/components/Switch";
import "./settings.css";
import { useAppSelector } from "@/store/store";
import {
  useGetGroupedSettingsQuery,
  useGetMySubscriptionQuery,
  useUpdateAccountProfileMutation,
  useUpdateGroupedSettingsMutation,
} from "./_service/settingsApi";
import { useGetMyRoleQuery } from "../roles/_service/rolesApi";
import { useUserPermissionCodes } from "@/lib/useUserPermissionCodes";
import type {
  CurrencyResponse,
  InventoryValuationMethod,
  MySubscriptionDto,
  NotificationFrequency,
  SubscriptionStatus,
} from "@/lib/dashboard-types";
import { getToken } from "@/lib/auth-api";
import {
  useGetCurrenciesQuery,
  useCreateCurrencyMutation,
  useUpdateCurrencyMutation,
  useDeleteCurrencyMutation,
  useSetDefaultDisplayCurrencyMutation,
} from "./_service/currencyApi";
import { SETTINGS_SECTIONS } from "./settingsNav";

function snapCurrencies(rows: CurrencyResponse[], defaultId: number | null) {
  return JSON.stringify({
    rows: [...rows]
      .map((c) => ({ id: c.id, exchangeRate: c.exchangeRate, isActive: c.isActive, name: c.name }))
      .sort((a, b) => a.id - b.id),
    defaultId,
  });
}

function toInputDate(iso: string): string {
  if (!iso?.trim()) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function parseEmailsFromString(s: string): string[] {
  return s.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
}

function joinEmails(emails: string[]): string {
  return emails.join(", ");
}

function passwordStrengthBars(pwd: string): number {
  let s = 0;
  if (pwd.length >= 8) s++;
  if (pwd.length >= 12) s++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) s++;
  if (/\d/.test(pwd)) s++;
  if (/[^a-zA-Z0-9]/.test(pwd)) s++;
  return Math.min(4, s);
}

function formatSubscriptionDate(iso: string): string {
  if (!iso?.trim()) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es", { day: "numeric", month: "long", year: "numeric" });
}

function subscriptionStatusBadge(status: SubscriptionStatus): { className: string; label: string } {
  const base = "settings-plan-flat__badge";
  switch (status) {
    case "active":
      return { className: `${base} settings-plan-flat__badge--ok`, label: "Activo" };
    case "pending":
      return { className: `${base} settings-plan-flat__badge--pending`, label: "Pendiente" };
    case "expired":
      return { className: `${base} settings-plan-flat__badge--bad`, label: "Vencida" };
    case "cancelled":
      return { className: `${base} settings-plan-flat__badge--muted`, label: "Cancelada" };
    default:
      return { className: `${base} settings-plan-flat__badge--pending`, label: "Pendiente" };
  }
}

function formatLimitStat(value: number | null): string {
  if (value === null || value === undefined) return "—";
  if (value === -1) return "∞";
  return String(value);
}

function SettingsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="settings-section">
      <h2 className="settings-section__title">{title}</h2>
      <div className="settings-section__divider" aria-hidden />
      <div className="settings-section__body">{children}</div>
    </section>
  );
}

export default function SettingsPageClient() {
  const user = useAppSelector((s) => s.auth);
  const { has } = useUserPermissionCodes();

  const { data, isLoading, refetch } = useGetGroupedSettingsQuery();
  const [updateGroupedSettings, { isLoading: savingGrouped }] = useUpdateGroupedSettingsMutation();
  const [updateAccountProfile, { isLoading: savingProfile }] = useUpdateAccountProfileMutation();

  const {
    data: subscription,
    isLoading: subLoading,
    isError: subError,
    refetch: refetchSub,
  } = useGetMySubscriptionQuery();

  const { data: myRoleResp } = useGetMyRoleQuery();
  const roleName = myRoleResp?.result?.name ?? "—";

  const [inventory, setInventory] = useState({
    roundingDecimals: 2,
    priceRoundingDecimals: 2,
    allowNegativeStock: false,
    defaultUnitOfMeasure: "unit",
    defaultMinimumStock: 0,
    inventoryValuationMethod: "FIFO" as InventoryValuationMethod,
  });

  const [notifications, setNotifications] = useState({
    alertOnLowStock: true,
    lowStockRecipients: "",
    criticalStockThreshold: 0,
    notificationFrequency: "immediate" as NotificationFrequency,
  });

  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");

  const groupedBaseline = useRef<{ inv: string; not: string } | null>(null);
  const hydratedGrouped = useRef(false);

  useEffect(() => {
    if (!data || hydratedGrouped.current) return;
    hydratedGrouped.current = true;
    const invDto = data.inventory;
    const notDto = data.notifications;
    if (invDto) {
      setInventory({
        roundingDecimals: invDto.roundingDecimals ?? 2,
        priceRoundingDecimals: invDto.priceRoundingDecimals ?? 2,
        allowNegativeStock: invDto.allowNegativeStock ?? false,
        defaultUnitOfMeasure: invDto.defaultUnitOfMeasure ?? "unit",
        defaultMinimumStock: invDto.defaultMinimumStock ?? 0,
        inventoryValuationMethod: (invDto.inventoryValuationMethod ?? "FIFO") as InventoryValuationMethod,
      });
    }
    if (notDto) {
      setNotifications({
        alertOnLowStock: notDto.alertOnLowStock ?? true,
        lowStockRecipients: notDto.lowStockRecipients ?? "",
        criticalStockThreshold: notDto.criticalStockThreshold ?? 0,
        notificationFrequency: (notDto.notificationFrequency ?? "immediate") as NotificationFrequency,
      });
      setEmailChips(parseEmailsFromString(notDto.lowStockRecipients ?? ""));
    }
    groupedBaseline.current = {
      inv: JSON.stringify(
        invDto
          ? {
              roundingDecimals: invDto.roundingDecimals ?? 2,
              priceRoundingDecimals: invDto.priceRoundingDecimals ?? 2,
              allowNegativeStock: invDto.allowNegativeStock ?? false,
              defaultUnitOfMeasure: invDto.defaultUnitOfMeasure ?? "unit",
              defaultMinimumStock: invDto.defaultMinimumStock ?? 0,
              inventoryValuationMethod: (invDto.inventoryValuationMethod ?? "FIFO") as InventoryValuationMethod,
            }
          : {
              roundingDecimals: 2,
              priceRoundingDecimals: 2,
              allowNegativeStock: false,
              defaultUnitOfMeasure: "unit",
              defaultMinimumStock: 0,
              inventoryValuationMethod: "FIFO" as InventoryValuationMethod,
            }
      ),
      not: JSON.stringify(
        notDto
          ? {
              alertOnLowStock: notDto.alertOnLowStock ?? true,
              lowStockRecipients: notDto.lowStockRecipients ?? "",
              criticalStockThreshold: notDto.criticalStockThreshold ?? 0,
              notificationFrequency: (notDto.notificationFrequency ?? "immediate") as NotificationFrequency,
            }
          : {
              alertOnLowStock: true,
              lowStockRecipients: "",
              criticalStockThreshold: 0,
              notificationFrequency: "immediate" as NotificationFrequency,
            }
      ),
    };
  }, [data]);

  const inventoryDirty = useMemo(() => {
    if (!groupedBaseline.current) return false;
    return JSON.stringify(inventory) !== groupedBaseline.current.inv;
  }, [inventory]);

  const notificationsDirty = useMemo(() => {
    if (!groupedBaseline.current) return false;
    const not = { ...notifications, lowStockRecipients: joinEmails(emailChips) };
    return JSON.stringify(not) !== groupedBaseline.current.not;
  }, [notifications, emailChips]);

  const groupedSectionDirty = inventoryDirty || notificationsDirty;

  const canReadCurrencies =
    has("currency.read") || has("currency.create") || has("currency.update");
  const canCreateCurrency = has("currency.create");
  const canUpdateCurrency = has("currency.update");
  const canDeleteCurrency = has("currency.delete");
  /** Solo omitir en SSR (Node no tiene fetch de sesión). En el navegador nunca skip: si usamos !getToken() el primer render a veces dejaba la query sin suscribir y no salía GET /currency en Red. */
  const skipCurrencies = typeof window === "undefined";
  const {
    data: currencyList,
    isLoading: currenciesLoading,
    isFetching: currenciesFetching,
    isError: currenciesError,
    refetch: refetchCurrencies,
  } = useGetCurrenciesQuery(undefined, { skip: skipCurrencies });

  const [createCurrency, { isLoading: creatingCurrency }] = useCreateCurrencyMutation();
  const [updateCurrencyApi, { isLoading: updatingCurrency }] = useUpdateCurrencyMutation();
  const [deleteCurrencyApi, { isLoading: deletingCurrency }] = useDeleteCurrencyMutation();
  const [setDefaultDisplayCurrency, { isLoading: settingDefault }] = useSetDefaultDisplayCurrencyMutation();

  const [currencyRows, setCurrencyRows] = useState<CurrencyResponse[]>([]);
  const [defaultDisplayId, setDefaultDisplayId] = useState<number | null>(null);
  const [currencyBaselineSnapshot, setCurrencyBaselineSnapshot] = useState("");

  useEffect(() => {
    if (!getToken()) return;
    if (currencyList === undefined) return;
    if (!currencyList.length) {
      setCurrencyRows([]);
      setDefaultDisplayId(null);
      setCurrencyBaselineSnapshot(snapCurrencies([], null));
      return;
    }
    const d = currencyList.find((c) => c.isDefaultDisplay)?.id ?? null;
    setCurrencyRows(currencyList);
    setDefaultDisplayId(d);
    setCurrencyBaselineSnapshot(snapCurrencies(currencyList, d));
  }, [currencyList]);

  const currenciesDirty = useMemo(() => {
    if (!getToken() || !currencyBaselineSnapshot) return false;
    return snapCurrencies(currencyRows, defaultDisplayId) !== currencyBaselineSnapshot;
  }, [currencyRows, defaultDisplayId, currencyBaselineSnapshot]);

  const [showAddCurrency, setShowAddCurrency] = useState(false);
  const [newCur, setNewCur] = useState({ code: "", name: "", rate: "" });
  const [activeSection, setActiveSection] = useState<string>("inventario");

  const [profileFullName, setProfileFullName] = useState("");
  const [profileGender, setProfileGender] = useState("0");
  const [profileBirth, setProfileBirth] = useState("");
  const profileBaseline = useRef("");
  const profileHydrated = useRef(false);

  useEffect(() => {
    if (!user || profileHydrated.current) return;
    profileHydrated.current = true;
    setProfileFullName(user.fullName ?? "");
    setProfileGender(String(user.genderId ?? 0));
    setProfileBirth(toInputDate(user.birthDate));
    profileBaseline.current = JSON.stringify({
      fullName: user.fullName ?? "",
      genderId: user.genderId ?? 0,
      birthDate: toInputDate(user.birthDate),
    });
  }, [user]);

  const profileDirty = useMemo(() => {
    const cur = JSON.stringify({
      fullName: profileFullName.trim(),
      genderId: Number(profileGender),
      birthDate: profileBirth,
    });
    return cur !== profileBaseline.current;
  }, [profileFullName, profileGender, profileBirth]);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const securityDirty =
    currentPassword.trim().length > 0 || newPassword.trim().length > 0 || confirmPassword.trim().length > 0;

  const pwdStrength = passwordStrengthBars(newPassword);

  const hasGlobalDirty = groupedSectionDirty || currenciesDirty || profileDirty;

  const syncGroupedBaseline = useCallback(() => {
    const not = { ...notifications, lowStockRecipients: joinEmails(emailChips) };
    groupedBaseline.current = {
      inv: JSON.stringify(inventory),
      not: JSON.stringify(not),
    };
  }, [inventory, notifications, emailChips]);

  const persistCurrencies = useCallback(async () => {
    const list = currencyList ?? [];
    for (const row of currencyRows) {
      if (row.isBase) continue;
      const orig = list.find((c) => c.id === row.id);
      if (!orig) continue;
      if (
        orig.exchangeRate !== row.exchangeRate ||
        orig.isActive !== row.isActive ||
        orig.name !== row.name
      ) {
        await updateCurrencyApi({
          id: row.id,
          body: { exchangeRate: row.exchangeRate, isActive: row.isActive, name: row.name },
        }).unwrap();
      }
    }
    const origDefault = list.find((c) => c.isDefaultDisplay)?.id ?? null;
    if (defaultDisplayId != null && defaultDisplayId !== origDefault) {
      await setDefaultDisplayCurrency({ currencyId: defaultDisplayId }).unwrap();
    }
    await refetchCurrencies();
  }, [
    currencyRows,
    currencyList,
    defaultDisplayId,
    updateCurrencyApi,
    setDefaultDisplayCurrency,
    refetchCurrencies,
  ]);

  const handleGlobalSave = async () => {
    if (groupedSectionDirty) {
      const not = { ...notifications, lowStockRecipients: joinEmails(emailChips) };
      await updateGroupedSettings({
        inventory,
        notifications: not,
      }).unwrap();
      syncGroupedBaseline();
    }
    if (currenciesDirty) await persistCurrencies();
    if (profileDirty) {
      await updateAccountProfile({
        fullName: profileFullName.trim(),
        genderId: Number(profileGender),
        birthDate: profileBirth,
      }).unwrap();
      profileBaseline.current = JSON.stringify({
        fullName: profileFullName.trim(),
        genderId: Number(profileGender),
        birthDate: profileBirth,
      });
    }
    await refetch();
  };

  const saveInventoryOnly = async () => {
    await updateGroupedSettings({ inventory }).unwrap();
    syncGroupedBaseline();
    await refetch();
  };

  const saveNotificationsOnly = async () => {
    const not = { ...notifications, lowStockRecipients: joinEmails(emailChips) };
    await updateGroupedSettings({ notifications: not }).unwrap();
    syncGroupedBaseline();
    await refetch();
  };

  const saveCurrenciesOnly = () => void persistCurrencies();

  const saveProfileOnly = async () => {
    await updateAccountProfile({
      fullName: profileFullName.trim(),
      genderId: Number(profileGender),
      birthDate: profileBirth,
    }).unwrap();
    profileBaseline.current = JSON.stringify({
      fullName: profileFullName.trim(),
      genderId: Number(profileGender),
      birthDate: profileBirth,
    });
  };

  const updatePassword = async () => {
    if (newPassword !== confirmPassword) return;
    await updateAccountProfile({
      currentPassword,
      newPassword,
      confirmNewPassword: confirmPassword,
    }).unwrap();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const pushEmailChip = (raw: string) => {
    const parts = raw.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean);
    if (parts.length === 0) return;
    setEmailChips((prev) => {
      const next = new Set(prev);
      for (const p of parts) next.add(p);
      return [...next];
    });
    setEmailInput("");
  };

  const addCurrencyRow = async () => {
    const code = newCur.code.trim().toUpperCase();
    if (!code || !newCur.name.trim()) return;
    const rate = Number(newCur.rate);
    if (!Number.isFinite(rate) || rate <= 0) return;
    await createCurrency({
      code,
      name: newCur.name.trim(),
      exchangeRate: rate,
      isActive: true,
    }).unwrap();
    setNewCur({ code: "", name: "", rate: "" });
    setShowAddCurrency(false);
    await refetchCurrencies();
  };

  const removeCurrency = (id: number) => {
    void deleteCurrencyApi(id).unwrap().then(() => refetchCurrencies());
  };

  const updateCurrencyRow = (id: number, patch: Partial<Pick<CurrencyResponse, "exchangeRate" | "isActive" | "name">>) => {
    setCurrencyRows((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    setActiveSection(hash);
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash) setActiveSection(hash);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const subscriptionPlanUi = (sub: MySubscriptionDto) => {
    const badge = subscriptionStatusBadge(sub.status);
    const features: { key: string; label: string }[] = [
      { key: "p", label: `Hasta ${formatLimitStat(sub.productsLimit)} productos` },
      { key: "u", label: `${formatLimitStat(sub.usersLimit)} usuarios` },
      { key: "l", label: `${formatLimitStat(sub.locationsLimit)} ubicaciones` },
      { key: "s", label: "Soporte por email" },
    ];
    return (
      <div className="settings-plan-flat">
        <div className="settings-plan-flat__head">
          <div>
            <h3 className="settings-plan-flat__name">{sub.planName}</h3>
            <p className="settings-plan-flat__meta">
              Próxima renovación:{" "}
              <span className="settings-plan-flat__meta-strong">{formatSubscriptionDate(sub.endDate)}</span>
            </p>
          </div>
          <span className={badge.className}>{badge.label}</span>
        </div>
        <p className="settings-plan-flat__price">
          Precio por período: <span className="settings-plan-flat__meta-strong">—</span>
        </p>
        <ul className="settings-plan-flat__features">
          {features.map((f) => (
            <li key={f.key}>{f.label}</li>
          ))}
        </ul>
        <div className="settings-plan-flat__actions">
          <button type="button" className="settings-btn settings-btn--primary-outline">
            Cambiar plan
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="settings-loading">
        <div className="dt-state__spinner" />
        <span>Cargando configuración…</span>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-page__inner">
        <div className="settings-page__intro">
          <h1 className="settings-page__title">Configuración</h1>
          <p className="settings-page__subtitle">Ajustes del sistema y de tu cuenta</p>
        </div>

        <div className="settings-layout">
        <aside className="settings-side-nav" aria-label="Secciones de configuración">
          {SETTINGS_SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`settings-side-nav__item ${activeSection === section.id ? "settings-side-nav__item--active" : ""}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </a>
          ))}
        </aside>
        <div className="settings-stack">
        <SettingsSection id="inventario" title="Inventario">
          <div className="settings-field-grid settings-field-grid--stack">
            <div className="settings-field">
              <label htmlFor="inv-round">Decimales de redondeo</label>
              <input
                id="inv-round"
                className="settings-input--num"
                type="number"
                min={0}
                max={6}
                value={inventory.roundingDecimals}
                onChange={(e) => setInventory((s) => ({ ...s, roundingDecimals: Number(e.target.value) }))}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="inv-price">Decimales de precio</label>
              <input
                id="inv-price"
                className="settings-input--num"
                type="number"
                min={0}
                max={6}
                value={inventory.priceRoundingDecimals}
                onChange={(e) => setInventory((s) => ({ ...s, priceRoundingDecimals: Number(e.target.value) }))}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="inv-uom">Unidad de medida por defecto</label>
              <input
                id="inv-uom"
                className="settings-input--short"
                type="text"
                value={inventory.defaultUnitOfMeasure}
                onChange={(e) => setInventory((s) => ({ ...s, defaultUnitOfMeasure: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="inv-min">Stock mínimo global</label>
              <input
                id="inv-min"
                className="settings-input--num"
                type="number"
                min={0}
                value={inventory.defaultMinimumStock ?? 0}
                onChange={(e) => setInventory((s) => ({ ...s, defaultMinimumStock: Number(e.target.value) || 0 }))}
              />
              <p className="settings-helper">Se aplica a productos sin stock mínimo propio</p>
            </div>
            <div className="settings-field settings-field--full">
              <div className="settings-toggle-row">
                <Switch
                  checked={inventory.allowNegativeStock}
                  onChange={(checked) => setInventory((s) => ({ ...s, allowNegativeStock: checked }))}
                />
                <label>Permitir stock negativo</label>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="settings-btn settings-btn--primary settings-section__save"
            disabled={!inventoryDirty || savingGrouped}
            onClick={() => void saveInventoryOnly()}
          >
            {savingGrouped ? "Guardando…" : "Guardar"}
          </button>
        </SettingsSection>

        <SettingsSection id="monedas" title="Monedas y tipo de cambio">
          {currenciesError ? (
            <div style={{ fontSize: "0.875rem", color: "#475569" }}>
              <p>No se pudieron cargar las monedas.</p>
              <button type="button" className="settings-btn settings-btn--primary-outline" onClick={() => void refetchCurrencies()}>
                Reintentar
              </button>
            </div>
          ) : currenciesLoading ? (
            <div className="settings-loading" style={{ padding: 24 }}>
              <div className="dt-state__spinner" />
              <span>Cargando monedas…</span>
            </div>
          ) : (
            <>
              <div className="settings-field settings-field--full" style={{ marginBottom: 16 }}>
                <label htmlFor="disp-cur">Moneda de visualización por defecto</label>
                <select
                  id="disp-cur"
                  className="settings-input--dropdown"
                  value={defaultDisplayId ?? ""}
                  disabled={!canUpdateCurrency}
                  onChange={(e) => setDefaultDisplayId(Number(e.target.value))}
                >
                  {currencyRows
                    .filter((c) => c.isActive)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} — {c.name}
                      </option>
                    ))}
                </select>
                <p className="settings-helper">Controla en qué moneda ven los usuarios los precios por defecto en la app</p>
              </div>

              <div className="settings-base-currency">
                <span className="settings-base-currency__code">
                  {currencyRows.find((c) => c.isBase)?.code ?? "CUP"}
                </span>
                <span className="settings-base-currency__note">Moneda base del sistema (no editable)</span>
              </div>

              <div className="settings-table-wrap">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>Moneda</th>
                      <th>Tasa de cambio (vs CUP)</th>
                      <th>Activa</th>
                      <th>Última actualización</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {currencyRows.map((c) => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.code}</strong>
                          <span style={{ color: "#64748b" }}> · {c.name}</span>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step="0.0001"
                            value={c.exchangeRate}
                            disabled={c.isBase || !canUpdateCurrency}
                            onChange={(e) =>
                              updateCurrencyRow(c.id, { exchangeRate: Number(e.target.value) })
                            }
                          />
                        </td>
                        <td>
                          <Switch
                            checked={c.isActive}
                            disabled={c.isBase || !canUpdateCurrency}
                            onChange={(checked) => updateCurrencyRow(c.id, { isActive: checked })}
                          />
                        </td>
                        <td style={{ fontSize: "0.8rem", color: "#475569" }}>
                          {new Date(c.updatedAt).toLocaleString("es")}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="settings-btn settings-btn--danger-ghost"
                            disabled={c.isBase || !canDeleteCurrency || deletingCurrency}
                            onClick={() => {
                              if (c.isBase) return;
                              if (!window.confirm(`¿Eliminar la moneda ${c.code}?`)) return;
                              removeCurrency(c.id);
                            }}
                            aria-label={`Eliminar ${c.code}`}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="settings-btn settings-btn--primary-outline"
                style={{ marginTop: 12 }}
                disabled={!canCreateCurrency || creatingCurrency}
                onClick={() => setShowAddCurrency((v) => !v)}
              >
                Agregar moneda
              </button>

              {showAddCurrency ? (
                <div className="settings-inline-form">
                  <div className="settings-field">
                    <label>Código</label>
                    <input
                      className="settings-input--short"
                      value={newCur.code}
                      onChange={(e) => setNewCur((s) => ({ ...s, code: e.target.value }))}
                      placeholder="USD"
                    />
                  </div>
                  <div className="settings-field">
                    <label>Nombre</label>
                    <input
                      className="settings-input--short"
                      value={newCur.name}
                      onChange={(e) => setNewCur((s) => ({ ...s, name: e.target.value }))}
                      placeholder="Dólar estadounidense"
                    />
                  </div>
                  <div className="settings-field">
                    <label>Tasa inicial</label>
                    <input
                      className="settings-input--num"
                      value={newCur.rate}
                      onChange={(e) => setNewCur((s) => ({ ...s, rate: e.target.value }))}
                      placeholder="120"
                    />
                  </div>
                  <div className="settings-field" style={{ alignSelf: "end" }}>
                    <button
                      type="button"
                      className="settings-btn settings-btn--primary"
                      disabled={creatingCurrency}
                      onClick={() => void addCurrencyRow()}
                    >
                      {creatingCurrency ? "Añadiendo…" : "Añadir"}
                    </button>
                  </div>
                </div>
              ) : null}

              <p className="settings-helper" style={{ marginTop: 12 }}>
                Las tasas se actualizan manualmente. Los precios se almacenan en CUP y se convierten en pantalla.
              </p>
              <button
                type="button"
                className="settings-btn settings-btn--primary settings-section__save"
                disabled={
                  !canReadCurrencies ||
                  !currenciesDirty ||
                  updatingCurrency ||
                  settingDefault ||
                  currenciesFetching
                }
                onClick={saveCurrenciesOnly}
              >
                {updatingCurrency || settingDefault ? "Guardando…" : "Guardar"}
              </button>
            </>
          )}
        </SettingsSection>

        <SettingsSection id="notificaciones" title="Notificaciones">
          <div className="settings-field-grid">
            <div className="settings-field settings-field--full">
              <div className="settings-toggle-row">
                <Switch
                  checked={notifications.alertOnLowStock}
                  onChange={(checked) => setNotifications((s) => ({ ...s, alertOnLowStock: checked }))}
                />
                <label>Alertar por stock bajo</label>
              </div>
            </div>
            <div className="settings-field settings-field--full">
              <label>Destinatarios</label>
              <div
                className="settings-chips"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    pushEmailChip(emailInput);
                  }
                }}
              >
                {emailChips.map((em) => (
                  <span key={em} className="settings-chip">
                    {em}
                    <button
                      type="button"
                      aria-label={`Quitar ${em}`}
                      onClick={() => setEmailChips((prev) => prev.filter((x) => x !== em))}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onBlur={() => {
                    if (emailInput.trim()) pushEmailChip(emailInput);
                  }}
                />
              </div>
              <p className="settings-helper">Separa los emails con Enter o coma</p>
            </div>
            <div className="settings-field settings-field--full">
              <div className="settings-field-grid settings-field-grid--2">
                <div className="settings-field">
                  <label htmlFor="crit-th">Umbral de stock crítico</label>
                  <input
                    id="crit-th"
                    className="settings-input--num"
                    type="number"
                    min={0}
                    value={notifications.criticalStockThreshold ?? 0}
                    onChange={(e) =>
                      setNotifications((s) => ({ ...s, criticalStockThreshold: Number(e.target.value) || 0 }))
                    }
                  />
                  <p className="settings-helper">Notificar cuando el stock caiga por debajo de este número</p>
                </div>
                <div className="settings-field">
                  <label htmlFor="notif-freq">Frecuencia de notificación</label>
                  <select
                    id="notif-freq"
                    className="settings-input--dropdown"
                    value={notifications.notificationFrequency}
                    onChange={(e) =>
                      setNotifications((s) => ({
                        ...s,
                        notificationFrequency: e.target.value as NotificationFrequency,
                      }))
                    }
                  >
                    <option value="immediate">Inmediata</option>
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="settings-btn settings-btn--primary settings-section__save"
            disabled={!notificationsDirty || savingGrouped}
            onClick={() => void saveNotificationsOnly()}
          >
            {savingGrouped ? "Guardando…" : "Guardar"}
          </button>
        </SettingsSection>

        <SettingsSection id="seguridad" title="Seguridad">
          <h3 className="settings-subhead">Cambiar contraseña</h3>
          <div className="settings-field-grid">
            <div className="settings-field settings-field--full">
              <label htmlFor="pwd-cur">Contraseña actual</label>
              <input
                id="pwd-cur"
                className="settings-input--full"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="settings-field settings-field--full">
              <label htmlFor="pwd-new">Nueva contraseña</label>
              <input
                id="pwd-new"
                className="settings-input--full"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="pwd-strength" aria-hidden>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={`pwd-strength__bar ${i < pwdStrength ? "pwd-strength__bar--on" : ""}`} />
                ))}
              </div>
            </div>
            <div className="settings-field settings-field--full">
              <label htmlFor="pwd-confirm">Confirmar nueva contraseña</label>
              <input
                id="pwd-confirm"
                className="settings-input--full"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            className="settings-btn settings-btn--primary settings-section__save"
            disabled={
              savingProfile ||
              !currentPassword ||
              !newPassword ||
              newPassword !== confirmPassword
            }
            onClick={() => void updatePassword()}
          >
            {savingProfile ? "Guardando…" : "Guardar"}
          </button>

          <h3 className="settings-subhead settings-subhead--spaced">Sesiones activas</h3>
          <div className="settings-sessions-placeholder">
            {/* TODO: GET /account/sessions cuando exista en el backend */}
            No hay sesiones listadas (integración pendiente).
          </div>
          <button
            type="button"
            className="settings-btn settings-btn--danger-ghost mt-2"
            onClick={() => {
              if (window.confirm("¿Cerrar todas las sesiones excepto la actual?")) {
                /* TODO: POST revocar sesiones */
              }
            }}
          >
            Cerrar todas las sesiones
          </button>
        </SettingsSection>

        <SettingsSection id="perfil" title="Perfil de cuenta">
          <div className="settings-field-grid settings-field-grid--2">
            <div className="settings-field settings-field--full">
              <label htmlFor="pf-name">Nombre completo</label>
              <input
                id="pf-name"
                className="settings-input--full"
                type="text"
                value={profileFullName}
                onChange={(e) => setProfileFullName(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="pf-gender">Género</label>
              <select
                id="pf-gender"
                className="settings-input--dropdown"
                value={profileGender}
                onChange={(e) => setProfileGender(e.target.value)}
              >
                <option value="1">Masculino</option>
                <option value="2">Femenino</option>
                <option value="0">Prefiero no decir</option>
              </select>
            </div>
            <div className="settings-field">
              <label htmlFor="pf-birth">Fecha de nacimiento</label>
              <input
                id="pf-birth"
                className="settings-input--short"
                type="date"
                value={profileBirth}
                onChange={(e) => setProfileBirth(e.target.value)}
              />
            </div>
            <div className="settings-field">
              <label>Rol actual</label>
              <span className="settings-badge-role">{roleName}</span>
            </div>
            <div className="settings-field settings-field--full">
              <label>Ubicación asignada</label>
              {user != null && user.locationId != null && user.locationId !== 0 ? (
                <div className="settings-readonly">
                  {user.location?.name ?? "—"}{" "}
                  <span className="text-slate-400">(ID: {user.locationId})</span>
                </div>
              ) : (
                <span className="settings-location-muted">Sin ubicación</span>
              )}
            </div>
          </div>
          <button
            type="button"
            className="settings-btn settings-btn--primary settings-section__save"
            disabled={!profileDirty || savingProfile}
            onClick={() => void saveProfileOnly()}
          >
            {savingProfile ? "Guardando…" : "Guardar"}
          </button>
        </SettingsSection>

        <SettingsSection id="suscripcion" title="Suscripción">
          {subLoading ? (
            <div className="settings-loading">
              <div className="dt-state__spinner" />
            </div>
          ) : subError ? (
            <div className="text-center text-sm text-slate-600">
              <p>No se pudo cargar la suscripción.</p>
              <button type="button" className="settings-btn settings-btn--primary-outline mt-2" onClick={() => void refetchSub()}>
                Reintentar
              </button>
            </div>
          ) : !subscription ? (
            <p className="text-sm text-slate-600">No hay información de suscripción disponible.</p>
          ) : (
            subscriptionPlanUi(subscription)
          )}

          <div className="settings-danger-zone">
            <button
              type="button"
              className="settings-btn settings-btn--danger-ghost"
              onClick={() => {
                if (window.confirm("¿Seguro que deseas cancelar la suscripción? Esta acción puede ser irreversible.")) {
                  /* TODO: integrar cancelación con API de facturación */
                }
              }}
            >
              Cancelar suscripción
            </button>
            <p className="settings-helper mt-2">{/* TODO: billing API */}</p>
          </div>
        </SettingsSection>
        </div>
        </div>
      </div>

      {hasGlobalDirty ? (
        <div className="settings-global-save">
          <button
            type="button"
            className="settings-btn settings-btn--primary"
            disabled={savingGrouped || savingProfile}
            onClick={() => void handleGlobalSave()}
          >
            {savingGrouped || savingProfile ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
