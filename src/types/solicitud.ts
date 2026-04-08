export type EstadoSolicitud =
  | "Pendiente"
  | "EnRevision"
  | "Aprobada"
  | "Rechazada"
  | "InfoAdicional";

export type TipoLicencia =
  | "PescaOrilla"
  | "EmbarcacionDeportiva"
  | "EmbarcacionEstatal"
  | "EmbarcacionComercial";

export interface Documento {
  id: number;
  nombreArchivo: string;
  rutaArchivo: string;
  estado: "Pendiente" | "Aprobado" | "Rechazado" | "Ilegible";
}

export interface Pago {
  id: number;
  monto: number;
  pasarela: "EnZona" | "Transfermovil";
  estado: "Pendiente" | "Completado" | "Fallido";
  transaccionId: string;
}

export interface Solicitud {
  id: number;
  tipo: TipoLicencia;
  estado: EstadoSolicitud;
  fechaSolicitud: string;
  fechaResolucion?: string;
  observacionGestor?: string;
  usuario: {
    id: string;
    nombre: string;
    carnet: string;
    email: string;
  };
  embarcacion?: {
    id: number;
    nombre: string;
    identidad: string;
  };
  documentos: Documento[];
  pago?: Pago;
}
