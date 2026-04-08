"use client";

import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { es } from "date-fns/locale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridFilterSelect } from "@/components/dashboard/GridFilterSelect";
import { parsePaginated } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type { LocationResponse } from "@/lib/auth-types";
import { ymdRangeToIsoRange } from "@/lib/reportIsoRange";
import type { ReportFilters as ReportFilterParams } from "@/lib/types/reports";
import { useAppSelector } from "@/store/store";
import "@/components/dashboard/grid-filter-bar.css";

type PeriodKey = "today" | "week" | "month" | "year" | "custom";

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "year", label: "Este año" },
  { value: "custom", label: "Rango personalizado" },
];

function formatYmd(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function rangeForPeriod(
  key: PeriodKey,
  now: Date,
): { startDate: string; endDate: string } {
  switch (key) {
    case "today": {
      const s = startOfDay(now);
      const e = endOfDay(now);
      return { startDate: formatYmd(s), endDate: formatYmd(e) };
    }
    case "week": {
      const s = startOfWeek(now, { weekStartsOn: 1, locale: es });
      const e = endOfWeek(now, { weekStartsOn: 1, locale: es });
      return { startDate: formatYmd(s), endDate: formatYmd(e) };
    }
    case "month": {
      const s = startOfMonth(now);
      const e = endOfMonth(now);
      return { startDate: formatYmd(s), endDate: formatYmd(e) };
    }
    case "year": {
      const s = startOfYear(now);
      const e = endOfYear(now);
      return { startDate: formatYmd(s), endDate: formatYmd(e) };
    }
    default:
      return { startDate: formatYmd(now), endDate: formatYmd(now) };
  }
}

export function ReportFilters({
  onFilterChange,
}: {
  onFilterChange: (filters: ReportFilterParams) => void;
}) {
  const orgId = useAppSelector((s) => s.auth?.organizationId);
  const [anchorNow] = useState(() => new Date());
  const onChangeRef = useRef(onFilterChange);
  onChangeRef.current = onFilterChange;

  const [period, setPeriod] = useState<PeriodKey>("month");
  const [customStart, setCustomStart] = useState(() =>
    formatYmd(startOfMonth(anchorNow)),
  );
  const [customEnd, setCustomEnd] = useState(() =>
    formatYmd(endOfMonth(anchorNow)),
  );
  const [locations, setLocations] = useState<LocationResponse[]>([]);
  const [locationsFailed, setLocationsFailed] = useState(false);
  const [locationId, setLocationId] = useState<number | undefined>(undefined);

  const range = useMemo(() => {
    if (period === "custom") {
      return { startDate: customStart, endDate: customEnd };
    }
    return rangeForPeriod(period, anchorNow);
  }, [period, customStart, customEnd, anchorNow]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const base = getApiUrl().replace(/\/$/, "");
      let path = `/location?page=1&perPage=500&sortOrder=desc`;
      if (orgId) path += `&organizationId=${orgId}`;
      const token = getToken();
      const headers: HeadersInit = { "ngrok-skip-browser-warning": "true" };
      if (token) headers.Authorization = `Bearer ${token}`;
      try {
        const res = await fetch(`${base}${path}`, { headers });
        const raw: unknown = await res.json().catch(() => null);
        if (!res.ok || !raw) {
          if (!cancelled) {
            setLocations([]);
            setLocationsFailed(true);
          }
          return;
        }
        const { data } = parsePaginated<LocationResponse>(raw, 500);
        if (!cancelled) {
          setLocations(data);
          setLocationsFailed(false);
          if (data.length === 1) {
            setLocationId(data[0].id);
          } else {
            setLocationId(undefined);
          }
        }
      } catch {
        if (!cancelled) {
          setLocations([]);
          setLocationsFailed(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  const emit = useCallback(() => {
    const { dateFrom, dateTo } = ymdRangeToIsoRange(
      range.startDate,
      range.endDate,
    );
    const base: ReportFilterParams = { dateFrom, dateTo };
    if (locations.length === 1) {
      base.locationId = locations[0].id;
    } else if (locationId != null) {
      base.locationId = locationId;
    }
    onChangeRef.current(base);
  }, [range.startDate, range.endDate, locations, locationId]);

  useEffect(() => {
    emit();
  }, [emit]);

  const showLocationSelect = !locationsFailed && locations.length > 1;

  return (
    <div className="dashboard-report-filters">
      <div className="dashboard-report-filters__periods" role="tablist" aria-label="Período del reporte">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={period === opt.value}
            className={`dashboard-report-filters__period ${period === opt.value ? "dashboard-report-filters__period--active" : ""}`}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div className="dashboard-report-filters__row">
        <div className="grid-filter-bar__filters flex flex-wrap items-end gap-3">
          {period === "custom" && (
            <>
              <label
                className="flex flex-col gap-1.5"
                htmlFor="report-custom-start"
              >
                <span className="text-[0.7rem] font-semibold text-[#64748b]">
                  Desde
                </span>
                <input
                  id="report-custom-start"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="grid-filter-bar__control h-9 rounded-md border border-[#e2e8f0] bg-white px-3 text-[0.8125rem] text-[#0f172a] focus-visible:border-[#4f6ef7] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(79,110,247,0.35)]"
                />
              </label>
              <label
                className="flex flex-col gap-1.5"
                htmlFor="report-custom-end"
              >
                <span className="text-[0.7rem] font-semibold text-[#64748b]">
                  Hasta
                </span>
                <input
                  id="report-custom-end"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="grid-filter-bar__control h-9 rounded-md border border-[#e2e8f0] bg-white px-3 text-[0.8125rem] text-[#0f172a] focus-visible:border-[#4f6ef7] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(79,110,247,0.35)]"
                />
              </label>
            </>
          )}
          {showLocationSelect && (
            <div className="flex min-w-[220px] flex-col gap-1.5">
              <span className="text-[0.7rem] font-semibold text-[#64748b]">
                Ubicación
              </span>
              <GridFilterSelect
                aria-label="Ubicación"
                value={locationId != null ? String(locationId) : ""}
                onChange={(v) => {
                  if (!v) setLocationId(undefined);
                  else setLocationId(Number.parseInt(v, 10));
                }}
                options={[
                  { value: "", label: "Todas" },
                  ...locations.map((l) => ({
                    value: String(l.id),
                    label: l.name ?? `Ubicación ${l.id}`,
                  })),
                ]}
                placeholder="Ubicación"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
