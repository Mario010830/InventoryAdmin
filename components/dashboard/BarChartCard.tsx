"use client";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import {
  apexChartFontFamily,
  apexChartLocaleEs,
  apexNoDataEs,
  formatChartNumber,
} from "@/lib/apexcharts-es";
import { ChartCardMenu } from "./ChartCardMenu";
import { theme } from "./theme";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export interface BarChartCardProps {
  title: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
  /** true = barras horizontales (por categoría/nombre) */
  horizontal?: boolean;
  /** Formato del valor en tooltip (ej. (n) => `$${n.toLocaleString()}`) */
  formatValue?: (value: number) => string;
}

export function BarChartCard({
  title,
  subtitle,
  data,
  color = theme.accent,
  height = 280,
  horizontal = false,
  formatValue,
}: BarChartCardProps) {
  const labels = data.map((d) => d.label);
  const values = data.map((d) => d.value);

  const options: ApexOptions = {
    noData: apexNoDataEs,
    colors: [color],
    chart: {
      type: "bar",
      height,
      fontFamily: apexChartFontFamily,
      toolbar: { show: false },
      ...apexChartLocaleEs,
    },
    plotOptions: {
      bar: {
        horizontal,
        borderRadius: 5,
        borderRadiusApplication: "end",
        columnWidth: horizontal ? "62%" : "39%",
      },
    },
    dataLabels: { enabled: false },
    stroke: horizontal
      ? { show: false }
      : {
          show: true,
          width: 4,
          colors: ["transparent"],
        },
    fill: { opacity: 1 },
    xaxis: {
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: horizontal
        ? {
            formatter: (val) =>
              typeof val === "number" ? formatChartNumber(val) : String(val),
            style: { colors: theme.secondaryText, fontSize: "12px" },
          }
        : { style: { colors: theme.secondaryText, fontSize: "12px" } },
    },
    yaxis: {
      labels: horizontal
        ? { style: { colors: [theme.secondaryText], fontSize: "12px" } }
        : {
            formatter: (val) => formatChartNumber(Number(val)),
            style: { colors: [theme.secondaryText], fontSize: "12px" },
          },
    },
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 0,
      xaxis: { lines: { show: horizontal } },
      yaxis: { lines: { show: !horizontal } },
    },
    tooltip: {
      y: {
        formatter: (val) =>
          formatValue
            ? formatValue(Number(val))
            : formatChartNumber(Number(val)),
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
          {subtitle && (
            <div className="dashboard-card__subtitle">{subtitle}</div>
          )}
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
          type="bar"
          height={height}
        />
      </div>
    </div>
  );
}
