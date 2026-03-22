const MIN_COL = 60;
const DEFAULT_W = 120;

/** Parsea `width` de columna a px inicial (mín. MIN_COL). */
export function parseColWidth(w?: string): number {
  if (!w || w === "auto") return DEFAULT_W;
  const s = w.trim();
  const px = /^(\d+(?:\.\d+)?)px$/i.exec(s);
  if (px) return Math.max(MIN_COL, Math.round(parseFloat(px[1])));
  const minMatch = /^min\(\s*(\d+)px/i.exec(s);
  if (minMatch) return Math.max(MIN_COL, parseInt(minMatch[1], 10));
  return DEFAULT_W;
}

export function computeInitialWidths<T extends { width?: string }>(
  columns: T[],
  options: boolean | { hasCheckbox?: boolean; hasActions?: boolean },
): number[] {
  const opts =
    typeof options === "boolean"
      ? { hasCheckbox: false, hasActions: options }
      : { hasCheckbox: options.hasCheckbox ?? false, hasActions: options.hasActions ?? false };
  const arr: number[] = [];
  if (opts.hasCheckbox) arr.push(48);
  for (const c of columns) arr.push(parseColWidth(c.width));
  if (opts.hasActions) arr.push(100);
  return arr;
}

/**
 * Margen para ignorar crecimiento espurio al repetir doble clic en autofit:
 * `scrollWidth` suele quedar 1–4px por encima del ancho útil (subpíxeles, padding, tabla fija).
 */
const AUTOFIT_EPSILON_PX = 4;

/** Auto-fit: máximo scrollWidth de cabecera y celdas de la columna. */
export function measureColumnFit(
  table: HTMLTableElement,
  columnIndex: number,
  currentWidthPx?: number,
): number {
  let max = MIN_COL;
  const thead = table.tHead;
  const tbody = table.tBodies[0];
  const measure = (cell: HTMLTableCellElement | undefined) => {
    if (!cell) return;
    max = Math.max(max, cell.scrollWidth);
  };
  if (thead?.rows[0]) measure(thead.rows[0].cells[columnIndex] as HTMLTableCellElement);
  if (tbody) {
    for (let r = 0; r < tbody.rows.length; r++) {
      measure(tbody.rows[r].cells[columnIndex] as HTMLTableCellElement);
    }
  }
  const rounded = Math.ceil(Math.max(MIN_COL, max));
  if (currentWidthPx != null) {
    const cur = Math.round(currentWidthPx);
    if (rounded > cur && rounded <= cur + AUTOFIT_EPSILON_PX) {
      return cur;
    }
  }
  return rounded;
}

export { MIN_COL };
