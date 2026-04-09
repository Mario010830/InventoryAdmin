"use client";

import { useRouter } from "next/navigation";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import type {
  ElYerroImportResult,
  ElYerroPreviewCategory,
  ElYerroPreviewResult,
  ProductTipo,
} from "@/lib/dashboard-types";
import {
  IMPORT_ELYERRO_MOVEMENT_REASON,
  MOVEMENT_REASON_LABEL,
} from "@/lib/inventoryMovementUi";
import {
  beginSuppressMutationToasts,
  endSuppressMutationToasts,
} from "@/lib/mutationToastControl";
import { getProxiedImageSrc } from "@/lib/proxiedImageSrc";
import { useGetLocationsQuery } from "../locations/_service/locationsApi";
import {
  useCreateMovementMutation,
  useGetMovementFormContextQuery,
} from "../movements/_service/movementsApi";
import {
  useImportElYerroMutation,
  usePreviewElYerroMutation,
} from "./_service/elyerroImportApi";
import {
  useLazyGetProductsQuery,
  useUpdateProductMutation,
} from "./_service/productsApi";
import "./product-import-wizard.css";

const ELYERRO_FINISH_TOAST_ID = "elyerro-import-finish";

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

function extractElYerroImportedRow(
  raw: unknown,
): { id: number; name: string } | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  let idRaw: unknown =
    o.id ?? o.Id ?? o.productId ?? o.ProductId ?? o.productoId ?? o.ProductoId;
  let name = String(o.name ?? o.Name ?? o.nombre ?? o.Nombre ?? "").trim();
  if (idRaw == null || idRaw === "") {
    const nested =
      o.product ?? o.Product ?? o.producto ?? o.Producto ?? o.item ?? o.Item;
    if (nested && typeof nested === "object") {
      const n = nested as Record<string, unknown>;
      idRaw =
        n.id ??
        n.Id ??
        n.productId ??
        n.ProductId ??
        n.productoId ??
        n.ProductoId;
      if (!name) {
        name = String(n.name ?? n.Name ?? n.nombre ?? n.Nombre ?? "").trim();
      }
    }
  }
  const id = typeof idRaw === "string" ? Number(idRaw.trim()) : Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return { id, name: name || `Producto #${id}` };
}

function parseElYerroImportedProducts(
  items: unknown[],
): { id: number; name: string }[] {
  const out: { id: number; name: string }[] = [];
  const seen = new Set<number>();
  for (const raw of items) {
    const row = extractElYerroImportedRow(raw);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function parseStockQtyInput(raw: string | undefined): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
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
  const [elyerroImportedProducts, setElyerroImportedProducts] = useState<
    { id: number; name: string }[]
  >([]);
  const [tipoAssign, setTipoAssign] = useState<
    Record<number, ProductTipo | "">
  >({});
  const [stockQtyAssign, setStockQtyAssign] = useState<Record<number, string>>(
    {},
  );
  const [stockLocationId, setStockLocationId] = useState<number | null>(null);
  const [postImportBusy, setPostImportBusy] = useState(false);

  const [previewMutation, { isLoading: previewLoading }] =
    usePreviewElYerroMutation();
  const [importMutation, { isLoading: importLoading }] =
    useImportElYerroMutation();
  const [fetchProductsPage] = useLazyGetProductsQuery();
  const [updateProduct] = useUpdateProductMutation();
  const [createMovement] = useCreateMovementMutation();

  const { data: movementCtx } = useGetMovementFormContextQuery(undefined, {
    skip: !open || step < 4,
  });
  const { data: locationsResult } = useGetLocationsQuery(
    { page: 1, perPage: 200 },
    { skip: !open || step < 4 },
  );

  const defaultStockLocationId = useMemo(() => {
    if (movementCtx?.locationId != null) return movementCtx.locationId;
    const first = locationsResult?.data?.[0]?.id;
    return first != null ? Number(first) : null;
  }, [movementCtx?.locationId, locationsResult?.data]);

  const stockLocationOptions = useMemo(
    () =>
      (locationsResult?.data ?? []).map((loc) => ({
        id: Number(loc.id),
        name: String(loc.name ?? `ID ${loc.id}`),
      })),
    [locationsResult?.data],
  );

  const stockLocationLabel = useMemo(() => {
    if (stockLocationId == null) return null;
    const found = stockLocationOptions.find((l) => l.id === stockLocationId);
    if (found) return found.name;
    if (
      movementCtx?.locationId === stockLocationId &&
      movementCtx?.locationName
    ) {
      return movementCtx.locationName;
    }
    return `ID ${stockLocationId}`;
  }, [
    stockLocationId,
    stockLocationOptions,
    movementCtx?.locationId,
    movementCtx?.locationName,
  ]);

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
    setElyerroImportedProducts([]);
    setTipoAssign({});
    setStockQtyAssign({});
    setStockLocationId(null);
    setPostImportBusy(false);
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (!open || step !== 5) return;
    if (stockLocationId != null) return;
    if (defaultStockLocationId != null) {
      setStockLocationId(defaultStockLocationId);
    }
  }, [open, step, stockLocationId, defaultStockLocationId]);

  const allTipoSlotsFilled = useMemo(() => {
    if (elyerroImportedProducts.length === 0) return true;
    return elyerroImportedProducts.every((p) => {
      const t = tipoAssign[p.id];
      return t === "inventariable" || t === "elaborado";
    });
  }, [elyerroImportedProducts, tipoAssign]);

  const persistTipos = async () => {
    for (const p of elyerroImportedProducts) {
      const tipo = tipoAssign[p.id];
      if (tipo !== "inventariable" && tipo !== "elaborado") {
        throw new Error("Tipo pendiente");
      }
      await updateProduct({
        id: p.id,
        body: { tipo },
      }).unwrap();
    }
  };

  const applyStockMovements = async (): Promise<{
    ok: number;
    fail: number;
  }> => {
    let ok = 0;
    let fail = 0;
    const locId = stockLocationId;
    for (const p of elyerroImportedProducts) {
      if (tipoAssign[p.id] !== "inventariable") continue;
      const q = parseStockQtyInput(stockQtyAssign[p.id]);
      if (q == null || q <= 0 || locId == null) continue;
      try {
        await createMovement({
          productId: p.id,
          locationId: locId,
          type: 0,
          quantity: q,
          reason: IMPORT_ELYERRO_MOVEMENT_REASON,
        }).unwrap();
        ok++;
      } catch {
        fail++;
      }
    }
    return { ok, fail };
  };

  const finishWithStock = async () => {
    const needsInvQty = elyerroImportedProducts.some((p) => {
      if (tipoAssign[p.id] !== "inventariable") return false;
      const q = parseStockQtyInput(stockQtyAssign[p.id]);
      return q != null && q > 0;
    });
    if (needsInvQty && stockLocationId == null) {
      toast.error("Elige una ubicación para registrar el stock inicial.");
      return;
    }
    setPostImportBusy(true);
    beginSuppressMutationToasts();
    toast.loading("Guardando tipos y stock…", { id: ELYERRO_FINISH_TOAST_ID });
    try {
      await persistTipos();
      const { ok, fail } = await applyStockMovements();
      const parts = ["Tipos de producto guardados."];
      if (ok > 0) {
        parts.push(
          `Entradas de inventario: ${ok} registrada${ok === 1 ? "" : "s"}.`,
        );
      }
      if (fail > 0) {
        parts.push(
          `${fail} movimiento${fail === 1 ? "" : "s"} no se pudieron registrar.`,
        );
      }
      const msg = parts.join(" ");
      if (fail > 0) {
        toast.warning(msg, { id: ELYERRO_FINISH_TOAST_ID });
      } else {
        toast.success(msg, { id: ELYERRO_FINISH_TOAST_ID });
      }
      onClose();
    } catch {
      toast.error(
        "No se pudo completar el paso final. Revisa tipos y vuelve a intentar.",
        { id: ELYERRO_FINISH_TOAST_ID },
      );
    } finally {
      endSuppressMutationToasts();
      setPostImportBusy(false);
    }
  };

  const finishWithoutStockMovements = async () => {
    setPostImportBusy(true);
    beginSuppressMutationToasts();
    toast.loading("Guardando tipos…", { id: ELYERRO_FINISH_TOAST_ID });
    try {
      await persistTipos();
      toast.success("Tipos de producto guardados.", {
        id: ELYERRO_FINISH_TOAST_ID,
      });
      onClose();
    } catch {
      toast.error("No se pudieron guardar los tipos de producto.", {
        id: ELYERRO_FINISH_TOAST_ID,
      });
    } finally {
      endSuppressMutationToasts();
      setPostImportBusy(false);
    }
  };

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
  const urlLooksOk = /^https:\/\/(www\.)?elyerromenu\.com\/b\/.+/i.test(
    urlTrimmed,
  );

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
            p.precio != null ? `${p.precio} ${p.moneda ?? ""}`.trim() : "—",
          disponible: p.disponible,
          warn: Boolean(importarSoloDisponibles && !p.disponible),
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
      let parsed = parseElYerroImportedProducts(data.productosImportados);
      if (parsed.length === 0 && data.totalImportados > 0) {
        try {
          const perPage = Math.min(Math.max(data.totalImportados, 1), 500);
          const pageResult = await fetchProductsPage(
            { page: 1, perPage, sortOrder: "desc" },
            false,
          ).unwrap();
          parsed = pageResult.data.slice(0, data.totalImportados).map((p) => ({
            id: p.id,
            name: p.name?.trim() ? p.name : `Producto #${p.id}`,
          }));
        } catch {
          parsed = [];
        }
      }
      const nextTipo: Record<number, ProductTipo | ""> = {};
      const nextStock: Record<number, string> = {};
      for (const p of parsed) {
        nextTipo[p.id] = "";
        nextStock[p.id] = "";
      }
      setTipoAssign(nextTipo);
      setStockQtyAssign(nextStock);
      setStockLocationId(null);
      setElyerroImportedProducts(parsed);
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
    if (previewLoading || importLoading || postImportBusy) return;
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !previewLoading &&
        !importLoading &&
        !postImportBusy
      ) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, previewLoading, importLoading, postImportBusy, onClose]);

  if (!open) return null;

  const wizardStepLabels = [
    "Origen",
    "Vista previa",
    "Resumen",
    "Tipo",
    "Stock",
  ] as const;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: modal backdrop
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape en useEffect
    <div
      className="modal-overlay product-import-wizard__backdrop"
      onClick={handleClose}
    >
      <div
        className="product-import-wizard__shell product-import-wizard__shell--elyerro-wide"
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
            disabled={previewLoading || importLoading || postImportBusy}
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
                <div
                  className="product-import-wizard__elyerro-errors"
                  role="alert"
                >
                  <strong>Errores parciales al obtener el menú</strong>
                  <ul>
                    {preview.errores.map((err, idx) => (
                      <li key={`${idx}-${err.slice(0, 48)}`}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="product-import-wizard__stock-location-card product-import-wizard__stock-location-card--elyerro-inline">
                <div className="product-import-wizard__stock-location-card-head">
                  <span
                    className="product-import-wizard__stock-location-card-icon"
                    aria-hidden
                  >
                    <Icon name="tune" />
                  </span>
                  <div className="product-import-wizard__stock-location-card-text">
                    <p className="product-import-wizard__stock-location-card-title">
                      Opciones de importación
                    </p>
                    <p className="product-import-wizard__stock-location-card-desc">
                      Mismo criterio que en la importación por Excel: solo
                      disponibles y cómo tratar duplicados por nombre y
                      categoría.
                    </p>
                  </div>
                </div>
                <div className="product-import-wizard__elyerro-options-stack">
                  <label className="product-import-wizard__elyerro-option-check">
                    <input
                      type="checkbox"
                      checked={importarSoloDisponibles}
                      onChange={(e) =>
                        setImportarSoloDisponibles(e.target.checked)
                      }
                    />
                    <span>
                      No importar ítems agotados o no disponibles en el menú
                    </span>
                  </label>
                  <label className="product-import-wizard__elyerro-option-check">
                    <input
                      type="checkbox"
                      checked={actualizarSiExiste}
                      onChange={(e) => setActualizarSiExiste(e.target.checked)}
                    />
                    <span>
                      Si ya existe un producto con el mismo nombre en la misma
                      categoría, actualizar sus datos en lugar de crear otro
                    </span>
                  </label>
                </div>
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
                          row.warn
                            ? "product-import-wizard__row-warn"
                            : undefined
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
              {elyerroImportedProducts.length > 0 ? (
                <p className="product-import-wizard__summary-pending">
                  A continuación podrás elegir el <strong>tipo</strong> de cada
                  producto y registrar <strong>stock inicial</strong> en la
                  ubicación que indiques (como en la importación por Excel).
                </p>
              ) : importResult.totalImportados > 0 ? (
                <p className="product-import-wizard__meta-warn product-import-wizard__meta--block">
                  No se pudo obtener la lista de productos recién importados (ni
                  en la respuesta del servidor ni desde el catálogo). Usa «Ir al
                  listado de productos» para asignar tipo y stock allí.
                </p>
              ) : null}
            </div>
          )}

          {step === 4 && elyerroImportedProducts.length > 0 && (
            <>
              <p className="product-import-wizard__meta product-import-wizard__meta--block">
                Elige el <strong>tipo de producto</strong> para cada ítem
                importado. Los <strong>inventariables</strong> podrán recibir
                stock en el siguiente paso.
              </p>
              <div className="product-import-wizard__table-scroll">
                <table className="product-import-wizard__mapping-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elyerroImportedProducts.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name || `ID ${p.id}`}</td>
                        <td>
                          <select
                            value={
                              tipoAssign[p.id] === undefined
                                ? ""
                                : String(tipoAssign[p.id])
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              setTipoAssign((prev) => ({
                                ...prev,
                                [p.id]:
                                  v === "inventariable" || v === "elaborado"
                                    ? v
                                    : "",
                              }));
                            }}
                            aria-label={`Tipo para ${p.name}`}
                          >
                            <option value="">— Elegir —</option>
                            <option value="inventariable">Inventariable</option>
                            <option value="elaborado">Elaborado</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!allTipoSlotsFilled ? (
                <p className="product-import-wizard__error">
                  Selecciona un tipo en cada fila para continuar.
                </p>
              ) : null}
            </>
          )}

          {step === 5 && elyerroImportedProducts.length > 0 && (
            <>
              <p className="product-import-wizard__meta product-import-wizard__meta--block">
                Registra una <strong>entrada de inventario</strong> como stock
                inicial para los productos inventariables. Deja en blanco o 0 si
                no quieres movimiento para esa fila.
              </p>
              <div className="product-import-wizard__stock-location-card">
                <div className="product-import-wizard__stock-location-card-head">
                  <span
                    className="product-import-wizard__stock-location-card-icon"
                    aria-hidden
                  >
                    <Icon name="place" />
                  </span>
                  <div className="product-import-wizard__stock-location-card-text">
                    <p className="product-import-wizard__stock-location-card-title">
                      Ubicación de la entrada
                    </p>
                    <p className="product-import-wizard__stock-location-card-desc">
                      Razón: «
                      {MOVEMENT_REASON_LABEL[IMPORT_ELYERRO_MOVEMENT_REASON] ??
                        IMPORT_ELYERRO_MOVEMENT_REASON}
                      ». Solo aplica a filas inventariables con cantidad mayor
                      que cero.
                    </p>
                  </div>
                </div>
                {stockLocationOptions.length > 0 ? (
                  <div className="product-import-wizard__stock-location-field">
                    <label
                      className="product-import-wizard__stock-location-label"
                      htmlFor="elyerro-stock-location-select"
                    >
                      Ubicación
                    </label>
                    <select
                      id="elyerro-stock-location-select"
                      className="product-import-wizard__location-select"
                      value={
                        stockLocationId == null ? "" : String(stockLocationId)
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        setStockLocationId(v === "" ? null : Number(v));
                      }}
                      aria-label="Ubicación para stock inicial"
                    >
                      <option value="">— Elegir ubicación —</option>
                      {stockLocationOptions.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                    {stockLocationId != null ? (
                      <p className="product-import-wizard__stock-location-hint">
                        Se usará «{stockLocationLabel}».
                      </p>
                    ) : (
                      <p className="product-import-wizard__stock-location-warn product-import-wizard__stock-location-warn--inline">
                        Obligatoria si indicas cantidades de stock.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="product-import-wizard__stock-location-warn">
                    No hay ubicaciones: no se pueden registrar entradas hasta
                    configurar al menos una.
                  </p>
                )}
              </div>
              <div className="product-import-wizard__table-scroll">
                <table className="product-import-wizard__mapping-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad inicial</th>
                    </tr>
                  </thead>
                  <tbody>
                    {elyerroImportedProducts.map((p) => {
                      const inv = tipoAssign[p.id] === "inventariable";
                      return (
                        <tr key={p.id}>
                          <td>{p.name || `ID ${p.id}`}</td>
                          <td>
                            {tipoAssign[p.id] === "inventariable"
                              ? "Inventariable"
                              : tipoAssign[p.id] === "elaborado"
                                ? "Elaborado"
                                : "—"}
                          </td>
                          <td>
                            {inv ? (
                              <input
                                className="product-import-wizard__stock-qty-input"
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={stockQtyAssign[p.id] ?? ""}
                                onChange={(e) =>
                                  setStockQtyAssign((prev) => ({
                                    ...prev,
                                    [p.id]: e.target.value,
                                  }))
                                }
                                aria-label={`Cantidad inicial para ${p.name}`}
                              />
                            ) : (
                              <span className="product-import-wizard__meta">
                                —
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
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
          {step === 3 &&
            (elyerroImportedProducts.length > 0 ? (
              <>
                <button
                  type="button"
                  className="product-import-wizard__btn product-import-wizard__btn--ghost"
                  onClick={handleClose}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="product-import-wizard__btn product-import-wizard__btn--primary"
                  onClick={() => setStep(4)}
                >
                  Continuar: tipo y stock
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="product-import-wizard__btn product-import-wizard__btn--ghost"
                  onClick={handleClose}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  className="product-import-wizard__btn product-import-wizard__btn--primary"
                  onClick={() => {
                    onClose();
                    router.push("/dashboard/products");
                  }}
                >
                  Ir al listado de productos
                </button>
              </>
            ))}
          {step === 4 && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() => setStep(3)}
                disabled={postImportBusy}
              >
                Atrás
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={handleClose}
                disabled={postImportBusy}
              >
                Omitir
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={() => setStep(5)}
                disabled={!allTipoSlotsFilled || postImportBusy}
              >
                Siguiente: stock inicial
              </button>
            </>
          )}
          {step === 5 && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() => setStep(4)}
                disabled={postImportBusy}
              >
                Atrás
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() => void finishWithoutStockMovements()}
                disabled={postImportBusy}
              >
                {postImportBusy ? "Guardando…" : "Solo guardar tipos"}
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={() => void finishWithStock()}
                disabled={postImportBusy}
              >
                {postImportBusy ? "Procesando…" : "Guardar tipos y stock"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
