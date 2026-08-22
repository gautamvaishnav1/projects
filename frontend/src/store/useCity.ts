import { create } from "zustand";
import type { CityJSON } from "../types";
import { SAMPLE_CITY } from "../data/sampleCity";
import type { Weather } from "../three/env";

export interface HealthEvent {
  id: number;
  buildingId: string;
  name: string;
  kind: "error" | "warn" | "recovered";
  detail: string;
  at: number;
}

interface S {
  city: CityJSON;
  selectedId: string | null;
  selectedFn: string | null;
  focus: { x: number; z: number; key: number } | null;
  traffic: boolean;
  underground: boolean;
  following: boolean;
  failing: boolean;
  links: boolean;
  /** REAL round-trip latency of the last API call, in ms */
  apiLatencyMs: number | null;
  /** derived traffic speed preset — kept for car speeds */
  latency: "fast" | "medium" | "slow";
  // weather / time-of-day (starlight engine)
  weather: Weather;
  time: number;
  autoCycle: boolean;
  live: boolean;
  sound: boolean;
  // main-branch additions (auth shell, analyzer, traces)
  analyzing: boolean;
  failingId: string | null;
  traceSteps: string[];
  traceStep: number;
  notifications: {
    id: number;
    text: string;
    target?: string;
    type: "info" | "success" | "error";
  }[];
  /** broken-pipeline feed — powers top-right alert dialogs + floating pins */
  healthEvents: HealthEvent[];
  select: (id: string | null, fn?: string | null) => void;
  setFocus: (x: number, z: number) => void;
  patch: (p: Partial<S>) => void;
  notify: (text: string, target?: string, type?: "info" | "success" | "error") => void;
  dismiss: (id: number) => void;
  setCity: (city: CityJSON) => void;
  recordLatency: (ms: number) => void;
  pushHealth: (e: Omit<HealthEvent, "id" | "at">) => void;
}

let nid = 1;
let hid = 1;

const speedFor = (ms: number | null): "fast" | "medium" | "slow" =>
  ms == null ? "fast" : ms < 250 ? "fast" : ms < 900 ? "medium" : "slow";

/** derive broken-pipeline events from a city's building health flags */
function healthFromCity(city: CityJSON): HealthEvent[] {
  const out: HealthEvent[] = [];
  for (const d of city.districts) {
    for (const b of d.buildings) {
      if (b.health === "ok") continue;
      out.push({
        id: hid++,
        buildingId: b.id,
        name: b.name,
        kind: b.health === "error" ? "error" : "warn",
        detail:
          b.health === "error"
            ? `pipeline down · ${d.name}`
            : `degraded responses · ${d.name}`,
        at: Date.now(),
      });
    }
  }
  return out;
}

export const useCity = create<S>()((set) => ({
  city: SAMPLE_CITY,
  selectedId: null,
  selectedFn: null,
  focus: null,
  traffic: true,
  underground: false,
  following: false,
  failing: false,
  links: true,
  apiLatencyMs: null,
  latency: "fast",
  weather: "clear",
  time: 19.5,
  autoCycle: false,
  live: false,
  sound: false,
  analyzing: false,
  failingId: null,
  traceSteps: [],
  traceStep: -1,
  notifications: [],
  healthEvents: healthFromCity(SAMPLE_CITY),
  select: (id, fn = null) => set({ selectedId: id, selectedFn: fn }),
  setFocus: (x, z) =>
    set((s) => ({ focus: { x, z, key: (s.focus?.key ?? 0) + 1 } })),
  patch: (p) => set(p),
  recordLatency: (ms) =>
    set({ apiLatencyMs: Math.round(ms), latency: speedFor(ms) }),
  pushHealth: (e) =>
    set((s) => ({
      healthEvents: [...s.healthEvents.slice(-11), { ...e, id: hid++, at: Date.now() }],
    })),
  notify: (text, target, type = "info") => {
    const id = nid++;
    set((s) => ({
      notifications: [...s.notifications.slice(-4), { id, text, target, type }],
    }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 6000);
  },
  dismiss: (id: number) =>
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
      healthEvents: s.healthEvents.filter((n) => n.id !== id),
    })),
  setCity: (city) =>
    set({
      city,
      selectedId: null,
      selectedFn: null,
      focus: null,
      failing: false,
      failingId: null,
      following: false,
      traceSteps: [],
      traceStep: -1,
      healthEvents: healthFromCity(city),
    }),
}));

export const followTarget = { active: false, x: 0, z: 0 };
