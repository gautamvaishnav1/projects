import { useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { Search, Play, Bug, Radio, Keyboard, GitBranch, LogOut, CloudRain, CloudLightning, CloudDrizzle, CloudFog, Snowflake, Sun, ScrollText } from "lucide-react";
import { setAudioEnabled } from "../three/audio";
import { apiFetch, API_BASE, useAuth } from "../lib/auth";
import { architectureToCity, useCityLayout } from "../lib/city";
import { KIND_COLOR } from "../lib/layout";
import { useCity } from "../store/useCity";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 90; // ~3 min ceiling

function UserChip() {
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  if (!user) return null;
  return (
    <div className="flex items-center gap-2 rounded-none border-[1.5px] border-black-ink bg-paper/95 px-2.5 py-2">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-black-ink text-[10px] font-bold text-paper">
        {user.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="hidden max-w-[90px] truncate font-mono text-[11px] text-black-ink/75 lg:block">{user.name}</span>
      <button onClick={signOut} title="Sign out" className="text-black-ink/45 transition-colors hover:text-signal">
        <LogOut size={13} />
      </button>
    </div>
  );
}

function RepoLoader() {
  const setCity = useCity((s) => s.setCity);
  const notify = useCity((s) => s.notify);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  async function load(urlOverride?: string) {
    const target = (urlOverride ?? q).trim();
    if (!target || busy) return;
    const isDemo = target.startsWith("demo://");
    if (!isDemo && !/^[a-z0-9-]+(\.[a-z0-9-]+)*(\/[^\s/]+)+$/i.test(target.replace(/^https?:\/\//i, ""))) {
      notify("⚠ Enter a repo like github.com/owner/repo", undefined, "error");
      return;
    }
    setBusy(true);
    notify(isDemo ? "▸ Loading bundled demo project (Beach Resort)…" : `▸ Analyzing ${target} …`);
    try {
      if (!useAuth.getState().token) {
        throw new Error("sign in first — ⌘K → Sign in / Create account");
      }

      // 1. create a project for the repo (demo:// → bundled demo, no download)
      const repoUrl = isDemo
        ? target
        : /^https?:\/\//i.test(target) ? target : `https://${target}`;
      const name = isDemo
        ? "Beach Resort (demo)"
        : decodeURIComponent(repoUrl.split("?")[0].replace(/\/+$/, "").split("/").pop() || "repo");
      const projRes = await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({ name, repoUrl, ...(isDemo ? { source: "demo" } : {}) }),
      });
      const projJson = await projRes.json();
      if (!projRes.ok) throw new Error(projJson.message ?? `HTTP ${projRes.status}`);
      const projectId: string = projJson.data.project.id;

      // 2. kick off the analysis pipeline
      const startRes = await apiFetch(`/projects/${projectId}/analyze`, { method: "POST" });
      const startJson = await startRes.json();
      if (startRes.status !== 202 && !startRes.ok) throw new Error(startJson.message ?? `HTTP ${startRes.status}`);
      const analysisId: string = startJson.data.analysisId;

      // 3. poll until the pipeline completes
      let status = "running";
      for (let i = 0; i < MAX_POLLS; i++) {
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        const stRes = await apiFetch(`/analyses/${analysisId}/status`);
        const stJson = await stRes.json();
        if (!stRes.ok) throw new Error(stJson.message ?? `HTTP ${stRes.status}`);
        status = stJson.data.status as string;
        notify(`▸ analyzing… ${stJson.data.progress ?? Math.min(99, i * 4)}%`);
        if (status !== "running") break;
      }
      if (status !== "completed") throw new Error(`analysis ${status} — check backend logs`);

      // 4. fetch the validated city architecture
      const archRes = await apiFetch(`/projects/${projectId}/architecture`);
      const archJson = await archRes.json();
      if (!archRes.ok) throw new Error(archJson.message ?? `HTTP ${archRes.status}`);

      const city = architectureToCity(archJson.data);
      const files = city.districts.reduce((a, d) => a + d.buildings.length, 0);
      setCity(city);
      notify(`🏙 Loaded ${city.project.name} — ${files} buildings`, undefined, "success");
    } catch (e) {
      notify(`⚠ ${(e as Error).message}`, undefined, "error");
    } finally {
      setBusy(false);
    }
  }

  // auto-load a repo requested from the landing page hero form
  useEffect(() => {
    const pending = localStorage.getItem("cc-pending-repo");
    if (!pending) return;
    localStorage.removeItem("cc-pending-repo");
    const id = window.setTimeout(() => void load(pending), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative flex items-center">
      <GitBranch size={14} className="absolute left-3 top-3 text-black-ink/55" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load()}
        placeholder="github.com/owner/repo"
        className="w-44 pl-8 pr-2 py-2 rounded-xl bg-paper/95 border-[1.5px] border-black-ink text-sm outline-none focus:border-signal lg:w-56"
      />
      <button
        onClick={() => load()}
        disabled={busy}
        title={busy ? "Analysis in progress…" : "Analyze the repo and build its city"}
        className={`ml-1 px-3 py-2 rounded-xl border text-xs font-bold ${
          busy
            ? "bg-black-ink/15 border-[1.5px] border-black-ink/40 text-black-ink/50 cursor-wait"
            : "bg-signal text-paper border-[1.5px] border-black-ink shadow-[3px_3px_0_rgba(20,20,20,.35)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_rgba(20,20,20,.35)] transition-all"
        }`}
      >
        {busy ? "Building…" : "Build City"}
      </button>
      <button
        onClick={() => load("demo://beach-resort")}
        disabled={busy}
        title="Analyze the bundled Beach Resort demo project (full-stack MERN, no download)"
        className="ml-1 px-3 py-2 rounded-xl border-[1.5px] border-black-ink bg-paper/95 text-xs font-bold hover:bg-black-ink hover:text-paper transition-colors disabled:opacity-50"
      >
        🏖 Demo
      </button>
    </div>
  );
}

/* ── atmosphere panel (weather · time · sound). weather now MEANS something:
      clear = healthy build · drizzle = warnings · rain/storm = errors / slow API ── */
function WeatherPanel() {
  const s = useCity();
  const bad = s.city.districts.flatMap((d) => d.buildings).filter((b) => b.health !== "ok").length;
  const errs = s.city.districts.flatMap((d) => d.buildings).filter((b) => b.health === "error").length;
  const meaning =
    s.failing || (s.apiLatencyMs != null && s.apiLatencyMs > 900)
      ? "STORM — API SLOW OR FAILING"
      : errs > 0
        ? "RAIN — BROKEN PIPELINES"
        : bad > 0
          ? "DRIZZLE — WARNINGS PRESENT"
          : "CLEAR — ALL SYSTEMS HEALTHY";
  return (
    <div className="pointer-events-auto w-52 self-end rounded-none border-[1.5px] border-black-ink bg-paper/95 p-3 max-lg:hidden">
      <div className="caption-caps mb-2 flex items-baseline justify-between font-bold">
        <span>ATMOSPHERE</span>
        <span className="text-[9px] text-black-ink/55">{meaning}</span>
      </div>
      <div className="flex gap-1.5">
        {([["clear", Sun], ["drizzle", CloudDrizzle], ["rain", CloudRain], ["storm", CloudLightning], ["snow", Snowflake], ["fog", CloudFog]] as const).map(([w, Ico]) => (
          <button key={w} onClick={() => s.patch({ weather: w, live: false })} title={w}
            className={`flex-1 rounded-lg border py-1.5 text-xs ${s.weather === w ? "border-black-ink bg-black-ink text-paper" : "border-[1.5px] border-black-ink/60 bg-paper-deep"}`}>
            <Ico size={13} className="inline" />
          </button>))}
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-black-ink/70">
        <input type="checkbox" checked={!!s.live} onChange={(e) => s.patch({ live: e.target.checked })} className="accent-[#e30613]" />
        Weather follows code health
      </label>
      <button onClick={() => { const on = !s.sound; s.patch({ sound: on }); setAudioEnabled(on); }}
        className={`mt-2 w-full rounded-lg border py-1.5 text-xs ${s.sound ? "border-black-ink bg-black-ink text-paper" : "border-[1.5px] border-black-ink/60 bg-paper-deep"}`}>
        {s.sound ? "🔊 Sound on" : "🔇 Sound off"}
      </button>
      <div className="mt-3 flex items-center gap-2 text-xs text-black-ink/55">
        <span>{String(Math.floor(s.time)).padStart(2, "0")}:{String(Math.round((s.time % 1) * 60)).padStart(2, "0")}</span>
        <input type="range" min={0} max={24} step={0.1} value={s.time} onChange={(e) => s.patch({ time: +e.target.value, autoCycle: false })} className="flex-1 accent-[#e30613]" />
      </div>
      <label className="mt-1 flex items-center gap-2 text-xs text-black-ink/55">
        <input type="checkbox" checked={s.autoCycle} onChange={(e) => s.patch({ autoCycle: e.target.checked })} className="accent-[#e30613]" />
        Auto day–night cycle
      </label>
    </div>
  );
}

/* ── REAL latency telemetry — measured from actual API round-trips ── */
function LatencyButtons() {
  const ms = useCity((s) => s.apiLatencyMs);
  const speed = useCity((s) => s.latency);
  const color = ms == null ? "#94a3b8" : ms < 250 ? "#22c55e" : ms < 900 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-2 rounded-xl border-[1.5px] border-black-ink bg-paper/95 px-3 py-2 text-xs">
      <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span className="font-bold tabular-nums">{ms == null ? "— ms" : `${Math.round(ms)} ms`}</span>
      <span className="text-black-ink/45">· {speed} traffic</span>
    </div>
  );
}

/* ── broken-pipeline ALERTS — top-right dialogs + floating map pins feed off
      store.healthEvents; clicking one flies you to the broken building ── */
export function AlertStack() {
  const events = useCity((s) => s.healthEvents);
  const dismiss = useCity((s) => s.dismiss);
  const pick = useCity((s) => s.select);
  const setFocus = useCity((s) => s.setFocus);
  const L = useCityLayout();
  const shown = events.slice(-3);
  if (shown.length === 0) return null;
  return (
    <div className="pointer-events-auto grid w-full gap-2">
      {shown.map((ev) => {
        const b = L.byId.get(ev.buildingId);
        return (
          <button
            key={ev.id}
            onClick={() => {
              if (b) { pick(b.id); setFocus(b.pos[0], b.pos[2]); }
            }}
            className={`group relative rounded-xl border-[1.5px] bg-paper/97 p-3 text-left text-xs shadow-[4px_4px_0_rgba(0,0,0,.35)] ${
              ev.kind === "error" ? "border-signal" : ev.kind === "warn" ? "border-[#f59e0b]" : "border-emerald-600"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold">
                {ev.kind === "error" ? "⛔ PIPELINE DOWN" : ev.kind === "warn" ? "⚠ DEGRADED" : "✓ RECOVERED"} ·{" "}
                <span className="text-signal">{ev.name}</span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => { e.stopPropagation(); dismiss(ev.id); }}
                onKeyDown={(e) => e.key === "Enter" && dismiss(ev.id)}
                className="text-black-ink/40 hover:text-signal"
              >
                ✕
              </span>
            </div>
            <p className="mt-0.5 text-black-ink/65">{ev.detail} — click to inspect &amp; ask AI how to fix it.</p>
          </button>
        );
      })}
      <div className="caption-caps text-right text-[9px] text-black-ink/45">
        {events.length} OPEN INCIDENT{events.length === 1 ? "" : "S"}
      </div>
    </div>
  );
}

/* ── floating notification above a selected/failing building's head ── */
export function FloatingNotifs() {
  const notifs = useCity((s) => s.notifications);
  const L = useCityLayout();
  const sel = useCity((s) => s.selectedId);
  const b = L.byId.get(sel ?? "");
  if (!b) return null;
  return (
    <group position={[b.pos[0], b.h + 7, b.pos[2]]}>
      <Html center distanceFactor={70} zIndexRange={[40, 0]}>
        <div className="grid gap-1">
          {notifs.slice(-2).map((n) => (
            <div key={n.id} className={`whitespace-nowrap rounded-none border-[1.5px] px-2 py-1 font-mono text-[10px] font-bold shadow-[3px_3px_0_rgba(0,0,0,.4)] ${
              n.type === "error" ? "border-black-ink bg-signal text-paper" : n.type === "success" ? "border-black-ink bg-emerald-500 text-black-ink" : "border-black-ink bg-paper text-black-ink"
            }`}>
              {n.text}
            </div>
          ))}
        </div>
      </Html>
    </group>
  );
}

/* ── live log feed: frontend actions + backend HTTP lines via SSE ── */
interface LogLine { t: number; src: "fe" | "be"; level: string; msg: string }
const LOG_BUFFER: LogLine[] = [];
export function pushLog(src: "fe" | "be", msg: string, level: "info" | "warn" | "error" | "ok" = "info") {
  LOG_BUFFER.push({ t: Date.now(), src, level, msg });
  if (LOG_BUFFER.length > 200) LOG_BUFFER.shift();
  window.dispatchEvent(new CustomEvent("cc-log"));
}

function LogPanel() {
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);
  useEffect(() => {
    const bump = () => force((v) => v + 1);
    window.addEventListener("cc-log", bump);
    let es: EventSource | null = null;
    try {
      es = new EventSource(`${API_BASE}/logs/stream`);
      es.onmessage = (m) => {
        try {
          const d = JSON.parse(m.data) as { message?: string; level?: string };
          if (d.message) pushLog("be", d.message, (d.level as any) ?? "info");
        } catch { /* keep-alive comments etc. */ }
      };
    } catch { /* SSE optional */ }
    return () => es?.close();
  }, []);
  const colorOf = (l: string) =>
    l === "error" ? "text-red-600" : l === "warn" ? "text-amber-600" : l === "ok" ? "text-emerald-700" : "text-black-ink/75";
  const errCount = LOG_BUFFER.filter((l) => l.level === "error").length;
  return (
    <div className="pointer-events-auto absolute bottom-16 left-3 max-lg:hidden">
      {open ? (
        <div className="w-[420px] max-w-[90vw] rounded-xl border-[1.5px] border-black-ink bg-[#101418]/97 p-0 text-[11px] leading-snug shadow-[4px_4px_0_rgba(0,0,0,.4)]">
          <div className="flex items-center justify-between border-b border-white/15 px-3 py-2">
            <span className="caption-caps font-bold text-white/85">SYSTEM LOG · FE + BE</span>
            <span className="flex items-center gap-2">
              {errCount > 0 && <span className="rounded-sm bg-red-600 px-1.5 text-[9px] font-bold text-white">{errCount} ERR</span>}
              <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white">✕</button>
            </span>
          </div>
          <div className="max-h-56 overflow-y-auto px-3 py-2 font-mono">
            {LOG_BUFFER.length === 0 && <p className="py-4 text-center text-white/35">waiting for activity…</p>}
            {LOG_BUFFER.map((l, i) => (
              <p key={i} className={`${colorOf(l.level)} whitespace-pre-wrap`}>
                <span className="text-white/30">{new Date(l.t).toLocaleTimeString([], { hour12: false })}</span>{" "}
                <span className={l.src === "fe" ? "text-cyan-400" : "text-violet-400"}>[{l.src.toUpperCase()}]</span>{" "}
                {l.msg}
              </p>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="relative rounded-xl border-[1.5px] border-black-ink bg-paper/95 px-3 py-2 text-xs text-black-ink/75 hover:border-signal">
          <ScrollText size={12} className="mr-1 inline" />
          Logs
          {errCount > 0 && <span className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-signal text-[9px] font-bold text-paper">{errCount}</span>}
        </button>
      )}
    </div>
  );
}

export function HUD() {
  const layout = useCityLayout();
  const cityEdges = useCity((s) => s.city.edges);
  const projectName = useCity((s) => s.city.project.name);
  const s = useCity();
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sel = layout.byId.get(s.selectedId ?? "");
  const selFn = sel?.functions.find((f) => f.name === s.selectedFn);
  const results = useMemo(
    () =>
      q
        ? layout.buildings.filter((b) => (b.name + b.districtName).toLowerCase().includes(q.toLowerCase())).slice(0, 6)
        : [],
    [q, layout],
  );
  const lines = layout.buildings.reduce((a, b) => a + b.loc, 0);

  const pick = (id: string) => {
    const b = layout.byId.get(id);
    if (!b) return;
    s.select(id);
    s.setFocus(b.pos[0], b.pos[2]);
    setQ("");
    pushLog("fe", `inspect ${b.name}`, "info");
  };

  // keyboard shortcuts
  useEffect(() => {
    const st = () => useCity.getState();
    const runLogin = () => {
      st().patch({ traffic: true, following: true });
      st().notify("🚗 POST /api/auth/login dispatched");
      pushLog("fe", "RUN ▸ POST /api/auth/login dispatched", "info");
    };
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
        if (e.key === "Escape") t.blur();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key) {
        case "/":
          e.preventDefault();
          document.querySelector<HTMLInputElement>("#city-search")?.focus();
          break;
        case "Escape":
          st().select(null);
          break;
        case "Enter":
          runLogin();
          break;
        case "t":
        case "T":
          st().patch({ traffic: !st().traffic });
          break;
        case "u":
        case "U":
          st().patch({ underground: !st().underground });
          break;
        case "f":
        case "F":
          st().patch({ following: !st().following });
          break;
        case "k":
        case "K":
          st().patch({ links: !st().links });
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    const onRunLogin = () => document.getElementById("cc-run-btn")?.click();
    const onFailPayment = () => document.getElementById("cc-fail-btn")?.click();
    window.addEventListener("cc-run-login", onRunLogin);
    window.addEventListener("cc-fail-payment", onFailPayment);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("cc-run-login", onRunLogin);
      window.removeEventListener("cc-fail-payment", onFailPayment);
    };
  }, []);

  // local static explanation (instant, no network)
  const explain = (b: NonNullable<typeof sel>, fn: NonNullable<typeof selFn>) =>
    `${fn.name}(${fn.args}) — ${fn.purpose}. It receives (${fn.args}) and returns ${fn.returns}. ` +
    `In the city, it lives inside the "${b.name}" building (${b.districtName} district). ` +
    `Requests reaching it arrive from ${
      cityEdges
        .filter((e) => e.to === b.id)
        .map((e) => layout.byId.get(e.from)?.name)
        .join(", ") || "the client"
    } and continue to ${
      cityEdges
        .filter((e) => e.from === b.id)
        .map((e) => layout.byId.get(e.to)?.name)
        .join(", ") || "nothing"
    }.`;

  // AI deep analysis of the selected building (backend LLM)
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  async function askAi(b: NonNullable<typeof sel>) {
    if (aiBusy) return;
    setAiBusy(true);
    setAiText(null);
    pushLog("fe", `AI analyze ${b.name}…`, "info");
    try {
      const projectId = useCity.getState().city.project?.id;
      const res = await apiFetch(projectId ? `/projects/${projectId}/insights` : `/insights/building`, {
        method: "POST",
        body: JSON.stringify({
          building: { id: b.id, name: b.name, kind: b.kind, loc: b.loc, health: b.health, district: b.districtName, stack: b.stack },
          connections: cityEdges.filter((e) => e.from === b.id || e.to === b.id),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
      setAiText(json.data?.analysis ?? JSON.stringify(json.data));
      pushLog("fe", `AI analysis ready for ${b.name}`, "ok");
    } catch (e) {
      setAiText(`AI unavailable: ${(e as Error).message}`);
      pushLog("fe", `AI failed: ${(e as Error).message}`, "error");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 pointer-events-none text-black-ink font-mono">
      {/* top bar — wraps on tablet */}
      <div className="absolute left-0 right-0 top-0 flex flex-wrap items-center gap-2 p-3 pointer-events-auto">
        <button
          onClick={() => {
            location.hash = "";
          }}
          title="Back to landing page"
          className="cursor-pointer rounded-xl border-[1.5px] border-black-ink bg-paper/95 px-3 py-2 font-bold transition-colors hover:text-signal"
        >
          🏙 CODECITY AI
        </button>
        <div className="max-w-[160px] truncate rounded-xl border-[1.5px] border-black-ink bg-paper/95 px-3 py-2 text-xs md:max-w-none">{projectName}</div>
        <RepoLoader />
        <div className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 sm:max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-black-ink/55" />
          <input
            id="city-search"
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a feature… e.g. payment   (press / )"
            className="w-full rounded-xl border-[1.5px] border-black-ink bg-paper/95 py-2 pl-8 pr-3 text-sm outline-none focus:border-signal"
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border-[1.5px] border-black-ink bg-paper">
              {results.map((b) => (
                <button key={b.id} onClick={() => pick(b.id)} className="block w-full px-3 py-2 text-left text-sm hover:bg-black-ink/10">
                  {b.name} <span className="text-black-ink/45">· {b.districtName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <UserChip />
        <div className="flex gap-2">
          <button
            onClick={() => s.patch({ traffic: !s.traffic })}
            className={`rounded-xl border px-2 py-2 text-xs lg:px-3 ${s.traffic ? "border-black-ink bg-black-ink text-paper" : "border-[1.5px] border-black-ink/60 bg-paper-deep"}`}
          >
            <Radio size={12} className="mr-1 inline lg:hidden xl:inline" />
            <span className="hidden lg:inline">Traffic</span>
          </button>
          <button
            onClick={() => s.patch({ underground: !s.underground })}
            className={`rounded-xl border px-2 py-2 text-xs lg:px-3 ${s.underground ? "border-black-ink bg-black-ink text-paper" : "border-[1.5px] border-black-ink/60 bg-paper-deep"}`}
          >
            <span className="hidden lg:inline">Underground</span>
            <span className="lg:hidden">Pipes</span>
          </button>
          <button
            onClick={() => s.patch({ links: !s.links })}
            className={`rounded-xl border px-2 py-2 text-xs lg:px-3 ${s.links ? "border-black-ink bg-black-ink text-paper" : "border-[1.5px] border-black-ink/60 bg-paper-deep"}`}
          >
            <span className="hidden lg:inline">Links</span>
            <span className="lg:hidden">Links</span>
          </button>
          <button
            onClick={() => s.patch({ following: !s.following })}
            className={`rounded-xl border px-2 py-2 text-xs lg:px-3 ${s.following ? "border-black-ink bg-black-ink text-paper" : "border-[1.5px] border-black-ink/60 bg-paper-deep"}`}
          >
            <span className="hidden lg:inline">Follow</span>
            <span className="lg:hidden">Cam</span>
          </button>
        </div>
      </div>

      {/* telemetry */}
      <div className="absolute left-3 top-16 grid gap-2 pointer-events-auto max-sm:grid-cols-4 max-sm:gap-1 sm:max-lg:top-28">
        {(
          [
            ["FILES", layout.buildings.length],
            ["LINES", lines],
            ["DISTRICTS", layout.districts.length],
            ["BOTTLENECKS", layout.buildings.filter((b) => b.health !== "ok").length],
          ] as [string, string | number][]
        ).map(([k, v]) => (
          <div key={k} className="rounded-xl border-[1.5px] border-black-ink bg-paper/95 px-3 py-2 text-xs">
            <div className="text-black-ink/55">{k}</div>
            <div className="text-lg font-bold text-signal">{v}</div>
          </div>
        ))}
      </div>

      {/* hero controls */}
      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 pointer-events-auto max-md:bottom-24">
        <LatencyButtons />
        <button
          onClick={() => {
            s.patch({ traffic: true, following: true });
            s.notify("🚗 POST /api/auth/login dispatched");
            pushLog("fe", "RUN ▸ POST /api/auth/login dispatched", "info");
          }}
          id="cc-run-btn" className="rounded-xl border-[1.5px] border-black-ink bg-black-ink px-3 py-2 text-sm font-bold text-paper shadow-[4px_4px_0_rgba(20,20,20,.35)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_rgba(20,20,20,.35)] md:px-5 md:py-3"
        >
          <Play size={14} className="mr-1 inline" />
          RUN LOGIN
        </button>
        <button
          onClick={() => {
            const next = !s.failing;
            s.patch({ failing: next });
            if (next) {
              const failB = layout.byId.get(s.failingId ?? "") ?? layout.byId.get("be-payctrl");
              s.notify("❌ Payment pipeline failed — 500", failB ? undefined : undefined, "error");
              if (failB) {
                s.pushHealth({ buildingId: failB.id, name: failB.name, kind: "error", detail: "payment POST → 500 · circuit open" });
                pushLog("fe", `FAIL ▸ ${failB.name} returns 500`, "error");
                pushLog("be", `[http] POST /api/v1/payments -> 500 (circuit open at ${failB.name})`, "error");
              }
            }
          }}
          id="cc-fail-btn" className="misreg rounded-xl border-[1.5px] border-black-ink bg-signal px-3 py-2 text-xs font-bold text-paper md:py-3"
        >
          <Bug size={12} className="mr-1 inline" />
          FAIL PAYMENT
        </button>
      </div>

      {/* notifications bottom-right */}
      <div className="pointer-events-auto absolute bottom-4 right-3 z-30 grid w-72 gap-2 max-md:bottom-40 max-md:left-3 max-md:right-3 max-md:w-auto">
        {s.notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              if (n.target) pick(n.target);
            }}
            className="rounded-xl border-[1.5px] border-black-ink bg-paper px-3 py-2 text-left text-xs hover:bg-red-500/20"
          >
            {n.text}
          </button>
        ))}
      </div>

      {/* right rail — alerts, inspector and atmosphere stack in one flow column
          so they can never overlap each other regardless of alert count */}
      <div className="pointer-events-none absolute right-3 top-16 z-30 flex max-h-[calc(100vh-160px)] w-80 max-w-[calc(100vw-24px)] flex-col items-stretch gap-2 overflow-y-auto max-md:left-3 max-md:right-3 max-md:w-auto">
        <AlertStack />
        {/* inspector */}
        {sel && (
          <div
          className="z-20 max-h-[62vh] w-full overflow-auto rounded-xl border-[1.5px] border-black-ink bg-paper/97 p-4 text-sm pointer-events-auto max-md:max-h-[46vh]">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-signal">{sel.name}</div>
                <div className="text-xs text-black-ink/55">
                  {sel.districtName} · {sel.kind} · {sel.loc} LOC ·{" "}
                  <span className={sel.health === "ok" ? "text-black-ink" : "text-signal"}>{sel.health}</span>
                </div>
              </div>
              <button onClick={() => s.select(null)} className="text-black-ink/45 hover:text-black-ink">
                ✕
              </button>
            </div>

            {/* CONNECTIONS */}
            <div className="mt-3 text-xs font-bold text-black-ink/55">CONNECTIONS</div>
            <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-black-ink/40 bg-paper-deep p-2">
                <div className="mb-1 font-bold">◀ CALLERS ({cityEdges.filter((e) => e.to === sel.id).length})</div>
                {cityEdges.filter((e) => e.to === sel.id).map((e) => (
                  <button key={e.from + e.to} onClick={() => pick(e.from)} className="block w-full truncate text-left underline decoration-dotted hover:text-signal">
                    {layout.byId.get(e.from)?.name ?? e.from}
                  </button>
                ))}
                {cityEdges.filter((e) => e.to === sel.id).length === 0 && <span className="text-black-ink/40">client requests only</span>}
              </div>
              <div className="rounded-lg border border-black-ink/40 bg-paper-deep p-2">
                <div className="mb-1 font-bold">CALLS ({cityEdges.filter((e) => e.from === sel.id).length}) ▶</div>
                {cityEdges.filter((e) => e.from === sel.id).map((e) => (
                  <button key={e.from + e.to} onClick={() => pick(e.to)} className="block w-full truncate text-left underline decoration-dotted hover:text-signal">
                    {layout.byId.get(e.to)?.name ?? e.to}
                  </button>
                ))}
                {cityEdges.filter((e) => e.from === sel.id).length === 0 && <span className="text-black-ink/40">nothing downstream</span>}
              </div>
            </div>

            <div className="mt-3 text-xs font-bold text-black-ink/55">FUNCTIONS</div>
            {sel.functions.length === 0 && <div className="text-xs text-black-ink/45">none extracted</div>}
            {sel.functions.map((f) => (
              <button
                key={f.name}
                onClick={() => s.select(sel.id, f.name)}
                className={`mt-1 block w-full rounded border px-2 py-1 text-left text-xs ${
                  s.selectedFn === f.name ? "border-signal bg-signal/10" : "border-black-ink/40"
                }`}
              >
                {f.name}({f.args})
              </button>
            ))}
            {selFn && (
              <div className="mt-3 rounded-lg border-[1.5px] border-black-ink bg-paper-deep p-3 text-xs">
                <div className="mb-1 font-bold text-signal">WHAT THIS DOES</div>
                {explain(sel, selFn)}
              </div>
            )}

            {/* AI GUIDE */}
            <div className="mt-3 rounded-lg border-[1.5px] border-black-ink bg-black-ink p-3 text-xs text-paper">
              <div className="mb-1 caption-caps flex items-center justify-between font-bold">
                <span className="text-signal">🤖 AI GUIDE — DEEP ANALYSIS</span>
                <button onClick={() => void askAi(sel)} disabled={aiBusy}
                  className="rounded border border-paper/40 px-2 py-0.5 text-[10px] font-bold text-paper hover:border-signal hover:text-signal disabled:opacity-50">
                  {aiBusy ? "THINKING…" : "ANALYZE"}
                </button>
              </div>
              {!aiText && !aiBusy && (
                <p className="text-paper/60">
                  Ask the AI about “{sel.name}”: what it does, how it connects, hidden risks and better patterns.
                </p>
              )}
              {aiBusy && (
                <p className="animate-pulse text-paper/60">
                  Scanning {sel.name}, its {cityEdges.filter((e) => e.from === sel.id || e.to === sel.id).length} links and district context…
                </p>
              )}
              {aiText && <p className="whitespace-pre-wrap leading-relaxed text-paper/90">{aiText}</p>}
            </div>

            {/* improvement guide shortcut */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("cc-open-guide"))}
              className="mt-2 block w-full rounded-lg border-[1.5px] border-black-ink bg-paper-deep px-3 py-2 text-left text-xs font-bold hover:border-signal"
            >
              📐 Open full IMPROVEMENT GUIDE →
            </button>
          </div>
        )}
        <WeatherPanel />
      </div>
      <LegendPanel />
      <Minimap />
      <LogPanel />
      <ImprovementGuide />
    </div>
  );
}

/* ── AI improvement guide — repo-wide advice panel ── */
function ImprovementGuide() {
  const [open, setOpen] = useState(false);
  const L = useCityLayout();
  const edges = useCity((s) => s.city.edges);
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("cc-open-guide", openIt);
    return () => window.removeEventListener("cc-open-guide", openIt);
  }, []);

  async function generate() {
    setBusy(true);
    setText(null);
    try {
      const hotspots = L.buildings
        .slice()
        .sort((a: typeof L.buildings[number], b: typeof L.buildings[number]) => b.loc - a.loc)
        .slice(0, 8)
        .map((b) => ({ id: b.id, name: b.name, kind: b.kind, loc: b.loc, health: b.health }));
      const broken = L.buildings.filter((b) => b.health !== "ok").map((b) => ({ id: b.id, name: b.name, health: b.health }));
      const projectId = useCity.getState().city.project?.id;
      const res = await apiFetch(projectId ? `/projects/${projectId}/improvements` : `/insights/improvements`, {
        method: "POST",
        body: JSON.stringify({ stats: { buildings: L.buildings.length, districts: L.districts.length }, hotspots, broken }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? `HTTP ${res.status}`);
      setText(json.data?.guide ?? JSON.stringify(json.data));
    } catch (e) {
      setText(`AI unavailable: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        className="pointer-events-auto absolute bottom-[240px] right-[344px] rounded-xl border-[1.5px] border-black-ink bg-paper/95 px-3 py-2 text-xs font-bold hover:border-signal max-lg:hidden"
      >
        📐 Improvement Guide
      </button>
    );

  return (
    <div className="pointer-events-auto absolute inset-x-4 top-16 bottom-16 z-40 mx-auto flex max-w-xl flex-col overflow-hidden rounded-xl border-[1.5px] border-black-ink bg-paper/98 shadow-[6px_6px_0_rgba(0,0,0,.4)] max-md:inset-x-2">
      <div className="flex items-center justify-between border-b-[1.5px] border-black-ink px-4 py-3">
        <span className="caption-caps font-bold">📐 AI IMPROVEMENT GUIDE — {L.buildings.length} BUILDINGS SCANNED</span>
        <button onClick={() => setOpen(false)} className="text-black-ink/45 hover:text-signal">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 text-sm leading-relaxed">
        {!text && !busy && (
          <>
            <p className="mb-3 text-black-ink/70">
              The architect reads your whole city — sizes ({L.buildings.reduce((a: number, b) => a + b.loc, 0).toLocaleString()} LOC), districts,
              {edges.length} connections and {L.buildings.filter((b) => b.health !== "ok").length} unhealthy buildings — then returns:
            </p>
            <ul className="list-disc space-y-1 pl-5 text-black-ink/80">
              <li>Broken or risky code and <b>how to fix each one</b></li>
              <li>Refactors: split oversized files, extract shared services</li>
              <li>Better patterns for your framework &amp; stack</li>
              <li>Architecture-level moves (caching, queues, boundaries)</li>
            </ul>
          </>
        )}
        {busy && <p className="animate-pulse text-black-ink/55">Reading the whole city… this can take ~20s.</p>}
        {text && <div className="whitespace-pre-wrap">{text}</div>}
      </div>
      <div className="border-t-[1.5px] border-black-ink p-3">
        <button onClick={() => void generate()} disabled={busy}
          className="w-full rounded-xl border-[1.5px] border-black-ink bg-black-ink py-2 text-sm font-bold text-paper hover:text-signal disabled:opacity-50">
          {busy ? "SCANNING…" : text ? "REGENERATE" : "SCAN CITY WITH AI"}
        </button>
      </div>
    </div>
  );
}

/* ── starlight engine: bottom-left minimap — cached plate + dynamic overlay ── */
function Minimap() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const focus = useCity((st) => st.focus);
  const LAYOUT = useCityLayout();
  const healthEvents = useCity((st) => st.healthEvents);
  const plateRef = useRef<HTMLCanvasElement | null>(null);

  // draw the static plate ONCE per layout — streets, river, blocks don't change
  useEffect(() => {
    const c = document.createElement("canvas");
    c.width = 160; c.height = 160;
    const g = c.getContext("2d")!;
    const S = 160, k = S / 200, ox = S / 2, oz = 30 * k;
    const X = (wx: number) => ox + wx * k;
    const Z = (wz: number) => oz + wz * k;

    // paper ground
    g.fillStyle = "#f2efe3"; g.fillRect(0, 0, S, S);

    // faint baseline grid
    g.strokeStyle = "rgba(20,20,20,.08)"; g.lineWidth = 1;
    g.beginPath();
    for (let wx = -75; wx <= 75; wx += 25) { g.moveTo(X(wx), 0); g.lineTo(X(wx), S); }
    for (let wz = -55; wz <= 125; wz += 30) { g.moveTo(0, Z(wz)); g.lineTo(S, Z(wz)); }
    g.stroke();

    // river wash between hairlines
    g.fillStyle = "rgba(34,120,150,.18)";
    g.fillRect(X(-5), Z(-77), 10 * k, 110 * k);
    g.strokeStyle = "rgba(20,20,20,.28)"; g.lineWidth = 1;
    g.beginPath();
    g.moveTo(X(-5), Z(-77)); g.lineTo(X(-5), Z(33));
    g.moveTo(X(5), Z(-77)); g.lineTo(X(5), Z(33));
    g.stroke();

    // streets — thin ink; highways heavy; bridges dashed
    g.lineCap = "round";
    for (const r of LAYOUT.roads) {
      if (r.kind === "road") {
        g.strokeStyle = "rgba(20,20,20,.38)"; g.lineWidth = Math.max(1, r.w * k * 0.4);
        g.setLineDash([]);
      } else if (r.kind === "highway") {
        g.strokeStyle = "#141414"; g.lineWidth = Math.max(1.5, r.w * k * 0.62);
        g.setLineDash([]);
      } else {
        g.strokeStyle = "#141414"; g.lineWidth = Math.max(1.5, r.w * k * 0.62);
        g.setLineDash([4, 3]);
      }
      g.beginPath(); g.moveTo(X(r.a[0]), Z(r.a[1])); g.lineTo(X(r.b[0]), Z(r.b[1])); g.stroke();
    }
    g.setLineDash([]);

    // districts — outlined blocks, light tint
    for (const d of LAYOUT.districts) {
      const w = d.stack === "database" ? 46 : 24, h = d.stack === "database" ? 14 : 20;
      g.fillStyle = "rgba(20,20,20,.07)";
      g.fillRect(X(d.center[0] - w / 2), Z(d.center[1] - h / 2), w * k, h * k);
      g.strokeStyle = "rgba(20,20,20,.55)"; g.lineWidth = 1;
      g.strokeRect(X(d.center[0] - w / 2), Z(d.center[1] - h / 2), w * k, h * k);
    }

    // buildings — set in ink
    g.fillStyle = "rgba(20,20,20,.85)";
    for (const b of LAYOUT.buildings) g.fillRect(X(b.pos[0]) - 1, Z(b.pos[2]) - 1, 2.2, 2.2);

    // toll plaza mark — red square on the west approach
    g.fillStyle = "#e30613";
    g.fillRect(X(LAYOUT.toll.x) - 2, Z(LAYOUT.toll.z) - 2, 4, 4);

    // plate furniture — corner ticks + north arrow
    g.strokeStyle = "rgba(20,20,20,.5)"; g.lineWidth = 1;
    const T = 7, m = 4;
    g.beginPath();
    g.moveTo(m, m + T); g.lineTo(m, m); g.lineTo(m + T, m);
    g.moveTo(S - m - T, m); g.lineTo(S - m, m); g.lineTo(S - m, m + T);
    g.moveTo(m, S - m - T); g.lineTo(m, S - m); g.lineTo(m + T, S - m);
    g.moveTo(S - m - T, S - m); g.lineTo(S - m, S - m); g.lineTo(S - m, S - m - T);
    g.stroke();
    g.fillStyle = "#141414";
    g.beginPath(); g.moveTo(S - 13, 26); g.lineTo(S - 16, 34); g.lineTo(S - 10, 34); g.closePath(); g.fill();
    g.font = "700 7px Archivo, Helvetica, sans-serif";
    g.textAlign = "center";
    g.fillText("N", S - 13, 42);

    plateRef.current = c;
  }, [LAYOUT]);

  // dynamic layer: focus pulse + incident pins — throttled to ~12fps, tiny redraw
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0; let last = 0;
    const draw = (t: number) => {
      raf = requestAnimationFrame(draw);
      if (t - last < 80) return; // 12fps is plenty for a pulsing dot
      last = t;
      const view = canvas.current; const plate = plateRef.current;
      if (!view || !plate) return;
      const g = view.getContext("2d")!;
      g.clearRect(0, 0, view.width, view.height);
      g.drawImage(plate, 0, 0);

      const S = view.width, k = S / 200, ox = S / 2, oz = 30 * k;
      const X = (wx: number) => ox + wx * k;
      const Z = (wz: number) => oz + wz * k;
      const SIGNAL = "#e30613";

      // incident pins — amber warn / red error
      for (const ev of healthEvents) {
        const b = LAYOUT.byId.get(ev.buildingId);
        if (!b) continue;
        g.fillStyle = ev.kind === "error" ? SIGNAL : "#f59e0b";
        g.beginPath(); g.arc(X(b.pos[0]), Z(b.pos[2]), 3, 0, Math.PI * 2); g.fill();
        g.strokeStyle = "#141414"; g.lineWidth = 0.75;
        g.beginPath(); g.arc(X(b.pos[0]), Z(b.pos[2]), 3, 0, Math.PI * 2); g.stroke();
      }

      // focus — signal red with misregistration ghost + pulse
      const fx = focus ? X(focus.x) : X(0), fz = focus ? Z(focus.z) : Z(0);
      const tt = performance.now() / 1000;
      g.globalAlpha = 0.5; g.fillStyle = SIGNAL;
      g.beginPath(); g.arc(fx - 1, fz + 1, 2.5, 0, Math.PI * 2); g.fill();
      g.globalAlpha = 1;
      g.beginPath(); g.arc(fx, fz, 2.5, 0, Math.PI * 2); g.fill();
      if (!reduced) {
        g.strokeStyle = SIGNAL; g.lineWidth = 1;
        g.globalAlpha = 0.62 - 0.28 * Math.sin(tt * 2.4);
        g.beginPath(); g.arc(fx, fz, 5.5 + Math.sin(tt * 2.4) * 1.5, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 1;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [focus, LAYOUT, healthEvents]);

  return (
    <div className="pointer-events-auto absolute bottom-[118px] left-3 w-[179px] select-none max-lg:hidden">
      {/* plate frame — printed pass around the map */}
      <div className="border-[1.5px] border-black-ink bg-paper-deep p-1.5 shadow-[4px_4px_0_rgba(0,0,0,.35)]">
        <div className="mb-1.5 flex items-center justify-between border-b-[1.5px] border-black-ink px-1 pb-1">
          <span className="caption-caps font-bold text-black-ink">City Plan</span>
          <span aria-hidden className="inline-block h-[7px] w-[7px] bg-signal" />
        </div>
        <canvas ref={canvas} width={164} height={164}
          className="block w-full cursor-crosshair"
          onClick={(e) => {
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const sx = r.width / 164, sy = r.height / 164;
            const k = 164 / 200, ox = 82, oz = 30 * k;
            useCity.getState().setFocus((e.clientX - r.left - ox * sx) / (k * sx), (e.clientY - r.top - oz * sy) / (k * sy));
          }}
        />
      </div>
      <p className="caption-caps mt-1.5 text-[9px] leading-none text-black-ink/60">Fig. 05 — click to navigate · pins = incidents</p>
    </div>
  );
}

function LegendPanel() {
  const layout = useCityLayout();
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    layout.buildings.forEach((b) => m.set(b.kind, (m.get(b.kind) ?? 0) + 1));
    return m;
  }, [layout]);
  return (
    <div className="absolute bottom-4 left-3 pointer-events-auto max-md:bottom-40">
      {open ? (
        <div className="w-56 rounded-none border-[1.5px] border-black-ink bg-paper/95 p-3 text-xs">
          <button onClick={() => setOpen(false)} className="float-right text-black-ink/45 hover:text-black-ink">
            ✕
          </button>
          <div className="mb-2 font-bold text-black-ink/75">BUILDING LEGEND</div>
          <div className="grid grid-cols-2 gap-y-1">
            {(Object.keys(KIND_COLOR) as (keyof typeof KIND_COLOR)[]).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: KIND_COLOR[k] }} />
                <span className="text-black-ink/75">{k}</span>
                <span className="text-black-ink/45">×{counts.get(k) ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 border-t border-black-ink/30 pt-2 text-[10px] leading-relaxed text-black-ink/55">
            <Keyboard size={10} className="mr-1 inline" />
            <b>/</b> search · <b>Enter</b> run login · <b>T</b> traffic · <b>U</b> pipes · <b>K</b> links · <b>F</b> follow ·{" "}
            <b>Esc</b> close
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-xl border-[1.5px] border-black-ink bg-paper/95 px-3 py-2 text-xs text-black-ink/75 hover:border-signal"
        >
          ☰ Legend &amp; keys
        </button>
      )}
    </div>
  );
}
