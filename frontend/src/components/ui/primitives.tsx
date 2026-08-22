import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { motion, useInView, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/* ── Reveal: blur-up scroll entrance ─────────────────────────────── */
export function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 24, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Button ──────────────────────────────────────────────────────── */
const BTN_VARIANTS = {
  primary:
    "bg-gradient-to-r from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8] text-[#0b1222] font-bold ring-1 ring-white/60 shadow-[0_0_24px_rgba(226,232,240,.5),inset_0_1px_0_rgba(255,255,255,.9)] hover:brightness-110 hover:-translate-y-px active:scale-[.97]",
  glass: "cc-glass text-slate-200 hover:border-cyan-400/50 hover:-translate-y-px active:scale-[.97]",
  ghost: "text-slate-400 hover:text-white hover:bg-white/5 active:scale-[.97]",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BTN_VARIANTS;
  magnetic?: boolean;
};

export function Button({ variant = "primary", magnetic = false, className = "", ...rest }: ButtonProps) {
  const el = (
    <button
      {...rest}
      className={`group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg0 [&_svg]:transition-transform group-hover:[&_svg]:translate-x-0.5 ${BTN_VARIANTS[variant]} ${className}`}
    />
  );
  return magnetic ? <Magnetic>{el}</Magnetic> : el;
}

/* ── Chip ────────────────────────────────────────────────────────── */
export function Chip({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-xs text-slate-300 ${className}`}>
      {children}
    </span>
  );
}

/* ── Glass card with cursor-tracked border spotlight + subtle tilt ─ */
export function GlassCard({
  children,
  className = "",
  tilt = true,
}: {
  children: ReactNode;
  className?: string;
  tilt?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;
    el.style.setProperty("--mx", `${mx}px`);
    el.style.setProperty("--my", `${my}px`);
    if (tilt && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const rx = (my / r.height - 0.5) * -4;
      const ry = (mx / r.width - 0.5) * 4;
      el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    }
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMouseMove}
      onMouseLeave={reset}
      className={`cc-glass cc-spot rounded-2xl transition-transform duration-200 ease-out ${className}`}
      style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,.06), 0 10px 36px rgba(0,0,0,.45)" }}
    >
      {children}
    </div>
  );
}

/* ── Magnetic pull toward cursor ─────────────────────────────────── */
export function Magnetic({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 300, damping: 28 });
  const sy = useSpring(y, { stiffness: 300, damping: 28 });

  if (reduced) return <>{children}</>;

  return (
    <motion.div
      style={{ x: sx, y: sy }}
      className="inline-block"
      onMouseMove={(e: React.MouseEvent) => {
        const r = e.currentTarget.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy) || 1;
        const f = Math.max(0, 1 - len / 90) * 6;
        x.set((dx / len) * f);
        y.set((dy / len) * f);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/* ── Section heading ─────────────────────────────────────────────── */
export function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <Reveal className="mx-auto mb-12 max-w-2xl text-center">
      <Chip className="mb-4">{eyebrow}</Chip>
      <h2 className="font-display text-3xl font-bold tracking-wide text-white md:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-sm leading-relaxed text-slate-400 md:text-base">{sub}</p>}
    </Reveal>
  );
}

/* ── Scramble decode text ────────────────────────────────────────── */
const CHARS = "01<>/{}#$";

export function ScrambleText({ text, className = "" }: { text: string; className?: string }) {
  const reduced = useReducedMotion();
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (reduced) return;
    const words = text.split(" ");
    let frame = 0;
    let raf = 0;
    const doneFrames = words.reduce((a, w) => a + w.length + 6, 0);
    const tick = () => {
      frame += 1;
      setOut(
        words
          .map((w, wi) => {
            const start = wi * 6;
            const local = Math.max(0, Math.min(frame - start, w.length));
            return (
              w.slice(0, local) +
              w.slice(local).replace(/./g, () => CHARS[(Math.random() * CHARS.length) | 0])
            );
          })
          .join(" "),
      );
      if (frame < doneFrames) raf = requestAnimationFrame(tick);
      else setOut(text);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, reduced]);

  return (
    <span className={className} aria-label={text}>
      {out}
    </span>
  );
}

/* ── Marquee ticker ──────────────────────────────────────────────── */
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="cc-marquee relative overflow-hidden border-y border-white/5 py-5 [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
      <div className="cc-marquee-track">
        {row.map((it, i) => (
          <span key={i} className="flex items-center gap-3 whitespace-nowrap font-mono text-sm uppercase tracking-[0.18em] text-slate-500">
            <span className="h-1 w-1 rounded-full bg-cyan-400/70" />
            {it}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Count-up on view ────────────────────────────────────────────── */
export function Counter({
  to,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  to: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const t0 = performance.now();
    const dur = 1200;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(to * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, to]);

  return (
    <span ref={ref} className="font-mono">
      {prefix}
      {val.toFixed(decimals)}
      {suffix}
    </span>
  );
}
