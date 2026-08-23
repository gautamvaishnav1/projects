import { useCallback, useEffect, useMemo, useState } from "react";
import Landing from "./pages/Landing";
import { CityScene } from "./three/CityScene";
import { HUD } from "./ui/HUD";
import { CommandPalette, type PaletteItem } from "./components/ui/CommandPalette";
import { AuthModal } from "./components/AuthModal";
import { completeOauthFromUrl, useAuth } from "./lib/auth";
import { CursorGlow, Noise } from "./components/ui/effects";

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function App() {
  const [view, setView] = useState<"landing" | "app">(() =>
    location.hash === "#app" ? "app" : "landing",
  );
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  // hash-based routing (no router dep needed)
  useEffect(() => {
    const onHash = () => setView(location.hash === "#app" ? "app" : "landing");
    window.addEventListener("hashchange", onHash);
    // HUD can request the auth modal (e.g. "Build City" while signed out)
    const openAuth = () => setAuthOpen(true);
    window.addEventListener("cc-open-auth", openAuth);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("cc-open-auth", openAuth);
    };
  }, []);

  const launch = useCallback(() => {
    // auth gate — first visit asks you to create an account
    if (!useAuth.getState().token) {
      sessionStorage.setItem("cc-auth-intent", "app");
      setAuthOpen(true);
      return;
    }
    location.hash = "#app";
    setView("app");
  }, []);

  // finish OAuth redirects: server bounces back with #oauth=<token>
  useEffect(() => {
    void completeOauthFromUrl().then((session) => {
      if (!session) {
        const err = location.hash.match(/#auth-error=([^&]+)/);
        if (err) history.replaceState(null, "", location.pathname + location.search);
        return;
      }
      const intent = sessionStorage.getItem("cc-auth-intent");
      sessionStorage.removeItem("cc-auth-intent");
      if (intent === "app" || location.hash.includes("#app")) {
        location.hash = "#app";
        setView("app");
      }
    });
  }, []);
  const home = useCallback(() => {
    location.hash = "";
    setView("landing");
  }, []);

  // ⌘K / Ctrl+K toggles the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const paletteItems = useMemo<PaletteItem[]>(
    () =>
      view === "landing"
        ? [
            { id: "launch", label: "Launch City", hint: "live demo", run: launch },
            { id: "go-raster", label: "Go to 01 Raster", run: () => scrollToId("raster") },
            { id: "go-satz", label: "Go to 02 Satz", run: () => scrollToId("satz") },
            { id: "go-farben", label: "Go to 03 Farben", run: () => scrollToId("farben") },
            { id: "go-zeit", label: "Go to 04 Zeit", run: () => scrollToId("zeit") },
            { id: "go-terminals", label: "Go to Launch panel", run: () => scrollToId("terminals") },
            { id: "top", label: "Back to top", run: () => window.scrollTo({ top: 0, behavior: "smooth" }) },
          ]
        : [
            { id: "home", label: "Back to landing page", run: home },
            { id: "login", label: "Run Login flow", hint: "follow-cam", run: () => window.dispatchEvent(new CustomEvent("cc-run-login")) },
            { id: "fail", label: "Fail the payment service", hint: "demo error", run: () => window.dispatchEvent(new CustomEvent("cc-fail-payment")) },
          ],
    [view, launch, home],
  );

  const signOut = useAuth((s) => s.signOut);
  const user = useAuth((s) => s.user);
  const appPaletteExtras = useMemo<PaletteItem[]>(() => {
    if (view !== "app") return [];
    const extras: PaletteItem[] = [];
    if (user) {
      extras.push({ id: "whoami", label: `Signed in as ${user.name}`, hint: user.email, run: () => {} });
      extras.push({ id: "signout", label: "Sign out", run: signOut });
    } else {
      extras.push({ id: "signin", label: "Sign in / Create account", run: () => setAuthOpen(true) });
    }
    return extras;
  }, [view, user, signOut]);

  return (
    <>
      {view === "app" ? (
        <div className="relative h-screen w-screen overflow-hidden bg-bg0">
          <CityScene />
          <HUD />
          <button
            onClick={home}
            className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 translate-y-[64px] rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 font-mono text-[10px] text-slate-400 backdrop-blur transition-colors hover:text-cyan-300"
          >
            ← back to site
          </button>
        </div>
      ) : (
        <Landing onLaunch={launch} />
      )}
      <Noise />
      {view === "app" && <CursorGlow />}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={[...paletteItems, ...appPaletteExtras]}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={() => {
          setAuthOpen(false);
          location.hash = "#app";
          setView("app");
        }}
      />
    </>
  );
}
