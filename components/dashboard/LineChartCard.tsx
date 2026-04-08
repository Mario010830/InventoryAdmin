"use client";

import dynamic from "next/dynamic";
import type { ApexOptions } from "apexcharts";
import { ChartCardMenu } from "./ChartCardMenu";
import { theme } from "./theme";
import {
  apexChartFontFamily,
  apexChartLocaleEs,
  apexNoDataEs,
  formatChartNumber,
} from "@/lib/apexcharts-es";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export interface LineChartCardProps {
  title: string;
  subtitle?: string;
  data: { label: string; value?: number; [key: string]: unknown }[];
  color?: string;
  height?: number;
  filled?: boolean;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function resolvePointValue(point: { value?: number; [key: string]: unknown }): number {
  const candidates = [
    point.value,
    point.count,
    point.total,
    point.amount,
    point.entries,
    point.entradas,
    point.movements,
    point.y,
  ];
  for (const candidate of candidates) {
    const parsed = toNumberOrNull(candidate);
    if (parsed != null) return parsed;
  }
  return 0;
}

export function LineChartCard({
  title,
  subtitle,
  data,
  color = theme.accent,
  height = 280,
  filled = true,
}: LineChartCardProps) {
  const labels = data.map((d) => d.label);
  const values = data.map(resolvePointValue);

  const chartType = filled ? "area" : "line";

  const options: ApexOptions = {
    noData: apexNoDataEs,
    colors: [color],
    chart: {
      type: chartType,
      height,
      fontFamily: apexChartFontFamily,
      toolbar: { show: false },
      ...apexChartLocaleEs,
    },
    stroke: {
      curve: "straight",
      width: 2,
    },
    fill: filled
      ? {
          type: "gradient",
          gradient: {
            opacityFrom: 0.55,
            opacityTo: 0,
          },
        }
      : { opacity: 0 },
    dataLabels: { enabled: false },
    markers: {
      size: filled ? 0 : 3.5,
      strokeColors: "#ffffff",
      strokeWidth: 2,
      hover: { size: 6 },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    xaxis: {
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: theme.secondaryText, fontSize: "12px" } },
    },
    yaxis: {
      labels: {
        formatter: (val) => formatChartNumber(Number(val)),
        style: { colors: [theme.secondaryText], fontSize: "12px" },
      },
      title: { text: "" },
    },
    tooltip: {
      theme: "light",
      y: {
        formatter: (val) => formatChartNumber(Number(val)),
      },
    },
    legend: { show: false },
  };

  const series = [{ name: title, data: values }];

  return (
    <div
      className="dashboard-card dashboard-card--chart"
      style={{
        background: theme.surface,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="dashboard-card__head">
        <div>
          <div className="dashboard-card__title">{title}</div>
          {subtitle && <div className="dashboard-card__subtitle">{subtitle}</div>}
        </div>
        <ChartCardMenu />
      </div>
      <div
        className="dashboard-chart-plot max-w-full"
        style={{
          width: "100%",
          height,
          minHeight: height,
          minWidth: 200,
          flexShrink: 0,
        }}
      >
        <ReactApexChart
          options={options}
          series={series}
          type={chartType}
          height={height}
        />
      </div>
    </div>
  );
}
