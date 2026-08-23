import { io, type Socket } from "socket.io-client";
import { useAuth } from "./auth";
import { useCity } from "../store/useCity";

/* ── Realtime channel (Socket.IO) ─────────────────────────────────
 * JWT handshake → project rooms → character walk/explain events.
 * Dev traffic rides the Vite ws proxy; prod hits same origin.
 */

let socket: Socket | null = null;

/** Explicit socket origin from .env (empty = same origin / Vite ws proxy). */
const WS_URL = import.meta.env.VITE_SOCKET_URL || undefined;
const WS_PATH = import.meta.env.DEV && !WS_URL ? undefined : "/socket.io";

export function getSocket(): Socket | null {
  if (socket?.connected) return socket;
  const token = useAuth.getState().token;
  if (!token) return null;
  socket = io(WS_URL ?? "/", {
    path: WS_PATH,
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 5,
  });
  wireServerEvents(socket);
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}

/** Join the room for a loaded city so backend broadcasts reach this client. */
export function joinProjectRoom(projectId: string): void {
  const s = getSocket();
  if (!s) return;
  s.emit("project:join", { projectId }, (ack: { ok?: boolean }) => {
    if (!ack?.ok) return;
  });
}

/** Walk a component path across every client in the room. */
export function emitCharacterMove(projectId: string, path: string[]): void {
  socket?.emit("character:move", { projectId, path });
}

type CharacterEvent = {
  projectId: string;
  path?: string[];
  toComponentId?: string;
};

interface AnalysisProgressEvent {
  analysisId?: string;
  projectId?: string;
  step?: string;
  message?: string;
  percent?: number;
  error?: string;
}

// throttle progress toasts — backend can emit one per parsed file batch
let lastProgressAt = 0;

function wireServerEvents(s: Socket): void {
  // Backend-driven walks (e.g. another tab asked the AI guide something)
  const onCharacter = (p: CharacterEvent) => {
    const path = p.path ?? (p.toComponentId ? [p.toComponentId] : []);
    window.dispatchEvent(
      new CustomEvent("cc-character-walk", { detail: { projectId: p.projectId, path } }),
    );
  };
  s.on("character:move", onCharacter);
  s.on("character:explain", onCharacter);

  // live pipeline feedback while a repo is being turned into a city
  s.on("analysis:started", () => {
    useCity.getState().notify("🏗 Downloading repository…");
  });
  s.on("analysis:progress", (p: AnalysisProgressEvent) => {
    const now = Date.now();
    if (now - lastProgressAt < 4000) return; // max one toast per 4s
    lastProgressAt = now;
    const label = p.message ?? p.step ?? "working…";
    const pct = typeof p.percent === "number" ? ` (${p.percent}%)` : "";
    useCity.getState().notify(`⚙ ${label}${pct}`);
  });
  s.on("analysis:failed", (p: AnalysisProgressEvent) => {
    useCity
      .getState()
      .notify(`⚠ Build failed: ${p.error ?? "see backend logs"}`, undefined, "error");
  });
}
