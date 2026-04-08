import type { TipoLicencia } from "./solicitud";

export interface Licencia {
  id: number;
  codigoUnico: string;
  tipo: TipoLicencia;
  /** Etiqueta desde API (`typeName` / orilla-embarcación) cuando aplica */
  tipoDisplay?: string;
  fechaEmision: string;
  fechaVencimiento: string;
  activa: boolean;
  usuario?: { nombre: string; carnet: string };
  embarcacion?: { nombre: string; identidad: string };
  /** IDs API (vista admin / búsqueda) */
  userId?: number | null;
  shipId?: number | null;
}
