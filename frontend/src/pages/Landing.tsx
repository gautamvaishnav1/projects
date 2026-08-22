import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { Reveal, FolioBar, StationClock, MiniCity, TickerBand, useInView, useCountUp } from "./landing/ui";

/* ═══ INTERNATIONALES ARCHIV — Swiss press system ══════════════════
   1958 Müller-Brockmann poster logic on a modern web grid.
   Remix-ready: swap the strings in BRAND, keep the system.          */

const BRAND = {
  mark: "CODECITY AI",
  headerLeft: "CODECITY AI — INTERNATIONALES ARCHIV N° 04",
  kicker: "A CITY MAP FOR ONBOARDING · NAVIGATION · CODE",
};

const INDEX = [
  { n: "01", t: "SYSTEM", meta: "12 COLUMNS", id: "raster" },
  { n: "02", t: "INKS", meta: "3 PRESS COLORS", id: "farben" },
  { n: "03", t: "LIVE DATA", meta: "DEPARTURES BOARD", id: "zeit" },
];

const SPECS: Array<[string, string]> = [
  ["PRODUCT", "CODECITY AI"],
  ["FORMAT", "CITY PLAN FROM SOURCE CODE"],
  ["PROBLEM", "MONTHS-LONG ONBOARDING · BLIND REFACTORS"],
  ["SOLUTION", "ONE MAP, DAY ONE"],
  ["USERS", "INTERNS · DEVS · SENIORS"],
  ["INKS", "3"],
];

/* ── helpers ─────────────────────────────────────────────────────── */

function goTo(e: MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function RuleHeavy() {
  return <hr aria-hidden className="rule-heavy" />;
}

/* ── hero — asymmetric 8 / 4 split ───────────────────────────────── */

function Hero({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section id="top" className="sheet relative scroll-mt-8">
      <div className="relative grid grid-cols-12 gap-x-6 gap-y-12 pb-16 pt-10 md:pt-14">
        <GridSystem />
        <div className="col-span-12 lg:col-span-8">
          <Reveal>
            <div className="mb-8 flex items-baseline justify-between gap-6 border-b border-black-ink/25 pb-4">
              <p className="caption-caps font-bold">{BRAND.kicker}</p>
              <p className="caption-caps hidden text-black-ink/55 sm:block">ZÜRICH — PRESS PROOF</p>
            </div>
          </Reveal>
          {/* headline builds like a printed pass — three ink passes */}
          <h1 aria-label="Code becomes city" className="display-caps select-none text-[clamp(64px,11vw,150px)]">
            {(["CODE", "BECOMES"] as const).map((word, i) => (
              <span key={word} className="headline-pass block" style={{ ["--d" as string]: i }}>
                {word}
              </span>
            ))}
            <span className="block headline-pass pass-signal" style={{ ["--d" as string]: 2 }}>
              <span className="misreg inline-block bg-signal px-[0.09em] text-paper">CITY</span>
            </span>
          </h1>
          <Reveal delay={650}>
            <p className="mt-8 max-w-[54ch] text-[15px] leading-6 text-black-ink/80">
              CodeCity AI draws a city plan from your source code: every file a building,
              every dependency a street, every hotspot a red tower. It removes the two
              costs of invisible architecture — months-long onboarding and blind refactoring.
              New developers walk the city on day one; seniors read complexity as height
              and dead code as empty lots. One objective plan, printed flat in three inks,
              understood by the whole team at a glance.
            </p>
          </Reveal>
          <Reveal delay={800}>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
              <button type="button" onClick={onLaunch} className="btn-print solid">
                Launch the app ▸
              </button>
              <a href="#terminals" onClick={(e) => goTo(e, "terminals")} className="btn-print ghost">
                See how it works ↓
              </a>
            </div>
          </Reveal>
        </div>

        <div className="col-span-12 flex flex-col justify-end gap-10 lg:col-span-4">
          <Reveal delay={250}>
            <StationClock />
          </Reveal>
          <Reveal delay={400}>
            <MiniCity />
          </Reveal>
        </div>
      </div>

      {/* index — hover inverts to a black block */}
      <nav aria-label="Contents" className="relative pb-20">
        <div className="max-w-xl border-b border-black-ink/25 lg:max-w-2xl">
          {INDEX.map((row, i) => (
            <Reveal key={row.n} delay={i * 90}>
              <a
                href={`#${row.id}`}
                onClick={(e) => goTo(e, row.id)}
                className="idx-row group flex items-baseline gap-6 border-t border-black-ink/25 px-3 py-4 md:py-5"
              >
                <span className="text-xs font-bold tabular-nums transition-colors duration-100 group-hover:text-signal md:text-sm">{row.n}</span>
                <span className="display-caps flex-1 text-3xl transition-colors duration-100 group-hover:text-paper md:text-5xl">{row.t}</span>
                <span className="caption-caps hidden text-black-ink/55 transition-colors duration-100 group-hover:text-paper/65 sm:block">{row.meta}</span>
                <span aria-hidden className="text-xl font-black transition-transform duration-150 md:text-2xl group-hover:translate-x-1.5">
                  →
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </nav>
    </section>
  );
}

/* ── visible grid system (hero only) ─────────────────────────────── */

function GridSystem() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <div className="grid-cols-rules absolute inset-0" />
      <div className="baseline-rules absolute inset-0" />
    </div>
  );
}

/* ── section header ──────────────────────────────────────────────── */

function SecHead({ n, t, meta }: { n: string; t: string; meta?: string }) {
  return (
    <Reveal>
      <header className="mb-12 flex items-end justify-between gap-8">
        <h2 className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
          <span className="text-xs font-black tracking-[0.2em] text-signal">{n}</span>
          <span className="display-caps text-[clamp(40px,6vw,84px)]">{t}</span>
        </h2>
        {meta && <p className="caption-caps hidden pb-2 text-right text-black-ink/50 md:block">{meta}</p>}
      </header>
    </Reveal>
  );
}

/* ── 01 SYSTEM — spec table + column lattice ─────────────────────── */

const LATTICE = [64, 118, 96, 152, 80, 200, 140, 74, 176, 110, 58, 132];

function RasterSection() {
  const [ref, seen] = useInView<HTMLDivElement>(0.35);
  return (
    <section id="raster" className="sheet scroll-mt-8 py-20 md:py-28">
      <SecHead n="01" t="SYSTEM" meta="THE GRID BEFORE THE CONTENT" />
      <div className="grid grid-cols-12 gap-x-6 gap-y-12">
        <div className="col-span-12 lg:col-span-7">
          <Reveal>
            <p className="display-caps text-[clamp(36px,5vw,72px)]">
              A thousand files.
              <br /> One city.
              <br /> No
              <br />
              <span className="text-signal">exceptions.</span>
            </p>
          </Reveal>
          <Reveal delay={150}>
            <p className="mt-10 max-w-[54ch] text-[15px] leading-6 text-black-ink/80">
              Every surface sits on the fixed carrier grid: files become buildings,
              dependencies become streets, complexity becomes height. The intern reads
              the city on the first day; the senior checks the street before writing.
              The map is the construction on which content first becomes legible.
            </p>
          </Reveal>
          <Reveal delay={250}>
            <p className="caption-caps mt-6 text-black-ink/55">
              A TWELVE-COLUMN LATTICE PRECEDES CONTENT. COLUMNS ARE STRUCTURE, NOT ORNAMENT.
            </p>
          </Reveal>
        </div>

        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <Reveal delay={120}>
            <dl className="border-b border-black-ink/25">
              {SPECS.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-6 border-t border-black-ink/25 py-3.5">
                  <dt className="caption-caps text-black-ink/55">{k}</dt>
                  <dd className="text-sm font-bold tracking-[0.08em] tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          {/* column diagram — bars rise to their LOC height when seen */}
          <div ref={ref} aria-hidden className="mt-10 flex h-24 items-end gap-[6px]">
            {LATTICE.map((h, i) => (
              <span
                key={i}
                className={`lattice-bar ${i === 5 ? "bg-signal" : "bg-black-ink"} ${seen ? "up" : ""}`}
                style={{ height: `${(h / 200) * 100}%`, transitionDelay: `${i * 45}ms` }}
              />
            ))}
          </div>
          <p className="caption-caps mt-3 text-black-ink/45">FIG. 03 — COLUMN AXES AS FILE SIZES</p>
        </div>
      </div>
    </section>
  );
}

/* ── quote band — inversion moment ───────────────────────────────── */

function QuoteBand() {
  return (
    <aside className="bg-black-ink text-paper">
      <div className="sheet py-20 md:py-24">
        <blockquote>
          <Reveal>
            <p className="display-caps max-w-4xl text-[clamp(24px,4vw,40px)] leading-snug">
              ONBOARDING IN DAYS, NOT MONTHS.
            </p>
          </Reveal>
          <footer className="caption-caps mt-6 text-paper/60">CODECITY AI — THESIS 01</footer>
        </blockquote>
      </div>
    </aside>
  );
}

/* ── 03 INKS — three flat inks, one intervention ─────────────────── */

const SWATCHES = [
  { name: "PAPER", hex: "#F2EFE3", note: "THE CARRIER SURFACE — UNPRINTED", cls: "bg-paper border border-black-ink/40", span: "lg:col-span-5", h: "h-44" },
  { name: "BLACK", hex: "#141414", note: "TEXT, LINES, DEPTH", cls: "bg-black-ink", span: "lg:col-span-4", h: "h-28" },
  { name: "SIGNAL RED", hex: "#E30613", note: "SIGNALS ONLY", cls: "bg-signal misreg", span: "lg:col-span-3", h: "h-20" },
];

function FarbenSection() {
  return (
    <section id="farben" className="sheet relative scroll-mt-8 py-20 md:py-28">
      <span aria-hidden className="misreg absolute -top-10 right-6 hidden h-40 w-40 rounded-full bg-signal lg:block xl:right-24" />

      <SecHead n="02" t="INKS" meta="FLAT COLORS — NO GRADIENTS" />
      <div className="grid grid-cols-12 items-end gap-x-6 gap-y-10">
        {SWATCHES.map((s, i) => (
          <div key={s.name} className={`col-span-12 sm:col-span-4 ${s.span}`}>
            <Reveal delay={i * 120}>
              <div aria-hidden className={`${s.cls} ${s.h} w-full`} />
            </Reveal>
            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-black-ink/25 pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">{s.name}</p>
              <p className="caption-caps text-black-ink/55 tabular-nums">{s.hex}</p>
            </div>
            <p className="caption-caps mt-1.5 text-black-ink/45">{s.note}</p>
          </div>
        ))}
      </div>
      <Reveal delay={200}>
        <p className="caption-caps mt-14 max-w-lg leading-relaxed text-black-ink/55">
          PRINTING: OFFSET. THREE COLORS ARE USED — CREAM, BLACK, SIGNAL RED.
          THE RED DISC IS REGISTERED ≈0.5 MM OUT OF REGISTER — DELIBERATELY.
        </p>
      </Reveal>
    </section>
  );
}

/* ── 04 LIVE DATA — departures board for a codebase ──────────────── */

interface DepRow {
  line: string;
  dep: string;
  plat: string;
  to: string;
  status: string;
  late: boolean;
}

const FLOWS: Array<[string, string[], number]> = [
  ["POST /login", ["Login.jsx", "authRoutes", "authController", "users DB"], 80],
  ["POST /pay", ["Payment.jsx", "payRoutes", "payController", "Stripe API"], 240],
  ["GET /cart", ["Cart.jsx", "cartRoutes", "cartController", "carts DB"], 300],
];

function makeDepartures(): DepRow[] {
  const now = new Date();
  const rows: DepRow[] = [];
  for (let i = 0; i < 6; i++) {
    const [verb, path] = FLOWS[i % FLOWS.length];
    const d = new Date(now.getTime() + (i * 7 + 4) * 60000);
    const late = i === 2; // one delayed row keeps the board honest
    const dep = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    rows.push({
      line: verb,
      dep,
      plat: String(((i * 3) % 9) + 1),
      to: path[path.length - 1],
      status: late ? "+2 MIN" : "ON TIME",
      late,
    });
  }
  return rows;
}

function ZeitSection() {
  const [rows, setRows] = useState<DepRow[]>(() => makeDepartures());
  const [ref, seen] = useInView<HTMLDivElement>(0.3);
  // re-stamp the board every minute so times stay live
  useEffect(() => {
    const id = window.setInterval(() => setRows(makeDepartures()), 60000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section id="zeit" className="sheet scroll-mt-8 py-20 md:py-28">
      <SecHead n="03" t="LIVE DATA" meta="TIMETABLE VALID WHILE YOUR APP RUNS" />
      <div className="grid grid-cols-12 gap-x-6 gap-y-12">
        <div ref={ref} className="col-span-12 overflow-x-auto lg:col-span-9">
          <table className="w-full min-w-[560px] border-collapse text-left">
            <thead>
              <tr className="caption-caps text-black-ink/55">
                <th scope="col" className="border-b-2 border-black-ink pb-3 pr-4 font-bold">REQUEST</th>
                <th scope="col" className="border-b-2 border-black-ink pb-3 pr-4 font-bold">DEP</th>
                <th scope="col" className="border-b-2 border-black-ink pb-3 pr-4 font-bold">GATE</th>
                <th scope="col" className="border-b-2 border-black-ink pb-3 pr-4 font-bold">DESTINATION</th>
                <th scope="col" className="border-b-2 border-black-ink pb-3 text-right font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={`${r.line}-${i}`}
                  className={`dep-row text-sm ${seen ? "in" : ""}`}
                  style={{ transitionDelay: `${i * 70}ms` }}
                >
                  <td className="border-b border-black-ink/25 py-3.5 pr-4 font-bold tabular-nums">{r.line}</td>
                  <td className="border-b border-black-ink/25 py-3.5 pr-4 tabular-nums">{r.dep}</td>
                  <td className="border-b border-black-ink/25 py-3.5 pr-4 tabular-nums">{r.plat}</td>
                  <td className="border-b border-black-ink/25 py-3.5 pr-4 uppercase">{r.to}</td>
                  <td className={`border-b border-black-ink/25 py-3.5 text-right text-xs font-bold uppercase tracking-[0.18em] tabular-nums ${r.late ? "text-signal dep-late" : ""}`}>
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="col-span-12 flex flex-col gap-8 lg:col-span-3 lg:border-l lg:border-black-ink/25 lg:pl-6">
          <Stat n="FILES MAPPED" v={1284} suffix="" />
          <Stat n="STREETS (EDGES)" v={2140} suffix="" />
          <Stat n="AVG ONBOARDING" v={4} suffix=" DAYS" />
          <p className="caption-caps mt-auto text-black-ink/45">FIG. 04 — DEPARTURES, LIVE EXTRACT</p>
        </aside>
      </div>
    </section>
  );
}

function Stat({ n, v, suffix }: { n: string; v: number; suffix?: string }) {
  const [ref, seen] = useInView<HTMLDivElement>(0.5);
  const val = useCountUp(v, seen);
  return (
    <div ref={ref}>
      <p className="caption-caps font-bold">{n}</p>
      <p className="mt-2 text-3xl font-black tabular-nums tracking-tight">
        {val.toLocaleString()}
        {suffix}
      </p>
    </div>
  );
}

/* ── launch panel — form follows function ────────────────────────── */

function LaunchPanel({ onLaunch }: { onLaunch: () => void }) {
  const [repo, setRepo] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem("cc-pending-repo", repo.trim());
    onLaunch();
  };

  return (
    <section id="terminals" className="sheet scroll-mt-8 py-20 md:py-28">
      <div className="grid grid-cols-12 gap-x-6 gap-y-12">
        <div className="col-span-12 lg:col-span-7">
          <p className="caption-caps mb-6 font-bold text-signal">APPLICATION — LIVE DEMO</p>
          <Reveal>
            <h2 className="display-caps text-[clamp(44px,7vw,96px)]">
              Ready
              <br />
              to print.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <p className="mt-8 max-w-[52ch] text-[15px] leading-6 text-black-ink/80">
              A repository URL is all it takes: the city plan is built from your repo —
              files as houses, dependencies as streets, bottlenecks as construction sites.
              No account needed to look; launching asks for access.
            </p>
          </Reveal>

          <form onSubmit={submit} className="mt-12 max-w-md">
            <label htmlFor="repo-input" className="caption-caps block pb-3 font-bold">
              REPOSITORY INPUT
            </label>
            <input
              id="repo-input"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              placeholder="github.com/owner/repo"
              spellCheck={false}
              autoComplete="off"
              className="field-print w-full"
            />
            <button type="submit" className="btn-print solid mt-8 w-full justify-center sm:w-auto">
              Build the city ▸
            </button>
          </form>
        </div>

        <div className="col-span-12 flex flex-col items-start gap-6 lg:col-span-4 lg:col-start-9 lg:border-l lg:border-black-ink/25 lg:pl-6">
          <button type="button" onClick={onLaunch} className="btn-print solid w-full justify-center py-5 text-sm">
            Launch ▸ open the app
          </button>
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="btn-print ghost w-full justify-center">
            Back to top ↑
          </button>
          <p className="caption-caps leading-relaxed text-black-ink/55">
            SHEET 1 OF 1 — THE EXHIBITION ENDS HERE. THE APPLICATION BEGINS.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ── colophon ────────────────────────────────────────────────────── */

function Colophon() {
  return (
    <footer className="pb-10">
      <RuleHeavy />
      <div className="sheet flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2 pt-5">
        <p className="caption-caps font-bold">PRINTED IN ZÜRICH — GROTESK ONLY — CODECITY AI · CITY PLAN FROM SOURCE CODE</p>
        <p className="caption-caps text-black-ink/60">47°22′N 8°33′E — BASELINE 8 PT — GRID 12</p>
        <p className="caption-caps text-black-ink/60">© 1958–2026 {BRAND.mark}</p>
      </div>
    </footer>
  );
}

/* ── page ────────────────────────────────────────────────────────── */

export default function Landing({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div className="swiss-root relative min-h-screen overflow-x-clip">
      {/* paper artifacts */}
      <div className="paper-grain" aria-hidden />
      <div className="paper-fold" aria-hidden />
      <div className="trim-edge trim-n" aria-hidden />
      <div className="trim-edge trim-s" aria-hidden />
      <div className="trim-edge trim-w" aria-hidden />
      <div className="trim-edge trim-e" aria-hidden />

      <FolioBar mark={BRAND.headerLeft} onLaunch={onLaunch} />

      <main>
        <Hero onLaunch={onLaunch} />
        <RuleHeavy />
        <RasterSection />
        <TickerBand phrase="EVERY FILE A BUILDING" />
        <QuoteBand />
        <FarbenSection />
        <RuleHeavy />
        <ZeitSection />
        <TickerBand phrase="CODE BECOMES CITY" />
        <LaunchPanel onLaunch={onLaunch} />
      </main>

      <Colophon />
    </div>
  );
}
