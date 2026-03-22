export type SortDir = "asc" | "desc" | null;

export interface SortState {
  key: string | null;
  dir: SortDir;
}

export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "boolean" && typeof b === "boolean") {
    return Number(a) - Number(b);
  }
  if (typeof a === "number" && typeof b === "number") {
    if (!Number.isNaN(a) && !Number.isNaN(b)) return a - b;
  }
  const na = Number(a);
  const nb = Number(b);
  if (
    typeof a !== "boolean" &&
    typeof b !== "boolean" &&
    !Number.isNaN(na) &&
    !Number.isNaN(nb) &&
    String(a).trim() !== "" &&
    String(b).trim() !== ""
  ) {
    return na - nb;
  }
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

function resolveValue<T extends object>(
  row: T,
  key: string | ((row: T) => string | number),
): unknown {
  if (typeof key === "function") return key(row);
  return key.split(".").reduce((obj: unknown, k) => (obj as Record<string, unknown>)?.[k], row);
}

/** Ordena filas según columna; `sortKey` es resolveColKey de la columna. */
export function sortData<T extends object, C extends { key: string | ((row: T) => string | number); sortable?: boolean; sortValue?: (row: T) => unknown }>(
  rows: T[],
  columns: C[],
  sortKey: string | null,
  sortDir: SortDir,
  resolveColKey: (col: C, index: number) => string,
): T[] {
  if (!sortKey || !sortDir) return rows;
  const colIdx = columns.findIndex((c, i) => resolveColKey(c, i) === sortKey);
  if (colIdx < 0) return rows;
  const col = columns[colIdx];
  if (col.sortable === false) return rows;

  const getSortVal = (row: T): unknown => {
    if (col.sortValue) return col.sortValue(row);
    return resolveValue(row, col.key);
  };

  const mult = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((r1, r2) => mult * compareValues(getSortVal(r1), getSortVal(r2)));
}

export function cycleSort(
  current: SortState,
  colKey: string,
): SortState {
  if (current.key !== colKey) {
    return { key: colKey, dir: "asc" };
  }
  if (current.dir === "asc") return { key: colKey, dir: "desc" };
  if (current.dir === "desc") return { key: null, dir: null };
  return { key: colKey, dir: "asc" };
}
