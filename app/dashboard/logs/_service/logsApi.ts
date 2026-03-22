import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parsePaginated } from "@/lib/api-utils";
import type { LogResponse, PaginationInfo } from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetLogsArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
  logType?: number;
  eventTypeLog?: number;
}

export const logsApi = createApi({
  reducerPath: "logsApi",
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
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["Log"],
  endpoints: (builder) => ({
    getLogs: builder.query<PaginatedResult<LogResponse>, GetLogsArgs>({
      query: ({ page = 1, perPage = 15, sortOrder = "desc", logType = -1, eventTypeLog = -1 } = {}) =>
        `/log?page=${page}&perPage=${perPage}&sortOrder=${sortOrder}&logType=${logType}&eventTypeLog=${eventTypeLog}`,
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<LogResponse>(raw, arg.perPage ?? 15),
      providesTags: [{ type: "Log", id: "LIST" }],
    }),
  }),
});

export const { useGetLogsQuery } = logsApi;
