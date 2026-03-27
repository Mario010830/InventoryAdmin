import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import { parsePaginated } from "@/lib/api-utils";
import type {
  ContactResponse,
  CreateContactRequest,
  UpdateContactRequest,
  PaginationInfo,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetContactsArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
}

interface UpdateContactArgs {
  id: number;
  body: UpdateContactRequest;
}

function unwrapContact(raw: unknown): ContactResponse {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.result && typeof r.result === "object") return r.result as ContactResponse;
    if (r.data && typeof r.data === "object") return r.data as ContactResponse;
  }
  return raw as ContactResponse;
}

export const contactsApi = createApi({
  reducerPath: "contactsApi",
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
  tagTypes: ["Contact"],
  endpoints: (builder) => ({
    getContacts: builder.query<PaginatedResult<ContactResponse>, GetContactsArgs>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        const sortOrder = arg?.sortOrder ?? "desc";
        return `/contact?page=${page}&perPage=${perPage}&sortOrder=${sortOrder}`;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<ContactResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Contact" as const, id })),
              { type: "Contact", id: "LIST" },
            ]
          : [{ type: "Contact", id: "LIST" }],
    }),
    createContact: builder.mutation<ContactResponse, CreateContactRequest>({
      query: (body) => ({ url: "/contact", method: "POST", body }),
      transformResponse: (raw: unknown) => unwrapContact(raw),
      invalidatesTags: [{ type: "Contact", id: "LIST" }],
    }),
    updateContact: builder.mutation<void, UpdateContactArgs>({
      query: ({ id, body }) => ({ url: `/contact?id=${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Contact", id }, { type: "Contact", id: "LIST" }],
    }),
    deleteContact: builder.mutation<void, number>({
      query: (id) => ({ url: `/contact?id=${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Contact", id }, { type: "Contact", id: "LIST" }],
    }),
  }),
});

export const {
  useGetContactsQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = contactsApi;
