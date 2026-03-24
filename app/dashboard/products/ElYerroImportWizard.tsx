"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import type {
  ElYerroImportResult,
  ElYerroPreviewCategory,
  ElYerroPreviewResult,
} from "@/lib/dashboard-types";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import {
  useImportElYerroMutation,
  usePreviewElYerroMutation,
} from "./_service/elyerroImportApi";
import "./product-import-wizard.css";

export interface ElYerroImportWizardProps {
  open: boolean;
  onClose: () => void;
}

function rtkErrorStatus(err: unknown): number | undefined {
  if (err && typeof err === "object" && "status" in err) {
    const s = (err as { status: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

function rtkErrorMessage(err: unknown): string {
  if (!err || typeof err !== "object") return "Error desconocido";
  const e = err as { status?: unknown; data?: unknown };
  const st = e.status;
  const data = e.data;
  if (typeof data === "string" && data.trim()) return data.trim();
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const m = o.message ?? o.Message ?? o.title ?? o.Title;
    if (typeof m === "string" && m.trim()) return m.trim();
    const errs = o.errors ?? o.Errors;
    if (Array.isArray(errs) && errs.length) {
      const first = errs[0];
      return typeof first === "string" ? first : JSON.stringify(first);
    }
  }
  if (st === 401)
    return "Sesión no válida o sin organización activa. Vuelve a iniciar sesión.";
  if (st === 403)
    return "No tienes permiso para importar (se requiere product.create).";
  if (st === 404) return "Negocio o categoría no encontrada en El Yerro.";
  return "No se pudo completar la operación.";
}

function slugFromCategoryUrl(url: string): string {
  try {
    const u = new URL(url);
    const parts = u.pathname.split("/").filter(Boolean);
    return parts.length ? (parts[parts.length - 1] ?? "") : "";
  } catch {
    return "";
  }
}

function categoryFilterForApi(cat: ElYerroPreviewCategory): string {
  const s = cat.slug?.trim();
  if (s) return s;
  const fromUrl = slugFromCategoryUrl(cat.url);
  if (fromUrl) return fromUrl;
  return cat.nombre?.trim() ?? "";
}

function isFullIndexSelection(
  categoriasCount: number,
  selectedIndices: number[],
): boolean {
  if (categoriasCount === 0 || selectedIndices.length !== categoriasCount)
    return false;
  const set = new Set(selectedIndices);
  for (let i = 0; i < categoriasCount; i++) {
    if (!set.has(i)) return false;
  }
  return true;
}

function buildCategoriasPayload(
  preview: ElYerroPreviewResult,
  selectedIndices: number[],
): string[] | undefined {
  const n = preview.categorias.length;
  if (selectedIndices.length === 0) return undefined;
  if (isFullIndexSelection(n, selectedIndices)) return [];
  const filters = [...new Set(selectedIndices)]
    .sort((a, b) => a - b)
    .map((i) => preview.categorias[i])
    .filter(Boolean)
    .map((c) => categoryFilterForApi(c))
    .filter(Boolean);
  return filters.length > 0 ? filters : undefined;
}

const PREVIEW_TABLE_MAX = 12;

export function ElYerroImportWizard({
  open,
  onClose,
}: ElYerroImportWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [businessUrl, setBusinessUrl] = useState("");
  /** Filtro opcional del paso 1: categorías añadidas una a una. */
  const [categoriasFiltroItems, setCategoriasFiltroItems] = useState<string[]>(
    [],
  );
  const [categoriaFiltroDraft, setCategoriaFiltroDraft] = useState("");
  const [preview, setPreview] = useState<ElYerroPreviewResult | null>(null);
  const [selectedCategoryIndices, setSelectedCategoryIndices] = useState<
    number[]
  >([]);
  const [importarSoloDisponibles, setImportarSoloDisponibles] = useState(true);
  const [actualizarSiExiste, setActualizarSiExiste] = useState(false);
  const [importResult, setImportResult] = useState<ElYerroImportResult | null>(
    null,
  );

  const [previewMutation, { isLoading: previewLoading }] =
    usePreviewElYerroMutation();
  const [importMutation, { isLoading: importLoading }] =
    useImportElYerroMutation();

  const resetState = useCallback(() => {
    setStep(1);
    setBusinessUrl("");
    setCategoriasFiltroItems([]);
    setCategoriaFiltroDraft("");
    setPreview(null);
    setSelectedCategoryIndices([]);
    setImportarSoloDisponibles(true);
    setActualizarSiExiste(false);
    setImportResult(null);
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  const handleAuthError = useCallback(
    (err: unknown) => {
      const st = rtkErrorStatus(err);
      if (st === 401) {
        toast.error(rtkErrorMessage(err));
        router.push("/login");
        return true;
      }
      if (st === 403) {
        toast.error(rtkErrorMessage(err));
        return true;
      }
      return false;
    },
    [router],
  );

  const urlTrimmed = businessUrl.trim();
  const urlLooksOk =
    /^https:\/\/(www\.)?elyerromenu\.com\/b\/.+/i.test(urlTrimmed);

  const step1Ready = Boolean(urlTrimmed) && urlLooksOk;

  const addCategoriaToFilter = () => {
    const t = categoriaFiltroDraft.trim();
    if (!t) return;
    let duplicate = false;
    setCategoriasFiltroItems((prev) => {
      if (prev.some((x) => x.toLowerCase() === t.toLowerCase())) {
        duplicate = true;
        return prev;
      }
      return [...prev, t];
    });
    if (duplicate) {
      toast.message("Esa categoría ya está en la lista");
      return;
    }
    setCategoriaFiltroDraft("");
  };

  const removeCategoriaFromFilter = (index: number) => {
    setCategoriasFiltroItems((prev) => prev.filter((_, i) => i !== index));
  };

  const flatPreviewRows = useMemo(() => {
    if (!preview) return [];
    const out: {
      catLabel: string;
      nombre: string;
      precio: string;
      disponible: boolean;
      warn: boolean;
    }[] = [];
    for (const cat of preview.categorias) {
      const slugOr = cat.slug?.trim() || slugFromCategoryUrl(cat.url);
      const catLabel = slugOr || cat.nombre || "—";
      for (const p of cat.productos) {
        out.push({
          catLabel,
          nombre: p.nombre || "—",
          precio:
            p.precio != null
              ? `${p.precio} ${p.moneda ?? ""}`.trim()
              : "—",
          disponible: p.disponible,
          warn:
            Boolean(importarSoloDisponibles && !p.disponible),
        });
        if (out.length >= PREVIEW_TABLE_MAX) return out;
      }
    }
    return out;
  }, [preview, importarSoloDisponibles]);

  const totalProductosEnSeleccion = useMemo(() => {
    if (!preview) return 0;
    let n = 0;
    for (let i = 0; i < preview.categorias.length; i++) {
      if (selectedCategoryIndices.includes(i)) {
        n += preview.categorias[i].productos.length;
      }
    }
    return n;
  }, [preview, selectedCategoryIndices]);

  const runPreview = async () => {
    if (!urlTrimmed) {
      toast.error("Indica la URL del negocio en El Yerro.");
      return;
    }
    if (!urlLooksOk) {
      toast.error(
        "La URL debe ser de elyerromenu.com, por ejemplo https://elyerromenu.com/b/{slug}/seller/…",
      );
      return;
    }
    try {
      const data = await previewMutation({
        businessUrl: urlTrimmed,
        categoriasAImportar:
          categoriasFiltroItems.length > 0 ? categoriasFiltroItems : undefined,
      }).unwrap();
      setPreview(data);
      setSelectedCategoryIndices(data.categorias.map((_, i) => i));
      setStep(2);
      if (data.errores.length > 0) {
        toast.message("Vista previa con advertencias", {
          description:
            "Algunas categorías fallaron; revisa la lista de errores.",
        });
      }
    } catch (e) {
      if (handleAuthError(e)) return;
      toast.error(rtkErrorMessage(e));
    }
  };

  const toggleCategoryIndex = (index: number) => {
    setSelectedCategoryIndices((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index].sort((a, b) => a - b),
    );
  };

  const selectAllCategories = () => {
    if (!preview) return;
    setSelectedCategoryIndices(preview.categorias.map((_, i) => i));
  };

  const clearAllCategories = () => {
    setSelectedCategoryIndices([]);
  };

  const categoriasForImport = useMemo(() => {
    if (!preview) return undefined;
    return buildCategoriasPayload(preview, selectedCategoryIndices);
  }, [preview, selectedCategoryIndices]);

  const canImport =
    preview != null &&
    selectedCategoryIndices.length > 0 &&
    categoriasForImport !== undefined;

  const runImport = async () => {
    if (!preview || !canImport) return;
    try {
      const data = await importMutation({
        businessUrl:
          preview.businessUrlNormalizada || urlTrimmed || businessUrl.trim(),
        categoriasAImportar: categoriasForImport,
        importarSoloDisponibles,
        actualizarSiExiste,
      }).unwrap();
      setImportResult(data);
      setStep(3);
      toast.success(
        `Importación finalizada: ${data.totalImportados} importados, ${data.totalOmitidos} omitidos.`,
      );
    } catch (e) {
      if (handleAuthError(e)) return;
      toast.error(rtkErrorMessage(e));
    }
  };

  const handleClose = () => {
    if (previewLoading || importLoading) return;
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !previewLoading && !importLoading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, previewLoading, importLoading, onClose]);

  if (!open) return null;

  const wizardStepLabels = ["Origen", "Vista previa", "Resumen"] as const;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape en useEffect
    <div
      className="modal-overlay product-import-wizard__backdrop"
      onClick={handleClose}
    >
      <div
        className="product-import-wizard__shell"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="elyerro-import-title"
      >
        <header className="product-import-wizard__header">
          <div className="product-import-wizard__header-text">
            <h2
              id="elyerro-import-title"
              className="product-import-wizard__title"
            >
              Importar productos
            </h2>
            <p className="product-import-wizard__subtitle">
              Trae el menú público de El Yerro a tu inventario actual: revisa y
              confirma antes de guardar.
            </p>
          </div>
          <button
            type="button"
            className="product-import-wizard__close"
            onClick={handleClose}
            aria-label="Cerrar"
            disabled={previewLoading || importLoading}
          >
            <Icon name="close" />
          </button>
        </header>

        <nav
          className="product-import-wizard__progress-track"
          aria-label="Pasos del asistente"
        >
          {/* biome-ignore lint/a11y/useSemanticElements: conectores entre pasos */}
          <div className="product-import-wizard__progress-row" role="list">
            {wizardStepLabels.map((label, i) => {
              const n = i + 1;
              const isDone = step > n;
              const isActive = step === n;
              return (
                <Fragment key={label}>
                  <div
                    className="product-import-wizard__progress-segment"
                    role="listitem"
                  >
                    <span
                      className={[
                        "product-import-wizard__circle",
                        isDone ? "product-import-wizard__circle--done" : "",
                        isActive ? "product-import-wizard__circle--active" : "",
                        !isDone && !isActive
                          ? "product-import-wizard__circle--pending"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-current={isActive ? "step" : undefined}
                    >
                      {isDone ? (
                        <Icon name="check" />
                      ) : (
                        <span className="product-import-wizard__circle-num">
                          {n}
                        </span>
                      )}
                    </span>
                    <span
                      className={[
                        "product-import-wizard__progress-label",
                        isActive
                          ? "product-import-wizard__progress-label--active"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      {label}
                    </span>
                  </div>
                  {i < wizardStepLabels.length - 1 ? (
                    <div
                      className={[
                        "product-import-wizard__progress-connector",
                        step > n
                          ? "product-import-wizard__progress-connector--done"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-hidden
                    />
                  ) : null}
                </Fragment>
              );
            })}
          </div>
        </nav>

        <div className="product-import-wizard__body">
          {step === 1 && previewLoading && (
            <div className="product-import-wizard__loading">
              <div className="product-import-wizard__spinner" />
              <span>Obteniendo vista previa del menú…</span>
            </div>
          )}

          {step === 1 && !previewLoading && (
            <div className="product-import-wizard__elyerro-form">
              <div
                className={[
                  "product-import-wizard__elyerro-url-card",
                  urlTrimmed
                    ? "product-import-wizard__elyerro-url-card--active"
                    : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                <span className="product-import-wizard__drop-icon" aria-hidden>
                  <Icon name="restaurant_menu" />
                </span>
                <p className="product-import-wizard__drop-title">
                  {urlTrimmed ? "Enlace del menú" : "Enlace público del menú"}
                </p>
                <p className="product-import-wizard__drop-sub">
                  Pega la URL. Debe ser de{" "}
                  <span className="dt-cell-mono">elyerromenu.com</span> e
                  incluir <span className="dt-cell-mono">/b/…</span>
                </p>
                <input
                  id="elyerro-business-url"
                  className="product-import-wizard__text-input"
                  type="url"
                  placeholder="https://elyerromenu.com/b/{slug}/seller/…"
                  value={businessUrl}
                  onChange={(e) => setBusinessUrl(e.target.value)}
                  autoComplete="off"
                  aria-label="URL del menú en El Yerro"
                />
              </div>

              <div className="product-import-wizard__elyerro-form-section">
                <p className="product-import-wizard__elyerro-field-label">
                  Limitar categorías (opcional)
                </p>
                <p
                  id="elyerro-categories-hint"
                  className="product-import-wizard__elyerro-field-hint"
                >
                  Añade el slug o nombre de cada categoría con{" "}
                  <strong>Agregar</strong>. La lista vacía significa que se
                  cargan todas las categorías del menú en la vista previa.
                </p>
                <div className="product-import-wizard__elyerro-category-add-row">
                  <input
                    id="elyerro-category-draft"
                    className="product-import-wizard__elyerro-category-input"
                    type="text"
                    placeholder="Ej. bebidas o postres"
                    value={categoriaFiltroDraft}
                    onChange={(e) => setCategoriaFiltroDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCategoriaToFilter();
                      }
                    }}
                    autoComplete="off"
                    aria-label="Nombre o slug de categoría para añadir al filtro"
                    aria-describedby="elyerro-categories-hint"
                  />
                  <button
                    type="button"
                    className="product-import-wizard__btn product-import-wizard__btn--ghost product-import-wizard__elyerro-category-add-btn"
                    onClick={addCategoriaToFilter}
                  >
                    Agregar
                  </button>
                </div>
                {categoriasFiltroItems.length > 0 ? (
                  <ul
                    className="product-import-wizard__elyerro-chip-list"
                    aria-label="Categorías incluidas en el filtro"
                  >
                    {categoriasFiltroItems.map((label, index) => (
                      <li
                        key={`${label}-${index}`}
                        className="product-import-wizard__elyerro-chip"
                      >
                        <span className="product-import-wizard__elyerro-chip-text">
                          {label}
                        </span>
                        <button
                          type="button"
                          className="product-import-wizard__elyerro-chip-remove"
                          onClick={() => removeCategoriaFromFilter(index)}
                          aria-label={`Quitar ${label}`}
                        >
                          <Icon name="close" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="product-import-wizard__elyerro-chip-empty">
                    Sin filtro: se usarán todas las categorías detectadas.
                  </p>
                )}
              </div>

              {!step1Ready && urlTrimmed ? (
                <p className="product-import-wizard__error">
                  Usa una URL de <strong>elyerromenu.com</strong> que contenga{" "}
                  <span className="dt-cell-mono">/b/…</span> en la ruta.
                </p>
              ) : null}
            </div>
          )}

          {step === 2 && preview && !importLoading && (
            <>
              <p className="product-import-wizard__elyerro-summary-line product-import-wizard__meta product-import-wizard__meta--block">
                <strong>{preview.nombreNegocio || "Negocio"}</strong>
                {preview.businessUrlNormalizada ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="dt-cell-mono">
                      {preview.businessUrlNormalizada}
                    </span>
                  </>
                ) : null}
              </p>
              <p className="product-import-wizard__elyerro-summary-line product-import-wizard__meta product-import-wizard__meta--block">
                {selectedCategoryIndices.length} categoría
                {selectedCategoryIndices.length === 1 ? "" : "s"} marcada
                {selectedCategoryIndices.length === 1 ? "" : "s"},{" "}
                {totalProductosEnSeleccion} producto
                {totalProductosEnSeleccion === 1 ? "" : "s"} en total.
                {importarSoloDisponibles
                  ? " Los no disponibles se omiten al importar."
                  : ""}
              </p>

              {preview.errores.length > 0 ? (
                <div className="product-import-wizard__elyerro-errors" role="alert">
                  <strong>Errores parciales al obtener el menú</strong>
                  <ul>
                    {preview.errores.map((err, idx) => (
                      <li key={`${idx}-${err.slice(0, 48)}`}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="product-import-wizard__table-scroll">
                <table className="product-import-wizard__mapping-table">
                  <thead>
                    <tr>
                      <th>Opción</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Solo productos disponibles</td>
                      <td>
                        <label className="product-import-wizard__elyerro-option-check">
                          <input
                            type="checkbox"
                            checked={importarSoloDisponibles}
                            onChange={(e) =>
                              setImportarSoloDisponibles(e.target.checked)
                            }
                          />
                          No importar ítems agotados o no disponibles en el menú
                        </label>
                      </td>
                    </tr>
                    <tr>
                      <td>Actualizar duplicados</td>
                      <td>
                        <label className="product-import-wizard__elyerro-option-check">
                          <input
                            type="checkbox"
                            checked={actualizarSiExiste}
                            onChange={(e) =>
                              setActualizarSiExiste(e.target.checked)
                            }
                          />
                          Si ya existe un producto con el mismo nombre en la
                          misma categoría, actualizar sus datos en lugar de
                          crear otro
                        </label>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="product-import-wizard__elyerro-preview-caption product-import-wizard__meta product-import-wizard__meta--block">
                Muestra de hasta {PREVIEW_TABLE_MAX} productos según las
                categorías que tengas marcadas más abajo.
              </p>
              <div className="product-import-wizard__preview-wrap">
                <table className="product-import-wizard__preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Categoría</th>
                      <th>Producto</th>
                      <th>Precio</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flatPreviewRows.map((row, i) => (
                      <tr
                        key={`${row.catLabel}-${row.nombre}-${i}`}
                        className={
                          row.warn ? "product-import-wizard__row-warn" : undefined
                        }
                      >
                        <td>{i + 1}</td>
                        <td>{row.catLabel}</td>
                        <td>{row.nombre}</td>
                        <td className="dt-cell-mono">{row.precio}</td>
                        <td>
                          {!row.disponible ? (
                            <span className="dt-tag dt-tag--red">Agotado</span>
                          ) : (
                            <span className="dt-tag dt-tag--green">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="product-import-wizard__elyerro-toolbar">
                <span className="product-import-wizard__elyerro-toolbar-label">
                  Categorías
                </span>
                <button type="button" onClick={selectAllCategories}>
                  Marcar todas
                </button>
                <button type="button" onClick={clearAllCategories}>
                  Quitar todas
                </button>
                <p className="product-import-wizard__elyerro-toolbar-hint">
                  Si no ves alguna sección, vuelve al paso anterior y revisa el
                  filtro por categorías o el menú en El Yerro.
                </p>
              </div>

              {preview.categorias.length === 0 ? (
                <p className="product-import-wizard__error">
                  No hay categorías con datos en la vista previa.
                </p>
              ) : null}

              <div className="product-import-wizard__elyerro-tree">
                {preview.categorias.map((cat, catIndex) => {
                  const slugOrPath =
                    cat.slug?.trim() || slugFromCategoryUrl(cat.url);
                  const checked = selectedCategoryIndices.includes(catIndex);
                  return (
                    <details
                      key={`${catIndex}-${cat.url}-${slugOrPath}`}
                      className="product-import-wizard__elyerro-cat"
                      open={catIndex < 3}
                    >
                      <summary>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategoryIndex(catIndex)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Incluir categoría ${cat.nombre || slugOrPath || catIndex}`}
                        />
                        <span className="product-import-wizard__elyerro-cat-title">
                          {cat.nombre || cat.slug || "Sin nombre"}
                          <span className="product-import-wizard__elyerro-cat-slug">
                            {slugOrPath ? ` · ${slugOrPath}` : ""} ·{" "}
                            {cat.productos.length} producto
                            {cat.productos.length === 1 ? "" : "s"}
                          </span>
                        </span>
                      </summary>
                      <ul className="product-import-wizard__elyerro-product-list">
                        {cat.productos.map((p) => (
                          <li
                            key={`${catIndex}-${p.slug}-${p.nombre}`}
                            className="product-import-wizard__elyerro-product"
                          >
                            {p.imagenUrl ? (
                              <img
                                src={
                                  getProxiedImageSrc(p.imagenUrl) ?? p.imagenUrl
                                }
                                alt=""
                              />
                            ) : (
                              <span
                                aria-hidden
                                className="product-import-wizard__elyerro-thumb-placeholder"
                              />
                            )}
                            <div className="product-import-wizard__elyerro-product-body">
                              <div className="product-import-wizard__elyerro-product-name">
                                {p.nombre || "—"}
                              </div>
                              {p.descripcion ? (
                                <div className="product-import-wizard__elyerro-product-desc">
                                  {p.descripcion}
                                </div>
                              ) : null}
                              <div className="product-import-wizard__elyerro-product-tags">
                                {!p.disponible ? (
                                  <span className="dt-tag dt-tag--red">
                                    Agotado
                                  </span>
                                ) : null}
                                {p.tieneDescuento ? (
                                  <span className="dt-tag dt-tag--green">
                                    Descuento
                                    {p.porcentajeDescuento != null
                                      ? ` ${p.porcentajeDescuento}%`
                                      : ""}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="dt-cell-mono product-import-wizard__elyerro-product-price">
                              {p.precio != null
                                ? `${p.precio} ${p.moneda || ""}`.trim()
                                : "—"}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && preview && importLoading && (
            <div className="product-import-wizard__import-run">
              <p className="product-import-wizard__import-run-title">
                Importando catálogo…
              </p>
              <div
                className="product-import-wizard__progress-meter"
                role="progressbar"
                aria-valuenow={50}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="product-import-wizard__progress-meter-fill product-import-wizard__progress-meter-fill--indeterminate" />
              </div>
              <p className="product-import-wizard__import-run-stats">
                Puede tardar varios minutos (límite de peticiones al sitio
                externo). No cierres esta ventana.
              </p>
            </div>
          )}

          {step === 3 && importResult && (
            <div className="product-import-wizard__summary">
              <span className="product-import-wizard__summary-icon" aria-hidden>
                <Icon name="task_alt" />
              </span>
              <p className="product-import-wizard__summary-title">
                Importación finalizada
              </p>
              <p>
                <span className="product-import-wizard__summary-num product-import-wizard__summary-num--ok">
                  {importResult.totalImportados}
                </span>
                <span className="product-import-wizard__summary-caption">
                  {" "}
                  importados
                </span>
              </p>
              {importResult.totalOmitidos > 0 ? (
                <p className="product-import-wizard__summary-row">
                  <span className="product-import-wizard__summary-num product-import-wizard__summary-num--fail">
                    {importResult.totalOmitidos}
                  </span>
                  <span className="product-import-wizard__summary-caption">
                    {" "}
                    omitidos
                  </span>
                </p>
              ) : null}
              <p className="product-import-wizard__summary-pending">
                <strong>
                  {importResult.nombreNegocio || preview?.nombreNegocio || "—"}
                </strong>
              </p>
              {importResult.errores.length > 0 ? (
                <div
                  className="product-import-wizard__elyerro-errors product-import-wizard__elyerro-errors--in-summary"
                  role="alert"
                >
                  <strong>Errores durante la importación</strong>
                  <ul>
                    {importResult.errores.map((err, idx) => (
                      <li key={`${idx}-${err.slice(0, 40)}`}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>

        <div className="product-import-wizard__footer">
          {step === 1 && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={handleClose}
                disabled={previewLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={() => void runPreview()}
                disabled={previewLoading || !step1Ready}
              >
                {previewLoading ? "Cargando…" : "Siguiente"}
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() => {
                  setStep(1);
                  setPreview(null);
                  setSelectedCategoryIndices([]);
                }}
                disabled={importLoading || previewLoading}
              >
                Atrás
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={() => void runImport()}
                disabled={
                  importLoading || previewLoading || !canImport || !preview
                }
              >
                {importLoading
                  ? "Importando…"
                  : `Importar${totalProductosEnSeleccion > 0 ? ` (${totalProductosEnSeleccion})` : ""}`}
              </button>
            </>
          )}
          {step === 3 && (
            <button
              type="button"
              className="product-import-wizard__btn product-import-wizard__btn--primary"
              onClick={handleClose}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
