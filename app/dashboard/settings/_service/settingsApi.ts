import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type {
  AccountUpdateProfileRequest,
  GroupedSettingsResponse,
  MySubscriptionDto,
  UpdateGroupedSettingsRequest,
} from "@/lib/dashboard-types";
import { parseMySubscriptionResponse } from "@/lib/subscription-utils";

export const settingsApi = createApi({
  reducerPath: "settingsApi",
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
  tagTypes: ["Setting", "Subscription"],
  endpoints: (builder) => ({
    getGroupedSettings: builder.query<GroupedSettingsResponse, void>({
      query: () => "/setting/grouped",
      transformResponse: (raw: unknown) => {
        if (!raw || typeof raw !== "object") return {} as GroupedSettingsResponse;
        const o = raw as Record<string, unknown>;
        const payload = o.data ?? o.result ?? o;
        return (payload && typeof payload === "object" ? payload : {}) as GroupedSettingsResponse;
      },
      providesTags: ["Setting"],
    }),
    updateGroupedSettings: builder.mutation<void, UpdateGroupedSettingsRequest>({
      query: (body) => ({ url: "/setting/grouped", method: "PUT", body }),
      invalidatesTags: ["Setting"],
    }),
    updateAccountProfile: builder.mutation<void, AccountUpdateProfileRequest>({
      query: (body) => ({ url: "/account/update-profile", method: "POST", body }),
      invalidatesTags: ["Setting"],
    }),
    getMySubscription: builder.query<MySubscriptionDto | null, void>({
      query: () => "/subscription/my-subscription",
      transformResponse: (raw: unknown) => parseMySubscriptionResponse(raw),
      providesTags: ["Subscription"],
    }),
  }),
});

export const {
  useGetGroupedSettingsQuery,
  useGetMySubscriptionQuery,
  useUpdateGroupedSettingsMutation,
  useUpdateAccountProfileMutation,
} = settingsApi;
