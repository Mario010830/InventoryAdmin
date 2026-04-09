import type { FuseOptionKey } from "fuse.js";
import Fuse from "fuse.js";
import { useMemo } from "react";

export function useFuseSearch<T>(
  items: T[],
  keys: FuseOptionKey<T>[],
  query: string,
): T[] {
  const fuse = useMemo(
    () =>
      new Fuse(items, {
        keys,
        threshold: 0.4,
        distance: 100,
        includeScore: true,
        ignoreLocation: true,
        useExtendedSearch: false,
      }),
    [items],
  );

  return useMemo(() => {
    if (!query.trim()) return items;
    return fuse.search(query).map((result) => result.item);
  }, [fuse, query, items]);
}
