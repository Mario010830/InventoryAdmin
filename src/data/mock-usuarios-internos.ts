import type { UsuarioInterno } from "@/types/usuario-interno";

export const initialMockUsuariosInternos: UsuarioInterno[] = [
  {
    id: "i1",
    nombre: "SuperAdmin",
    email: "admin@email.com",
    carnet: "ADMIN-01",
    rol: "Administrador",
    activo: true,
  },
  {
    id: "i2",
    nombre: "Patricia Gómez Ruiz",
    email: "pgomez@mintur.cu",
    carnet: "GTR-2201",
    rol: "Gestor",
    activo: true,
  },
  {
    id: "i3",
    nombre: "Miguel Santos León",
    email: "msantos@mintur.cu",
    carnet: "INS-8844",
    rol: "Inspector",
    activo: true,
  },
  {
    id: "i4",
    nombre: "Laura Benítez Moya",
    email: "lbenitez@mintur.cu",
    carnet: "GTR-2202",
    rol: "Gestor",
    activo: false,
  },
];
