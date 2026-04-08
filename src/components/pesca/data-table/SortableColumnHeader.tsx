"use client";

import type { Column } from "@tanstack/react-table";
import React from "react";

type Props<TData, TValue> = {
  column: Column<TData, TValue>;
  children: React.ReactNode;
};

export default function SortableColumnHeader<TData, TValue>({
  column,
  children,
}: Props<TData, TValue>) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {children}
      <span className="text-theme-xs opacity-60">
        {column.getIsSorted() === "asc"
          ? "↑"
          : column.getIsSorted() === "desc"
            ? "↓"
            : "⇅"}
      </span>
    </button>
  );
}
