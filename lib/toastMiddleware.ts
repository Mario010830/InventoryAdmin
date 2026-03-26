import { type Middleware } from "@reduxjs/toolkit";
import { toast } from "sonner";
import { areMutationToastsSuppressed } from "@/lib/mutationToastControl";

/**
 * Mutaciones que no deben mostrar toast (renovación de token en segundo plano, etc.).
 */
const SILENT_MUTATIONS = new Set(["refreshToken"]);

/**
 * Solo estas mutaciones muestran toast de éxito con mensaje fijo.
 * El resto de mutaciones exitosas no muestran nada (evita "Operación exitosa" genérico).
 */
const SUCCESS_MESSAGES: Record<string, string> = {
  // Auth
  login: "Sesión iniciada correctamente",
  logout: "Sesión cerrada",
  register: "Registro completado",
  regiterWithOrganization: "Cuenta creada correctamente",
  createOrganization: "Organización creada correctamente",
  resetPassword: "Correo de recuperación enviado",

  // Productos
  createProduct: "Producto creado correctamente",
  updateProduct: "Producto actualizado correctamente",
  deleteProduct: "Producto eliminado correctamente",
  uploadProductImage: "Imagen del producto actualizada",

  // Categorías
  createCategory: "Categoría creada correctamente",
  updateCategory: "Categoría actualizada correctamente",
  deleteCategory: "Categoría eliminada correctamente",

  // Proveedores
  createSupplier: "Proveedor creado correctamente",
  updateSupplier: "Proveedor actualizado correctamente",
  deleteSupplier: "Proveedor eliminado correctamente",

  // Ubicaciones
  createLocation: "Ubicación creada correctamente",
  updateLocation: "Ubicación actualizada correctamente",
  deleteLocation: "Ubicación eliminada correctamente",
  uploadLocationImage: "Imagen de la ubicación actualizada",

  // Inventario
  createInventory: "Entrada de inventario creada",
  updateInventory: "Entrada de inventario actualizada",
  deleteInventory: "Entrada de inventario eliminada",

  // Movimientos
  createMovement: "Movimiento registrado correctamente",

  // Usuarios y roles
  createUser: "Usuario creado correctamente",
  updateUser: "Usuario actualizado correctamente",
  deleteUser: "Usuario eliminado correctamente",
  createRole: "Rol creado correctamente",
  updateRole: "Rol actualizado correctamente",
  deleteRole: "Rol eliminado correctamente",

  // Configuración
  updateGroupedSettings: "Configuración guardada",
  updateAccountProfile: "Cambios guardados",
  createCurrency: "Moneda creada",
  updateCurrency: "Moneda actualizada",
  deleteCurrency: "Moneda eliminada",
  setDefaultDisplayCurrency: "Moneda de visualización actualizada",
  updateBusinessCategory: "Categoría de negocio actualizada",

  // Ventas
  createOrder: "Pedido creado correctamente",
  updateOrder: "Pedido actualizado correctamente",
  confirmOrder: "Pedido confirmado",
  cancelOrder: "Pedido cancelado",

  createPromotion: "Promoción creada correctamente",
  updatePromotion: "Promoción actualizada correctamente",
  setPromotionActive: "Estado de la promoción actualizado",
  deletePromotion: "Promoción eliminada correctamente",
};

const ERROR_MESSAGES: Record<string, string> = {
  login: "Credenciales incorrectas",
  deleteProduct: "No se pudo eliminar el producto",
  deletePromotion: "No se pudo eliminar la promoción",
};

export const toastMiddleware: Middleware = () => (next) => (action) => {
  const result = next(action);

  const type = (action as { type?: string }).type;
  if (!type || typeof type !== "string") return result;

  // Nunca mostrar toasts por lecturas (GET / RTK executeQuery).
  if (type.includes("executeQuery")) return result;

  if (!type.includes("executeMutation")) return result;

  const endpointName = (action as { meta?: { arg?: { endpointName?: string } } })?.meta?.arg
    ?.endpointName as string | undefined;
  if (!endpointName || SILENT_MUTATIONS.has(endpointName)) return result;

  if (type.endsWith("/fulfilled")) {
    if (!areMutationToastsSuppressed()) {
      const message = SUCCESS_MESSAGES[endpointName];
      if (message) toast.success(message);
    }
    return result;
  }

  if (type.endsWith("/rejected")) {
    if (areMutationToastsSuppressed()) return result;
    const payload = (action as { payload?: Record<string, unknown> }).payload;
    const serverMessage =
      (payload?.data as { message?: string } | undefined)?.message ??
      (payload?.data as { error?: string } | undefined)?.error ??
      (payload as { error?: string } | undefined)?.error ??
      (payload as { message?: string } | undefined)?.message ??
      null;
    const message = serverMessage ?? ERROR_MESSAGES[endpointName] ?? "Ocurrió un error";
    toast.error(typeof message === "string" ? message : "Ocurrió un error");
  }

  return result;
};
