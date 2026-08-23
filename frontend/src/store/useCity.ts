import { create } from "zustand";
import type { CityJSON } from "../types";
import { SAMPLE_CITY } from "../data/sampleCity";
import type { Weather } from "../three/env";

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
  // live backend session — set when a real repo city is loaded
  projectId: string | null;
  analysisId: string | null;
  chatLoading: boolean;
  aiAnswer: string | null;
  traceSteps: string[];
  traceStep: number;
  notifications: {
    id: number;
    text: string;
    target?: string;
    type: "info" | "success" | "error";
  }[];
  select: (id: string | null, fn?: string | null) => void;
  setFocus: (x: number, z: number) => void;
  patch: (p: Partial<S>) => void;
  notify: (text: string, target?: string, type?: "info" | "success" | "error") => void;
  dismiss: (id: number) => void;
  setCity: (city: CityJSON) => void;
}

let nid = 1;

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
  latency: "fast",
  weather: "clear",
  time: 19.5,
  autoCycle: false,
  live: false,
  sound: false,
  analyzing: false,
  failingId: null,
  projectId: null,
  analysisId: null,
  chatLoading: false,
  aiAnswer: null,
  traceSteps: [],
  traceStep: -1,
  notifications: [],
  select: (id, fn = null) => set({ selectedId: id, selectedFn: fn }),
  setFocus: (x, z) =>
    set((s) => ({ focus: { x, z, key: (s.focus?.key ?? 0) + 1 } })),
  patch: (p) => set(p),
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
    set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
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
      chatLoading: false,
      aiAnswer: null,
    }),
}));

export const followTarget = { active: false, x: 0, z: 0 };
