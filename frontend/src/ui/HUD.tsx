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
      <GitBranch size={14} className="absolute left-3 top-3 text-black-ink/55" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && load()}
        placeholder="github.com/owner/repo"
        className="w-56 pl-8 pr-2 py-2 rounded-xl bg-paper/95 border-[1.5px] border-black-ink text-sm outline-none focus:border-signal"
      />
      <button
        onClick={() => load()}
        disabled={busy}
        className={`ml-1 px-3 py-2 rounded-xl border text-xs font-bold ${
          busy ? "bg-paper/60 border-[1.5px] border-black-ink/40 text-black-ink/40" : "bg-black-ink text-paper border-[1.5px] border-black-ink hover:text-signal"
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
    <div className="absolute right-3 top-[248px] w-52 pointer-events-auto rounded-none bg-paper/95 border-[1.5px] border-black-ink p-3">
      <div className="caption-caps font-bold mb-2">ATMOSPHERE</div>
      <div className="flex gap-1.5">
        {([["clear", Sun], ["drizzle", CloudDrizzle], ["rain", CloudRain], ["storm", CloudLightning], ["snow", Snowflake], ["fog", CloudFog]] as const).map(([w, Ico]) => (
          <button key={w} onClick={() => s.patch({ weather: w, live: false })} title={w}
            className={`flex-1 py-1.5 rounded-lg border text-xs ${s.weather === w ? "bg-black-ink text-paper border-black-ink" : "bg-paper-deep border-[1.5px] border-black-ink/60"}`}>
            <Ico size={13} className="inline" />
          </button>))}
      </div>
      <button onClick={() => { const on = !s.sound; s.patch({ sound: on }); setAudioEnabled(on); }}
        className={`w-full mt-2 py-1.5 rounded-lg border text-xs ${s.sound ? "bg-black-ink text-paper border-black-ink" : "bg-paper-deep border-[1.5px] border-black-ink/60"}`}>
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
    <div className="absolute inset-0 pointer-events-none text-black-ink font-mono">
      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-3 pointer-events-auto">
        <button
          onClick={() => {
            location.hash = "";
          }}
          title="Back to landing page"
          className="cursor-pointer px-3 py-2 rounded-xl bg-paper/95 border-[1.5px] border-black-ink font-bold transition-colors hover:text-signal"
        >
          🏙 CODECITY AI
        </button>
        <div className="px-3 py-2 rounded-xl bg-paper/95 border-[1.5px] border-black-ink text-xs">{projectName}</div>
        <RepoLoader />
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-black-ink/55" />
          <input
            id="city-search"
            ref={searchRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Find a feature… e.g. payment   (press / )"
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-paper/95 border-[1.5px] border-black-ink text-sm outline-none focus:border-signal"
          />
          {results.length > 0 && (
            <div className="absolute mt-1 w-full rounded-xl bg-paper border-[1.5px] border-black-ink overflow-hidden z-10">
              {results.map((b) => (
                <button key={b.id} onClick={() => pick(b.id)} className="block w-full text-left px-3 py-2 text-sm hover:bg-black-ink/10">
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
            className={`px-3 py-2 rounded-xl border text-xs ${s.traffic ? "bg-black-ink text-paper border-black-ink" : "bg-paper-deep border-[1.5px] border-black-ink/60"}`}
          >
            <Radio size={12} className="inline mr-1" />
            Traffic
          </button>
          <button
            onClick={() => s.patch({ underground: !s.underground })}
            className={`px-3 py-2 rounded-xl border text-xs ${s.underground ? "bg-black-ink text-paper border-black-ink" : "bg-paper-deep border-[1.5px] border-black-ink/60"}`}
          >
            Underground
          </button>
          <button
            onClick={() => s.patch({ links: !s.links })}
            className={`px-3 py-2 rounded-xl border text-xs ${s.links ? "bg-black-ink text-paper border-black-ink" : "bg-paper-deep border-[1.5px] border-black-ink/60"}`}
          >
            Links
          </button>
          <button
            onClick={() => s.patch({ following: !s.following })}
            className={`px-3 py-2 rounded-xl border text-xs ${s.following ? "bg-black-ink text-paper border-black-ink" : "bg-paper-deep border-[1.5px] border-black-ink/60"}`}
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
            ["DISTRICTS", layout.districts.length],
            ["BOTTLENECKS", layout.buildings.filter((b) => b.health !== "ok").length],
          ] as [string, string | number][]
        ).map(([k, v]) => (
          <div key={k} className="px-3 py-2 rounded-xl bg-paper/95 border-[1.5px] border-black-ink text-xs">
            <div className="text-black-ink/55">{k}</div>
            <div className="text-lg font-bold text-signal">{v}</div>
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
          id="cc-run-btn" className="px-5 py-3 rounded-xl bg-black-ink text-paper font-bold text-sm border-[1.5px] border-black-ink shadow-[4px_4px_0_rgba(20,20,20,.35)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_rgba(20,20,20,.35)] transition-all"
        >
          <Play size={14} className="inline mr-1" />
          RUN LOGIN
        </button>
        {(["fast", "medium", "slow"] as const).map((l) => (
          <button
            key={l}
            onClick={() => s.patch({ latency: l })}
            className={`px-3 py-3 rounded-xl border text-xs ${s.latency === l ? "bg-black-ink text-paper border-black-ink" : "bg-paper-deep border-[1.5px] border-black-ink/60"}`}
          >
            {l === "fast" ? "🟢 80ms" : l === "medium" ? "🟡 300ms" : "🔴 2s"}
          </button>
        ))}
        <button
          onClick={() => {
            s.patch({ failing: !s.failing });
            if (!s.failing) s.notify("❌ Payment API failed — 500", "be-payctrl");
          }}
          id="cc-fail-btn" className="px-3 py-3 rounded-xl bg-signal misreg text-paper border-[1.5px] border-black-ink text-xs font-bold"
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
            className="text-left px-3 py-2 rounded-xl bg-paper border-[1.5px] border-signal text-xs hover:bg-red-500/20"
          >
            {n.text} — click to inspect
          </button>
        ))}
      </div>

      {/* inspector */}
      {sel && (
        <div className="absolute right-3 top-16 w-80 max-h-[70vh] overflow-auto rounded-xl bg-paper/95 border-[1.5px] border-black-ink p-4 pointer-events-auto text-sm">
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
          <div className="mt-3 text-xs font-bold text-black-ink/55">FUNCTIONS</div>
          {sel.functions.length === 0 && <div className="text-xs text-black-ink/45">none extracted</div>}
          {sel.functions.map((f) => (
            <button
              key={f.name}
              onClick={() => s.select(sel.id, f.name)}
              className={`block w-full text-left mt-1 px-2 py-1 rounded border text-xs ${
                s.selectedFn === f.name ? "border-signal bg-signal/10" : "border-black-ink/40"
              }`}
            >
              {f.name}({f.args})
            </button>
          ))}
          {selFn && (
            <div className="mt-3 rounded-lg border-[1.5px] border-black-ink bg-paper-deep p-3 text-xs">
              <div className="font-bold text-signal mb-1"> AI GUIDE</div>
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

/* ── starlight engine: bottom-left minimap — swiss press city plan ── */
function Minimap() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const focus = useCity((st) => st.focus);
  const LAYOUT = useCityLayout();
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const INK = "#141414";
    const SIGNAL = "#e30613";
    const draw = () => {
      const c = canvas.current; if (!c) return;
      const g = c.getContext("2d")!;
      const S = c.width, k = S / 200, ox = S / 2, oz = 30 * k; // world x∈[-100,100], z∈[-70,130]
      const X = (wx: number) => ox + wx * k;
      const Z = (wz: number) => oz + wz * k;
      g.clearRect(0, 0, S, S);

      // paper ground
      g.fillStyle = "#f2efe3"; g.fillRect(0, 0, S, S);

      // faint baseline grid — the raster precedes the content
      g.strokeStyle = "rgba(20,20,20,.08)"; g.lineWidth = 1;
      g.beginPath();
      for (let wx = -75; wx <= 75; wx += 25) { g.moveTo(X(wx), 0); g.lineTo(X(wx), S); }
      for (let wz = -55; wz <= 125; wz += 30) { g.moveTo(0, Z(wz)); g.lineTo(S, Z(wz)); }
      g.stroke();

      // river — pale wash between hairlines
      g.fillStyle = "rgba(20,20,20,.10)";
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
          g.strokeStyle = INK; g.lineWidth = Math.max(1.5, r.w * k * 0.62);
          g.setLineDash([]);
        } else {
          g.strokeStyle = INK; g.lineWidth = Math.max(1.5, r.w * k * 0.62);
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

      // focus — signal red with 0.5 mm misregistration + press pulse
      const fx = focus ? X(focus.x) : X(0), fz = focus ? Z(focus.z) : Z(0);
      const t = performance.now() / 1000;
      g.globalAlpha = 0.5;
      g.fillStyle = SIGNAL;
      g.beginPath(); g.arc(fx - 1, fz + 1, 2.5, 0, Math.PI * 2); g.fill(); // ghost pass
      g.globalAlpha = 1;
      g.beginPath(); g.arc(fx, fz, 2.5, 0, Math.PI * 2); g.fill();
      if (!reduced) {
        g.strokeStyle = SIGNAL; g.lineWidth = 1;
        g.globalAlpha = 0.62 - 0.28 * Math.sin(t * 2.4);
        g.beginPath(); g.arc(fx, fz, 5.5 + Math.sin(t * 2.4) * 1.5, 0, Math.PI * 2); g.stroke();
        g.globalAlpha = 1;
      }

      // plate furniture — corner ticks + north arrow
      g.strokeStyle = "rgba(20,20,20,.5)"; g.lineWidth = 1;
      const T = 7, m = 4;
      g.beginPath();
      g.moveTo(m, m + T); g.lineTo(m, m); g.lineTo(m + T, m);
      g.moveTo(S - m - T, m); g.lineTo(S - m, m); g.lineTo(S - m, m + T);
      g.moveTo(m, S - m - T); g.lineTo(m, S - m); g.lineTo(m + T, S - m);
      g.moveTo(S - m - T, S - m); g.lineTo(S - m, S - m); g.lineTo(S - m, S - m - T);
      g.stroke();
      g.fillStyle = INK;
      g.beginPath(); g.moveTo(S - 13, 26); g.lineTo(S - 16, 34); g.lineTo(S - 10, 34); g.closePath(); g.fill();
      g.font = "700 7px Archivo, Helvetica, sans-serif";
      g.textAlign = "center";
      g.fillText("N", S - 13, 42);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [focus, LAYOUT]);
  return (
    <div className="pointer-events-auto absolute left-3 bottom-[220px] w-[164px] select-none">
      {/* plate frame — printed pass around the map */}
      <div className="border-[1.5px] border-black-ink bg-paper-deep p-1.5 shadow-[4px_4px_0_rgba(0,0,0,.35)]">
        <div className="mb-1.5 flex items-center justify-between border-b-[1.5px] border-black-ink px-1 pb-1">
          <span className="caption-caps font-bold text-black-ink">City Plan</span>
          <span aria-hidden className="inline-block h-[7px] w-[7px] bg-signal" />
        </div>
        <canvas ref={canvas} width={160} height={160}
          className="block w-full cursor-crosshair"
          onClick={(e) => {
            const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const sx = r.width / 160, sy = r.height / 160;
            const k = 160 / 200, ox = 80, oz = 30 * k;
            useCity.getState().setFocus((e.clientX - r.left - ox * sx) / (k * sx), (e.clientY - r.top - oz * sy) / (k * sy));
          }}
        />
      </div>
      <p className="caption-caps mt-1.5 text-[9px] leading-none text-paper/70">Fig. 05 — click to navigate</p>
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
    <div className="absolute bottom-4 left-3 pointer-events-auto">
      {open ? (
        <div className="w-56 rounded-none bg-paper/95 border-[1.5px] border-black-ink p-3 text-xs">
          <button onClick={() => setOpen(false)} className="float-right text-black-ink/45 hover:text-black-ink">
            ✕
          </button>
          <div className="font-bold text-black-ink/75 mb-2">BUILDING LEGEND</div>
          <div className="grid grid-cols-2 gap-y-1">
            {(Object.keys(KIND_COLOR) as (keyof typeof KIND_COLOR)[]).map((k) => (
              <div key={k} className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: KIND_COLOR[k] }} />
                <span className="text-black-ink/75">{k}</span>
                <span className="text-black-ink/45">×{counts.get(k) ?? 0}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-black-ink/30 text-[10px] leading-relaxed text-black-ink/55">
            <Keyboard size={10} className="inline mr-1" />
            <b>/</b> search · <b>Enter</b> run login · <b>T</b> traffic · <b>U</b> pipes · <b>K</b> links · <b>F</b> follow ·{" "}
            <b>Esc</b> close
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="px-3 py-2 rounded-xl bg-paper/95 border-[1.5px] border-black-ink text-xs text-black-ink/75 hover:border-signal"
        >
          ☰ Legend &amp; keys
        </button>
      )}
    </div>
  );
}
