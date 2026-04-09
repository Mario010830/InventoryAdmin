import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { parsePaginated } from "@/lib/api-utils";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type { LocationResponse } from "@/lib/auth-types";
import type {
  CreateLocationRequest,
  PaginationInfo,
  UpdateLocationRequest,
} from "@/lib/dashboard-types";

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo | null;
}

interface GetLocationsArgs {
  page?: number;
  perPage?: number;
  sortOrder?: "asc" | "desc";
  organizationId?: number;
}

interface UpdateLocationArgs {
  id: number;
  body: UpdateLocationRequest;
}

export const locationsApi = createApi({
  reducerPath: "locationsApi",
  baseQuery: fetchBaseQuery({
    baseUrl: getApiUrl(),
    prepareHeaders: (headers, { endpoint }) => {
      const token = getToken();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      headers.set("ngrok-skip-browser-warning", "true");
      if (endpoint !== "uploadLocationImage")
        headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["Location"],
  endpoints: (builder) => ({
    getLocations: builder.query<
      PaginatedResult<LocationResponse>,
      GetLocationsArgs
    >({
      query: ({
        page = 1,
        perPage = 10,
        sortOrder = "desc",
        organizationId,
      } = {}) => {
        let url = `/location?page=${page}&perPage=${perPage}&sortOrder=${sortOrder}`;
        if (organizationId != null) url += `&organizationId=${organizationId}`;
        return url;
      },
      transformResponse: (raw: unknown, _meta, arg) =>
        parsePaginated<LocationResponse>(raw, arg.perPage ?? 10),
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Location" as const,
                id,
              })),
              { type: "Location", id: "LIST" },
            ]
          : [{ type: "Location", id: "LIST" }],
    }),
    createLocation: builder.mutation<LocationResponse, CreateLocationRequest>({
      query: (body) => ({ url: "/location", method: "POST", body }),
      transformResponse: (
        raw: LocationResponse | { data: LocationResponse },
      ) => ("data" in raw ? raw.data : raw),
      invalidatesTags: [{ type: "Location", id: "LIST" }],
    }),
    updateLocation: builder.mutation<void, UpdateLocationArgs>({
      query: ({ id, body }) => ({
        url: `/location?id=${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_r, _e, { id }) => [
        { type: "Location", id },
        { type: "Location", id: "LIST" },
      ],
    }),
    deleteLocation: builder.mutation<void, number>({
      query: (id) => ({ url: `/location?id=${id}`, method: "DELETE" }),
      invalidatesTags: (_r, _e, id) => [
        { type: "Location", id },
        { type: "Location", id: "LIST" },
      ],
    }),
    /** POST /location/image (multipart/form-data, campo "file"). Devuelve { data: { photoUrl } }. */
    uploadLocationImage: builder.mutation<string, File>({
      query: (file) => {
        const body = new FormData();
        body.append("file", file);
        return {
          url: "/location/image",
          method: "POST",
          body,
        };
      },
      transformResponse: (raw: {
        data?: { photoUrl?: string };
        result?: { photoUrl?: string };
      }) => raw?.data?.photoUrl ?? raw?.result?.photoUrl ?? "",
    }),
  }),
});

export const {
  useGetLocationsQuery,
  useCreateLocationMutation,
  useUpdateLocationMutation,
  useDeleteLocationMutation,
  useUploadLocationImageMutation,
} = locationsApi;
