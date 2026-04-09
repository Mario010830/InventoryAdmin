import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CartItem } from "@/lib/dashboard-types";

interface CartState {
  locationId: number | null;
  locationName: string;
  whatsAppContact: string | null;
  isOpenNow: boolean | null;
  todayOpen: string | null;
  todayClose: string | null;
  items: CartItem[];
}

const initialState: CartState = {
  locationId: null,
  locationName: "",
  whatsAppContact: null,
  isOpenNow: null,
  todayOpen: null,
  todayClose: null,
  items: [],
};

export const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    setLocation(
      state,
      action: PayloadAction<{
        id: number;
        name: string;
        whatsAppContact: string | null;
        isOpenNow?: boolean | null;
        todayOpen?: string | null;
        todayClose?: string | null;
      }>,
    ) {
      if (state.locationId !== null && state.locationId !== action.payload.id) {
        state.items = [];
      }
      state.locationId = action.payload.id;
      state.locationName = action.payload.name;
      state.whatsAppContact = action.payload.whatsAppContact;
      state.isOpenNow = action.payload.isOpenNow ?? null;
      state.todayOpen = action.payload.todayOpen ?? null;
      state.todayClose = action.payload.todayClose ?? null;
    },

    addItem(state, action: PayloadAction<CartItem>) {
      const existing = state.items.find(
        (i) => i.productId === action.payload.productId,
      );
      const maxQty =
        action.payload.tipo === "elaborado"
          ? Infinity
          : action.payload.stockAtLocation;
      if (existing) {
        existing.quantity = Math.min(existing.quantity + 1, maxQty);
        if (action.payload.tipo != null) existing.tipo = action.payload.tipo;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
    },

    removeItem(state, action: PayloadAction<number>) {
      state.items = state.items.filter((i) => i.productId !== action.payload);
    },

    updateQuantity(
      state,
      action: PayloadAction<{ productId: number; quantity: number }>,
    ) {
      const item = state.items.find(
        (i) => i.productId === action.payload.productId,
      );
      if (!item) return;
      if (action.payload.quantity <= 0) {
        state.items = state.items.filter(
          (i) => i.productId !== action.payload.productId,
        );
      } else {
        const maxQty =
          item.tipo === "elaborado" ? Infinity : item.stockAtLocation;
        item.quantity = Math.min(action.payload.quantity, maxQty);
      }
    },

    clearCart(state) {
      state.items = [];
    },
  },
});

export const { setLocation, addItem, removeItem, updateQuantity, clearCart } =
  cartSlice.actions;
