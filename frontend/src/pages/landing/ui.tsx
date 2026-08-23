import { useEffect, useRef, useState, type ReactNode } from "react";

/* ── hooks ───────────────────────────────────────────────────────── */

export function useInView<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return [ref, seen] as const;
}

export function useCountUp(target: number, run: boolean, ms = 1400) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min((t - t0) / ms, 1);
      setV(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, target, ms]);
  return v;
}

export function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setP(max > 0 ? h.scrollTop / max : 0);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return p;
}

/* ── reveal wrapper — print-wipe entrance ────────────────────────── */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.12);
  return (
    <div
      ref={ref}
      className={`reveal ${seen ? "in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ── sticky folio header + reading-progress feed bar ─────────────── */

export function FolioBar({ mark, onLaunch }: { mark: string; onLaunch: () => void }) {
  const p = useScrollProgress();
  const [lifted, setLifted] = useState(false);
  useEffect(() => {
    const on = () => setLifted(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <div className={`sticky top-0 z-50 bg-paper ${lifted ? "shadow-[0_1px_0_rgba(20,20,20,.28)]" : ""}`}>
      <div className="sheet flex items-center justify-between gap-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden className="misreg inline-block h-3 w-3 shrink-0 rounded-full bg-signal" />
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.22em]">{mark}</p>
        </div>
        <div className="flex items-center gap-5">
          <LiveStatChip />
          <button type="button" onClick={onLaunch} className="btn-print solid !px-4 !py-2 !text-[10px]">
            Launch ▸
          </button>
        </div>
      </div>
      <div aria-hidden className="h-[2px] w-full bg-black-ink/10">
        <div className="h-full origin-left bg-signal" style={{ transform: `scaleX(${p})` }} />
      </div>
    </div>
  );
}

/* ── ABB. 01 — Bahnhofsuhr, sweeping second hand (SBB pause at 12) ─ */

export function StationClock() {
  const sec = useRef<SVGGElement>(null);
  const min = useRef<SVGGElement>(null);
  const hr = useRef<SVGGElement>(null);
  const last = useRef("");
  const [label, setLabel] = useState("--:--");

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const n = new Date();
      const frac = (n.getSeconds() * 1000 + n.getMilliseconds()) / 60000;
      const sweep = Math.min(frac / 0.975, 1); // full turn ≈58.5s, holds at 12
      sec.current?.setAttribute("transform", `rotate(${sweep * 360} 100 100)`);
      min.current?.setAttribute("transform", `rotate(${n.getMinutes() * 6 + sweep * 6} 100 100)`);
      hr.current?.setAttribute(
        "transform",
        `rotate(${((n.getHours() % 12) + n.getMinutes() / 60) * 30} 100 100)`,
      );
      const l = `${String(n.getHours()).padStart(2, "0")}:${String(n.getMinutes()).padStart(2, "0")}`;
      if (l !== last.current) {
        last.current = l;
        setLabel(l);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <figure>
      <div className="border-[1.5px] border-black-ink p-1.5">
        <div className="relative border border-black-ink/50 bg-paper-deep p-4 md:p-5">
          <svg viewBox="0 0 200 200" role="img" aria-label={`Station clock, ${label}`} className="block w-full">
            <circle cx="100" cy="100" r="86" fill="#f6f2e1" stroke="#141414" strokeWidth="11" />
            {Array.from({ length: 60 }).map((_, i) => (
              <rect key={`t${i}`} x="99.4" y="18" width="1.2" height="7" fill="#141414" opacity="0.32" transform={`rotate(${i * 6} 100 100)`} />
            ))}
            {Array.from({ length: 12 }).map((_, i) => (
              <rect key={`b${i}`} x="98.4" y="16" width="3.2" height="13" fill="#141414" transform={`rotate(${i * 30} 100 100)`} />
            ))}
            <g ref={hr}>
              <rect x="95.5" y="46" width="9" height="56" fill="#141414" />
            </g>
            <g ref={min}>
              <rect x="97.75" y="20" width="4.5" height="82" fill="#141414" />
            </g>
            <g ref={sec}>
              <line x1="100" y1="126" x2="100" y2="24" stroke="#e30613" strokeWidth="3" />
              <circle cx="100" cy="30" r="8" fill="#e30613" />
            </g>
            <circle cx="100" cy="100" r="5.5" fill="#e30613" />
            <circle cx="100" cy="100" r="1.8" fill="#141414" />
          </svg>
          <div aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-35 mix-blend-multiply" />
        </div>
      </div>
      <figcaption className="flex items-baseline justify-between gap-4 pt-3">
        <span className="caption-caps font-bold">FIG. 01 — STATION CLOCK</span>
        <span className="caption-caps text-black-ink/55 tabular-nums">{label} · HALFTONE 60/LPI</span>
      </figcaption>
    </figure>
  );
}

/* ── FIG. 02 — the product, printed: code-city elevation model ───── */

const BLDGS: Array<[number, number, number, boolean?]> = [
  // x, w, h, signal?
  [22, 26, 64], [52, 20, 44], [76, 30, 96, true], [110, 22, 56],
  [136, 26, 78], [166, 34, 118, true], [204, 24, 62], [232, 28, 88],
  [264, 22, 48],
];

export function MiniCity() {
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  return (
    <figure>
      <div className="border-[1.5px] border-black-ink p-1.5">
        <div className="relative bg-paper-deep p-4 md:p-5">
          <div ref={ref}>
            <svg viewBox="0 0 320 210" role="img" aria-label="CodeCity elevation model" className={`block w-full ${seen ? "city-live" : ""}`}>
              {/* street grid */}
              <line x1="0" y1="182" x2="320" y2="182" stroke="#141414" strokeWidth="2.5" />
              {[46, 104, 162, 220, 278].map((x) => (
                <line key={x} x1={x} y1="182" x2={x} y2="196" stroke="#141414" strokeWidth="1.5" strokeDasharray="4 4" />
              ))}
              {/* buildings — rise when scrolled into view */}
              {BLDGS.map(([x, w, h, sig], i) => (
                <g key={i} className="bld" style={{ ["--i" as string]: i }}>
                  <rect x={x} y={182 - h} width={w} height={h} fill={sig ? "#e30613" : "#141414"} />
                  {!sig &&
                    Array.from({ length: Math.floor(h / 18) }).map((_, r) => (
                      <rect key={r} x={x + 4} y={182 - h + 8 + r * 18} width={w - 8} height="5" fill="#f2efe3" opacity="0.85" />
                    ))}
                </g>
              ))}
              {/* request traffic — one red pulse looping the street */}
              <circle r="4" fill="#e30613" className="city-car">
                <animateMotion dur="9s" repeatCount="indefinite" path="M0 189 H320" />
              </circle>
              <circle r="2.5" fill="#141414" className="city-car">
                <animateMotion dur="9s" begin="-4.5s" repeatCount="indefinite" path="M320 189 H0" />
              </circle>
              {/* district tags */}
              <text x="30" y="205" className="city-tag">FE</text>
              <text x="150" y="205" className="city-tag">BE</text>
              <text x="250" y="205" className="city-tag">DB</text>
            </svg>
          </div>
          <div aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-25 mix-blend-multiply" />
        </div>
      </div>
      <figcaption className="flex items-baseline justify-between gap-4 pt-3">
        <span className="caption-caps font-bold">FIG. 02 — THE PRODUCT, PRINTED</span>
        <span className="caption-caps text-black-ink/55">FILES AS BUILDINGS · REQUESTS IN TRANSIT</span>
      </figcaption>
    </figure>
  );
}

/* ── ticker band between sections ────────────────────────────────── */

export function TickerBand({ phrase }: { phrase: string }) {
  const cells = Array.from({ length: 8 });
  return (
    <div className="overflow-hidden border-y-[3px] border-black-ink bg-black-ink py-2.5 text-paper" aria-hidden>
      <div className="cc-marquee-track">
        {[0, 1].map((half) => (
          <div key={half} className="flex shrink-0 gap-12 pr-12">
            {cells.map((_, i) => (
              <span key={i} className="caption-caps whitespace-nowrap font-bold">
                {phrase} <span className="ml-12 text-signal">●</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── live stat chip — rotating product numbers beside Launch ─────── */
const CHIP_STATS = [
  ["FILES MAPPED", "1,284"],
  ["STREETS BUILT", "2,140"],
  ["ONBOARDING", "4 DAYS"],
];
export function LiveStatChip() {
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setK((v) => (v + 1) % CHIP_STATS.length), 3200);
    return () => window.clearInterval(id);
  }, []);
  const [label, val] = CHIP_STATS[k];
  return (
    <span className="hidden items-baseline gap-2 sm:flex">
      <span aria-hidden className="misreg inline-block h-1.5 w-1.5 rounded-full bg-signal" />
      <span key={k} className="stat-swap caption-caps font-bold">
        {label} <span className="ml-1 text-signal tabular-nums">{val}</span>
      </span>
    </span>
  );
}

/* ── teletype — the analyzer at work, printed live ───────────────── */
const TT_LINES: Array<[string, string]> = [
  ["$ codecity analyze github.com/acme/payments", ""],
  ["> cloning repository", "ok"],
  ["> parsing 1,284 files · 6 languages", "ok"],
  ["> districts — frontend 24 · backend 31 · db 7", "ok"],
  ["> tallest: PaymentController.ts (2,140 LOC)", "ok"],
  ["> streets: 2,140 dependencies wired", "ok"],
  ["✓ city ready in 8.2s — press LAUNCH", ""],
];

export function AtlasPlate() {
  // honor reduced-motion: freeze the route dots for those who ask
  const [reduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  /* ── geometry: four district slabs, buildings on a shared lot grid ──
     slab i: y = 60 + i*120, height 104 → 60..164 / 180..284 / 300..404 / 420..524
     buildings: x = 150 + i*155 (w 138) → 150..288 / 305..443 / 460..598 / 615..753
     corridors: left x=60 · right x=762 (req) / x=770 (res express)
     route horizontals ride BELOW the buildings: slabY + 93 (req) / +99 (res) */

  /* the request's route — a clean serpentine through the corridors */
  const REQ =
    "M 60 47 L 60 153 L 762 153 L 762 273 L 60 273 L 60 393 L 762 393 L 762 513 L 401 513";
  /* the response climbs straight back up the east margin — one express line */
  const RES = "M 434 506 L 770 506 L 770 47 L 522 47";

  const bands = [
    { n: "01", name: "CLIENT", tech: "REACT", y: 60, boxes: [
      ["BROWSER", "index.html · root"],
      ["REACT APP", "router · state"],
      ["COMPONENTS", "Navbar · Card · Cart"],
      ["API CLIENT", "axios · SWR"],
    ]},
    { n: "02", name: "SERVER", tech: "EXPRESS", y: 180, boxes: [
      ["EXPRESS", "app · server.js"],
      ["MIDDLEWARE", "auth · cors · morgan"],
      ["ROUTES", "/api/products · /cart"],
      ["CONTROLLER", "req → res handlers"],
    ]},
    { n: "03", name: "RUNTIME", tech: "NODE", y: 300, boxes: [
      ["NODE.JS", "v20 · libuv"],
      ["EVENT LOOP", "non-blocking I/O"],
      ["SERVICES", "pricing · inventory"],
      ["VALIDATION", "zod schemas"],
    ]},
    { n: "04", name: "DATA", tech: "MONGODB", y: 420, boxes: [
      ["MONGOOSE", "ODM · queries"],
      ["MODELS", "Product · User · Order"],
      ["MONGODB ATLAS", "replica set · indexes", true],
      ["AGGREGATIONS", "pipelines · cache"],
    ]},
  ] as const;

  return (
    <figure>
      <div className="border-[1.5px] border-black-ink bg-paper-deep p-1.5 shadow-[6px_6px_0_rgba(20,20,20,.18)]">
        <svg viewBox="0 0 800 600" role="img"
          aria-label="City-plan map of the MERN stack: a request descends through Client, Server, Runtime and Data districts; the response climbs back out"
          className="block h-auto w-full select-none">
          <defs>
            <marker id="atlas-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#e30613" />
            </marker>
          </defs>

          {/* ── surveyor's grid ── */}
          <g stroke="#141414" strokeOpacity="0.07">
            {Array.from({ length: 19 }, (_, i) => (
              <line key={`v${i}`} x1={(i + 1) * 40} y1={0} x2={(i + 1) * 40} y2={600} />
            ))}
            {Array.from({ length: 14 }, (_, i) => (
              <line key={`h${i}`} x1={0} y1={(i + 1) * 40} x2={800} y2={(i + 1) * 40} />
            ))}
          </g>

          {/* ── plate furniture: coordinates + title ── */}
          <g fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#141414" opacity="0.5">
            {["A", "B", "C", "D", "E", "F", "G", "H"].map((c, i) => (
              <text key={c} x={100 + i * 88} y={596} textAnchor="middle">{c}</text>
            ))}
            {["1", "2", "3", "4"].map((c, i) => (
              <text key={c} x={10} y={120 + i * 120}>{c}</text>
            ))}
          </g>
          <text x="260" y="24" textAnchor="middle" fontFamily="Archivo, sans-serif" fontWeight="900" fontSize="17" fill="#141414" letterSpacing="1">
            MERN STACK — CITY PLAN
          </text>

          {/* ── the four districts ── */}
          {bands.map((b) => (
            <g key={b.n}>
              {/* district slab */}
              <rect x="26" y={b.y} width="748" height="104" fill="#141414" fillOpacity="0.035" stroke="#141414" strokeOpacity="0.35" strokeWidth="1" />
              {/* district label — on the building grid, clear of the west corridor */}
              <text x="150" y={b.y + 16} fontFamily="Archivo, sans-serif" fontWeight="900" fontSize="11" fill="#141414" letterSpacing="1.5">
                {b.n} · {b.name}
                <tspan fill="#e30613"> — {b.tech}</tspan>
              </text>
              {/* buildings */}
              {b.boxes.map(([name, sub, hot], i) => {
                const x = 150 + i * 155;
                return (
                  <g key={name} className="atlas-bldg">
                    <rect x={x} y={b.y + 24} width="138" height="60"
                      fill={hot ? "#e30613" : "#f7f4e8"}
                      stroke="#141414" strokeWidth={hot ? 2 : 1.4} />
                    {/* roof tick — print-map building mark */}
                    <line x1={x + 6} y1={b.y + 24} x2={x + 6} y2={b.y + 32} stroke={hot ? "#f7f4e8" : "#141414"} strokeWidth="2" />
                    <text x={x + 12} y={b.y + 46} fontFamily="Archivo, sans-serif" fontWeight="700" fontSize="11.5"
                      fill={hot ? "#f7f4e8" : "#141414"} letterSpacing="0.5">{name}</text>
                    <text x={x + 12} y={b.y + 62} fontFamily="JetBrains Mono, monospace" fontSize="8.5"
                      fill={hot ? "#f7f4e8" : "#141414"} opacity={hot ? 0.85 : 0.6}>{sub}</text>
                    <title>{name} — {sub}</title>
                  </g>
                );
              })}
            </g>
          ))}

          {/* ── routes ride the corridors, never through a building ── */}
          <path d={REQ} fill="none" stroke="#e30613" strokeWidth="2.4" strokeLinejoin="round" />
          <path d={RES} fill="none" stroke="#e30613" strokeWidth="1.6" strokeDasharray="7 5" strokeLinejoin="round" opacity="0.75" markerEnd="url(#atlas-arrow)" />

          {/* hop markers where the request changes layer */}
          {([[60, 153, 70, 149, "start"], [762, 273, 752, 269, "end"], [60, 393, 70, 389, "start"], [762, 513, 752, 509, "end"]] as const).map(([x, y, tx, ty, anchor], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="4.5" fill="#f7f4e8" stroke="#e30613" strokeWidth="2" />
              <text x={tx} y={ty} textAnchor={anchor}
                fontFamily="JetBrains Mono, monospace" fontSize="8.5" fontWeight="700" fill="#e30613">
                HOP {i + 1}
              </text>
            </g>
          ))}

          {/* endpoints */}
          <g fontFamily="JetBrains Mono, monospace" fontSize="9.5" fontWeight="700">
            <rect x="30" y="30" width="62" height="17" fill="#141414" />
            <text x="61" y="42" textAnchor="middle" fill="#f7f4e8">REQ ↓</text>
            <rect x="368" y="498" width="66" height="17" fill="#e30613" />
            <text x="401" y="510" textAnchor="middle" fill="#f7f4e8">MONGO</text>
            <rect x="404" y="30" width="118" height="17" fill="none" stroke="#e30613" strokeWidth="1.4" strokeDasharray="4 3" />
            <text x="463" y="42" textAnchor="middle" fill="#e30613">RES 200 ↑ 3.2s</text>
          </g>

          {/* ── the travelling packets ── */}
          {!reduced && (
            <>
              <circle r="5.5" fill="#e30613" stroke="#f7f4e8" strokeWidth="1.5">
                <animateMotion dur="7s" repeatCount="indefinite" path={REQ} />
              </circle>
              <circle r="4.5" fill="#f7f4e8" stroke="#e30613" strokeWidth="2">
                <animateMotion dur="7s" begin="3.5s" repeatCount="indefinite" path={RES} />
              </circle>
            </>
          )}

          {/* ── compass rose, bottom right ── */}
          <g transform="translate(762,560)">
            <circle r="16" fill="none" stroke="#141414" strokeWidth="1.2" />
            <path d="M 0 -13 L 4 4 L 0 1 L -4 4 Z" fill="#e30613" />
            <text y="-20" textAnchor="middle" fontFamily="Archivo, sans-serif" fontWeight="900" fontSize="11" fill="#141414">N</text>
          </g>

          {/* ── legend + scale bar ── */}
          <g transform="translate(28,556)" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#141414">
            <line x1="0" y1="0" x2="26" y2="0" stroke="#e30613" strokeWidth="2.4" />
            <text x="32" y="3">REQUEST</text>
            <line x1="104" y1="0" x2="130" y2="0" stroke="#e30613" strokeWidth="1.6" strokeDasharray="6 4" />
            <text x="136" y="3">RESPONSE</text>
            <rect x="216" y="-6" width="12" height="12" fill="#f7f4e8" stroke="#141414" strokeWidth="1.3" />
            <text x="234" y="3">MODULE</text>
            <rect x="300" y="-6" width="12" height="12" fill="#e30613" />
            <text x="318" y="3">DATASTORE</text>
            {/* scale bar */}
            <g transform="translate(420,0)">
              <line x1="0" y1="0" x2="120" y2="0" stroke="#141414" strokeWidth="1.4" />
              {[0, 30, 60, 90, 120].map((x) => (
                <line key={x} x1={x} y1="-4" x2={x} y2="4" stroke="#141414" strokeWidth="1.4" />
              ))}
              <text x="0" y="14" fontSize="8" opacity="0.6">0</text>
              <text x="104" y="14" fontSize="8" opacity="0.6">1 HOP</text>
            </g>
          </g>
        </svg>
      </div>
      <figcaption className="caption-caps mt-3 flex items-baseline justify-between gap-4 text-black-ink/45">
        <span>FIG. 05 — FULL-STACK MERN PLATE · ONE REQUEST, END TO END</span>
        <span className="hidden sm:block">8 HOPS · 4 DISTRICTS · LIVE ROUTE</span>
      </figcaption>
    </figure>
  );
}

export function Teletype() {
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  const [n, setN] = useState(0);
  const staticAll = useRef(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      staticAll.current = true;
      setN(TT_LINES.length);
      return;
    }
    if (!seen) return;
    let t: number;
    const step = () => {
      setN((v) => (v >= TT_LINES.length ? 0 : v + 1));
      t = window.setTimeout(step, n >= TT_LINES.length ? 4200 : 620);
    };
    t = window.setTimeout(step, 400);
    return () => clearTimeout(t);
  }, [seen, n]);

  return (
    <figure ref={ref}>
      <div className="border-[1.5px] border-black-ink p-1.5">
        <div className="bg-black-ink text-paper">
          {/* header strip */}
          <div className="flex items-center justify-between border-b border-paper/20 px-3 py-2">
            <span className="caption-caps font-bold text-paper/70">CODECITY ANALYZER</span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="rec-dot inline-block h-1.5 w-1.5 rounded-full bg-signal" />
              <span className="caption-caps font-bold text-signal">LIVE</span>
            </span>
          </div>
          {/* stream */}
          <div role="img" aria-label="Animated demo of a repository being analyzed into a city" className="min-h-[168px] px-3 py-3 font-mono text-[11px] leading-[1.9] md:text-xs">
            {TT_LINES.slice(0, n).map(([line, tag], i) => (
              <p key={i} className={`tt-line whitespace-pre-wrap ${i === 0 ? "font-bold text-paper" : "text-paper/75"} ${line.startsWith("✓") ? "!text-signal font-bold" : ""}`}>
                {line}
                {tag && <span className="ml-2 border border-paper/30 px-1 text-[9px] tracking-widest text-paper/60">{tag}</span>}
              </p>
            ))}
            <span aria-hidden className="tt-caret ml-0.5 inline-block h-[13px] w-[7px] translate-y-[2px] bg-paper" />
          </div>
        </div>
      </div>
      <figcaption className="flex items-baseline justify-between gap-4 pt-3">
        <span className="caption-caps font-bold">FIG. 01 — REPO BECOMES CITY, CONTINUOUSLY</span>
        <span className="caption-caps hidden text-black-ink/55 sm:block">LOOPED TRANSMISSION</span>
      </figcaption>
    </figure>
  );
}
