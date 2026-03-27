import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parsePaginated } from "@/lib/api-utils";
import type {
  ContactResponse,
  CreateLeadRequest,
  LeadResponse,
  UpdateLeadRequest,
  PaginationInfo,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetLeadsArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
  /** Filtro por estado (API GET /lead) */
  status?: string;
}

interface UpdateLeadArgs {
  id: number;
  body: UpdateLeadRequest;
}

function unwrapLead(raw: unknown): LeadResponse {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.result && typeof r.result === "object") return r.result as LeadResponse;
    if (r.data && typeof r.data === "object") return r.data as LeadResponse;
  }
  return raw as LeadResponse;
}

function unwrapContact(raw: unknown): ContactResponse {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.result && typeof r.result === "object") return r.result as ContactResponse;
    if (r.data && typeof r.data === "object") return r.data as ContactResponse;
  }
  return raw as ContactResponse;
}

export const leadsApi = createApi({
  reducerPath: "leadsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers) => {
      const token = getToken();
      if (token) headers.set("Authorization", "Bearer " + token);
      headers.set("Content-Type", "application/json");
      headers.set("ngrok-skip-browser-warning", "true");
      return headers;
    },
  }),
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["Lead"],
  endpoints: (builder) => ({
    getLeads: builder.query<PaginatedResult<LeadResponse>, GetLeadsArgs>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        const sortOrder = arg?.sortOrder ?? "desc";
        let url = `/lead?page=${page}&perPage=${perPage}&sortOrder=${sortOrder}`;
        if (arg?.status?.trim()) {
          url += `&status=${encodeURIComponent(arg.status.trim())}`;
        }
        return url;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<LeadResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Lead" as const, id })),
              { type: "Lead", id: "LIST" },
            ]
          : [{ type: "Lead", id: "LIST" }],
    }),
    createLead: builder.mutation<LeadResponse, CreateLeadRequest>({
      query: (body) => ({ url: "/lead", method: "POST", body }),
      transformResponse: (raw: unknown) => unwrapLead(raw),
      invalidatesTags: [{ type: "Lead", id: "LIST" }],
    }),
    updateLead: builder.mutation<void, UpdateLeadArgs>({
      query: ({ id, body }) => ({ url: `/lead?id=${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Lead", id }, { type: "Lead", id: "LIST" }],
    }),
    deleteLead: builder.mutation<void, number>({
      query: (id) => ({ url: `/lead?id=${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Lead", id }, { type: "Lead", id: "LIST" }],
    }),
    /** Convierte el lead en contacto (POST /lead/{id}/convert). */
    convertLeadToContact: builder.mutation<ContactResponse, number>({
      query: (id) => ({ url: `/lead/${id}/convert`, method: "POST" }),
      transformResponse: (raw: unknown) => unwrapContact(raw),
      invalidatesTags: (_r, _e, id) => [{ type: "Lead", id }, { type: "Lead", id: "LIST" }],
    }),
  }),
});

export const {
  useGetLeadsQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useDeleteLeadMutation,
  useConvertLeadToContactMutation,
} = leadsApi;
