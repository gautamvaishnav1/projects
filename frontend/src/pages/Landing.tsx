import { useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";

/* ═══ INTERNATIONALES ARCHIV — Swiss press system ══════════════════
   1958 Müller-Brockmann poster logic on a modern web grid.
   Remix-ready: swap the strings in BRAND, keep the system.          */

const BRAND = {
  mark: "CODECITY AI",
  headerLeft: "CODECITY AI — INTERNATIONALES ARCHIV N° 04 / 1958",
  folio: "S. 01",
  kicker: "EINE STADTKARTE FÜR ONBOARDING · NAVIGATION · CODE",
  headline: ["CODE", "BECOMES", "CITY"],
  accentWord: "CITY",
};

const INDEX = [
  { n: "01", t: "RASTER", meta: "12 SPALTEN", id: "raster" },
  { n: "02", t: "SATZ", meta: "ARCHIVO 400–900", id: "satz" },
  { n: "03", t: "FARBEN", meta: "3 DRUCKFARBEN", id: "farben" },
  { n: "04", t: "ZEIT", meta: "MEZ ±0:00", id: "zeit" },
];

const SPECS: Array<[string, string]> = [
  ["MARKE", "CODECITY AI"],
  ["FORMAT", "STADTPLAN AUS QUELLCODE"],
  ["PROBLEM", "ONBOARDING MONTHS · BLIND REFACTORS"],
  ["LÖSUNG", "ONE MAP, DAY ONE"],
  ["NUTZER", "INTERNS · DEVS · SENIORS"],
  ["FARBEN", "3"],
];

const TIMETABLE = [
  { line: "R 421", dep: "08:07", plat: "5", to: "OLTEN", status: "PÜNKTLICH", late: false },
  { line: "S 8", dep: "08:14", plat: "31", to: "AARAU", status: "PÜNKTLICH", late: false },
  { line: "IC 512", dep: "08:26", plat: "8", to: "BERN", status: "+2 MIN", late: true },
  { line: "S 11", dep: "08:33", plat: "2", to: "ZUG", status: "PÜNKTLICH", late: false },
  { line: "IR 35", dep: "08:41", plat: "7", to: "BASEL", status: "PÜNKTLICH", late: false },
  { line: "S 24", dep: "08:52", plat: "4", to: "CHUR", status: "PÜNKTLICH", late: false },
];

/* ── helpers ─────────────────────────────────────────────────────── */

function useNow(stepMs = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), stepMs);
    return () => window.clearInterval(id);
  }, [stepMs]);
  return now;
}

function goTo(e: MouseEvent<HTMLAnchorElement>, id: string) {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function RuleHeavy() {
  return <hr aria-hidden className="rule-heavy" />;
}

/* ── folio header ────────────────────────────────────────────────── */

function FolioHeader() {
  return (
    <header className="sheet pt-6">
      <div className="flex items-center justify-between gap-6 pb-4">
        <div className="flex items-center gap-4 min-w-0">
          <span aria-hidden className="misreg inline-block h-3.5 w-3.5 shrink-0 rounded-full bg-signal" />
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.22em]">
            {BRAND.headerLeft}
          </p>
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.22em]">{BRAND.folio}</p>
      </div>
      <div aria-hidden className="h-[2.5px] w-full bg-black-ink" />
    </header>
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

/* ── ABB. 01 — Bahnhofsuhr, halftone reproduction ────────────────── */

function StationClock() {
  const now = useNow();
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const secAng = s * 6;
  const minAng = m * 6 + s * 0.1;
  const hrAng = ((h % 12) + m / 60) * 30;
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");

  return (
    <figure>
      <div className="border-[1.5px] border-black-ink p-1.5">
        <div className="relative border border-black-ink/50 bg-paper-deep p-4 md:p-5">
          <svg viewBox="0 0 200 200" role="img" aria-label={`Bahnhofsuhr, ${hh}:${mm} Uhr`} className="block w-full">
            {/* face + ring */}
            <circle cx="100" cy="100" r="86" fill="#f6f2e1" stroke="#141414" strokeWidth="11" />
            {/* minor ticks — 60 */}
            {Array.from({ length: 60 }).map((_, i) => (
              <rect key={`t${i}`} x="99.4" y="18" width="1.2" height="7" fill="#141414" opacity="0.32" transform={`rotate(${i * 6} 100 100)`} />
            ))}
            {/* hour batons — 12 */}
            {Array.from({ length: 12 }).map((_, i) => (
              <rect key={`b${i}`} x="98.4" y="16" width="3.2" height="13" fill="#141414" transform={`rotate(${i * 30} 100 100)`} />
            ))}
            {/* second hand — misregistered print copy first, key layer above */}
            <g opacity="0.55" transform="translate(1.6 -1.2)">
              <g transform={`rotate(${secAng} 100 100)`}>
                <line x1="100" y1="126" x2="100" y2="24" stroke="#e30613" strokeWidth="3" />
                <circle cx="100" cy="30" r="8" fill="#e30613" />
              </g>
            </g>
            <g transform={`rotate(${secAng} 100 100)`}>
              <line x1="100" y1="126" x2="100" y2="24" stroke="#e30613" strokeWidth="3" />
              <circle cx="100" cy="30" r="8" fill="#e30613" />
            </g>
            {/* hour + minute hands */}
            <g transform={`rotate(${hrAng} 100 100)`}>
              <rect x="95.5" y="46" width="9" height="56" fill="#141414" />
            </g>
            <g transform={`rotate(${minAng} 100 100)`}>
              <rect x="97.75" y="20" width="4.5" height="82" fill="#141414" />
            </g>
            {/* pivot — SBB red disc */}
            <circle cx="100" cy="100" r="5.5" fill="#e30613" />
            <circle cx="100" cy="100" r="1.8" fill="#141414" />
          </svg>
          <div aria-hidden className="halftone pointer-events-none absolute inset-0 opacity-35 mix-blend-multiply" />
        </div>
      </div>
      <figcaption className="flex items-baseline justify-between gap-4 pt-3">
        <span className="caption-caps font-bold">ABB. 01 — BAHNHOFUHR</span>
        <span className="caption-caps text-black-ink/55 tabular-nums">
          {hh}:{mm} · HALBTON 60/LPI
        </span>
      </figcaption>
    </figure>
  );
}

/* ── hero — asymmetric 8 / 4 split ───────────────────────────────── */

function Hero({ onLaunch }: { onLaunch: () => void }) {
  return (
    <section id="top" className="sheet relative scroll-mt-8">
      <div className="relative grid grid-cols-12 gap-x-6 gap-y-12 pb-16 pt-10 md:pt-14">
        <GridSystem />
        <div className="col-span-12 lg:col-span-8">
          <div className="mb-8 flex items-baseline justify-between gap-6 border-b border-black-ink/25 pb-4">
            <p className="caption-caps font-bold">{BRAND.kicker}</p>
            <p className="caption-caps hidden text-black-ink/55 sm:block">ZÜRICH, MAI 1958</p>
          </div>
          <h1 className="display-caps select-none text-[clamp(64px,11vw,150px)]">
            {BRAND.headline.map((word) =>
              word === BRAND.accentWord ? (
                <span key={word} className="block">
                  <span className="misreg inline-block bg-signal px-[0.09em] text-paper">{word}</span>
                </span>
              ) : (
                <span key={word} className="block">
                  {word}
                </span>
              ),
            )}
          </h1>
          <p className="mt-8 max-w-[54ch] text-[15px] leading-6 text-black-ink/80">
            CODECITY AI draws a city plan from source code: every file a building,
            every dependency a street, every hotspot a tower. It solves the two
            costs of invisible architecture — slow onboarding and blind coding.
            Interns and new developers walk the city on day one instead of
            wandering months through an unseen codebase; seniors see complexity
            as height and dead code as empty blocks, so they write and refactor
            against a map, not against memory. One objective plan, printed flat
            in three inks, read by the whole team in one look.
          </p>
        </div>

        <div className="col-span-12 flex flex-col justify-end lg:col-span-4">
          <StationClock />
        </div>
      </div>

      {/* index — hover inverts to a black block */}
      <nav aria-label="Inhalt" className="relative pb-20">
        <div className="max-w-xl border-b border-black-ink/25 lg:max-w-2xl">
          {INDEX.map((row) => (
            <a
              key={row.n}
              href={`#${row.id}`}
              onClick={(e) => goTo(e, row.id)}
              className="idx-row group flex items-baseline gap-6 border-t border-black-ink/25 px-3 py-4 md:py-5"
            >
              <span className="text-xs font-bold tabular-nums group-hover:text-signal md:text-sm">{row.n}</span>
              <span className="display-caps flex-1 text-3xl group-hover:text-paper md:text-5xl">{row.t}</span>
              <span className="caption-caps hidden text-black-ink/55 group-hover:text-paper/65 sm:block">{row.meta}</span>
              <span aria-hidden className="text-xl font-black md:text-2xl">
                →
              </span>
            </a>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
          <button type="button" onClick={onLaunch} className="btn-print solid">
            APP STARTEN ▸
          </button>
          <p className="caption-caps max-w-xs leading-relaxed text-black-ink/55">
            ERSTER ZUGANG ERFORDERT KONTO — OAUTH ODER E-MAIL.
          </p>
        </div>
      </nav>
    </section>
  );
}

/* ── section header ──────────────────────────────────────────────── */

function SecHead({ n, t, meta }: { n: string; t: string; meta?: string }) {
  return (
    <header className="mb-12 flex items-end justify-between gap-8">
      <h2 className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
        <span className="text-xs font-black tracking-[0.2em] text-signal">{n}</span>
        <span className="display-caps text-[clamp(40px,6vw,84px)]">{t}</span>
      </h2>
      {meta && <p className="caption-caps hidden pb-2 text-right text-black-ink/50 md:block">{meta}</p>}
    </header>
  );
}

/* ── 01 RASTER — spec table as print metadata ────────────────────── */

function RasterSection() {
  return (
    <section id="raster" className="sheet scroll-mt-8 py-20 md:py-28">
      <SecHead n="01" t="RASTER" meta="DAS SYSTEM VOR DEM INHALT" />
      <div className="grid grid-cols-12 gap-x-6 gap-y-12">
        <div className="col-span-12 lg:col-span-7">
          <p className="display-caps text-[clamp(36px,5vw,72px)]">
            Tausend Dateien.
            <br />
            Eine Stadt.
            <br />
            Keine
            <br />
            <span className="text-signal">Ausnahmen.</span>
          </p>
          <p className="mt-10 max-w-[54ch] text-[15px] leading-6 text-black-ink/80">
            Jede Fläche liegt auf dem festen Trägerraster: Dateien werden zu
            Häusern, Abhängigkeiten zu Strassen, Komplexität zu Höhe. Der Intern
            liest die Stadt am ersten Tag, der Senior prüft die Strasse, bevor
            er schreibt — die Karte ist die Konstruktion, auf der Inhalt erst
            lesbar wird.
          </p>
          <p className="caption-caps mt-6 text-black-ink/55">
            A TWELVE-COLUMN LATTICE PRECEDES CONTENT. COLUMNS ARE STRUCTURE, NOT ORNAMENT.
          </p>
        </div>

        <div className="col-span-12 lg:col-span-4 lg:col-start-9">
          <dl className="border-b border-black-ink/25">
            {SPECS.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-6 border-t border-black-ink/25 py-3.5">
                <dt className="caption-caps text-black-ink/55">{k}</dt>
                <dd className="text-sm font-bold tracking-[0.08em] tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="caption-caps mt-4 text-black-ink/45">DRUCKVORLAGE — ANGABEN OHNE GEWÄHR</p>

          {/* column diagram — geometric primitives only */}
          <div aria-hidden className="mt-10 flex h-16 items-stretch gap-2">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i} className={`flex-1 ${i === 3 || i === 8 ? "bg-signal" : "bg-black-ink"}`} />
            ))}
          </div>
          <p className="caption-caps mt-3 text-black-ink/45">ABB. 02 — SPALTENACHSE, 12 FELDER</p>
        </div>
      </div>
    </section>
  );
}

/* ── 02 SATZ — one grotesque, contrast by weight & scale ─────────── */

function SpecimenRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-3 border-t border-black-ink/25 py-8">
      <p className="caption-caps col-span-12 pt-2 text-black-ink/50 md:col-span-3">{label}</p>
      <div className="col-span-12 md:col-span-9">{children}</div>
    </div>
  );
}

function SatzSection() {
  return (
    <section id="satz" className="sheet scroll-mt-8 py-20 md:py-28">
      <SecHead n="02" t="SATZ" meta="ARCHIVO — EIN GROTESK, KEIN ZWEITER" />
      <div className="border-b border-black-ink/25">
        <SpecimenRow label="DISPLAY — BLACK 900 · 96–160 PX · FLUSH LEFT, RAG RIGHT">
          <p className="display-caps text-[clamp(56px,9vw,140px)]">Grotesk 900</p>
        </SpecimenRow>
        <SpecimenRow label="SUBHEAD — BOLD 700 · KAPITÄLCHENERSATZ DURCH CAPS">
          <p className="text-3xl font-bold uppercase tracking-tight md:text-4xl">Hamburgefonstiv — Satzskala II</p>
        </SpecimenRow>
        <SpecimenRow label="TEXT — REGULAR 400 · 15/24 · MAX 54 CH">
          <p className="max-w-[54ch] text-[15px] leading-6">
            Der Satz folgt dem Lesen, nicht der Laune. Ein einziger Schriftschnitt
            trägt die ganze Seite: Kontrast entsteht durch Gewicht und Grösse,
            nie durch Farbe, nie durch Zierde. Absätze bleiben flach, Hervorhebung
            ist Sache des Rasters.
          </p>
        </SpecimenRow>
        <SpecimenRow label="CAPTION — 10 PT · TRACKING +220 · VERSALIEN">
          <p className="caption-caps">Bildunterschrift, Quellenangabe und Kollophon stehen in dieser Zeile</p>
        </SpecimenRow>
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
          <p className="display-caps max-w-4xl text-[28px] leading-snug">ONBOARDING IN DAYS, NOT MONTHS.</p>
          <footer className="caption-caps mt-6 text-paper/60">CODECITY AI — THESE 01</footer>
        </blockquote>
      </div>
    </aside>
  );
}

/* ── 03 FARBEN — three flat inks, one intervention ───────────────── */

const SWATCHES = [
  { name: "PAPIER", hex: "#F2EFE3", note: "TRÄGERFLÄCHE — UNBEDRUCKT", cls: "bg-paper border border-black-ink/40", span: "lg:col-span-5", h: "h-44" },
  { name: "SCHWARZ", hex: "#141414", note: "TEXT, LINIEN, TIEFE", cls: "bg-black-ink", span: "lg:col-span-4", h: "h-28" },
  { name: "SIGNALROT", hex: "#E30613", note: "NUR FÜR SIGNALE", cls: "bg-signal misreg", span: "lg:col-span-3", h: "h-20" },
];

function FarbenSection() {
  return (
    <section id="farben" className="sheet relative scroll-mt-8 py-20 md:py-28">
      {/* the single geometric intervention on this screen */}
      <span aria-hidden className="misreg absolute -top-10 right-6 hidden h-40 w-40 rounded-full bg-signal lg:block xl:right-24" />

      <SecHead n="03" t="FARBEN" meta="FLACHE FARBEN — KEINE VERLÄUFE" />
      <div className="grid grid-cols-12 items-end gap-x-6 gap-y-10">
        {SWATCHES.map((s) => (
          <div key={s.name} className={`col-span-12 sm:col-span-4 ${s.span}`}>
            <div aria-hidden className={`${s.cls} ${s.h} w-full`} />
            <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-black-ink/25 pt-3">
              <p className="text-xs font-bold uppercase tracking-[0.18em]">{s.name}</p>
              <p className="caption-caps text-black-ink/55 tabular-nums">{s.hex}</p>
            </div>
            <p className="caption-caps mt-1.5 text-black-ink/45">{s.note}</p>
          </div>
        ))}
      </div>
      <p className="caption-caps mt-14 max-w-lg leading-relaxed text-black-ink/55">
        DRUCK: OFFSET. GENUTZT WERDEN DREI FARBEN — CREME, SCHWARZ, SIGNALROT.
        DER ROTE KREIS IST UM CA. 0,5 MM FALSCHPASSUNG REGISTRIERT.
      </p>
    </section>
  );
}

/* ── 04 ZEIT — timetable as content ──────────────────────────────── */

function ZeitSection() {
  return (
    <section id="zeit" className="sheet scroll-mt-8 py-20 md:py-28">
      <SecHead n="04" t="ZEIT" meta="FAHRPLAN GÜLTIG 1958 — ÄNDERUNGEN VORBEHALTEN" />
      <div className="grid grid-cols-12 gap-x-6 gap-y-12">
        <div className="col-span-12 overflow-x-auto lg:col-span-9">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="caption-caps text-black-ink/55">
                <th scope="col" className="border-b-2 border-black-ink pb-3 pr-4 font-bold">LINIE</th>
                <th scope="col" className="border-b-2 border-black-ink pb-3 pr-4 font-bold">AB</th>
                <th scope="col" className="border-b-2 border-black-ink pb-3 pr-4 font-bold">GLEIS</th>
                <th scope="col" className="border-b-2 border-black-ink pb-3 pr-4 font-bold">NACH</th>
                <th scope="col" className="border-b-2 border-black-ink pb-3 text-right font-bold">STATUS</th>
              </tr>
            </thead>
            <tbody>
              {TIMETABLE.map((r) => (
                <tr key={r.line} className="text-sm">
                  <td className="border-b border-black-ink/25 py-3.5 pr-4 font-bold tabular-nums">{r.line}</td>
                  <td className="border-b border-black-ink/25 py-3.5 pr-4 tabular-nums">{r.dep}</td>
                  <td className="border-b border-black-ink/25 py-3.5 pr-4 tabular-nums">{r.plat}</td>
                  <td className="border-b border-black-ink/25 py-3.5 pr-4 uppercase">{r.to}</td>
                  <td className={`border-b border-black-ink/25 py-3.5 text-right text-xs font-bold uppercase tracking-[0.18em] tabular-nums ${r.late ? "text-signal" : ""}`}>
                    {r.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="col-span-12 flex flex-col gap-8 lg:col-span-3 lg:border-l lg:border-black-ink/25 lg:pl-6">
          <div>
            <p className="caption-caps font-bold">MEZ</p>
            <p className="mt-2 text-[15px] leading-6">Mitteleuropäische Zeit. Die Bahnhofsuhr gilt für alle Gleise.</p>
          </div>
          <div>
            <p className="caption-caps font-bold">SEKUNDENPAUSE</p>
            <p className="mt-2 text-[15px] leading-6">
              Um null hält der rote Sekundenzeiger für zwei Sekunden an — der
              Fahrplan bekommt eine Chance.
            </p>
          </div>
          <p className="caption-caps mt-auto text-black-ink/45">ABB. 03 — KURSFELD, AUSSCHNITT</p>
        </aside>
      </div>
    </section>
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
          <p className="caption-caps mb-6 font-bold text-signal">ANWENDUNG — LIVEDEMO</p>
          <h2 className="display-caps text-[clamp(44px,7vw,96px)]">
            Bereit
            <br />
            zum Druck.
          </h2>
          <p className="mt-8 max-w-[52ch] text-[15px] leading-6 text-black-ink/80">
            Repository-Eingabe genügt: Der Stadtplan wird aus dem Repo gebaut —
            Dateien als Häuser, Abhängigkeiten als Strassen, Engpässe als
            Baustellen. Kein Konto fürs Ansehen; das erste Starten fragt nach Zugang.
          </p>

          <form onSubmit={submit} className="mt-12 max-w-md">
            <label htmlFor="repo-input" className="caption-caps block pb-3 font-bold">
              REPOSITORY-EINGABE
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
              STADT BAUEN ▸
            </button>
          </form>
        </div>

        <div className="col-span-12 flex flex-col items-start gap-6 lg:col-span-4 lg:col-start-9 lg:border-l lg:border-black-ink/25 lg:pl-6">
          <button type="button" onClick={onLaunch} className="btn-print solid w-full justify-center py-5 text-sm">
            LAUNCH ▸ APP STARTEN
          </button>
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="btn-print ghost w-full justify-center"
          >
            ZUM ANFANG ↑
          </button>
          <p className="caption-caps leading-relaxed text-black-ink/55">
            BLATT 1 VON 1 — DIE AUSSTELLUNG ENDET HIER. DIE ANWENDUNG BEGINNT.
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
        <p className="caption-caps font-bold">GEDRUCKT IN ZÜRICH — HELVETICA ONLY — CODECITY AI · STADTPLAN AUS QUELLCODE</p>
        <p className="caption-caps text-black-ink/60">47°22′N 8°33′E — BASELINE 8 PT — RASTER 12</p>
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

      <FolioHeader />

      <main>
        <Hero onLaunch={onLaunch} />
        <RuleHeavy />
        <RasterSection />
        <RuleHeavy />
        <SatzSection />
        <QuoteBand />
        <FarbenSection />
        <RuleHeavy />
        <ZeitSection />
        <RuleHeavy />
        <LaunchPanel onLaunch={onLaunch} />
      </main>

      <Colophon />
    </div>
  );
}
