import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type PdfTableColumn = { key: string; label: string };

/**
 * Exporta una tabla a PDF (todas las filas).
 * Nombre sugerido: `prefijo-YYYY-MM-DD.pdf` (lo arma el caller).
 */
export function exportRowsToPdf(options: {
  columns: PdfTableColumn[];
  rows: Record<string, unknown>[];
  getCellText: (row: Record<string, unknown>, key: string) => string;
  fileName: string;
  title?: string;
}): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let y = 14;
  if (options.title) {
    doc.setFontSize(12);
    doc.text(options.title, 14, y);
    y = 22;
  }
  const head = [options.columns.map((c) => c.label)];
  const body = options.rows.map((row) =>
    options.columns.map((c) => options.getCellText(row, c.key)),
  );
  autoTable(doc, {
    head,
    body,
    startY: y,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 110, 247] },
  });
  doc.save(options.fileName);
}
