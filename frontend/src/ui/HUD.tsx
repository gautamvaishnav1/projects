import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Play, Bug, Radio, Keyboard } from "lucide-react";
import { LAYOUT } from "../lib/city";
import { KIND_COLOR } from "../lib/layout";
import { useCity } from "../store/useCity";
import { SAMPLE_CITY } from "../data/sampleCity";

const explain = (
  b: (typeof LAYOUT.buildings)[number],
  fn: NonNullable<(typeof LAYOUT.buildings)[number]["functions"]>[number],
) =>
  `${fn.name}(${fn.args}) — ${fn.purpose}. It receives (${fn.args}) and returns ${fn.returns}. ` +
  `In the city, it lives inside the "${b.name}" building (${b.districtName} district). ` +
  `Requests reaching it arrive from ${
    SAMPLE_CITY.edges
      .filter((e) => e.to === b.id)
      .map((e) => LAYOUT.byId.get(e.from)?.name)
      .join(", ") || "the client"
  } and continue to ${
    SAMPLE_CITY.edges
      .filter((e) => e.from === b.id)
      .map((e) => LAYOUT.byId.get(e.to)?.name)
      .join(", ") || "nothing"
  }.`;

function DistrictNav() {
  const setFocus = useCity((st) => st.setFocus);
  return (
    <div className="absolute top-14 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-auto max-w-[70vw] overflow-x-auto">
      {LAYOUT.districts.map((d) => (
        <button
          key={d.id}
          onClick={() => setFocus(d.center[0], d.center[1])}
          className="px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur border border-slate-700 text-[11px] text-slate-300 whitespace-nowrap hover:border-cyan-500/60 hover:text-cyan-300"
        >
          {d.name}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  const [open, setOpen] = useState(false);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    LAYOUT.buildings.forEach((b) => m.set(b.kind, (m.get(b.kind) ?? 0) + 1));
    return m;
  }, []);
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

export function HUD() {
  const s = useCity();
  const [q, setQ] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const sel = LAYOUT.byId.get(s.selectedId ?? "");
  const selFn = sel?.functions.find((f) => f.name === s.selectedFn);
  const results = useMemo(
    () =>
      q
        ? LAYOUT.buildings.filter((b) => (b.name + b.districtName).toLowerCase().includes(q.toLowerCase())).slice(0, 6)
        : [],
    [q],
  );
  const lines = LAYOUT.buildings.reduce((a, b) => a + b.loc, 0);

  const pick = (id: string) => {
    const b = LAYOUT.byId.get(id)!;
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
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none text-slate-100 font-mono">
      {/* top bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center gap-3 p-3 pointer-events-auto">
        <div className="px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur border border-cyan-500/40 font-bold text-cyan-400">
          🏙 CODECITY AI
        </div>
        <div className="px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-700 text-xs">{SAMPLE_CITY.project.name}</div>
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
            ["FILES", LAYOUT.buildings.length],
            ["LINES", lines],
            ["SECURITY", "87"],
            ["BOTTLENECKS", LAYOUT.buildings.filter((b) => b.health !== "ok").length],
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
          className="px-5 py-3 rounded-xl bg-cyan-500 text-slate-900 font-bold text-sm shadow-lg shadow-cyan-500/40"
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
          className="px-3 py-3 rounded-xl bg-red-600/90 border border-red-500 text-xs font-bold"
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

      <DistrictNav />
      <Legend />
    </div>
  );
}
