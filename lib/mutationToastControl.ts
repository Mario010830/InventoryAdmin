/**
 * Desactiva los toasts automáticos del toastMiddleware para mutaciones RTK
 * (createProduct, updateProduct, etc.) mientras depth > 0.
 * Usar en bucles bulk / importación para evitar N notificaciones idénticas.
 */
let suppressDepth = 0;

export function beginSuppressMutationToasts(): void {
  suppressDepth++;
}

export function endSuppressMutationToasts(): void {
  suppressDepth = Math.max(0, suppressDepth - 1);
}

export function areMutationToastsSuppressed(): boolean {
  return suppressDepth > 0;
}

export async function withSuppressedMutationToasts<T>(
  fn: () => Promise<T>,
): Promise<T> {
  beginSuppressMutationToasts();
  try {
    return await fn();
  } finally {
    endSuppressMutationToasts();
  }
}
