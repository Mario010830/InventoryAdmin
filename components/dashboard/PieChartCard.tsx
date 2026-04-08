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

export interface PieChartCardProps {
  title: string;
  data: { name: string; value: number }[];
  colors?: readonly string[];
  height?: number;
  showLegend?: boolean;
}

export function PieChartCard({
  title,
  data,
  colors = theme.chart,
  height = 280,
  showLegend = true,
}: PieChartCardProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const labels = data.map((d) => d.name);
  const values = data.map((d) => d.value);
  const options: ApexOptions = {
    noData: apexNoDataEs,
    labels,
    colors: [...colors],
    chart: {
      type: "donut",
      fontFamily: apexChartFontFamily,
      ...apexChartLocaleEs,
    },
    legend: {
      show: showLegend,
      position: "bottom",
      fontSize: "12px",
      fontFamily: apexChartFontFamily,
      labels: { colors: theme.primaryText },
    },
    stroke: {
      colors: [theme.surface],
      width: 2,
    },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: { size: "58%" },
      },
    },
    tooltip: {
      y: {
        formatter: (val: number) => {
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : "0.0";
          return `${formatChartNumber(val)} (${pct}%)`;
        },
      },
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
        <div className="dashboard-card__title">{title}</div>
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
        <ReactApexChart options={options} series={values} type="donut" height={height} />
      </div>
    </div>
  );
}
