import { create } from "zustand";

interface S {
  selectedId: string | null;
  selectedFn: string | null;
  focus: { x: number; z: number; key: number } | null;
  traffic: boolean;
  underground: boolean;
  following: boolean;
  failing: boolean;
  links: boolean;
  latency: "fast" | "medium" | "slow";
  notifications: { id: number; text: string; target?: string }[];
  select: (id: string | null, fn?: string | null) => void;
  setFocus: (x: number, z: number) => void;
  patch: (p: Partial<S>) => void;
  notify: (text: string, target?: string) => void;
}

let nid = 1;

export const useCity = create<S>()((set) => ({
  selectedId: null,
  selectedFn: null,
  focus: null,
  traffic: true,
  underground: false,
  following: false,
  failing: false,
  links: true,
  latency: "fast",
  notifications: [],
  select: (id, fn = null) => set({ selectedId: id, selectedFn: fn }),
  setFocus: (x, z) =>
    set((s) => ({ focus: { x, z, key: (s.focus?.key ?? 0) + 1 } })),
  patch: (p) => set(p),
  notify: (text, target) => {
    const id = nid++;
    set((s) => ({ notifications: [...s.notifications.slice(-4), { id, text, target }] }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, 8000);
  },
}));

export const followTarget = { active: false, x: 0, z: 0 };
