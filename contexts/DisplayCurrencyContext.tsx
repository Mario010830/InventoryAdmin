"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useGetCurrenciesQuery } from "@/app/dashboard/settings/_service/currencyApi";
import { useGetGroupedSettingsQuery } from "@/app/dashboard/settings/_service/settingsApi";
import { getToken } from "@/lib/auth-api";
import type { CurrencyResponse } from "@/lib/dashboard-types";
import {
  cupToDisplayAmount,
  formatAmountWithCode,
  roundPriceDecimals,
} from "@/lib/displayCurrencyFormat";

const STORAGE_KEY = "strova_display_currency_id";

function syntheticCup(): CurrencyResponse {
  return {
    id: 0,
    code: "CUP",
    name: "Peso cubano",
    exchangeRate: 1,
    isActive: true,
    isBase: true,
    isDefaultDisplay: true,
    createdAt: "",
    updatedAt: "",
  };
}

type DisplayCurrencyContextValue = {
  /** Moneda seleccionada para mostrar (tipo CUP si aún no hay datos). */
  selectedCurrency: CurrencyResponse;
  /** Activas para el desplegable. */
  activeCurrencies: CurrencyResponse[];
  priceDecimals: number;
  setCurrencyId: (id: number) => void;
  /** cup en BD → texto "1.234,56 USD" */
  formatCup: (cup: number) => string;
  isLoading: boolean;
};

const DisplayCurrencyContext =
  createContext<DisplayCurrencyContextValue | null>(null);

export function DisplayCurrencyProvider({ children }: { children: ReactNode }) {
  const hasToken = typeof window !== "undefined" && !!getToken();
  const skipCurrencies = typeof window === "undefined" || !hasToken;

  const { data: groupedSettings } = useGetGroupedSettingsQuery(undefined, {
    skip: typeof window === "undefined" || !hasToken,
  });
  const priceDecimals = groupedSettings?.inventory?.priceRoundingDecimals ?? 2;

  const {
    data: currencyList,
    isLoading: currenciesLoading,
    isFetching: currenciesFetching,
  } = useGetCurrenciesQuery(undefined, { skip: skipCurrencies });

  const activeCurrencies = useMemo(
    () => (currencyList ?? []).filter((c) => c.isActive),
    [currencyList],
  );

  const defaultCurrency = useMemo(() => {
    if (activeCurrencies.length === 0) return syntheticCup();
    return (
      activeCurrencies.find((c) => c.isDefaultDisplay) ??
      activeCurrencies.find((c) => c.isBase) ??
      activeCurrencies[0]
    );
  }, [activeCurrencies]);

  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (activeCurrencies.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((prev) => {
      if (prev != null && activeCurrencies.some((c) => c.id === prev))
        return prev;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw != null) {
          const n = Number.parseInt(raw, 10);
          if (Number.isFinite(n) && activeCurrencies.some((c) => c.id === n))
            return n;
        }
      } catch {
        /* ignore */
      }
      return defaultCurrency.id;
    });
  }, [activeCurrencies, defaultCurrency.id]);

  const selectedCurrency = useMemo(() => {
    if (selectedId == null) return defaultCurrency;
    const found = activeCurrencies.find((c) => c.id === selectedId);
    return found ?? defaultCurrency;
  }, [activeCurrencies, selectedId, defaultCurrency]);

  const setCurrencyId = useCallback(
    (id: number) => {
      if (!activeCurrencies.some((c) => c.id === id)) return;
      setSelectedId(id);
      try {
        localStorage.setItem(STORAGE_KEY, String(id));
      } catch {
        /* ignore */
      }
    },
    [activeCurrencies],
  );

  const formatCup = useCallback(
    (cup: number) => {
      const rate = selectedCurrency.exchangeRate;
      const display = cupToDisplayAmount(Number(cup), rate);
      const rounded = roundPriceDecimals(display, priceDecimals);
      return formatAmountWithCode(
        rounded,
        selectedCurrency.code,
        priceDecimals,
      );
    },
    [selectedCurrency, priceDecimals],
  );

  const value = useMemo<DisplayCurrencyContextValue>(
    () => ({
      selectedCurrency,
      activeCurrencies,
      priceDecimals,
      setCurrencyId,
      formatCup,
      isLoading: currenciesLoading || currenciesFetching,
    }),
    [
      selectedCurrency,
      activeCurrencies,
      priceDecimals,
      setCurrencyId,
      formatCup,
      currenciesLoading,
      currenciesFetching,
    ],
  );

  return (
    <DisplayCurrencyContext.Provider value={value}>
      {children}
    </DisplayCurrencyContext.Provider>
  );
}

export function useDisplayCurrency(): DisplayCurrencyContextValue {
  const ctx = useContext(DisplayCurrencyContext);
  if (!ctx) {
    const fallback = syntheticCup();
    return {
      selectedCurrency: fallback,
      activeCurrencies: [],
      priceDecimals: 2,
      setCurrencyId: () => {},
      formatCup: (cup: number) =>
        formatAmountWithCode(roundPriceDecimals(cup, 2), "CUP", 2),
      isLoading: false,
    };
  }
  return ctx;
}
