import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { parsePaginated } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type { ApiResponse } from "@/lib/auth-types";
import type {
  CreateRoleRequest,
  PaginationInfo,
  PermissionResponse,
  RoleResponse,
  UpdateRoleRequest,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetRolesArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
}

interface UpdateRoleArgs {
  id: number;
  body: UpdateRoleRequest;
}

export const rolesApi = createApi({
  reducerPath: "rolesApi",
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
  tagTypes: ["Role", "Permission"],
  endpoints: (builder) => ({
    getRoles: builder.query<PaginatedResult<RoleResponse>, GetRolesArgs>({
      query: ({ page = 1, perPage = 100 } = {}) =>
        `/role?page=${page}&perPage=${perPage}&sortOrder=asc`,
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<RoleResponse>(raw, arg.perPage ?? 100),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "Role" as const, id })),
              { type: "Role", id: "LIST" },
            ]
          : [{ type: "Role", id: "LIST" }],
    }),
    getRoleById: builder.query<ApiResponse<RoleResponse>, number>({
      query: (id) => `/role/id?id=${id}`,
      providesTags: (_result, _err, id) => [{ type: "Role", id }],
    }),
    getMyRole: builder.query<ApiResponse<RoleResponse>, void>({
      query: () => "/role/my-role",
      providesTags: [{ type: "Role", id: "MY" }],
    }),
    getPermissions: builder.query<ApiResponse<PermissionResponse[]>, void>({
      query: () => "/role/permissions",
      providesTags: ["Permission"],
    }),
    createRole: builder.mutation<RoleResponse, CreateRoleRequest>({
      query: (body) => ({ url: "/role", method: "POST", body }),
      transformResponse: (raw: RoleResponse | { data: RoleResponse }) =>
        "data" in raw ? raw.data : raw,
      invalidatesTags: [{ type: "Role", id: "LIST" }],
    }),
    updateRole: builder.mutation<void, UpdateRoleArgs>({
      query: ({ id, body }) => ({ url: `/role?id=${id}`, method: "PUT", body }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),
    deleteRole: builder.mutation<void, number>({
      query: (id) => ({ url: `/role?id=${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Role", id },
        { type: "Role", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetRolesQuery,
  useGetRoleByIdQuery,
  useGetMyRoleQuery,
  useGetPermissionsQuery,
  useCreateRoleMutation,
  useUpdateRoleMutation,
  useDeleteRoleMutation,
} = rolesApi;
