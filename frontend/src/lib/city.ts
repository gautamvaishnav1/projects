import { buildLayout } from "./layout";
import { SAMPLE_CITY } from "../data/sampleCity";

export const LAYOUT = buildLayout(SAMPLE_CITY);
export const CITY_EDGES = SAMPLE_CITY.edges;
