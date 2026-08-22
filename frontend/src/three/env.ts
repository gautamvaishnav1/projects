export const ENV = { night: 0.6, rain: 0, snow: 0, fog: 0, wind: 0.2, cloud: 0.15, wet: 0, storm: 0 };
export const TIME = { value: 0 };
export const WIND = { value: 0.2 };
export type Weather = "clear" | "drizzle" | "rain" | "storm" | "snow" | "fog";
export const PRESETS: Record<Weather, { rain: number; snow: number; fog: number; wind: number; cloud: number }> = {
  clear:   { rain: 0,    snow: 0, fog: 0,   wind: 0.2, cloud: 0.15 },
  drizzle: { rain: 0.35, snow: 0, fog: 0.03, wind: 0.35, cloud: 0.45 },
  rain:    { rain: 0.75, snow: 0, fog: 0.05, wind: 0.5, cloud: 0.65 },
  storm:   { rain: 1,    snow: 0, fog: 0.09, wind: 1,   cloud: 1 },
  snow:    { rain: 0,    snow: 1, fog: 0.04, wind: 0.3, cloud: 0.5 },
  fog:     { rain: 0,    snow: 0, fog: 1,   wind: 0.1, cloud: 0.3 },
};
