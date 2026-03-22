import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parseChartResult } from "@/lib/api-utils";
import type { BusinessCategoryResponse, UpdateBusinessCategoryRequest } from "@/lib/dashboard-types";

function normalizeBusinessCategoryRow(row: Record<string, unknown>): BusinessCategoryResponse {
  const id = Number(row.id ?? row.Id ?? 0);
  const name = String(row.name ?? row.Name ?? "");
  const iconRaw = row.icon ?? row.Icon;
  const iconUrlRaw = row.iconUrl ?? row.IconUrl;
  const activeRaw = row.isActive ?? row.IsActive;
  let isActive = true;
  if (typeof activeRaw === "boolean") isActive = activeRaw;
  else if (activeRaw != null) isActive = String(activeRaw).toLowerCase() === "true" || activeRaw === 1;
  return {
    id,
    name,
    isActive,
    icon: iconRaw != null && iconRaw !== "" ? String(iconRaw) : null,
    iconUrl: iconUrlRaw != null && iconUrlRaw !== "" ? String(iconUrlRaw) : null,
  };
}

export const businessCategoryApi = createApi({
  reducerPath: "businessCategoryApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("Content-Type", "application/json");
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),
  tagTypes: ["BusinessCategory"],
  endpoints: (builder) => ({
    getBusinessCategories: builder.query<BusinessCategoryResponse[], void>({
      query: () => "/business-category",
      transformResponse: (raw: unknown) =>
        parseChartResult<Record<string, unknown>>(raw).map(normalizeBusinessCategoryRow),
      providesTags: (result) =>
        result?.length
          ? [...result.map((c) => ({ type: "BusinessCategory" as const, id: c.id })), { type: "BusinessCategory", id: "LIST" }]
          : [{ type: "BusinessCategory", id: "LIST" }],
    }),
    updateBusinessCategory: builder.mutation<
      void,
      { id: number; body: UpdateBusinessCategoryRequest }
    >({
      query: ({ id, body }) => ({
        url: `/business-category/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "BusinessCategory", id },
        { type: "BusinessCategory", id: "LIST" },
      ],
    }),
  }),
});

export const { useGetBusinessCategoriesQuery, useUpdateBusinessCategoryMutation } = businessCategoryApi;
