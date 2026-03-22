import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthState {
  id: number;
  birthDate: string;
  fullName: string;
  identity: string;
  genderId: number;
  gender: string;
  email: string;
  phone: string;
  statusId: number;
  status: string;
  locationId: number;
  organizationId: number;
  roleId: number;
  location: {
    id: number;
    organizationId: number;
    organizationName: string;
    name: string;
    code: string;
    description: string;
    createdAt: string;
    modifiedAt: string;
  };
  organization?: {
    id: number;
    name: string;
    code: string;
    description: string;
    createdAt: string;
    modifiedAt: string;
  };
}

type AuthSliceState = AuthState | null;

const initialState: AuthSliceState = null;

export const authSlice = createSlice({
  name: "auth",
  initialState: initialState as AuthSliceState,
  reducers: {
    loginSuccessfull: (_state, action: PayloadAction<AuthState>) => {
      return action.payload;   // ✅ return instead of reassign
    },
    logoutSuccessfull: () => {
      return null;             // ✅ return instead of reassign
    },
  },
});

export const { loginSuccessfull, logoutSuccessfull } = authSlice.actions;