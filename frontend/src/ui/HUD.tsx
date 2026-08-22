import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Play, Bug, Radio, Keyboard, GitBranch, LogOut, CloudRain, CloudLightning, CloudDrizzle, CloudFog, Snowflake, Sun } from "lucide-react";
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
    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900/80 px-2.5 py-2">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 text-[10px] font-bold text-slate-950">
        {user.name.slice(0, 1).toUpperCase()}
      </span>
      <span className="hidden max-w-[90px] truncate font-mono text-[11px] text-slate-300 lg:block">{user.name}</span>
      <button onClick={signOut} title="Sign out" className="text-slate-500 transition-colors hover:text-rose-300">
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
    setBusy(true);
    try {
      if (!useAuth.getState().token) {
        throw new Error("sign in first — ⌘K → Sign in / Create account");
      }

      // 1. create a project for the repo
      const repoUrl = /^https?:\/\//i.test(target) ? target : `https://${target}`;
      const name = decodeURIComponent(repoUrl.split("?")[0].replace(/\/+$/, "").split("/").pop() || "repo");
      const projRes = await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({ name, repoUrl }),
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
        const stRes = await fetch(`${API_BASE}/analyses/${analysisId}/status`, {
          headers: { Authorization: `Bearer ${useAuth.getState().token ?? ""}` },
        });
        const stJson = await stRes.json();
        if (!stRes.ok) throw new Error(stJson.message ?? `HTTP ${stRes.status}`);
        status = stJson.data.status as string;
        if (status !== "running") break;
      }
      if (status !== "completed") throw new Error(`analysis ${status} — check backend logs`);

      // 4. fetch the validated city architecture
      const archRes = await fetch(`${API_BASE}/projects/${projectId}/architecture`, {
        headers: { Authorization: `Bearer ${useAuth.getState().token ?? ""}` },
      });
      const archJson = await archRes.json();
      if (!archRes.ok) throw new Error(archJson.message ?? `HTTP ${archRes.status}`);

      const city = architectureToCity(archJson.data);
      const files = city.districts.reduce((a, d) => a + d.buildings.length, 0);
      setCity(city);
      notify(`🏙 Loaded ${city.project.name} — ${files} buildings`, undefined, "success");
    } catch (e) {
      notify(`⚠ Backend failed: ${(e as Error).message}. Is it running on :5000?`, undefined, "error");
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
      <GitBranch size={14} className="absolute left-3 top-3 text-slate-400" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load()}
        placeholder="github.com/owner/repo"
        className="w-56 pl-8 pr-2 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm outline-none focus:border-emerald-500"
      />
      <button
        onClick={() => load()}
        disabled={busy}
        className={`ml-1 px-3 py-2 rounded-xl border text-xs font-bold ${
          busy ? "bg-slate-800 border-slate-700 text-slate-500" : "bg-emerald-500/20 border-emerald-500 text-emerald-300 hover:bg-emerald-500/30"
        }`}
      >
        {busy ? "Building…" : "Build City"}
      </button>
    </div>
  );
}

/* ── starlight engine: atmosphere panel (weather · time · sound) ── */
function WeatherPanel() {
  const s = useCity();
  return (
    <div className="absolute right-3 top-[248px] w-52 pointer-events-auto rounded-xl bg-slate-900/85 backdrop-blur border border-slate-700 p-3">
      <div className="text-[10px] tracking-widest text-slate-400 mb-2">ATMOSPHERE</div>
      <div className="flex gap-1.5">
        {([["clear", Sun], ["drizzle", CloudDrizzle], ["rain", CloudRain], ["storm", CloudLightning], ["snow", Snowflake], ["fog", CloudFog]] as const).map(([w, Ico]) => (
          <button key={w} onClick={() => s.patch({ weather: w, live: false })} title={w}
            className={`flex-1 py-1.5 rounded-lg border text-xs ${s.weather === w ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-900/80 border-slate-700"}`}>
            <Ico size={13} className="inline" />
          </button>))}
      </div>
      <button onClick={() => { const on = !s.sound; s.patch({ sound: on }); setAudioEnabled(on); }}
        className={`w-full mt-2 py-1.5 rounded-lg border text-xs ${s.sound ? "bg-emerald-500/20 border-emerald-500 text-emerald-300" : "bg-slate-900/80 border-slate-700"}`}>
        {s.sound ? "🔊 Sound on" : "🔇 Sound off"}
      </button>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <span>{String(Math.floor(s.time)).padStart(2, "0")}:{String(Math.round((s.time % 1) * 60)).padStart(2, "0")}</span>
        <input type="range" min={0} max={24} step={0.1} value={s.time} onChange={(e) => s.patch({ time: +e.target.value, autoCycle: false })} className="flex-1 accent-cyan-400" />
      </div>
      <label className="mt-1 flex items-center gap-2 text-xs text-slate-400">
        <input type="checkbox" checked={s.autoCycle} onChange={(e) => s.patch({ autoCycle: e.target.checked })} className="accent-cyan-400" />
        Auto day–night cycle
      </label>
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
  };

  // keyboard shortcuts
  useEffect(() => {
    const st = () => useCity.getState();
    const runLogin = () => {
      st().patch({ traffic: true, following: true });
      st().notify("🚗 POST /api/auth/login dispatched");
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
    // bridges for the command palette / landing page
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

  return (
    <div className="absolute inset-0 pointer-events-none text-slate-100 font-mono">
      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-3 pointer-events-auto">
        <button
          onClick={() => {
            location.hash = "";
          }}
          title="Back to landing page"
          className="cursor-pointer px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur border border-cyan-500/40 font-bold text-cyan-400 transition-colors hover:border-cyan-400"
        >
          🏙 CODECITY AI
        </button>
        <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs">{projectName}</div>
        <RepoLoader />
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            id="city-search"
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a feature… e.g. payment   (press / )"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-sm outline-none focus:border-cyan-500"
          />
          {results.length > 0 && (
            <div className="absolute mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 overflow-hidden z-10">
              {results.map((b) => (
                <button key={b.id} onClick={() => pick(b.id)} className="block w-full text-left px-3 py-2 text-sm hover:bg-cyan-500/20">
                  {b.name} <span className="text-slate-500">· {b.districtName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <UserChip />
        <div className="flex gap-2">
          <button
            onClick={() => s.patch({ traffic: !s.traffic })}
            className={`px-3 py-2 rounded-xl border text-xs ${s.traffic ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-900/80 border-slate-700"}`}
          >
            <Radio size={12} className="inline mr-1" />
            Traffic
          </button>
          <button
            onClick={() => s.patch({ underground: !s.underground })}
            className={`px-3 py-2 rounded-xl border text-xs ${s.underground ? "bg-cyan-500/20 border-cyan-500 text-cyan-300" : "bg-slate-900/80 border-slate-700"}`}
          >
            Underground
          </button>
          <button
            onClick={() => s.patch({ links: !s.links })}
            className={`px-3 py-2 rounded-xl border text-xs ${s.links ? "bg-violet-500/20 border-violet-500 text-violet-300" : "bg-slate-900/80 border-slate-700"}`}
          >
            Links
          </button>
          <button
            onClick={() => s.patch({ following: !s.following })}
            className={`px-3 py-2 rounded-xl border text-xs ${s.following ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300" : "bg-slate-900/80 border-slate-700"}`}
          >
            Follow-cam
          </button>
        </div>
      </div>

      {/* telemetry */}
      <div className="absolute left-3 top-16 grid gap-2 pointer-events-auto">
        {(
          [
            ["FILES", layout.buildings.length],
            ["LINES", lines],
            ["SECURITY", "87"],
            ["BOTTLENECKS", layout.buildings.filter((b) => b.health !== "ok").length],
          ] as [string, string | number][]
        ).map(([k, v]) => (
          <div key={k} className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs">
            <div className="text-slate-400">{k}</div>
            <div className="text-lg font-bold text-cyan-300">{v}</div>
          </div>
        ))}
      </div>

      {/* hero controls */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={() => {
            s.patch({ traffic: true, following: true });
            s.notify("🚗 POST /api/auth/login dispatched");
          }}
          id="cc-run-btn" className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#f8fafc] via-[#cbd5e1] to-[#94a3b8] text-[#0b1222] font-bold text-sm shadow-[0_0_24px_rgba(226,232,240,.5)]"
        >
          <Play size={14} className="inline mr-1" />
          RUN LOGIN
        </button>
        {(["fast", "medium", "slow"] as const).map((l) => (
          <button
            key={l}
            onClick={() => s.patch({ latency: l })}
            className={`px-3 py-3 rounded-xl border text-xs ${s.latency === l ? "bg-slate-700 border-slate-500" : "bg-slate-900/80 border-slate-700"}`}
          >
            {l === "fast" ? "🟢 80ms" : l === "medium" ? "🟡 300ms" : "🔴 2s"}
          </button>
        ))}
        <button
          onClick={() => {
            s.patch({ failing: !s.failing });
            if (!s.failing) s.notify("❌ Payment API failed — 500", "be-payctrl");
          }}
          id="cc-fail-btn" className="px-3 py-3 rounded-xl bg-red-600/90 border border-red-500 text-xs font-bold"
        >
          <Bug size={12} className="inline mr-1" />
          FAIL PAYMENT
        </button>
      </div>

      {/* notifications */}
      <div className="absolute right-3 bottom-4 grid gap-2 pointer-events-auto w-72">
        {s.notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => {
              if (n.target) pick(n.target);
            }}
            className="text-left px-3 py-2 rounded-xl bg-slate-900/90 border border-red-500/50 text-xs hover:bg-red-500/20"
          >
            {n.text} — click to inspect
          </button>
        ))}
      </div>

      {/* inspector */}
      {sel && (
        <div className="absolute right-3 top-16 w-80 max-h-[70vh] overflow-auto rounded-xl bg-slate-900/90 backdrop-blur border border-slate-700 p-4 pointer-events-auto text-sm">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-cyan-300">{sel.name}</div>
              <div className="text-xs text-slate-400">
                {sel.districtName} · {sel.kind} · {sel.loc} LOC ·{" "}
                <span className={sel.health === "ok" ? "text-green-400" : "text-red-400"}>{sel.health}</span>
              </div>
            </div>
            <button onClick={() => s.select(null)} className="text-slate-500 hover:text-white">
              ✕
            </button>
          </div>
          <div className="mt-3 text-xs font-bold text-slate-400">FUNCTIONS</div>
          {sel.functions.length === 0 && <div className="text-xs text-slate-500">none extracted</div>}
          {sel.functions.map((f) => (
            <button
              key={f.name}
              onClick={() => s.select(sel.id, f.name)}
              className={`block w-full text-left mt-1 px-2 py-1 rounded border text-xs ${
                s.selectedFn === f.name ? "border-cyan-500 bg-cyan-500/10" : "border-slate-700"
              }`}
            >
              {f.name}({f.args})
            </button>
          ))}
          {selFn && (
            <div className="mt-3 rounded-lg bg-slate-800/80 border border-fuchsia-500/40 p-3 text-xs">
              <div className="font-bold text-fuchsia-300 mb-1"> AI GUIDE</div>
              {explain(sel, selFn)}
            </div>
          )}
        </div>
      )}

      <LegendPanel />
      <WeatherPanel />
      <Minimap />
    </div>
  );
}

/* ── starlight engine: bottom-left minimap (districts · river · focus dot) ── */
function Minimap() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const focus = useCity((st) => st.focus);
  const LAYOUT = useCityLayout();
  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const c = canvas.current; if (!c) return;
      const g = c.getContext("2d")!;
      const S = c.width, k = S / 200, ox = S / 2, oz = 30 * k; // world x∈[-100,100], z∈[-70,130]
      g.clearRect(0, 0, S, S);
      g.fillStyle = "rgba(7,11,24,.72)"; g.fillRect(0, 0, S, S);
      g.fillStyle = "rgba(16,60,90,.8)";
      g.fillRect(ox - 5 * k, (-77) * k + oz, 10 * k, 110 * k); // river
      for (const d of LAYOUT.districts) {
        const w = d.stack === "database" ? 46 : 24, h = d.stack === "database" ? 14 : 20;
        g.fillStyle = d.stack === "frontend" ? "rgba(56,189,248,.45)" : d.stack === "backend" ? "rgba(251,146,60,.45)" : d.stack === "database" ? "rgba(52,211,153,.5)" : "rgba(129,140,248,.45)";
        g.fillRect(ox + (d.center[0] - w / 2) * k, oz + (d.center[1] - h / 2) * k, w * k, h * k);
      }
      g.fillStyle = "rgba(226,240,255,.85)";
      for (const b of LAYOUT.buildings) g.fillRect(ox + b.pos[0] * k - 1, oz + b.pos[2] * k - 1, 2.4, 2.4);
      const fx = focus ? ox + focus.x * k : ox, fz = focus ? oz + focus.z * k : oz;
      g.fillStyle = "#22d3ee";
      g.beginPath(); g.arc(fx, fz, 3, 0, Math.PI * 2); g.fill();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [focus]);
  return (
    <canvas ref={canvas} width={160} height={160}
      className="absolute left-3 bottom-[220px] rounded-xl border border-slate-700 pointer-events-auto cursor-crosshair"
      onClick={(e) => {
        const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
        const k = 160 / 200, ox = 80, oz = 30 * k;
        useCity.getState().setFocus((e.clientX - r.left - ox) / k, (e.clientY - r.top - oz) / k);
      }}
    />
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
    <div className="absolute bottom-4 left-3 pointer-events-auto">
      {open ? (
        <div className="w-56 rounded-xl bg-slate-900/85 backdrop-blur border border-slate-700 p-3 text-xs">
          <button onClick={() => setOpen(false)} className="float-right text-slate-500 hover:text-white">
            ✕
          </button>
          <div className="font-bold text-slate-300 mb-2">BUILDING LEGEND</div>
          <div className="grid grid-cols-2 gap-y-1">
            {(Object.keys(KIND_COLOR) as (keyof typeof KIND_COLOR)[]).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: KIND_COLOR[k] }} />
                <span className="text-slate-300">{k}</span>
                <span className="text-slate-500">×{counts.get(k) ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-slate-700 text-[10px] leading-relaxed text-slate-400">
            <Keyboard size={10} className="inline mr-1" />
            <b>/</b> search · <b>Enter</b> run login · <b>T</b> traffic · <b>U</b> pipes · <b>K</b> links · <b>F</b> follow ·{" "}
            <b>Esc</b> close
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs text-slate-300 hover:border-cyan-500/60"
        >
          ☰ Legend &amp; keys
        </button>
      )}
    </div>
  );
}
