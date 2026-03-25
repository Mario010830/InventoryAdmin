"use client";

import { useCallback, useEffect, useState } from "react";
import { parseSummaryResult } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type { ReportRequestParams } from "@/lib/types/reports";

function buildQuery(params: ReportRequestParams): string {
  const qs = new URLSearchParams();
  qs.set("dateFrom", params.dateFrom);
  qs.set("dateTo", params.dateTo);
  if (params.locationId != null)
    qs.set("locationId", String(params.locationId));
  if (params.page != null) qs.set("page", String(params.page));
  if (params.pageSize != null) qs.set("pageSize", String(params.pageSize));
  return qs.toString();
}

function parseErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "message" in body) {
    const m = (body as { message?: unknown }).message;
    if (typeof m === "string" && m.trim()) return m;
  }
  return fallback;
}

/**
 * GET /api/reports/... — query con dateFrom/dateTo ISO y opcional locationId.
 * Para ventas: pasar page / pageSize en params; el refetch corre al cambiar filtros o paginación.
 * Respuesta: el payload útil va en `result` (parseSummaryResult en lib/api-utils).
 */
export function useReportData<T>(endpoint: string, params: ReportRequestParams) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const base = getApiUrl().replace(/\/$/, "");
    const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    const url = `${base}${path}?${buildQuery({
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
      locationId: params.locationId,
      page: params.page,
      pageSize: params.pageSize,
    })}`;
    const token = getToken();
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { headers });
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        setData(null);
        setError(parseErrorMessage(body, `Error ${res.status}`));
        return;
      }
      const parsed = parseSummaryResult<T>(body);
      if (parsed != null) {
        setData(parsed);
        return;
      }
      if (body && typeof body === "object" && "result" in body) {
        const r = (body as { result: unknown }).result;
        setData((r ?? null) as T | null);
        return;
      }
      setData(null);
      setError("Respuesta inválida");
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [
    endpoint,
    params.dateFrom,
    params.dateTo,
    params.locationId,
    params.page,
    params.pageSize,
  ]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
