"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  exportDailySummaryCsv,
  exportDailySummaryPdf,
  useGenerateDailySummaryMutation,
  useGetDailySummaryByDateQuery,
  useGetDailySummaryHistoryQuery,
} from "@/app/dashboard/daily-summary/_service/dailySummaryApi";
import type {
  DailySummary,
  GenerateDailySummaryRequest,
} from "@/lib/types/daily-summary";

// ─── fetch por fecha ───────────────────────────────────────────────────────────

export function useDailySummaryByDate(date: string) {
  const { data: summary, isLoading, refetch } = useGetDailySummaryByDateQuery(date, { skip: !date });
  return { summary: summary ?? null, isLoading, refetch };
}

// ─── historial ────────────────────────────────────────────────────────────────

export function useDailySummaryHistory(from: string, to: string, skip = false) {
  const { data: history = [], isLoading } = useGetDailySummaryHistoryQuery(
    { from, to },
    { skip: skip || !from || !to },
  );
  return { history, isLoading };
}

// ─── hook completo (para la página principal) ─────────────────────────────────

interface UseDailySummaryReturn {
  summary: DailySummary | null;
  history: DailySummary[];
  isLoading: boolean;
  isGenerating: boolean;
  isExporting: boolean;
  error: string | null;
  fetchByDate: (date: string) => void;
  fetchHistory: (from: string, to: string) => void;
  generate: (data: GenerateDailySummaryRequest) => Promise<void>;
  exportToCsv: (date: string) => Promise<void>;
  exportToPdf: (date: string) => Promise<void>;
}

export function useDailySummary(initialDate: string): UseDailySummaryReturn {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [historyRange, setHistoryRange] = useState<{ from: string; to: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { summary, isLoading: isLoadingSummary } = useDailySummaryByDate(selectedDate);
  const { history, isLoading: isLoadingHistory } = useDailySummaryHistory(
    historyRange?.from ?? "",
    historyRange?.to ?? "",
    historyRange === null,
  );

  const [generateMutation, { isLoading: isGenerating }] = useGenerateDailySummaryMutation();

  const fetchByDate = useCallback((date: string) => {
    setSelectedDate(date);
    setError(null);
  }, []);

  const fetchHistory = useCallback((from: string, to: string) => {
    setHistoryRange({ from, to });
    setError(null);
  }, []);

  const generate = useCallback(
    async (data: GenerateDailySummaryRequest) => {
      setError(null);
      try {
        await generateMutation(data).unwrap();
      } catch (err) {
        const msg =
          (err as { data?: { message?: string } })?.data?.message ??
          "Error al generar el cuadre";
        setError(msg);
        throw err;
      }
    },
    [generateMutation],
  );

  const exportToCsv = useCallback(async (date: string) => {
    setIsExporting(true);
    try {
      await exportDailySummaryCsv(date);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al exportar CSV";
      toast.error(msg, { duration: 5000 });
    } finally {
      setIsExporting(false);
    }
  }, []);

  const exportToPdf = useCallback(async (date: string) => {
    setIsExporting(true);
    try {
      await exportDailySummaryPdf(date);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al exportar PDF";
      toast.error(msg, { duration: 5000 });
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    summary,
    history,
    isLoading: isLoadingSummary || isLoadingHistory,
    isGenerating,
    isExporting,
    error,
    fetchByDate,
    fetchHistory,
    generate,
    exportToCsv,
    exportToPdf,
  };
}
