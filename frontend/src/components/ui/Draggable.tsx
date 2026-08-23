import { useEffect, useRef, useState, type ReactNode } from "react";

/* ── Draggable HUD panel ──────────────────────────────────────────
 * Wraps any absolutely-positioned HUD box and makes it draggable by
 * a small ⠿ grip handle (so buttons / scrollable content inside keep
 * working). Positions persist to localStorage and are clamped to the
 * viewport; lifting a panel brings it to the front.
 */

export interface PanelPos {
  x: number;
  y: number;
}

const storageKey = (id: string) => `cc-panel-pos:${id}`;
let Z_TOP = 40;

function loadSaved(id: string): PanelPos | null {
  try {
    const raw = localStorage.getItem(storageKey(id));
    if (!raw) return null;
    const p = JSON.parse(raw) as PanelPos;
    return typeof p.x === "number" && typeof p.y === "number" ? p : null;
  } catch {
    return null;
  }
}

function clamp(p: PanelPos, el: HTMLElement | null): PanelPos {
  const w = el?.offsetWidth ?? 240;
  const h = el?.offsetHeight ?? 120;
  const maxX = Math.max(8, window.innerWidth - w - 8);
  const maxY = Math.max(8, window.innerHeight - h - 8);
  return {
    x: Math.min(Math.max(8, p.x), maxX),
    y: Math.min(Math.max(8, p.y), maxY),
  };
}

interface DraggablePanelProps {
  /** unique key for position persistence */
  id: string;
  initial: PanelPos;
  /** extra classes for the outer box (width, layout…) */
  className?: string;
  /** text shown on the grip handle */
  label?: string;
  children: ReactNode;
}

export function DraggablePanel({ id, initial, className = "", label = "DRAG", children }: DraggablePanelProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PanelPos>(() => loadSaved(id) ?? initial);
  const [z, setZ] = useState(() => ++Z_TOP);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  // keep the panel on-screen (also right after mount)
  useEffect(() => {
    setPos((p) => clamp(p, boxRef.current));
    const onResize = () => setPos((p) => clamp(p, boxRef.current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const box = boxRef.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setPos(
      clamp(
        { x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy },
        boxRef.current,
      ),
    );
  };

  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    e.currentTarget.releasePointerCapture(e.pointerId);
    try {
      const el = boxRef.current;
      if (el) localStorage.setItem(storageKey(id), JSON.stringify({ x: el.offsetLeft, y: el.offsetTop }));
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <div
      ref={boxRef}
      style={{ left: pos.x, top: pos.y, zIndex: z }}
      className={`pointer-events-auto absolute ${className}`}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        title={`Drag to move ${label.toLowerCase()}`}
        className="mb-1 flex w-fit cursor-grab touch-none select-none items-center gap-1 rounded-md border border-black-ink/20 bg-black-ink/85 px-2 py-0.5 font-mono text-[9px] leading-none tracking-widest text-paper/90 transition-colors hover:bg-signal active:cursor-grabbing"
      >
        <span aria-hidden>⠿</span> {label}
      </div>
      {children}
    </div>
  );
}

/** Default anchor helpers — mirror the pre-drag fixed layout. */
export const fromRight = (y: number, width = 320, margin = 12): PanelPos => ({
  x: Math.max(8, window.innerWidth - width - margin),
  y,
});

export const bottomLeft = (offsetUp = 60): PanelPos => ({
  x: 12,
  y: Math.max(8, window.innerHeight - offsetUp),
});
