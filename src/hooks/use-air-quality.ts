import { queryOptions, useQuery } from "@tanstack/react-query";
import { getAirQuality } from "@/lib/air.functions";
import type { Place } from "@/lib/domain/profile";

export const airQualityQuery = (place: Pick<Place, "latitude" | "longitude">) =>
  queryOptions({
    queryKey: ["air-quality", place.latitude.toFixed(3), place.longitude.toFixed(3)],
    queryFn: () =>
      getAirQuality({ data: { latitude: place.latitude, longitude: place.longitude } }),
    staleTime: 15 * 60 * 1000,
    refetchInterval: 30 * 60 * 1000,
    retry: 1,
  });

export function useAirQuality(place: Pick<Place, "latitude" | "longitude">) {
  return useQuery(airQualityQuery(place));
}
