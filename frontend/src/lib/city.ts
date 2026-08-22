import { useMemo } from "react";
import { buildLayout } from "./layout";
import { useCity } from "../store/useCity";

/** Layout derived reactively from the active CityJSON in the store. */
export function useCityLayout() {
  const city = useCity((s) => s.city);
  return useMemo(() => buildLayout(city), [city]);
}
