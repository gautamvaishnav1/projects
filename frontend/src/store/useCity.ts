import { create } from "zustand";
import type { CityJSON } from "../types";
import { SAMPLE_CITY } from "../data/sampleCity";

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
  select: (id: string | null, fn?: string | null) => void;
  setFocus: (x: number, z: number) => void;
  patch: (p: Partial<S>) => void;
  notify: (text: string, target?: string, type?: "info" | "success" | "error") => void;
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
  analyzing: false,
  failingId: null,
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
    }, 8000);
  },
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
    }),
}));

export const followTarget = { active: false, x: 0, z: 0 };
