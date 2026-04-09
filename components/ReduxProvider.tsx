"use client";

import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { DisplayCurrencyProvider } from "@/contexts/DisplayCurrencyContext";
import { persistor, store } from "../store/store";
import { AuthRestore } from "./AuthRestore";

/** Shown while redux-persist rehydrates; avoids a blank screen during navigation/refresh. */
function RehydrateFallback() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100%",
        background: "#f5f6fa",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div className="rehydrate-spinner" />
        <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
          Cargando...
        </span>
      </div>
    </div>
  );
}

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <PersistGate loading={<RehydrateFallback />} persistor={persistor}>
        <AuthRestore />
        <DisplayCurrencyProvider>{children}</DisplayCurrencyProvider>
      </PersistGate>
    </Provider>
  );
}
