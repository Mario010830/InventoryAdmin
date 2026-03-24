"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Icon } from "@/components/ui/Icon";
import { useDisplayCurrency } from "@/contexts/DisplayCurrencyContext";
import type {
  CreateProductRequest,
  ProductTipo,
  ProductCategoryResponse,
} from "@/lib/dashboard-types";
import {
  IMPORT_EXCEL_MOVEMENT_REASON,
  MOVEMENT_REASON_LABEL,
} from "@/lib/inventoryMovementUi";
import { useGetLocationsQuery } from "../locations/_service/locationsApi";
import {
  useCreateMovementMutation,
  useGetMovementFormContextQuery,
} from "../movements/_service/movementsApi";
import {
  useCreateProductMutation,
  useGetProductCategoriesQuery,
  useUpdateProductMutation,
} from "./_service/productsApi";
import {
  beginSuppressMutationToasts,
  endSuppressMutationToasts,
  withSuppressedMutationToasts,
} from "@/lib/mutationToastControl";
import "./product-import-wizard.css";

const EXCEL_IMPORT_TOAST_ID = "excel-product-import";

type MappingKey =
  | "name"
  | "description"
  | "precio"
  | "costo"
  | "code"
  | "categoryName"
  | "quantityStock";

const FIELD_ROWS: { key: MappingKey; label: string; required: boolean }[] = [
  { key: "name", label: "Nombre del producto", required: true },
  { key: "description", label: "Descripción", required: false },
  { key: "precio", label: "Precio de venta", required: true },
  { key: "costo", label: "Costo", required: false },
  { key: "code", label: "Código / SKU", required: false },
  {
    key: "categoryName",
    label: "Categoría (nombre en Excel)",
    required: false,
  },
  {
    key: "quantityStock",
    label: "Cantidad / stock (entrada de inventario)",
    required: false,
  },
];

/** Primera fila que parece cabecera de tabla (Nombre + Precio). */
function findHeaderRowIndex(matrix: unknown[][]): number {
  const maxScan = Math.min(matrix.length, 80);
  for (let r = 0; r < maxScan; r++) {
    const row = matrix[r];
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => normalizeKey(String(c ?? "")));
    const hasNombre = cells.some(
      (c) =>
        c.includes("nombre") ||
        c === "producto" ||
        (c.includes("producto") && !c.includes("ganancia")),
    );
    const hasPrecio = cells.some((c) => {
      if (c.includes("ganancia") || c.includes("roi")) return false;
      return c.includes("precio") || c.includes("venta") || c.includes("price");
    });
    if (hasNombre && hasPrecio) return r;
  }
  return 0;
}

function pickSheetAndMatrix(
  wb: import("xlsx").WorkBook,
  XLSX: typeof import("xlsx"),
): { sheetName: string; matrix: unknown[][]; headerRow: number } {
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    if (!sheet) continue;
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      raw: true,
    }) as unknown[][];
    if (!matrix.length) continue;
    const headerRow = findHeaderRowIndex(matrix);
    const row = matrix[headerRow];
    if (!Array.isArray(row)) continue;
    const cells = row.map((c) => normalizeKey(String(c ?? "")));
    const hasNombre = cells.some(
      (c) => c.includes("nombre") || c.includes("producto"),
    );
    const hasPrecio = cells.some((c) => {
      if (c.includes("ganancia") || c.includes("roi")) return false;
      return c.includes("precio") || c.includes("venta");
    });
    if (hasNombre && hasPrecio) {
      return { sheetName: name, matrix, headerRow };
    }
  }
  const firstName = wb.SheetNames[0];
  if (!firstName) throw new Error("El archivo no tiene hojas.");
  const sheet = wb.Sheets[firstName];
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: true,
  }) as unknown[][];
  return {
    sheetName: firstName,
    matrix,
    headerRow: findHeaderRowIndex(matrix),
  };
}

function normalizeKey(s: string): string {
  return s.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/** Cabecera vacía en Excel: el parser usa "Columna N" (no es un encabezado de datos real). */
function isSyntheticHeaderLabel(label: string): boolean {
  return /^Columna\s+\d+$/i.test(label.trim());
}

/**
 * Opciones del mapeo: solo el nombre del header (sin índice entre paréntesis).
 * Se omiten columnas vacías tipo "Columna N", salvo si `includeIndices` las tiene mapeadas.
 */
function buildColumnSelectOptions(
  labels: string[],
  includeIndices?: Set<number>,
): { value: string; label: string }[] {
  const mapped = labels.map((label, i) => ({
    value: String(i),
    label: label.trim(),
  }));
  const out = mapped.filter(
    (_o, i) =>
      !isSyntheticHeaderLabel(labels[i] ?? "") ||
      includeIndices?.has(i) === true,
  );
  return out.length > 0 ? out : mapped;
}

function buildCategoryLookup(categories: ProductCategoryResponse[]) {
  const map = new Map<string, number>();
  for (const c of categories) {
    const k = normalizeKey(c.name);
    if (k && !map.has(k)) map.set(k, c.id);
  }
  return map;
}

function parseNumberCell(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Descarta filas vacías o solo con ceros (fila en blanco entre cabecera y datos, plantillas con 0 por defecto). */
function rowHasMeaningfulContent(row: unknown[]): boolean {
  for (const c of row) {
    if (c == null || c === "") continue;
    if (typeof c === "number") {
      if (Number.isFinite(c) && c !== 0) return true;
      continue;
    }
    const s = String(c).trim();
    if (s.length === 0) continue;
    const n = parseNumberCell(c);
    if (n !== null && n === 0) continue;
    return true;
  }
  return false;
}

function parseStockQuantity(raw: unknown): number | null {
  const n = parseNumberCell(raw);
  if (n == null || n <= 0) return null;
  return Math.floor(n);
}

function getCell(row: unknown[], colIndex: number | undefined): unknown {
  if (colIndex == null || colIndex < 0) return undefined;
  return row[colIndex];
}

/** Códigos únicos en el lote: vacíos → IMP-fila-xxx; repetidos → sufijo -1, -2… */
function resolveUniqueCodesForImportBatch(rawCodes: string[]): string[] {
  const used = new Set<string>();
  const out: string[] = [];
  for (let i = 0; i < rawCodes.length; i++) {
    let base = rawCodes[i].trim();
    if (base === "") {
      base = `IMP-${i + 1}-${Math.random().toString(36).slice(2, 9)}`;
    }
    let candidate = base;
    let dup = 0;
    while (used.has(candidate)) {
      dup++;
      candidate = `${base}-${dup}`;
    }
    used.add(candidate);
    out.push(candidate);
  }
  return out;
}

/** Nombre vacío o solo guiones/puntos (celda “vacía” visual en Excel). */
function isBlankOrPlaceholderName(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return true;
  return /^[\s\-–—\u2013\u2014.…]+$/.test(t);
}

/**
 * Fila que no aporta producto ni datos útiles en columnas mapeadas (separadores,
 * filas en blanco con texto solo en columnas ROI/% fuera del mapeo, etc.).
 */
function rowIsSkippableImportNoise(
  row: unknown[],
  colIndex: (key: MappingKey) => number | undefined,
): boolean {
  const nameIx = colIndex("name");
  const precioIx = colIndex("precio");
  if (nameIx === undefined || precioIx === undefined) return false;

  const nameRaw = String(getCell(row, nameIx) ?? "").trim();
  if (!isBlankOrPlaceholderName(nameRaw)) return false;

  const precio = parseNumberCell(getCell(row, precioIx));
  if (precio != null && precio !== 0) return false;

  if (parseStockQuantity(getCell(row, colIndex("quantityStock"))) != null)
    return false;

  const code = String(getCell(row, colIndex("code")) ?? "").trim();
  if (code.length > 0) return false;

  return true;
}

export interface ProductImportWizardProps {
  open: boolean;
  onClose: () => void;
}

export function ProductImportWizard({
  open,
  onClose,
}: ProductImportWizardProps) {
  const { formatCup } = useDisplayCurrency();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [fileName, setFileName] = useState("");
  const [sheetCaption, setSheetCaption] = useState("");
  const [columnLabels, setColumnLabels] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<unknown[][]>([]);
  const [mapping, setMapping] = useState<Record<MappingKey, string>>({
    name: "",
    description: "",
    precio: "",
    costo: "",
    code: "",
    categoryName: "",
    quantityStock: "",
  });

  const [importing, setImporting] = useState(false);
  const [importIndex, setImportIndex] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [okCount, setOkCount] = useState(0);
  const [failCount, setFailCount] = useState(0);
  const [stockFailCount, setStockFailCount] = useState(0);
  const [stockOkCount, setStockOkCount] = useState(0);
  const [selectedLocationId, setSelectedLocationId] = useState<number | null>(
    null,
  );
  /** Productos creados sin categoría — paso 5 para asignar. */
  const [productsNeedingCategory, setProductsNeedingCategory] = useState<
    { id: number; name: string }[]
  >([]);
  const [categoryAssign, setCategoryAssign] = useState<
    Record<number, number | "">
  >({});
  const [savingCategories, setSavingCategories] = useState(false);
  /** Tipos por producto — paso 6 para asignar inventariable/elaborado. */
  const [productsNeedingTipo, setProductsNeedingTipo] = useState<
    { id: number; name: string }[]
  >([]);
  const [tipoAssign, setTipoAssign] = useState<Record<number, ProductTipo | "">>(
    {},
  );
  const [savingTipos, setSavingTipos] = useState(false);

  const { data: categoriesResult, isFetching: categoriesLoading } =
    useGetProductCategoriesQuery(
      { page: 1, perPage: 500 },
      { skip: !open || step < 2 },
    );

  const { data: movementCtx } = useGetMovementFormContextQuery(undefined, {
    skip: !open || step < 2,
  });
  const { data: locationsResult } = useGetLocationsQuery(
    { page: 1, perPage: 200 },
    { skip: !open || step < 2 },
  );

  const defaultLocationId = useMemo(() => {
    if (movementCtx?.locationId != null) return movementCtx.locationId;
    const first = locationsResult?.data?.[0]?.id;
    return first != null ? Number(first) : null;
  }, [movementCtx?.locationId, locationsResult?.data]);

  const locationOptions = useMemo(
    () =>
      (locationsResult?.data ?? []).map((loc) => ({
        id: Number(loc.id),
        name: String(loc.name ?? `ID ${loc.id}`),
      })),
    [locationsResult?.data],
  );

  const selectedLocationLabel = useMemo(() => {
    if (selectedLocationId == null) return null;
    const found = locationOptions.find((loc) => loc.id === selectedLocationId);
    if (found) return found.name;
    if (
      movementCtx?.locationId === selectedLocationId &&
      movementCtx?.locationName
    ) {
      return movementCtx.locationName;
    }
    return `ID ${selectedLocationId}`;
  }, [
    selectedLocationId,
    locationOptions,
    movementCtx?.locationId,
    movementCtx?.locationName,
  ]);

  const categories = categoriesResult?.data ?? [];
  const categoryLookup = useMemo(
    () => buildCategoryLookup(categories),
    [categories],
  );

  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [createMovement] = useCreateMovementMutation();

  const resetState = useCallback(() => {
    setStep(1);
    setFileName("");
    setSheetCaption("");
    setColumnLabels([]);
    setDataRows([]);
    setMapping({
      name: "",
      description: "",
      precio: "",
      costo: "",
      code: "",
      categoryName: "",
      quantityStock: "",
    });
    setImporting(false);
    setImportIndex(0);
    setImportTotal(0);
    setOkCount(0);
    setFailCount(0);
    setStockFailCount(0);
    setStockOkCount(0);
    setSelectedLocationId(null);
    setProductsNeedingCategory([]);
    setCategoryAssign({});
    setSavingCategories(false);
    setProductsNeedingTipo([]);
    setTipoAssign({});
    setSavingTipos(false);
  }, []);

  useEffect(() => {
    if (!open) resetState();
  }, [open, resetState]);

  useEffect(() => {
    if (!open) return;
    if (selectedLocationId != null) return;
    if (defaultLocationId != null) setSelectedLocationId(defaultLocationId);
  }, [open, selectedLocationId, defaultLocationId]);

  const colIndex = useCallback(
    (key: MappingKey): number | undefined => {
      const v = mapping[key];
      if (v === "") return undefined;
      const i = Number(v);
      return Number.isFinite(i) ? i : undefined;
    },
    [mapping],
  );

  /** Excluye filas vacías respecto a columnas mapeadas (tras elegir Nombre + Precio). */
  const dataRowsForImport = useMemo(() => {
    const nameIx = colIndex("name");
    const precioIx = colIndex("precio");
    if (nameIx === undefined || precioIx === undefined) return dataRows;
    return dataRows.filter((row) => !rowIsSkippableImportNoise(row, colIndex));
  }, [dataRows, colIndex]);

  const previewAndPayload = useMemo(() => {
    const nameIx = colIndex("name");
    const descIx = colIndex("description");
    const precioIx = colIndex("precio");
    const costoIx = colIndex("costo");
    const codeIx = colIndex("code");
    const catIx = colIndex("categoryName");
    const qtyIx = colIndex("quantityStock");

    const rows: {
      rowIndex: number;
      name: string;
      description: string;
      precio: number | null;
      costo: number;
      code: string;
      categoryExcel: string;
      categoryId: number | null;
      categoryUnknown: boolean;
      categoryMissing: boolean;
      missingRequired: boolean;
      stockQty: number | null;
      wantsStockMovement: boolean;
      payload: CreateProductRequest | null;
    }[] = [];

    const rawCodesForBatch = dataRowsForImport.map((row) =>
      String(getCell(row, codeIx) ?? "").trim(),
    );
    const resolvedCodes = resolveUniqueCodesForImportBatch(rawCodesForBatch);

    dataRowsForImport.forEach((row, idx) => {
      const name = String(getCell(row, nameIx) ?? "").trim();
      const description = String(getCell(row, descIx) ?? "").trim();
      const precio = parseNumberCell(getCell(row, precioIx));
      const costoRaw = parseNumberCell(getCell(row, costoIx));
      const costo = costoRaw ?? 0;
      const code = resolvedCodes[idx] ?? "";
      const categoryExcel = String(getCell(row, catIx) ?? "").trim();
      const stockQty = parseStockQuantity(getCell(row, qtyIx));
      let categoryId: number | null = null;
      let categoryUnknown = false;
      if (categoryExcel) {
        const found = categoryLookup.get(normalizeKey(categoryExcel));
        if (found != null) categoryId = found;
        else categoryUnknown = true;
      }
      const categoryMissing = catIx !== undefined && !categoryExcel;
      const missingRequired = !name || precio == null || precio < 0;
      let payload: CreateProductRequest | null = null;
      if (!missingRequired && precio != null) {
        payload = {
          tipo: "elaborado",
          isAvailable: true,
          isForSale: true,
          tagIds: [],
          code,
          name,
          description,
          precio,
          costo,
          categoryId,
          imagenUrl: "",
        };
      }
      const wantsStockMovement = Boolean(
        stockQty != null && stockQty > 0 && qtyIx !== undefined,
      );
      rows.push({
        rowIndex: idx,
        name,
        description,
        precio,
        costo,
        code,
        categoryExcel,
        categoryId,
        categoryUnknown,
        categoryMissing,
        missingRequired,
        stockQty,
        wantsStockMovement,
        payload,
      });
    });

    return rows;
  }, [dataRowsForImport, colIndex, categoryLookup]);

  const importableRows = useMemo(
    () => previewAndPayload.filter((r) => r.payload != null),
    [previewAndPayload],
  );

  const parseFile = async (file: File) => {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const { sheetName, matrix, headerRow } = pickSheetAndMatrix(wb, XLSX);
    if (!matrix.length) throw new Error("La hoja está vacía.");
    const headerCells = matrix[headerRow];
    if (!Array.isArray(headerCells))
      throw new Error("No se detectaron encabezados.");
    const headers = headerCells.map((h, i) => {
      const s = String(h ?? "").trim();
      return s || `Columna ${i + 1}`;
    });
    const rest = matrix
      .slice(headerRow + 1)
      .filter((row) => Array.isArray(row) && rowHasMeaningfulContent(row));
    const width = Math.max(headers.length, ...rest.map((r) => r.length));
    const padded = rest.map((row) => {
      const copy = [...row];
      while (copy.length < width) copy.push("");
      return copy.slice(0, width);
    });
    setColumnLabels(headers);
    setDataRows(padded);
    setFileName(file.name);
    setSheetCaption(
      `Hoja «${sheetName}» · Fila de encabezados: ${headerRow + 1}`,
    );
    const nextMapping: Record<MappingKey, string> = {
      name: "",
      description: "",
      precio: "",
      costo: "",
      code: "",
      categoryName: "",
      quantityStock: "",
    };
    const lower = headers.map((h) => normalizeKey(h));
    const findCol = (...candidates: string[]) => {
      for (const c of candidates) {
        const i = lower.findIndex((l) => l.includes(c) || c.includes(l));
        if (i >= 0) return String(i);
      }
      return "";
    };
    nextMapping.name = findCol("nombre", "name", "producto");
    nextMapping.precio = findCol(
      "precio de venta",
      "precio venta",
      "venta",
      "precio",
      "price",
    );
    nextMapping.costo = findCol("precio por unidad", "costo", "cost");
    nextMapping.description = findCol("descripcion", "description", "desc");
    nextMapping.code = findCol("codigo", "code", "sku");
    nextMapping.categoryName = findCol("categoria", "category", "categoría");
    nextMapping.quantityStock = findCol(
      "cantidad actual",
      "cantidad inicial",
      "existencia",
      "stock",
    );
    setMapping(nextMapping);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) {
      toast.error("Selecciona un archivo .xlsx");
      return;
    }
    void parseFile(f).catch((err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "No se pudo leer el Excel.",
      );
    });
  };

  const mappingValid =
    mapping.name !== "" &&
    mapping.precio !== "" &&
    colIndex("name") !== undefined &&
    colIndex("precio") !== undefined;

  /** Archivo leído y listo para pasar a mapeo (paso 1 → 2). */
  const step1Ready = Boolean(fileName) && columnLabels.length > 0;

  const goToMapping = () => {
    if (!step1Ready) return;
    setStep(2);
  };

  const goPreview = () => {
    if (!mappingValid) return;
    setStep(3);
  };

  const runImport = async () => {
    const list = importableRows;
    if (list.length === 0) return;
    setImporting(true);
    setOkCount(0);
    setFailCount(0);
    setStockOkCount(0);
    setStockFailCount(0);
    setImportTotal(list.length);
    setImportIndex(0);
    await new Promise((r) => setTimeout(r, 0));
    let ok = 0;
    let fail = 0;
    let stockOk = 0;
    let stockFail = 0;
    const locId = selectedLocationId;
    const needCategoryAfter: { id: number; name: string }[] = [];
    const needTipoAfter: { id: number; name: string }[] = [];
    beginSuppressMutationToasts();
    toast.loading(`Importando… 0 / ${list.length}`, { id: EXCEL_IMPORT_TOAST_ID });
    try {
      for (let i = 0; i < list.length; i++) {
        setImportIndex(i + 1);
        if (i % 5 === 0 || i === list.length - 1) {
          toast.loading(`Importando… ${i + 1} / ${list.length}`, {
            id: EXCEL_IMPORT_TOAST_ID,
          });
        }
        const item = list[i];
        if (!item.payload) {
          fail++;
          setFailCount(fail);
          continue;
        }
        try {
          const created = await createProduct(item.payload).unwrap();
          ok++;
          setOkCount(ok);
          const pCat = item.payload.categoryId;
          if (pCat == null || pCat === 0) {
            needCategoryAfter.push({
              id: created.id,
              name: created.name || item.payload.name,
            });
          }
          needTipoAfter.push({
            id: created.id,
            name: created.name || item.payload.name,
          });
          const qty = item.stockQty;
          if (
            item.wantsStockMovement &&
            qty != null &&
            qty > 0 &&
            locId != null
          ) {
            try {
              await createMovement({
                productId: created.id,
                locationId: locId,
                type: 0,
                quantity: qty,
                reason: IMPORT_EXCEL_MOVEMENT_REASON,
              }).unwrap();
              stockOk++;
              setStockOkCount(stockOk);
            } catch {
              stockFail++;
              setStockFailCount(stockFail);
            }
          }
        } catch {
          fail++;
          setFailCount(fail);
        }
      }
      setOkCount(ok);
      setFailCount(fail);
      setStockOkCount(stockOk);
      setStockFailCount(stockFail);
      const parts: string[] = [`${ok} producto(s) creado(s)`];
      if (fail > 0) parts.push(`${fail} con error`);
      if (stockOk > 0) parts.push(`${stockOk} entrada(s) de stock`);
      if (stockFail > 0)
        parts.push(`${stockFail} movimiento(s) de stock fallidos`);
      toast.success(parts.join(" · "), { id: EXCEL_IMPORT_TOAST_ID });
      setProductsNeedingCategory(needCategoryAfter);
      setCategoryAssign({});
      setProductsNeedingTipo(needTipoAfter);
      setTipoAssign({});
      setStep(4);
    } finally {
      endSuppressMutationToasts();
      setImporting(false);
    }
  };

  const allCategorySlotsFilled = useMemo(() => {
    if (productsNeedingCategory.length === 0) return true;
    return productsNeedingCategory.every(
      (p) =>
        categoryAssign[p.id] !== "" &&
        categoryAssign[p.id] != null &&
        Number(categoryAssign[p.id]) > 0,
    );
  }, [productsNeedingCategory, categoryAssign]);

  const saveAssignedCategories = async () => {
    if (!allCategorySlotsFilled || productsNeedingCategory.length === 0) return;
    setSavingCategories(true);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const p of productsNeedingCategory) {
          const cid = categoryAssign[p.id];
          if (cid === "" || cid == null) continue;
          await updateProduct({
            id: p.id,
            body: { categoryId: Number(cid) },
          }).unwrap();
        }
      });
      toast.success("Categorías actualizadas.");
      if (productsNeedingTipo.length > 0) {
        setStep(6);
      } else {
        onClose();
      }
    } catch {
      toast.error("No se pudieron guardar todas las categorías.");
    } finally {
      setSavingCategories(false);
    }
  };

  const allTipoSlotsFilled = useMemo(() => {
    if (productsNeedingTipo.length === 0) return true;
    return productsNeedingTipo.every((p) => {
      const t = tipoAssign[p.id];
      return t === "inventariable" || t === "elaborado";
    });
  }, [productsNeedingTipo, tipoAssign]);

  const saveAssignedTipos = async () => {
    if (!allTipoSlotsFilled || productsNeedingTipo.length === 0) return;
    setSavingTipos(true);
    try {
      await withSuppressedMutationToasts(async () => {
        for (const p of productsNeedingTipo) {
          const tipo = tipoAssign[p.id];
          if (tipo !== "inventariable" && tipo !== "elaborado") continue;
          await updateProduct({
            id: p.id,
            body: { tipo },
          }).unwrap();
        }
      });
      toast.success("Tipos actualizados.");
      onClose();
    } catch {
      toast.error("No se pudieron guardar todos los tipos.");
    } finally {
      setSavingTipos(false);
    }
  };

  const handleClose = () => {
    if (importing || savingCategories || savingTipos) return;
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !importing && !savingCategories && !savingTipos)
        onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, importing, savingCategories, savingTipos, onClose]);

  if (!open) return null;

  const mappedColumnIndices = new Set<number>();
  for (const v of Object.values(mapping)) {
    if (v === "") continue;
    const n = Number(v);
    if (Number.isFinite(n)) mappedColumnIndices.add(n);
  }
  const columnOptions = buildColumnSelectOptions(
    columnLabels,
    mappedColumnIndices,
  );

  const wizardStepLabels = [
    "Archivo",
    "Mapeo",
    "Vista previa",
    "Resumen",
    "Categorías",
    "Tipo",
  ] as const;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: fondo del modal; Escape cierra en useEffect
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape cierra en useEffect
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
        aria-labelledby="product-import-title"
      >
        <header className="product-import-wizard__header">
          <div className="product-import-wizard__header-text">
            <h2
              id="product-import-title"
              className="product-import-wizard__title"
            >
              Importar productos
            </h2>
            <p className="product-import-wizard__subtitle">
              Importación masiva desde Excel (.xlsx)
            </p>
          </div>
          <button
            type="button"
            className="product-import-wizard__close"
            onClick={handleClose}
            aria-label="Cerrar"
            disabled={importing || savingCategories || savingTipos}
          >
            <Icon name="close" />
          </button>
        </header>

        <nav
          className="product-import-wizard__progress-track"
          aria-label="Pasos del asistente"
        >
          {/* biome-ignore lint/a11y/useSemanticElements: pasos con conectores flex entre ítems; ol no encaja */}
          <div className="product-import-wizard__progress-row" role="list">
            {wizardStepLabels.map((label, i) => {
              const n = i + 1;
              const isDone = step > n;
              const isActive = step === n;
              return (
                <Fragment key={label}>
                  {/* biome-ignore lint/a11y/useSemanticElements: mismo motivo */}
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
          {step === 1 && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="product-import-wizard__file-input"
                onChange={onPickFile}
              />
              <button
                type="button"
                className={[
                  "product-import-wizard__drop",
                  fileName ? "product-import-wizard__drop--has-file" : "",
                ].join(" ")}
                onClick={() => fileInputRef.current?.click()}
              >
                <span className="product-import-wizard__drop-icon" aria-hidden>
                  <Icon name="upload_file" />
                </span>
                <p className="product-import-wizard__drop-title">
                  {fileName ? fileName : "Subir archivo Excel"}
                </p>
                <p className="product-import-wizard__drop-sub">
                  {fileName
                    ? "Listo para continuar al mapeo de columnas."
                    : ".xlsx · Se detecta la fila de cabecera aunque haya filas previas u otra hoja con tabla válida."}
                </p>
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {categoriesLoading && (
                <div className="product-import-wizard__loading">
                  <div className="product-import-wizard__spinner" />
                  <span>Cargando categorías…</span>
                </div>
              )}
              {!categoriesLoading && (
                <>
                  <p className="product-import-wizard__meta">
                    Archivo:{" "}
                    <strong className="product-import-wizard__meta-strong">
                      {fileName}
                    </strong>
                    {sheetCaption ? (
                      <>
                        {" "}
                        · <span>{sheetCaption}</span>
                      </>
                    ) : null}
                    <br />
                    {dataRowsForImport.length} filas de datos ·{" "}
                    {columnLabels.length} columnas
                  </p>

                  {mapping.quantityStock !== "" ? (
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
                            Entrada de inventario
                          </p>
                          <p className="product-import-wizard__stock-location-card-desc">
                            Razón de movimiento: «
                            {MOVEMENT_REASON_LABEL[
                              IMPORT_EXCEL_MOVEMENT_REASON
                            ] ?? IMPORT_EXCEL_MOVEMENT_REASON}
                            ». Las cantidades del Excel se registrarán como
                            entrada en la ubicación que elijas.
                          </p>
                        </div>
                      </div>
                      {locationOptions.length > 0 ? (
                        <div className="product-import-wizard__stock-location-field">
                          <label
                            className="product-import-wizard__stock-location-label"
                            htmlFor="import-excel-location-select"
                          >
                            Ubicación de entrada
                          </label>
                          <select
                            id="import-excel-location-select"
                            className="product-import-wizard__location-select"
                            value={
                              selectedLocationId == null
                                ? ""
                                : String(selectedLocationId)
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              setSelectedLocationId(
                                v === "" ? null : Number(v),
                              );
                            }}
                            aria-label="Ubicación para entrada de inventario"
                          >
                            <option value="">— Elegir ubicación —</option>
                            {locationOptions.map((loc) => (
                              <option key={loc.id} value={loc.id}>
                                {loc.name}
                              </option>
                            ))}
                          </select>
                          {selectedLocationId != null ? (
                            <p className="product-import-wizard__stock-location-hint">
                              Se usará «{selectedLocationLabel}» al importar.
                            </p>
                          ) : (
                            <p className="product-import-wizard__stock-location-warn product-import-wizard__stock-location-warn--inline">
                              Elige una ubicación para registrar las entradas de
                              stock.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="product-import-wizard__stock-location-warn">
                          No hay ubicaciones configuradas: no se registrarán
                          entradas de stock hasta que exista al menos una
                          ubicación en el sistema.
                        </p>
                      )}
                    </div>
                  ) : null}
                  <div className="product-import-wizard__table-scroll">
                    <table className="product-import-wizard__mapping-table">
                      <thead>
                        <tr>
                          <th>Campo</th>
                          <th>Columna del Excel</th>
                        </tr>
                      </thead>
                      <tbody>
                        {FIELD_ROWS.map((row) => (
                          <tr key={row.key}>
                            <td>
                              {row.label}
                              {row.required ? (
                                <span className="product-import-wizard__req">
                                  {" "}
                                  *
                                </span>
                              ) : null}
                            </td>
                            <td>
                              <select
                                value={mapping[row.key]}
                                onChange={(e) =>
                                  setMapping((m) => ({
                                    ...m,
                                    [row.key]: e.target.value,
                                  }))
                                }
                                aria-label={row.label}
                              >
                                <option value="">— Ninguna —</option>
                                {columnOptions.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!mappingValid && (
                    <p className="product-import-wizard__error">
                      Indica las columnas para nombre y precio (obligatorios).
                    </p>
                  )}
                </>
              )}
            </>
          )}

          {step === 3 && !importing && (
            <>
              <p className="product-import-wizard__meta product-import-wizard__meta--block">
                Vista previa de las primeras 10 filas. Se importarán{" "}
                <strong>{importableRows.length}</strong> productos válidos de{" "}
                {dataRowsForImport.length} filas.
                {mapping.quantityStock !== "" &&
                importableRows.some((x) => x.wantsStockMovement) ? (
                  <>
                    {" "}
                    Tras crear cada producto, si hay cantidad se registra una{" "}
                    <strong>entrada de inventario</strong> (
                    {MOVEMENT_REASON_LABEL[IMPORT_EXCEL_MOVEMENT_REASON]})
                    {selectedLocationId == null ? (
                      <span className="product-import-wizard__meta-warn">
                        {" "}
                        — sin ubicación no se crearán movimientos.
                      </span>
                    ) : null}
                  </>
                ) : null}{" "}
                Sin categoría en Excel podrás asignarla después de importar.
              </p>
              <div className="product-import-wizard__preview-wrap">
                <table className="product-import-wizard__preview-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nombre</th>
                      <th>Precio</th>
                      <th>Costo</th>
                      <th>Código</th>
                      <th>Categoría</th>
                      <th>Cant.</th>
                      <th>Entrada inv.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewAndPayload.slice(0, 10).map((r, i) => (
                      <tr
                        key={r.rowIndex}
                        className={
                          r.categoryUnknown ||
                          r.categoryMissing ||
                          (r.wantsStockMovement && selectedLocationId == null)
                            ? "product-import-wizard__row-warn"
                            : undefined
                        }
                      >
                        <td>{i + 1}</td>
                        <td>
                          {r.name || "—"}
                          {r.missingRequired ? (
                            <div className="product-import-wizard__warn-badge">
                              <span className="product-import-wizard__icon-inline">
                                <Icon name="error_outline" />
                              </span>
                              Faltan datos obligatorios
                            </div>
                          ) : null}
                        </td>
                        <td className="dt-cell-mono">
                          {r.precio != null ? formatCup(r.precio) : "—"}
                        </td>
                        <td className="dt-cell-mono">{formatCup(r.costo)}</td>
                        <td>{r.code || "—"}</td>
                        <td>
                          {r.categoryMissing
                            ? "—"
                            : r.categoryExcel
                              ? r.categoryUnknown
                                ? `${r.categoryExcel} (sin coincidencia)`
                                : (categories.find((c) => c.id === r.categoryId)
                                    ?.name ?? "—")
                              : "—"}
                          {r.categoryMissing ? (
                            <div className="product-import-wizard__info-badge">
                              <span className="product-import-wizard__icon-inline">
                                <Icon name="info_outline" />
                              </span>
                              Sin categoría: podrás asignarla al finalizar
                            </div>
                          ) : null}
                          {r.categoryUnknown ? (
                            <div className="product-import-wizard__info-badge">
                              <span className="product-import-wizard__icon-inline">
                                <Icon name="info_outline" />
                              </span>
                              Sin coincidencia: podrás elegir categoría después
                            </div>
                          ) : null}
                        </td>
                        <td className="dt-cell-mono">
                          {r.stockQty != null ? String(r.stockQty) : "—"}
                        </td>
                        <td>
                          {r.wantsStockMovement && r.stockQty != null ? (
                            selectedLocationId != null ? (
                              <span className="dt-tag dt-tag--green">
                                Entrada {r.stockQty} u.
                              </span>
                            ) : (
                              <div className="product-import-wizard__warn-badge">
                                <span className="product-import-wizard__icon-inline">
                                  <Icon name="warning_amber" />
                                </span>
                                Sin ubicación para movimiento
                              </div>
                            )
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {step === 3 && importing && (
            <div className="product-import-wizard__import-run">
              <p className="product-import-wizard__import-run-title">
                Importando… {importIndex} / {importTotal}
              </p>
              <div
                className="product-import-wizard__progress-meter"
                role="progressbar"
                aria-valuenow={importIndex}
                aria-valuemin={0}
                aria-valuemax={importTotal}
              >
                <div
                  className="product-import-wizard__progress-meter-fill"
                  style={{
                    width: importTotal
                      ? `${(importIndex / importTotal) * 100}%`
                      : "0%",
                  }}
                />
              </div>
              <p className="product-import-wizard__import-run-stats">
                Correctos: {okCount} · Errores: {failCount}
              </p>
            </div>
          )}

          {step === 4 && (
            <div className="product-import-wizard__summary">
              <span className="product-import-wizard__summary-icon" aria-hidden>
                <Icon name="task_alt" />
              </span>
              <p className="product-import-wizard__summary-title">
                Importación finalizada
              </p>
              <p>
                <span className="product-import-wizard__summary-num product-import-wizard__summary-num--ok">
                  {okCount}
                </span>
                <span className="product-import-wizard__summary-caption">
                  {" "}
                  importados correctamente
                </span>
              </p>
              {failCount > 0 ? (
                <p className="product-import-wizard__summary-row">
                  <span className="product-import-wizard__summary-num product-import-wizard__summary-num--fail">
                    {failCount}
                  </span>
                  <span className="product-import-wizard__summary-caption">
                    {" "}
                    no se pudieron importar
                  </span>
                </p>
              ) : null}
              {stockOkCount > 0 || stockFailCount > 0 ? (
                <p className="product-import-wizard__summary-stock">
                  Entradas de inventario:{" "}
                  <strong className="product-import-wizard__summary-stock-ok">
                    {stockOkCount}
                  </strong>{" "}
                  registradas
                  {stockFailCount > 0 ? (
                    <>
                      {" "}
                      ·{" "}
                      <strong className="product-import-wizard__summary-stock-fail">
                        {stockFailCount}
                      </strong>{" "}
                      fallidas (el producto sí se creó)
                    </>
                  ) : null}
                </p>
              ) : null}
              {productsNeedingCategory.length > 0 ? (
                <p className="product-import-wizard__summary-pending">
                  {productsNeedingCategory.length} producto
                  {productsNeedingCategory.length === 1 ? "" : "s"} sin
                  categoría — pulsa «Asignar categorías» para completarlas.
                </p>
              ) : null}
              {productsNeedingTipo.length > 0 ? (
                <p className="product-import-wizard__summary-pending">
                  {productsNeedingTipo.length} producto
                  {productsNeedingTipo.length === 1 ? "" : "s"} pendiente
                  {productsNeedingTipo.length === 1 ? "" : "s"} de tipo —
                  selecciona si son inventariables o elaborados.
                </p>
              ) : null}
            </div>
          )}

          {step === 5 && (
            <>
              <p className="product-import-wizard__meta product-import-wizard__meta--block">
                Estos productos se crearon <strong>sin categoría</strong>{" "}
                (faltaba en el Excel o no coincidía con ninguna). Elige una
                categoría para cada uno.
              </p>
              <div className="product-import-wizard__table-scroll">
                <table className="product-import-wizard__mapping-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoría</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productsNeedingCategory.map((p) => (
                      <tr key={p.id}>
                        <td>{p.name || `ID ${p.id}`}</td>
                        <td>
                          <select
                            value={
                              categoryAssign[p.id] === undefined
                                ? ""
                                : String(categoryAssign[p.id])
                            }
                            onChange={(e) => {
                              const v = e.target.value;
                              setCategoryAssign((prev) => ({
                                ...prev,
                                [p.id]: v === "" ? "" : Number(v),
                              }));
                            }}
                            aria-label={`Categoría para ${p.name}`}
                          >
                            <option value="">— Elegir —</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!allCategorySlotsFilled ? (
                <p className="product-import-wizard__error">
                  Selecciona una categoría en cada fila para continuar.
                </p>
              ) : null}
            </>
          )}
          {step === 6 && (
            <>
              <p className="product-import-wizard__meta product-import-wizard__meta--block">
                Elige el <strong>tipo de producto</strong> para cada fila.
                Esto evita que entren todos como elaborados.
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
                    {productsNeedingTipo.map((p) => (
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
        </div>

        <div className="product-import-wizard__footer">
          {step === 1 && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={handleClose}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={goToMapping}
                disabled={!step1Ready}
              >
                Siguiente
              </button>
            </>
          )}
          {step === 2 && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() => setStep(1)}
                disabled={categoriesLoading}
              >
                Atrás
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={goPreview}
                disabled={!mappingValid || categoriesLoading}
              >
                Siguiente
              </button>
            </>
          )}
          {step === 3 && !importing && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() => setStep(2)}
              >
                Atrás
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={() => void runImport()}
                disabled={importableRows.length === 0}
              >
                Importar {importableRows.length} producto
                {importableRows.length === 1 ? "" : "s"}
              </button>
            </>
          )}
          {step === 4 &&
            (productsNeedingCategory.length > 0 ? (
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
                  onClick={() => setStep(5)}
                >
                  Asignar categorías ({productsNeedingCategory.length})
                </button>
              </>
            ) : productsNeedingTipo.length > 0 ? (
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
                  onClick={() => setStep(6)}
                >
                  Asignar tipo ({productsNeedingTipo.length})
                </button>
              </>
            ) : (
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={handleClose}
              >
                Cerrar
              </button>
            ))}
          {step === 5 && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() => setStep(4)}
                disabled={savingCategories}
              >
                Atrás
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() => {
                  if (productsNeedingTipo.length > 0) setStep(6);
                  else onClose();
                }}
                disabled={savingCategories}
              >
                Omitir
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={() => void saveAssignedCategories()}
                disabled={
                  !allCategorySlotsFilled ||
                  savingCategories ||
                  productsNeedingCategory.length === 0
                }
              >
                {savingCategories ? "Guardando…" : "Guardar categorías"}
              </button>
            </>
          )}
          {step === 6 && (
            <>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={() =>
                  setStep(productsNeedingCategory.length > 0 ? 5 : 4)
                }
                disabled={savingTipos}
              >
                Atrás
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--ghost"
                onClick={onClose}
                disabled={savingTipos}
              >
                Omitir
              </button>
              <button
                type="button"
                className="product-import-wizard__btn product-import-wizard__btn--primary"
                onClick={() => void saveAssignedTipos()}
                disabled={
                  !allTipoSlotsFilled ||
                  savingTipos ||
                  productsNeedingTipo.length === 0
                }
              >
                {savingTipos ? "Guardando…" : "Guardar tipos"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
