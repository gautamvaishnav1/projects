import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Play, Bug, Radio, CloudRain, CloudLightning, CloudDrizzle, CloudFog, Snowflake, Sun, Link2, Moon } from "lucide-react";
import { setAudioEnabled } from "../three/audio";
import { LAYOUT } from "../three/CityScene";
import { useCity } from "../store/useCity";
import { SAMPLE_CITY } from "../data/sampleCity";

const explain = (b: any, fn: any) =>
  `${fn.name}(${fn.args}) — ${fn.purpose}. Returns ${fn.returns}. Lives inside "${b.name}" (${b.districtName}). ` +
  `Traffic arrives from ${SAMPLE_CITY.edges.filter((e) => e.to === b.id).map((e) => LAYOUT.byId.get(e.from)?.name).join(", ") || "the client"} and continues to ` +
  `${SAMPLE_CITY.edges.filter((e) => e.from === b.id).map((e) => LAYOUT.byId.get(e.to)?.name).join(", ") || "nothing"}.`;

export function HUD() {
  const s = useCity();
  const [q, setQ] = useState(""); const [legend, setLegend] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === "/") { e.preventDefault(); input.current?.focus(); } }; window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h); }, []);
  const sel = LAYOUT.byId.get(s.selectedId ?? ""); const selFn = sel?.functions.find((f) => f.name === s.selectedFn);
  const results = useMemo(() => (q ? LAYOUT.buildings.filter((b) => (b.name + b.districtName).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : []), [q]);
  const lines = LAYOUT.buildings.reduce((a, b) => a + b.loc, 0);
  const pick = (id: string) => { const b = LAYOUT.byId.get(id)!; s.select(id); s.setFocus(b.pos[0], b.pos[2]); setQ(""); };

  return (
    <div className="absolute inset-0 pointer-events-none text-slate-100">
      {/* TOP BAR */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-4 pointer-events-auto">
        <div className="glass px-4 py-2.5 font-display font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-fuchsia-400 text-lg">CODECITY AI</div>
        <div className="glass px-3 py-2 text-xs text-slate-300">{SAMPLE_CITY.project.name}</div>
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-3.5 text-slate-400" />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a feature… e.g. payment  ( / )"
            className="w-full pl-8 pr-3 py-2.5 glass text-sm outline-none focus:border-cyan-400/60 placeholder:text-slate-500" />
          {results.length > 0 && (
            <div className="absolute mt-1 w-full glass overflow-hidden">
              {results.map((b) => <button key={b.id} onClick={() => pick(b.id)} className="chip block w-full text-left px-3 py-2 text-sm hover:bg-cyan-400/10">{b.name} <span className="text-slate-500 text-xs">· {b.districtName}</span></button>)}
            </div>)}
        </div>
        <div className="flex gap-2">
          <button onClick={() => s.patch({ traffic: !s.traffic })} className={`chip glass px-3 py-2 text-xs font-data ${s.traffic ? "!border-cyan-400/60 text-cyan-300" : ""}`}><Radio size={12} className="inline mr-1" />Traffic</button>
          <button onClick={() => s.patch({ links: !s.links })} className={`chip glass px-3 py-2 text-xs font-data ${s.links ? "!border-fuchsia-400/60 text-fuchsia-300" : ""}`}><Link2 size={12} className="inline mr-1" />Links</button>
          <button onClick={() => s.patch({ underground: !s.underground })} className={`chip glass px-3 py-2 text-xs font-data ${s.underground ? "!border-cyan-400/60 text-cyan-300" : ""}`}>Underground</button>
          <button onClick={() => s.patch({ following: !s.following })} className={`chip glass px-3 py-2 text-xs font-data ${s.following ? "!border-fuchsia-400/60 text-fuchsia-300" : ""}`}>Follow-cam</button>
        </div>
      </div>

      {/* DISTRICT CHIPS */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-auto flex-wrap justify-center">
        {LAYOUT.districts.map((d) => (
          <button key={d.id} onClick={() => s.setFocus(d.center[0], d.center[1])} className="chip glass px-3 py-1.5 text-xs text-slate-300">{d.name}</button>))}
      </div>

      {/* WEATHER + TIME */}
      <div className="absolute right-4 top-16 glass p-3 pointer-events-auto w-56">
        <div className="font-display text-[10px] tracking-widest text-slate-400 mb-2">ATMOSPHERE</div>
        <div className="flex gap-1.5">
          {([["clear", Sun], ["drizzle", CloudDrizzle], ["rain", CloudRain], ["storm", CloudLightning], ["snow", Snowflake], ["fog", CloudFog]] as const).map(([w, Ico]) => (
            <button key={w} onClick={() => s.patch({ weather: w, live: false })} className={`chip glass flex-1 py-1.5 text-xs ${s.weather === w ? "!border-cyan-400/70 text-cyan-300" : ""}`}><Ico size={14} className="inline" /></button>))}
        </div>
        <button onClick={() => s.patch({ live: !s.live })} className={`chip glass w-full mt-2 py-1.5 text-xs ${s.live ? "!border-emerald-400/70 text-emerald-300" : ""}`}>⚡ LIVE weather = system health</button>
        <button onClick={() => { const on = !s.sound; s.patch({ sound: on }); setAudioEnabled(on); }} className="chip glass w-full mt-1.5 py-1.5 text-xs">{s.sound ? "🔊 Sound on" : "🔇 Sound off"}</button>
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
          <Moon size={12} />
          <input type="range" min={0} max={24} step={0.1} value={s.time} onChange={(e) => s.patch({ time: +e.target.value, autoCycle: false })} className="flex-1 accent-cyan-400" />
          <span className="font-data w-10">{s.time.toFixed(1)}h</span>
        </div>
        <label className="mt-1 flex items-center gap-2 text-xs text-slate-400"><input type="checkbox" checked={s.autoCycle} onChange={(e) => s.patch({ autoCycle: e.target.checked })} className="accent-cyan-400" />Auto day–night cycle</label>
      </div>

      {/* TELEMETRY */}
      <div className="absolute left-4 top-16 grid gap-2 pointer-events-auto">
        {[["FILES", LAYOUT.buildings.length, "text-cyan-300"], ["LINES", lines, "text-cyan-300"], ["SECURITY", "87", "text-emerald-300"], ["BOTTLENECKS", LAYOUT.buildings.filter((b) => b.health !== "ok").length, "text-red-400"]].map(([k, v, c]) => (
          <div key={k as string} className="glass px-4 py-2.5"><div className="font-display text-[10px] tracking-widest text-slate-400">{k}</div><div className={`font-data text-xl font-semibold ${c}`}>{v}</div></div>))}
        <button onClick={() => setLegend(!legend)} className="glass px-4 py-2 text-xs text-slate-300 chip">☰ Legend & keys</button>
        {legend && (
          <div className="glass p-3 text-[11px] text-slate-300 space-y-1 w-52">
            <div>🏢 Building = file</div><div>🏭 Factory = service</div><div>📦 Warehouse = DB collection</div>
            <div>🗼 Tower = external API</div><div>🚗 Car = HTTP request</div><div>🌉 Bridge = frontend↔backend</div>
            <div>🚶 People = users/devs</div><div>🔴 Red = failing module</div>
          </div>)}
      </div>

      {/* HERO CONTROLS */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto">
        <button onClick={() => { s.patch({ traffic: true, following: true }); s.notify("🚗 POST /api/auth/login dispatched"); }}
          className="px-6 py-3 rounded-2xl font-display font-bold text-sm text-slate-900 bg-gradient-to-r from-cyan-300 to-cyan-400 shadow-lg shadow-cyan-500/40 hover:shadow-cyan-400/60 chip"><Play size={14} className="inline mr-1" />RUN LOGIN</button>
        {(["fast", "medium", "slow"] as const).map((l) => (
          <button key={l} onClick={() => s.patch({ latency: l })} className={`chip glass px-3 py-3 rounded-2xl text-xs font-data ${s.latency === l ? "!border-slate-400/60" : ""}`}>{l === "fast" ? "🟢 80ms" : l === "medium" ? "🟡 300ms" : "🔴 2s"}</button>))}
        <button onClick={() => { s.patch({ failing: true }); s.notify("❌ Payment API failed — 500", "be-payctrl"); }}
          className="px-4 py-3 rounded-2xl bg-red-600/90 border border-red-400/50 text-xs font-display font-bold chip"><Bug size={12} className="inline mr-1" />FAIL PAYMENT</button>
      </div>

      {/* NOTIFICATIONS */}
      <div className="absolute right-4 bottom-5 grid gap-2 pointer-events-auto w-72">
        {s.notifications.map((n) => (
          <button key={n.id} onClick={() => n.target && pick(n.target)} className="chip text-left px-3 py-2 rounded-2xl glass !border-red-400/40 text-xs hover:bg-red-400/10">{n.text} — click to inspect</button>))}
      </div>

      {/* INSPECTOR */}
      {sel && (
        <div className="absolute right-4 top-56 w-80 max-h-[52vh] overflow-auto glass p-4 pointer-events-auto text-sm">
          <div className="flex justify-between items-start">
            <div><div className="font-display font-bold text-cyan-300">{sel.name}</div>
              <div className="text-xs text-slate-400 font-data">{sel.districtName} · {sel.kind} · {sel.loc} LOC · <span className={sel.health === "ok" ? "text-emerald-400" : "text-red-400"}>{sel.health}</span></div></div>
            <button onClick={() => s.select(null)} className="text-slate-500 hover:text-white">✕</button>
          </div>
          <div className="mt-3 font-display text-[10px] tracking-widest text-slate-400">FUNCTIONS</div>
          {sel.functions.map((f) => (
            <button key={f.name} onClick={() => s.select(sel.id, f.name)} className={`chip block w-full text-left mt-1 px-2 py-1.5 rounded-lg border text-xs font-data ${s.selectedFn === f.name ? "border-cyan-400/60 bg-cyan-400/10" : "border-slate-700/60"}`}>{f.name}({f.args})</button>))}
          {selFn && <div className="mt-3 rounded-xl bg-slate-800/70 border border-fuchsia-400/40 p-3 text-xs leading-relaxed"><div className="font-display font-bold text-fuchsia-300 mb-1">✨ AI GUIDE</div>{explain(sel, selFn)}</div>}
        </div>)}
    </div>
  );
}
