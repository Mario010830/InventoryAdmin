import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { getApiUrl, getToken } from "@/lib/auth-api";
import type {
  ElYerroImportExecuteRequest,
  ElYerroImportPreviewRequest,
  ElYerroImportResult,
  ElYerroPreviewProduct,
  ElYerroPreviewCategory,
  ElYerroPreviewResult,
} from "@/lib/dashboard-types";

function pickStr(o: Record<string, unknown>, c: string, p: string): string {
  const v = o[c] ?? o[p];
  return v == null ? "" : String(v);
}

function pickNum(o: Record<string, unknown>, c: string, p: string): number {
  const v = o[c] ?? o[p];
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pickBool(o: Record<string, unknown>, c: string, p: string): boolean {
  const v = o[c] ?? o[p];
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1) return true;
  if (v === "false" || v === 0) return false;
  return Boolean(v);
}

function pickOptNum(
  o: Record<string, unknown>,
  c: string,
  p: string,
): number | null {
  const v = o[c] ?? o[p];
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parsePreviewProduct(raw: unknown): ElYerroPreviewProduct {
  const o = raw as Record<string, unknown>;
  const descripcion =
    pickStr(o, "descripcion", "Descripcion") ||
    pickStr(o, "description", "Description");
  return {
    nombre: pickStr(o, "nombre", "Nombre"),
    descripcion,
    precio: pickNum(o, "precio", "Precio"),
    precioOriginal: pickOptNum(o, "precioOriginal", "PrecioOriginal"),
    moneda: pickStr(o, "moneda", "Moneda"),
    imagenUrl: pickStr(o, "imagenUrl", "ImagenUrl"),
    categoria: pickStr(o, "categoria", "Categoria"),
    slug: pickStr(o, "slug", "Slug"),
    disponible: pickBool(o, "disponible", "Disponible"),
    tieneDescuento: pickBool(o, "tieneDescuento", "TieneDescuento"),
    porcentajeDescuento: pickOptNum(
      o,
      "porcentajeDescuento",
      "PorcentajeDescuento",
    ),
  };
}

function parsePreviewCategory(raw: unknown): ElYerroPreviewCategory {
  const o = raw as Record<string, unknown>;
  const prods = o.productos ?? o.Productos;
  const productos = Array.isArray(prods)
    ? prods.map(parsePreviewProduct)
    : [];
  return {
    nombre: pickStr(o, "nombre", "Nombre"),
    slug: pickStr(o, "slug", "Slug"),
    cantidadProductos: pickNum(o, "cantidadProductos", "CantidadProductos"),
    url: pickStr(o, "url", "Url"),
    productos,
  };
}

export function unwrapElYerroPreviewResult(raw: unknown): ElYerroPreviewResult | null {
  if (raw == null) return null;
  const outer = raw as Record<string, unknown>;
  const payload = (outer.result ?? outer.Result ?? outer) as Record<
    string,
    unknown
  >;
  if (!payload || typeof payload !== "object") return null;
  const cats = payload.categorias ?? payload.Categorias;
  const errs = payload.errores ?? payload.Errores;
  return {
    nombreNegocio: pickStr(payload, "nombreNegocio", "NombreNegocio"),
    businessUrlNormalizada: pickStr(
      payload,
      "businessUrlNormalizada",
      "BusinessUrlNormalizada",
    ),
    categorias: Array.isArray(cats) ? cats.map(parsePreviewCategory) : [],
    errores: Array.isArray(errs) ? errs.map((e) => String(e)) : [],
  };
}

function parseImportResult(raw: unknown): ElYerroImportResult | null {
  if (raw == null) return null;
  const outer = raw as Record<string, unknown>;
  const payload = (outer.result ?? outer.Result ?? outer) as Record<
    string,
    unknown
  >;
  if (!payload || typeof payload !== "object") return null;
  const errs = payload.errores ?? payload.Errores;
  const imported =
    payload.productosImportados ?? payload.ProductosImportados ?? [];
  return {
    nombreNegocio: pickStr(payload, "nombreNegocio", "NombreNegocio"),
    totalImportados: pickNum(payload, "totalImportados", "TotalImportados"),
    totalOmitidos: pickNum(payload, "totalOmitidos", "TotalOmitidos"),
    errores: Array.isArray(errs) ? errs.map((e) => String(e)) : [],
    productosImportados: Array.isArray(imported) ? imported : [],
  };
}

export const elyerroImportApi = createApi({
  reducerPath: "elyerroImportApi",
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
  tagTypes: ["Product"],
  endpoints: (builder) => ({
    previewElYerro: builder.mutation<
      ElYerroPreviewResult,
      ElYerroImportPreviewRequest
    >({
      query: (body) => ({
        url: "/import/elyerro/preview",
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        unwrapElYerroPreviewResult(raw) ?? {
          nombreNegocio: "",
          businessUrlNormalizada: "",
          categorias: [],
          errores: ["Respuesta inválida del servidor."],
        },
    }),
    importElYerro: builder.mutation<
      ElYerroImportResult,
      ElYerroImportExecuteRequest
    >({
      query: (body) => ({
        url: "/import/elyerro",
        method: "POST",
        body,
      }),
      transformResponse: (raw: unknown) =>
        parseImportResult(raw) ?? {
          nombreNegocio: "",
          totalImportados: 0,
          totalOmitidos: 0,
          errores: ["Respuesta inválida del servidor."],
          productosImportados: [],
        },
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),
  }),
});

export const { usePreviewElYerroMutation, useImportElYerroMutation } =
  elyerroImportApi;
