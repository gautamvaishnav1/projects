import { create } from "zustand";
import type { Weather } from "../three/env";

interface S {
  selectedId: string | null; selectedFn: string | null;
  focus: { x: number; z: number; key: number } | null;
  traffic: boolean; underground: boolean; following: boolean; failing: boolean; links: boolean;
  latency: "fast" | "medium" | "slow";
  weather: Weather; time: number; autoCycle: boolean; live: boolean; sound: boolean;
  notifications: { id: number; text: string; target?: string }[];
  select: (id: string | null, fn?: string | null) => void;
  setFocus: (x: number, z: number) => void;
  patch: (p: Partial<S>) => void;
  notify: (text: string, target?: string) => void;
  dismiss: (id: number) => void;
}
let nid = 1;
export const useCity = create<S>((set) => ({
  selectedId: null, selectedFn: null, focus: null,
  traffic: true, underground: false, following: false, failing: false, links: true,
  latency: "fast", weather: "clear", time: 19.5, autoCycle: false, live: false, sound: false,
  notifications: [],
  select: (id, fn = null) => set({ selectedId: id, selectedFn: fn }),
  setFocus: (x, z) => set((s) => ({ focus: { x, z, key: (s.focus?.key ?? 0) + 1 } })),
  patch: (p) => set(p),
  notify: (text, target) => set((s) => ({ notifications: [...s.notifications.slice(-3), { id: nid++, text, target }] })),
  dismiss: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));
export const followTarget = { active: false, x: 0, z: 0 };
