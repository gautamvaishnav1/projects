import { useEffect, useRef } from "react";

/** Slow drifting color blobs — place inside a relative section */
export function Aurora({ className = "" }: { className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="cc-aurora cc-aurora-a left-[-10%] top-[-25%] h-[46rem] w-[46rem]" />
      <div className="cc-aurora cc-aurora-b bottom-[-30%] right-[-12%] h-[42rem] w-[42rem]" />
    </div>
  );
}

/** Page-wide blueprint grid */
export function GridBG() {
  return <div aria-hidden className="cc-grid-bg pointer-events-none fixed inset-0 -z-10" />;
}

/** Analog grain overlay */
export function Noise() {
  return <div aria-hidden className="cc-noise pointer-events-none fixed inset-0 z-[70]" />;
}

/** Cyan cursor halo with lerped follow (desktop only) */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 3;
    let x = tx;
    let y = ty;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };
    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      if (ref.current) ref.current.style.transform = `translate3d(${x - 250}px, ${y - 250}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("mousemove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[4] hidden h-[500px] w-[500px] rounded-full md:block"
      style={{ background: "radial-gradient(circle, rgba(34,211,238,.06), transparent 62%)" }}
    />
  );
}
