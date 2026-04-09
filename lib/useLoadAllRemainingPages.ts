import { useEffect } from "react";

type PaginationSlice = { currentPage?: number; totalPages?: number };

/**
 * Tras cada respuesta paginada, si quedan páginas en el API pide la siguiente
 * automáticamente hasta acumular **todas** las filas.
 *
 * Así la búsqueda y filtros en cliente aplican al conjunto completo y
 * «Seleccionar todo» en DataTable incluye todas las entidades, no solo las
 * ya visibles por scroll infinito.
 */
export function useLoadAllRemainingPages({
  isFetching,
  pagination,
  loadNextPage,
}: {
  isFetching: boolean;
  pagination: PaginationSlice | null | undefined;
  loadNextPage: () => void;
}) {
  useEffect(() => {
    if (!pagination || isFetching) return;
    const cur = pagination.currentPage ?? 1;
    const total = pagination.totalPages ?? 1;
    if (cur < total) loadNextPage();
  }, [
    isFetching,
    pagination?.currentPage,
    pagination?.totalPages,
    loadNextPage,
    pagination,
  ]);
}

/** Tamaño de página al listar: menos viajes de red que con 10 filas por petición. */
export const SEARCH_TABLE_CHUNK_PAGE_SIZE = 100;

export const TABLE_SEARCH_DEBOUNCE_MS = 350;

/**
 * @deprecated Usar `useLoadAllRemainingPages` (mismo comportamiento: siempre carga todo).
 */
export function usePrefetchAllPagesWhileSearching({
  isSearchActive: _unused,
  ...rest
}: {
  isSearchActive: boolean;
  isFetching: boolean;
  pagination: PaginationSlice | null | undefined;
  loadNextPage: () => void;
}) {
  useLoadAllRemainingPages(rest);
}
