"use client";

import { useEffect } from "react";
import type { AuthState } from "@/app/login/_slices/authSlice";
import { loginSuccessfull } from "@/app/login/_slices/authSlice";
import { getStoredUser, getToken } from "@/lib/auth-api";
import { useAppDispatch, useAppSelector } from "@/store/store";

/**
 * Restores auth into Redux from localStorage when there is a token but no auth
 * in state (e.g. after a full page reload if redux-persist hasn't rehydrated yet
 * or rehydration failed). Ensures permission-based nav and other auth-dependent
 * logic work after reload.
 */
export function AuthRestore() {
  const dispatch = useAppDispatch();
  const auth = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (auth != null) return;
    const token = getToken();
    if (!token) return;
    const user = getStoredUser();
    if (user?.roleId != null) {
      dispatch(loginSuccessfull(user as AuthState));
    }
  }, [auth, dispatch]);

  return null;
}
