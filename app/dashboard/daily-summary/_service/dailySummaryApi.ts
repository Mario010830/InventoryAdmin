import { createApi } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parseSummaryResult } from "@/lib/api-utils";
import baseQueryWithReauth from "@/lib/baseQuery";
import type {
  DailySummary,
  GenerateDailySummaryRequest,
} from "@/lib/types/daily-summary";

// ─── helpers de descarga ───────────────────────────────────────────────────────

function timestampForFilename(): string {
  const d = new Date();
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const s = String(d.getSeconds()).padStart(2, "0");
  return `${y}${mo}${day}-${h}${mi}${s}`;
}

function filenameFromContentDisposition(header: string | null): string | null {
  if (!header?.trim()) return null;
  const utf8 = /filename\*=UTF-8''([^;\s]+)/i.exec(header);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim());
    } catch {
      return utf8[1].trim();
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].trim();
  const unquoted = /filename=([^;\s]+)/i.exec(header);
  if (unquoted?.[1]) return unquoted[1].replace(/^"|"$/g, "").trim();
  return null;
}

function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function fetchBlobExport(
  path: string,
  date: string,
  ext: "csv" | "pdf",
): Promise<void> {
  const base = getApiUrl().replace(/\/$/, "");
  const url = `${base}${path}`;
  const token = getToken();
  const headers: HeadersInit = { "ngrok-skip-browser-warning": "true" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ date }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text.trim() ||
        `Error al exportar ${ext.toUpperCase()} (${res.status})`,
    );
  }

  const blob = await res.blob();
  const fromHeader = filenameFromContentDisposition(
    res.headers.get("Content-Disposition"),
  );
  const filename =
    fromHeader ?? `cuadre-diario-${date}-${timestampForFilename()}.${ext}`;
  triggerDownload(blob, filename);
}

// ─── exportaciones directas (fuera de RTK Query, igual que salesReportCsvExport) ──

export async function exportDailySummaryCsv(date: string): Promise<void> {
  await fetchBlobExport("/daily-summary/export/csv", date, "csv");
}

export async function exportDailySummaryPdf(date: string): Promise<void> {
  await fetchBlobExport("/daily-summary/export/pdf", date, "pdf");
}

// ─── RTK Query API slice ───────────────────────────────────────────────────────

function extractSummary(raw: unknown): DailySummary {
  return (parseSummaryResult<DailySummary>(raw) ?? raw) as DailySummary;
}

function extractSummaryList(raw: unknown): DailySummary[] {
  const obj = raw as Record<string, unknown> | null;
  if (!obj) return [];
  const result = obj.result ?? obj.data ?? obj;
  if (Array.isArray(result)) return result as DailySummary[];
  return [];
}

export const dailySummaryApi = createApi({
  reducerPath: "dailySummaryApi",
  baseQuery: baseQueryWithReauth,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["DailySummary"],

  endpoints: (builder) => ({
    getDailySummaryByDate: builder.query<DailySummary | null, string>({
      query: (date) => `/daily-summary?date=${encodeURIComponent(date)}`,
      transformResponse: (raw: unknown) => {
        try {
          return extractSummary(raw);
        } catch {
          return null;
        }
      },
      providesTags: (_r, _e, date) => [{ type: "DailySummary", id: date }],
    }),

    getDailySummaryHistory: builder.query<
      DailySummary[],
      { from: string; to: string }
    >({
      query: ({ from, to }) =>
        `/daily-summary/history?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      transformResponse: extractSummaryList,
      providesTags: [{ type: "DailySummary", id: "HISTORY" }],
    }),

    generateDailySummary: builder.mutation<
      DailySummary,
      GenerateDailySummaryRequest
    >({
      query: (body) => ({
        url: "/daily-summary/generate",
        method: "POST",
        body,
      }),
      transformResponse: extractSummary,
      invalidatesTags: (_r, _e, arg) => [
        { type: "DailySummary", id: arg.date },
        { type: "DailySummary", id: "HISTORY" },
      ],
    }),
  }),
});

export const {
  useGetDailySummaryByDateQuery,
  useGetDailySummaryHistoryQuery,
  useGenerateDailySummaryMutation,
} = dailySummaryApi;
