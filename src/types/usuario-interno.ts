export type RolInterno = "Administrador" | "Gestor" | "Inspector";

export interface UsuarioInterno {
  id: string;
  nombre: string;
  email: string;
  carnet: string;
  rol: RolInterno;
  activo: boolean;
}
