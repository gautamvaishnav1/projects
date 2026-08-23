import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Play, Bug, Radio, Keyboard, GitBranch, LogOut, CloudRain, CloudLightning, CloudDrizzle, CloudFog, Snowflake, Sun, FolderOpen, Trash2 } from "lucide-react";
import { setAudioEnabled } from "../three/audio";
import { useAuth } from "../lib/auth";
import { architectureToCity, useCityLayout } from "../lib/city";
import { KIND_COLOR } from "../lib/layout";
import { useCity } from "../store/useCity";
import { askChat, createProject, deleteProject, getAnalysisStatus, getArchitecture, listProjects, startAnalysis, type ProjectDTO } from "../lib/api";
import { apiErrorMessage } from "../lib/http";
import { joinProjectRoom } from "../lib/socket";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 90; // ~3 min ceiling

/** Follow a character path broadcast by the backend (chat guide / other tabs). */
function useCharacterWalk() {
  const layout = useCityLayout();
  useEffect(() => {
    let cancelled = false;
    const onWalk = (e: Event) => {
      const { path } = (e as CustomEvent<{ path?: string[] }>).detail;
      void (async () => {
        for (const id of path ?? []) {
          if (cancelled) return;
          const stop = layout.byId.get(id);
          if (!stop) continue;
          useCity.getState().select(id);
          useCity.getState().setFocus(stop.pos[0], stop.pos[2]);
          await new Promise((r) => setTimeout(r, 900));
        }
      })();
    };
    window.addEventListener("cc-character-walk", onWalk);
    return () => {
      cancelled = true;
      window.removeEventListener("cc-character-walk", onWalk);
    };
  }, [layout]);
}

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
  const patch = useCity((s) => s.patch);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [cities, setCities] = useState<ProjectDTO[] | null>(null);

  /** Full pipeline for a repo URL: create → analyze → poll → architecture. */
  async function load(urlOverride?: string) {
    const target = (urlOverride ?? q).trim();
    if (!target || busy) return;
    setBusy(true);
    try {
      // not signed in? stash the URL and pop the auth modal — the build
      // resumes automatically once login succeeds (see token effect below)
      if (!useAuth.getState().token) {
        localStorage.setItem("cc-pending-repo", target);
        window.dispatchEvent(new CustomEvent("cc-open-auth"));
        notify("🔐 Sign in to build your city — it will start automatically", undefined, "info");
        return;
      }

      // 1. create a project for the repo
      const repoUrl = /^https?:\/\//i.test(target) ? target : `https://${target}`;
      const name = decodeURIComponent(repoUrl.split("?")[0].replace(/\/+$/, "").split("/").pop() || "repo");
      notify(`🏗 Creating project for ${name}…`);
      const created = await createProject(name, repoUrl);
      const project = created.project;

      // repo already saved? explain instead of rebuilding blindly — reuse its city
      if (created.alreadyExists) {
        notify(`ℹ️ ${created.message ?? `A project for this GitHub URL already exists ("${project.name}").`}`, undefined, "info");
        try {
          await loadArchitecture(project.id, project.name);
          return;
        } catch {
          notify(`🏗 No finished analysis yet for "${project.name}" — starting a fresh build…`, undefined, "info");
        }
      }

      // 2. kick off the analysis pipeline (github → babel/AST JSON → AI → city)
      let analysisId: string;
      try {
        analysisId = await startAnalysis(project.id);
        joinProjectRoom(project.id); // listen for live progress from the pipeline
      } catch (err) {
        // 409 "already running" etc. — architecture endpoint may still work
        analysisId = "";
        if (!/already running|409/i.test(apiErrorMessage(err))) {
          throw err;
        }
      }

      // 3. poll until the pipeline completes (socket progress arrives in parallel)
      if (analysisId) {
        let status = "running";
        let pollErrors = 0;
        for (let i = 0; i < MAX_POLLS; i++) {
          await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
          try {
            const st = await getAnalysisStatus(analysisId);
            status = st.status as string;
            pollErrors = 0;
          } catch {
            // tolerate transient network blips during long builds
            if (++pollErrors >= 5) throw new Error("lost connection while building");
            continue;
          }
          if (status !== "running") break;
          if (i > 0 && i % 8 === 0) notify(`⏳ Still building — ${i * POLL_INTERVAL_MS / 1000}s elapsed`);
        }
        if (status !== "completed") throw new Error(`analysis ${status} — check backend logs`);
      }

      await loadArchitecture(project.id, name);
    } catch (e) {
      notify(`⚠ Build failed: ${apiErrorMessage(e)}`, undefined, "error");
    } finally {
      setBusy(false);
      setCities(null);
    }
  }

  /** Fetch the validated city plan and swap it into the renderer. */
  async function loadArchitecture(projectId: string, fallbackName?: string) {
    const arch = await getArchitecture(projectId);
    const city = architectureToCity(arch);
    const files = city.districts.reduce((a, d) => a + d.buildings.length, 0);
    patch({ projectId, analysisId: arch.analysisId ?? null });
    joinProjectRoom(projectId);
    setCity(city);
    const engine = arch.stats?.aiEngine;
    const engineTag = engine === "llm" ? " · 🤖 AI architect" : engine === "heuristic" ? " · rule-based (AI unavailable)" : "";
    notify(`🏙 Loaded ${fallbackName ?? city.project.name} — ${files} buildings${engineTag}`, undefined, "success");
  }

  /** GET /projects — recent cities dropdown. */
  async function toggleCities() {
    if (cities) {
      setCities(null);
      return;
    }
    try {
      setCities(await listProjects());
    } catch (e) {
      notify(`⚠ ${(e as Error).message}`, undefined, "error");
      setCities([]);
    }
  }

  async function openCity(p: ProjectDTO) {
    setCities(null);
    try {
      await loadArchitecture(p.id, p.name);
    } catch (e) {
      notify(`⚠ ${(e as Error).message}`, undefined, "error");
    }
  }

  async function removeCity(p: ProjectDTO) {
    try {
      await deleteProject(p.id);
      setCities((cs) => cs?.filter((c) => c.id !== p.id) ?? null);
      notify(`🗑 Deleted ${p.name}`);
    } catch (e) {
      notify(`⚠ ${(e as Error).message}`, undefined, "error");
    }
  }

  // auto-load a repo requested from the landing page hero form — or resume
  // one stashed by a failed attempt, as soon as the user signs in
  const token = useAuth((s) => s.token);
  useEffect(() => {
    if (!token) return;
    const pending = localStorage.getItem("cc-pending-repo");
    if (!pending) return;
    localStorage.removeItem("cc-pending-repo");
    const id = window.setTimeout(() => void load(pending), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

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
      <button
        onClick={() => void toggleCities()}
        title="My cities"
        className="ml-1 px-2 py-2 rounded-xl bg-paper/95 border-[1.5px] border-black-ink text-xs text-black-ink/75 hover:text-signal"
      >
        <FolderOpen size={14} />
      </button>
      {cities && (
        <div className="absolute left-0 top-12 z-20 w-72 rounded-xl bg-paper border-[1.5px] border-black-ink overflow-hidden shadow-[4px_4px_0_rgba(20,20,20,.25)]">
          {cities.length === 0 && (
            <div className="px-3 py-2 text-xs text-black-ink/45">no cities yet — build one above</div>
          )}
          {cities.map((p) => (
            <div key={p.id} className="flex items-center gap-1 px-3 py-2 text-sm hover:bg-black-ink/10 group">
              <button onClick={() => void openCity(p)} className="flex-1 truncate text-left">
                {p.name}
              </button>
              <button
                onClick={() => void removeCity(p)}
                title="Delete city"
                className="opacity-0 group-hover:opacity-100 text-black-ink/40 hover:text-signal transition-opacity"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
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
  useCharacterWalk();
  const layout = useCityLayout();
  const cityEdges = useCity((s) => s.city.edges);
  const projectName = useCity((s) => s.city.project.name);
  const s = useCity();
  const projectId = s.projectId;
  const chatLoading = s.chatLoading;
  const aiAnswer = s.aiAnswer;
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

  // real backend AI — POST /projects/:id/chat, then walk the returned path
  const askGuide = async (b: NonNullable<typeof sel>, fn: NonNullable<typeof selFn>) => {
    const st = useCity.getState();
    if (!st.projectId) return;
    st.patch({ chatLoading: true, aiAnswer: null });
    try {
      const res = await askChat(st.projectId, `What does ${fn.name} in "${b.name}" do?`);
      useCity.getState().patch({ chatLoading: false, aiAnswer: res.answer || "…" });
      for (const id of res.path) {
        const stop = layout.byId.get(id);
        if (stop) {
          useCity.getState().select(id);
          useCity.getState().setFocus(stop.pos[0], stop.pos[2]);
          await new Promise((r) => setTimeout(r, 900));
        }
      }
      useCity.getState().select(b.id, fn.name);
    } catch (e) {
      useCity.getState().patch({ chatLoading: false, aiAnswer: null });
      useCity.getState().notify(`⚠ AI guide: ${(e as Error).message}`, undefined, "error");
    }
  };

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
                <span className={sel.health === "ok" ? "text-black-ink" : "text-signal"}>
                  {sel.health === "error" ? "bottleneck" : sel.health === "warn" ? "hotspot" : "ok"}
                </span>
              </div>
            </div>
            <button onClick={() => s.select(null)} className="text-black-ink/45 hover:text-black-ink">
              ✕
            </button>
          </div>

          {sel.description && (
            <p className="mt-2 text-xs leading-relaxed text-black-ink/75">{sel.description}</p>
          )}

          {/* analysis metrics */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg border border-black-ink/40 bg-paper-deep py-1.5">
              <div className="text-black-ink/50">FILES</div>
              <div className="font-bold">{sel.filesCount ?? "—"}</div>
            </div>
            <div className="rounded-lg border border-black-ink/40 bg-paper-deep py-1.5">
              <div className="text-black-ink/50">LINES</div>
              <div className="font-bold">{sel.loc || "—"}</div>
            </div>
            <div className="rounded-lg border border-black-ink/40 bg-paper-deep py-1.5">
              <div className="text-black-ink/50">COMPLEXITY</div>
              <div className={`font-bold ${sel.health !== "ok" ? "text-signal" : ""}`}>
                {sel.complexity != null ? sel.complexity : "—"}
              </div>
            </div>
          </div>
          {sel.complexity != null && (
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-black-ink/15">
              <div
                className={`h-full rounded-full ${sel.complexity >= 60 ? "bg-signal" : "bg-black-ink"}`}
                style={{ width: `${Math.min(100, sel.complexity)}%` }}
              />
            </div>
          )}

          {(sel.imports?.length ?? 0) > 0 && (
            <div className="mt-3">
              <div className="text-xs font-bold text-black-ink/55">NPM IMPORTS</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {sel.imports!.slice(0, 8).map((dep) => (
                  <span key={dep} className="rounded border border-black-ink/40 px-1.5 py-0.5 font-mono text-[10px] text-black-ink/70">
                    {dep}
                  </span>
                ))}
                {(sel.imports?.length ?? 0) > 8 && (
                  <span className="text-[10px] text-black-ink/45">+{sel.imports!.length - 8} more</span>
                )}
              </div>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-1 text-[10px]">
            {cityEdges.filter((e) => e.from === sel.id).map((e, i) => (
              <button key={`out${i}`} onClick={() => pick(e.to)} className="rounded bg-black-ink/10 px-1.5 py-0.5 hover:bg-signal/20" title="calls →">
                → {layout.byId.get(e.to)?.name ?? e.to}
              </button>
            ))}
            {cityEdges.filter((e) => e.to === sel.id).map((e, i) => (
              <button key={`in${i}`} onClick={() => pick(e.from)} className="rounded bg-black-ink/5 px-1.5 py-0.5 hover:bg-signal/20" title="called by ←">
                ← {layout.byId.get(e.from)?.name ?? e.from}
              </button>
            ))}
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
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold text-signal"> AI GUIDE</div>
                {projectId && (
                  <button
                    onClick={() => void askGuide(sel, selFn)}
                    disabled={chatLoading}
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                      chatLoading
                        ? "border-black-ink/30 text-black-ink/40"
                        : "bg-black-ink text-paper border-black-ink hover:text-signal"
                    }`}
                  >
                    {chatLoading ? "thinking…" : "Ask AI"}
                  </button>
                )}
              </div>
              {chatLoading && <div className="animate-pulse text-black-ink/55">asking the backend…</div>}
              {aiAnswer ? (
                <div className="whitespace-pre-wrap">{aiAnswer}</div>
              ) : (
                explain(sel, selFn)
              )}
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
      g.fillStyle = "#efece0"; g.fillRect(0, 0, S, S);
      g.strokeStyle = "rgba(20,20,20,.35)"; g.strokeRect(0.5, 0.5, S - 1, S - 1); g.fillStyle = "rgba(20,20,20,.18)";
      g.fillRect(ox - 5 * k, (-77) * k + oz, 10 * k, 110 * k); // river
      for (const d of LAYOUT.districts) {
        const w = d.stack === "database" ? 46 : 24, h = d.stack === "database" ? 14 : 20;
        g.globalAlpha = 0.28; g.fillStyle = "#141414";
        g.fillRect(ox + (d.center[0] - w / 2) * k, oz + (d.center[1] - h / 2) * k, w * k, h * k); g.globalAlpha = 1;
      }
      g.fillStyle = "#141414";
      for (const b of LAYOUT.buildings) g.fillRect(ox + b.pos[0] * k - 1, oz + b.pos[2] * k - 1, 2.4, 2.4);
      const fx = focus ? ox + focus.x * k : ox, fz = focus ? oz + focus.z * k : oz;
      g.fillStyle = "#e30613";
      g.beginPath(); g.arc(fx, fz, 3, 0, Math.PI * 2); g.fill();
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [focus]);
  return (
    <canvas ref={canvas} width={160} height={160}
      className="absolute left-3 bottom-[220px] rounded-none border-[1.5px] border-black-ink pointer-events-auto cursor-crosshair shadow-[3px_3px_0_rgba(20,20,20,.25)]"
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
            <div className="col-span-2 mt-1 flex items-center gap-2 border-t border-black-ink/20 pt-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm bg-signal" />
              <span className="text-signal font-bold">bottleneck / hotspot</span>
              <span className="text-black-ink/45">×{layout.buildings.filter((b) => b.health !== "ok").length}</span>
            </div>
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
