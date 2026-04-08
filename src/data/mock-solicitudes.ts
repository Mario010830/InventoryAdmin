import type { Solicitud } from "@/types/solicitud";

export const mockSolicitudes: Solicitud[] = [
  {
    id: 1,
    tipo: "PescaOrilla",
    estado: "Pendiente",
    fechaSolicitud: "2026-03-15T10:00:00.000Z",
    usuario: {
      id: "u1",
      nombre: "Carlos Méndez Ríos",
      carnet: "96041212345",
      email: "cmendez@correo.cu",
    },
    documentos: [
      {
        id: 1,
        nombreArchivo: "carnet.pdf",
        rutaArchivo: "/docs/u1/carnet.pdf",
        estado: "Aprobado",
      },
      {
        id: 2,
        nombreArchivo: "comprobante.pdf",
        rutaArchivo: "/docs/u1/pago.pdf",
        estado: "Pendiente",
      },
    ],
    pago: {
      id: 1,
      monto: 150,
      pasarela: "Transfermovil",
      estado: "Completado",
      transaccionId: "TMX-10001",
    },
  },
  {
    id: 2,
    tipo: "EmbarcacionDeportiva",
    estado: "EnRevision",
    fechaSolicitud: "2026-03-18T14:30:00.000Z",
    usuario: {
      id: "u2",
      nombre: "Ana López García",
      carnet: "85062367890",
      email: "alopez@correo.cu",
    },
    embarcacion: {
      id: 10,
      nombre: "La Brisa",
      identidad: "EMB-2019-044",
    },
    documentos: [
      {
        id: 3,
        nombreArchivo: "matricula.pdf",
        rutaArchivo: "/docs/u2/mat.pdf",
        estado: "Aprobado",
      },
      {
        id: 4,
        nombreArchivo: "seguro.pdf",
        rutaArchivo: "/docs/u2/seg.pdf",
        estado: "Pendiente",
      },
    ],
    pago: {
      id: 2,
      monto: 450,
      pasarela: "EnZona",
      estado: "Pendiente",
      transaccionId: "EZ-pending",
    },
  },
  {
    id: 3,
    tipo: "EmbarcacionComercial",
    estado: "Aprobada",
    fechaSolicitud: "2026-02-01T09:00:00.000Z",
    fechaResolucion: "2026-02-20T16:00:00.000Z",
    usuario: {
      id: "u3",
      nombre: "Empresa Pesquera Norte",
      carnet: "NIT-298765432",
      email: "contacto@epn.cu",
    },
    embarcacion: {
      id: 11,
      nombre: "Pescador III",
      identidad: "COM-7788",
    },
    documentos: [
      {
        id: 5,
        nombreArchivo: "licencia_anterior.pdf",
        rutaArchivo: "/docs/u3/prev.pdf",
        estado: "Aprobado",
      },
    ],
    pago: {
      id: 3,
      monto: 1200,
      pasarela: "EnZona",
      estado: "Completado",
      transaccionId: "EZ-88221",
    },
  },
  {
    id: 4,
    tipo: "EmbarcacionEstatal",
    estado: "Rechazada",
    fechaSolicitud: "2026-03-01T11:20:00.000Z",
    fechaResolucion: "2026-03-10T08:00:00.000Z",
    observacionGestor: "Documentación de la embarcación incompleta.",
    usuario: {
      id: "u4",
      nombre: "Luis Fernández Paz",
      carnet: "78120111223",
      email: "lfernandez@correo.cu",
    },
    embarcacion: {
      id: 12,
      nombre: "Estatal-04",
      identidad: "EST-004",
    },
    documentos: [
      {
        id: 6,
        nombreArchivo: "oficio.pdf",
        rutaArchivo: "/docs/u4/oficio.pdf",
        estado: "Rechazado",
      },
    ],
  },
  {
    id: 5,
    tipo: "PescaOrilla",
    estado: "InfoAdicional",
    fechaSolicitud: "2026-03-20T08:45:00.000Z",
    observacionGestor: "Se requiere foto legible del carnet.",
    usuario: {
      id: "u5",
      nombre: "María Torres Leal",
      carnet: "99081533445",
      email: "mtorres@correo.cu",
    },
    documentos: [
      {
        id: 7,
        nombreArchivo: "carnet_foto.jpg",
        rutaArchivo: "/docs/u5/carnet.jpg",
        estado: "Ilegible",
      },
    ],
    pago: {
      id: 4,
      monto: 150,
      pasarela: "Transfermovil",
      estado: "Completado",
      transaccionId: "TMX-10088",
    },
  },
  {
    id: 6,
    tipo: "EmbarcacionDeportiva",
    estado: "Pendiente",
    fechaSolicitud: "2026-03-22T16:10:00.000Z",
    usuario: {
      id: "u6",
      nombre: "Jorge Castillo Núñez",
      carnet: "92051144556",
      email: "jcastillo@correo.cu",
    },
    embarcacion: {
      id: 13,
      nombre: "El Delfín",
      identidad: "EMB-2021-102",
    },
    documentos: [
      {
        id: 8,
        nombreArchivo: "solicitud.pdf",
        rutaArchivo: "/docs/u6/sol.pdf",
        estado: "Pendiente",
      },
    ],
  },
  {
    id: 7,
    tipo: "PescaOrilla",
    estado: "EnRevision",
    fechaSolicitud: "2026-03-21T12:00:00.000Z",
    usuario: {
      id: "u7",
      nombre: "Rosa Elena Vila",
      carnet: "87040255667",
      email: "rvila@correo.cu",
    },
    documentos: [
      {
        id: 9,
        nombreArchivo: "id.pdf",
        rutaArchivo: "/docs/u7/id.pdf",
        estado: "Aprobado",
      },
    ],
    pago: {
      id: 5,
      monto: 150,
      pasarela: "EnZona",
      estado: "Fallido",
      transaccionId: "EZ-fail-01",
    },
  },
  {
    id: 8,
    tipo: "EmbarcacionComercial",
    estado: "Pendiente",
    fechaSolicitud: "2026-03-23T09:30:00.000Z",
    usuario: {
      id: "u8",
      nombre: "Cooperativa Mar Azul",
      carnet: "NIT-112233445",
      email: "admin@marazul.coop.cu",
    },
    embarcacion: {
      id: 14,
      nombre: "Atarraya I",
      identidad: "COM-9901",
    },
    documentos: [],
  },
];

export function getSolicitudById(id: number): Solicitud | undefined {
  return mockSolicitudes.find((s) => s.id === id);
}
