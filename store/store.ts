import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import {
  type TypedUseSelectorHook,
  useDispatch,
  useSelector,
} from "react-redux";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  persistReducer,
  persistStore,
  REGISTER,
  REHYDRATE,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // localStorage
import { catalogApi } from "@/app/catalog/_service/catalogApi";
import { dashboardApi } from "@/app/dashboard/_service/dashboardApi";
import { categoriesApi } from "@/app/dashboard/categories/_service/categoriesApi";
import { contactsApi } from "@/app/dashboard/contacts/_service/contactsApi";
import { dailySummaryApi } from "@/app/dashboard/daily-summary/_service/dailySummaryApi";
import { inventoryApi } from "@/app/dashboard/inventory/_service/inventoryApi";
import { leadsApi } from "@/app/dashboard/leads/_service/leadsApi";
import { loansApi } from "@/app/dashboard/loans/_service/loansApi";
import { businessCategoryApi } from "@/app/dashboard/locations/_service/businessCategoryApi";
import { locationsApi } from "@/app/dashboard/locations/_service/locationsApi";
import { logsApi } from "@/app/dashboard/logs/_service/logsApi";
import { movementsApi } from "@/app/dashboard/movements/_service/movementsApi";
import { elyerroImportApi } from "@/app/dashboard/products/_service/elyerroImportApi";
import { productsApi } from "@/app/dashboard/products/_service/productsApi";
import { promotionApi } from "@/app/dashboard/promotions/_service/promotionApi";
import { rolesApi } from "@/app/dashboard/roles/_service/rolesApi";
import { salesApi } from "@/app/dashboard/sales/_service/salesApi";
import { currencyApi } from "@/app/dashboard/settings/_service/currencyApi";
import { settingsApi } from "@/app/dashboard/settings/_service/settingsApi";
import { suppliersApi } from "@/app/dashboard/suppliers/_service/suppliersApi";
import { usersApi } from "@/app/dashboard/users/_service/usersApi";
import { toastMiddleware } from "@/lib/toastMiddleware";
import { authApi } from "../app/login/_service/authApi";
import { authSlice } from "../app/login/_slices/authSlice";
import { cartSlice } from "./cartSlice";

// Only persist the auth slice — API cache doesn't need persistence
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "cart"],
};

const combinedReducer = combineReducers({
  auth: authSlice.reducer,
  cart: cartSlice.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [productsApi.reducerPath]: productsApi.reducer,
  [elyerroImportApi.reducerPath]: elyerroImportApi.reducer,
  [inventoryApi.reducerPath]: inventoryApi.reducer,
  [categoriesApi.reducerPath]: categoriesApi.reducer,
  [suppliersApi.reducerPath]: suppliersApi.reducer,
  [locationsApi.reducerPath]: locationsApi.reducer,
  [businessCategoryApi.reducerPath]: businessCategoryApi.reducer,
  [movementsApi.reducerPath]: movementsApi.reducer,
  [usersApi.reducerPath]: usersApi.reducer,
  [rolesApi.reducerPath]: rolesApi.reducer,
  [logsApi.reducerPath]: logsApi.reducer,
  [settingsApi.reducerPath]: settingsApi.reducer,
  [currencyApi.reducerPath]: currencyApi.reducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  [catalogApi.reducerPath]: catalogApi.reducer,
  [salesApi.reducerPath]: salesApi.reducer,
  [promotionApi.reducerPath]: promotionApi.reducer,
  [contactsApi.reducerPath]: contactsApi.reducer,
  [leadsApi.reducerPath]: leadsApi.reducer,
  [loansApi.reducerPath]: loansApi.reducer,
  [dailySummaryApi.reducerPath]: dailySummaryApi.reducer,
});

type CombinedState = ReturnType<typeof combinedReducer>;

// On login or logout, wipe all RTK Query caches so stale data from a
// previous session is never served to the incoming user.
function rootReducer(
  state: CombinedState | undefined,
  action: { type: string },
): CombinedState {
  if (
    action.type === "auth/logoutSuccessfull" ||
    action.type === "auth/loginSuccessfull"
  ) {
    return combinedReducer(undefined, action);
  }
  return combinedReducer(state, action);
}

const persistedReducer = persistReducer(persistConfig, rootReducer);

const apiMiddleware = [
  authApi.middleware,
  productsApi.middleware,
  elyerroImportApi.middleware,
  inventoryApi.middleware,
  categoriesApi.middleware,
  suppliersApi.middleware,
  locationsApi.middleware,
  businessCategoryApi.middleware,
  movementsApi.middleware,
  usersApi.middleware,
  rolesApi.middleware,
  logsApi.middleware,
  settingsApi.middleware,
  currencyApi.middleware,
  dashboardApi.middleware,
  catalogApi.middleware,
  salesApi.middleware,
  promotionApi.middleware,
  contactsApi.middleware,
  leadsApi.middleware,
  loansApi.middleware,
  dailySummaryApi.middleware,
];

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .concat(toastMiddleware)
      .concat(...apiMiddleware),
});

export const persistor = persistStore(store);

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
