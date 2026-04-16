import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { parsePaginated } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type {
  CreateLoanRequest,
  LoanResponse,
  PaginationInfo,
  RegisterLoanPaymentRequest,
  UpdateLoanRequest,
} from "@/lib/dashboard-types";

export interface PaginatedLoansResult {
  data: LoanResponse[];
  pagination: PaginationInfo | null;
}

interface GetLoansArgs {
  page?: number;
  perPage?: number;
}

interface UpdateLoanArgs {
  id: number;
  body: UpdateLoanRequest;
}

function unwrapLoan(raw: unknown): LoanResponse {
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (r.result && typeof r.result === "object")
      return r.result as LoanResponse;
    if (r.data && typeof r.data === "object") return r.data as LoanResponse;
  }
  return raw as LoanResponse;
}

export const loansApi = createApi({
  reducerPath: "loansApi",
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
  tagTypes: ["Loan"],
  endpoints: (builder) => ({
    getLoans: builder.query<PaginatedLoansResult, GetLoansArgs>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        return `/loan?page=${page}&perPage=${perPage}`;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<LoanResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Loan" as const, id })),
              { type: "Loan", id: "LIST" },
            ]
          : [{ type: "Loan", id: "LIST" }],
    }),
    getLoanById: builder.query<LoanResponse, number>({
      query: (id) => `/loan/id?id=${id}`,
      transformResponse: (raw: unknown) => unwrapLoan(raw),
      providesTags: (_r, _e, id) => [{ type: "Loan", id }],
    }),
    createLoan: builder.mutation<LoanResponse, CreateLoanRequest>({
      query: (body) => ({ url: "/loan", method: "POST", body }),
      transformResponse: (raw: unknown) => unwrapLoan(raw),
      invalidatesTags: [{ type: "Loan", id: "LIST" }],
    }),
    updateLoan: builder.mutation<void, UpdateLoanArgs>({
      query: ({ id, body }) => ({
        url: `/loan?id=${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Loan", id },
        { type: "Loan", id: "LIST" },
      ],
    }),
    deleteLoan: builder.mutation<void, number>({
      query: (id) => ({ url: `/loan?id=${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Loan", id },
        { type: "Loan", id: "LIST" },
      ],
    }),
    registerLoanPayment: builder.mutation<
      LoanResponse,
      { loanId: number; body: RegisterLoanPaymentRequest }
    >({
      query: ({ loanId, body }) => ({
        url: `/loan/${loanId}/payments`,
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) => unwrapLoan(raw),
      invalidatesTags: (_r, _e, { loanId }) => [
        { type: "Loan", id: loanId },
        { type: "Loan", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetLoansQuery,
  useGetLoanByIdQuery,
  useCreateLoanMutation,
  useUpdateLoanMutation,
  useDeleteLoanMutation,
  useRegisterLoanPaymentMutation,
} = loansApi;
