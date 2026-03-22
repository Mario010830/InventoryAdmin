import { useEffect } from "react";

type PaginationSlice = { currentPage?: number; totalPages?: number };

/**
 * Con scroll infinito, la búsqueda solo ve filas ya cargadas. Mientras hay texto
 * de búsqueda (debounced en la página), pide la siguiente página al API hasta
 * acumular todo el conjunto; así el filtro en cliente puede encontrar cualquier fila.
 */
export function usePrefetchAllPagesWhileSearching({
  isSearchActive,
  isFetching,
  pagination,
  loadNextPage,
}: {
  isSearchActive: boolean;
  isFetching: boolean;
  pagination: PaginationSlice | null | undefined;
  loadNextPage: () => void;
}) {
  useEffect(() => {
    if (!isSearchActive || !pagination || isFetching) return;
    const cur = pagination.currentPage ?? 1;
    const total = pagination.totalPages ?? 1;
    if (cur < total) loadNextPage();
  }, [isSearchActive, isFetching, pagination?.currentPage, pagination?.totalPages, loadNextPage]);
}

/** Tamaño de página al buscar: menos viajes de red que con el pageSize normal. */
export const SEARCH_TABLE_CHUNK_PAGE_SIZE = 100;

export const TABLE_SEARCH_DEBOUNCE_MS = 350;
