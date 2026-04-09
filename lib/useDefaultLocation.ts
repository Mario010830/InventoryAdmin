"use client";

import { useAppSelector } from "@/store/store";

interface LocationLike {
  id: number;
  name: string;
}

interface DefaultLocationResult {
  locationId: number | null;
  locationName: string | null;
  isSingle: boolean;
}

/**
 * Returns a sensible default location based on the available locations list
 * and the current user's assigned location.
 *
 * Priority:
 * 1. If only one location exists in the list -> return it (isSingle = true).
 * 2. If the user has an assigned locationId -> return it as a default (isSingle = false).
 * 3. Otherwise -> null.
 */
export function useDefaultLocation(
  locations: LocationLike[],
): DefaultLocationResult {
  const user = useAppSelector((s) => s.auth);

  if (locations.length === 1) {
    return {
      locationId: locations[0].id,
      locationName: locations[0].name,
      isSingle: true,
    };
  }

  if (user?.locationId && user?.location) {
    return {
      locationId: user.locationId,
      locationName: user.location.name,
      isSingle: false,
    };
  }

  return { locationId: null, locationName: null, isSingle: false };
}
