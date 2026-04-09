"use client";

import type { ApexAxisChartSeries, ApexOptions } from "apexcharts";
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

export interface ComposedChartCardProps {
  title: string;
  subtitle?: string;
  /** Barras: value. Línea opcional: lineValue (ej. acumulado). */
  data: { label: string; value: number; lineValue?: number }[];
  barColor?: string;
  lineColor?: string;
  lineName?: string;
  height?: number;
}

export function ComposedChartCard({
  title,
  subtitle,
  data,
  barColor = theme.accent,
  lineColor = theme.success,
  lineName = "Acumulado",
  height = 280,
}: ComposedChartCardProps) {
  const labels = data.map((d) => d.label);
  const barSeriesName = "Por día";
  const barValues = data.map((d) => d.value);
  const hasLine = data.some((d) => d.lineValue != null);
  const lineValues = data.map((d) => d.lineValue ?? 0);

  const series: ApexAxisChartSeries = hasLine
    ? [
        { name: barSeriesName, type: "column", data: barValues },
        { name: lineName, type: "line", data: lineValues },
      ]
    : [{ name: barSeriesName, type: "column", data: barValues }];

  const options: ApexOptions = {
    noData: apexNoDataEs,
    chart: {
      type: "line",
      stacked: false,
      height,
      fontFamily: apexChartFontFamily,
      toolbar: { show: false },
      ...apexChartLocaleEs,
    },
    colors: hasLine ? [barColor, lineColor] : [barColor],
    stroke: {
      width: hasLine ? [4, 2.5] : [4],
      curve: "smooth",
      colors: hasLine ? ["transparent", lineColor] : ["transparent"],
    },
    plotOptions: {
      bar: {
        columnWidth: "39%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    xaxis: {
      categories: labels,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: theme.secondaryText, fontSize: "12px" } },
    },
    yaxis: [
      {
        seriesName: barSeriesName,
        labels: {
          formatter: (val) => formatChartNumber(Number(val)),
          style: { colors: [theme.secondaryText], fontSize: "12px" },
        },
      },
      ...(hasLine
        ? [
            {
              seriesName: lineName,
              opposite: true,
              labels: {
                formatter: (val: number) => formatChartNumber(Number(val)),
                style: { colors: [theme.secondaryText], fontSize: "12px" },
              },
            },
          ]
        : []),
    ],
    grid: {
      borderColor: "#f1f5f9",
      strokeDashArray: 0,
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      shared: true,
      y: {
        formatter: (val: number) => formatChartNumber(Number(val)),
      },
    },
    legend: {
      show: hasLine,
      position: "top",
      horizontalAlign: "left",
      fontSize: "12px",
      fontFamily: apexChartFontFamily,
    },
  };

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
          type="line"
          height={height}
        />
      </div>
    </div>
  );
}
