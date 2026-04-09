import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { parsePaginated } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type { UserResponse } from "@/lib/auth-types";
import type {
  CreateUserRequest,
  PaginationInfo,
  UpdateUserRequest,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetUsersArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
}

interface UpdateUserArgs {
  id: number;
  body: UpdateUserRequest;
}

export const usersApi = createApi({
  reducerPath: "usersApi",
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
  tagTypes: ["User"],
  endpoints: (builder) => ({
    getUsers: builder.query<PaginatedResult<UserResponse>, GetUsersArgs>({
      query: (arg) => {
        const page = arg?.page ?? 1;
        const perPage = arg?.perPage ?? 10;
        const sortOrder = arg?.sortOrder ?? "desc";
        return (
          "/user?page=" +
          page +
          "&perPage=" +
          perPage +
          "&sortOrder=" +
          sortOrder
        );
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<UserResponse>(raw, arg?.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: "User" as const, id })),
              { type: "User", id: "LIST" },
            ]
          : [{ type: "User", id: "LIST" }],
    }),
    createUser: builder.mutation<UserResponse, CreateUserRequest>({
      query: (body) => ({
        url: "/user",
        method: "POST",
        body: {
          fullName: body.fullName,
          password: body.password,
          email: body.email,
          phone: body.phone ?? "",
          birthDate: body.birthDate
            ? new Date(body.birthDate).toISOString()
            : "",
          locationId: body.locationId ?? 0,
          organizationId: body.organizationId ?? 0,
          roleId: body.roleId ?? 0,
        },
      }),
      transformResponse: (raw: UserResponse | { data: UserResponse }) =>
        "data" in raw ? raw.data : raw,
      invalidatesTags: [{ type: "User", id: "LIST" }],
    }),
    updateUser: builder.mutation<void, UpdateUserArgs>({
      query: ({ id, body }) => {
        const b: Record<string, unknown> = {};
        if (body.fullName !== undefined) b.fullName = body.fullName;
        if (body.oldPassword !== undefined) b.oldPassword = body.oldPassword;
        if (body.password !== undefined) b.password = body.password;
        if (body.email !== undefined) b.email = body.email;
        if (body.phone !== undefined) b.phone = body.phone;
        if (body.birthDate !== undefined)
          b.birthDate = body.birthDate
            ? new Date(body.birthDate).toISOString()
            : "";
        if (body.locationId !== undefined) b.locationId = body.locationId;
        if (body.organizationId !== undefined)
          b.organizationId = body.organizationId;
        if (body.roleId !== undefined) b.roleId = body.roleId;
        if (body.statusId !== undefined) b.statusId = body.statusId;
        return {
          url: `/user/${id}`,
          method: "PUT",
          body: Object.keys(b).length ? b : {},
        };
      },
      invalidatesTags: (_r, _e, { id }) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
    deleteUser: builder.mutation<void, number>({
      query: (id) => ({ url: `/user?id=${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "User", id },
        { type: "User", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = usersApi;
