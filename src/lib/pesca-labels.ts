import type { EstadoSolicitud, TipoLicencia } from "@/types/solicitud";
import type { BadgeColor } from "@/components/ui/badge/Badge";

export function labelTipoLicencia(t: TipoLicencia): string {
  const m: Record<TipoLicencia, string> = {
    PescaOrilla: "Pesca de orilla",
    EmbarcacionDeportiva: "Embarcación deportiva",
    EmbarcacionEstatal: "Embarcación estatal",
    EmbarcacionComercial: "Embarcación comercial",
  };
  return m[t];
}

export function labelEstadoSolicitud(e: EstadoSolicitud): string {
  const m: Record<EstadoSolicitud, string> = {
    Pendiente: "Pendiente",
    EnRevision: "En revisión",
    Aprobada: "Aprobada",
    Rechazada: "Rechazada",
    InfoAdicional: "Info. adicional",
  };
  return m[e];
}

export function badgeColorEstadoSolicitud(
  e: EstadoSolicitud
): BadgeColor {
  switch (e) {
    case "Aprobada":
      return "success";
    case "Rechazada":
      return "error";
    case "Pendiente":
      return "warning";
    case "EnRevision":
      return "info";
    case "InfoAdicional":
      return "primary";
    default:
      return "light";
  }
}

export function labelEstadoDocumento(
  e: "Pendiente" | "Aprobado" | "Rechazado" | "Ilegible"
): string {
  const m = {
    Pendiente: "Pendiente",
    Aprobado: "Aprobado",
    Rechazado: "Rechazado",
    Ilegible: "Ilegible",
  };
  return m[e];
}

export function badgeColorDocumento(
  e: "Pendiente" | "Aprobado" | "Rechazado" | "Ilegible"
): BadgeColor {
  switch (e) {
    case "Aprobado":
      return "success";
    case "Rechazado":
    case "Ilegible":
      return "error";
    default:
      return "warning";
  }
}

export function labelPagoEstado(
  e: "Pendiente" | "Completado" | "Fallido"
): string {
  return e === "Completado" ? "Completado" : e === "Fallido" ? "Fallido" : "Pendiente";
}

export function badgeColorPago(
  e: "Pendiente" | "Completado" | "Fallido"
): BadgeColor {
  if (e === "Completado") return "success";
  if (e === "Fallido") return "error";
  return "warning";
}
