import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { parsePaginated } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type {
  ContactResponse,
  CreateContactRequest,
  CreateCounterpartyRequest,
  CustomerLoyaltyAccountResponse,
  PaginationInfo,
  UpdateContactRequest,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

export type ContactListRole = "customer" | "supplier" | "lead";

interface GetContactsArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
  /** Filtro por rol CRM (opcional). */
  role?: ContactListRole;
}

interface UpdateContactArgs {
  id: number;
  body: UpdateContactRequest;
}

function unwrapContact(raw: unknown): ContactResponse {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.result && typeof r.result === "object")
      return r.result as ContactResponse;
    if (r.data && typeof r.data === "object") return r.data as ContactResponse;
  }
  return raw as ContactResponse;
}

function unwrapLoyalty(raw: unknown): CustomerLoyaltyAccountResponse {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const inner = (r.result ?? r.data ?? r) as Record<string, unknown>;
    const num = (v: unknown): number | undefined => {
      const n =
        typeof v === "number"
          ? v
          : typeof v === "string"
            ? Number(v)
            : NaN;
      return Number.isFinite(n) ? n : undefined;
    };
    const milestoneRaw =
      inner.ordersUntilNextMilestone ?? inner.OrdersUntilNextMilestone;
    let ordersUntilNextMilestone: number | null;
    if (milestoneRaw === null) ordersUntilNextMilestone = null;
    else {
      const n = num(milestoneRaw);
      ordersUntilNextMilestone = n !== undefined ? n : null;
    }
    const cid = num(inner.contactId ?? inner.ContactId);
    return {
      contactId: cid ?? 0,
      pointsBalance: num(inner.pointsBalance ?? inner.PointsBalance) ?? 0,
      lifetimeOrders: num(inner.lifetimeOrders ?? inner.LifetimeOrders) ?? 0,
      lastPurchaseAt:
        (inner.lastPurchaseAt ?? inner.LastPurchaseAt) != null
          ? String(inner.lastPurchaseAt ?? inner.LastPurchaseAt)
          : null,
      notifyEveryNOrders:
        num(inner.notifyEveryNOrders ?? inner.NotifyEveryNOrders) ?? 0,
      ordersUntilNextMilestone,
    };
  }
  return raw as CustomerLoyaltyAccountResponse;
}

export const contactsApi = createApi({
  reducerPath: "contactsApi",
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
  tagTypes: ["Contact", "ContactLoyalty"],
  endpoints: (builder) => ({
    getContacts: builder.query<
      PaginatedResult<ContactResponse>,
      GetContactsArgs
    >({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        const sortOrder = arg?.sortOrder ?? "desc";
        let url = `/contact?page=${page}&perPage=${perPage}&sortOrder=${sortOrder}`;
        if (arg?.role) url += `&role=${encodeURIComponent(arg.role)}`;
        return url;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<ContactResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Contact" as const,
                id,
              })),
              { type: "Contact", id: "LIST" },
            ]
          : [{ type: "Contact", id: "LIST" }],
    }),
    createContact: builder.mutation<ContactResponse, CreateContactRequest>({
      query: (body) => ({ url: "/contact", method: "POST", body }),
      transformResponse: (raw: unknown) => unwrapContact(raw),
      invalidatesTags: [{ type: "Contact", id: "LIST" }],
    }),
    createCounterparty: builder.mutation<
      ContactResponse,
      CreateCounterpartyRequest
    >({
      query: (body) => ({
        url: "/contact/counterparty",
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) => unwrapContact(raw),
      invalidatesTags: [{ type: "Contact", id: "LIST" }],
    }),
    getContactLoyalty: builder.query<CustomerLoyaltyAccountResponse, number>({
      query: (contactId) => `/contact/${contactId}/loyalty`,
      transformResponse: (raw: unknown) => unwrapLoyalty(raw),
      providesTags: (_result, _err, contactId) => [
        { type: "ContactLoyalty", id: contactId },
      ],
    }),
    updateContact: builder.mutation<void, UpdateContactArgs>({
      query: ({ id, body }) => ({
        url: `/contact/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Contact", id },
        { type: "Contact", id: "LIST" },
        { type: "ContactLoyalty", id },
      ],
    }),
    deleteContact: builder.mutation<void, number>({
      query: (id) => ({ url: `/contact/${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Contact", id },
        { type: "Contact", id: "LIST" },
        { type: "ContactLoyalty", id },
      ],
    }),
  }),
});

export const {
  useGetContactsQuery,
  useCreateContactMutation,
  useCreateCounterpartyMutation,
  useGetContactLoyaltyQuery,
  useUpdateContactMutation,
  useDeleteContactMutation,
} = contactsApi;
