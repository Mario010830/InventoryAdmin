import { createApi } from "@reduxjs/toolkit/query/react";
import type {
  ApiResponse,
  ChangePasswordRequest,
  CreateOrganizationRequest,
  LoginRequest,
  OrganizationResponse,
  RegisterWithOrganizationRequest,
  UserResponse,
} from "@/lib/auth-types";
import baseQueryWithReauth from "@/lib/baseQuery";
import { type PublicPlan, parsePlansFromApi } from "@/lib/plan-utils";

export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithReauth,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true,
  tagTypes: ["User", "Organization"],
  endpoints: (builder) => ({
    login: builder.mutation<ApiResponse<UserResponse>, LoginRequest>({
      query: (credentials) => ({
        url: "/account/login",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["User"],
    }),

    register: builder.mutation<
      void,
      {
        FullName: string;
        Email: string;
        Password: string;
        ConfirmationPassword: string;
        Birthday: string;
        Gender: number;
        Phone?: string;
        OrganizationId?: number;
      }
    >({
      query: (body) => ({
        url: "/account/register",
        method: "POST",
        body,
      }),
    }),
    regiterWithOrganization: builder.mutation<
      void,
      RegisterWithOrganizationRequest
    >({
      query: (body) => ({
        url: "/account/register-with-organization",
        method: "POST",
        body,
      }),
    }),

    getPlans: builder.query<PublicPlan[], void>({
      query: () => ({ url: "/plan", method: "GET" }),
      transformResponse: (raw: unknown) => parsePlansFromApi(raw),
    }),
    createOrganization: builder.mutation<
      OrganizationResponse,
      CreateOrganizationRequest
    >({
      query: (data) => ({
        url: "/organization",
        method: "POST",
        body: { Name: data.name, Code: data.code },
      }),
      invalidatesTags: ["Organization"],
    }),

    refreshToken: builder.mutation<void, { refreshToken: string }>({
      query: (body) => ({
        url: "/account/refresh",
        method: "POST",
        body,
      }),
    }),

    /** POST {baseUrl}/account/logout — baseUrl incluye /api (p. ej. …/api/account/logout) */
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "/account/logout",
        method: "POST",
      }),
      invalidatesTags: ["User"],
    }),
    resetPassword: builder.mutation<void, { email: string }>({
      query: (body) => ({
        url: "/account/forgot-password",
        method: "POST",
        body,
      }),
    }),

    changePassword: builder.mutation<void, ChangePasswordRequest>({
      query: (body) => ({
        url: "/account/change-password",
        method: "POST",
        body: {
          oldPassword: body.oldPassword,
          newPassword: body.newPassword,
          confirmPassword: body.confirmPassword,
        },
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRegiterWithOrganizationMutation,
  useGetPlansQuery,
  useCreateOrganizationMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
} = authApi;
