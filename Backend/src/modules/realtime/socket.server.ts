import type { Server, Socket } from "socket.io";
import type { ExtendedError } from "socket.io/dist/namespace";
import { env } from "../../config/env";
import { logger } from "../../shared/utils/logger";
import { verifyAccessToken } from "../../shared/utils/jwt.util";

interface SocketData {
  userId: string;
  email: string;
}

const roomFor = (projectId: string) => `project:${projectId}`;

/** JWT handshake auth — sockets without a valid token are rejected. */
function authenticateHandshake(socket: Socket, next: (err?: ExtendedError) => void): void {
  try {
    const raw =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.startsWith("Bearer ")
        ? socket.handshake.headers.authorization.slice(7)
        : undefined);
    if (!raw) return next(new Error("Unauthorized: missing token"));
    const payload = verifyAccessToken(raw);
    socket.data.userId = payload.sub;
    socket.data.email = payload.email;
    next();
  } catch {
    next(new Error("Unauthorized: invalid token"));
  }
}

async function assertOwnsProject(userId: string, projectId: string): Promise<boolean> {
  const { ProjectModel } = await import("../projects/project.model");
  const project = await ProjectModel.findById(projectId).select("owner").lean();
  return Boolean(project && String((project as { owner: unknown }).owner) === String(userId));
}

async function latestArchitecture(projectId: string): Promise<{
  components: Array<{ id: string }>;
} | null> {
  const { AnalysisModel } = await import("../analysis/analysis.model");
  const doc = await AnalysisModel.findOne({ project: projectId, status: "completed" })
    .sort({ createdAt: -1 })
    .select("architecture.components")
    .lean();
  return doc?.architecture ?? null;
}

function componentExists(architecture: { components: Array<{ id: string }> } | null, id: string): boolean {
  return Boolean(architecture?.components.some((c) => c.id === id));
}

export function registerSocketServer(io: Server): void {
  io.use(authenticateHandshake);

  io.on("connection", (socket: Socket) => {
    const { userId } = socket.data as SocketData;
    logger.debug("socket connected", { socketId: socket.id, userId });

    /* ---------------- rooms ---------------- */
    socket.on("project:join", async (payload: { projectId?: string }, ack?: (r: unknown) => void) => {
      const projectId = payload?.projectId;
      if (!projectId) {
        ack?.({ ok: false, error: "projectId required" });
        return;
      }
      const owns = await assertOwnsProject(userId, projectId);
      if (!owns) {
        ack?.({ ok: false, error: "Forbidden" });
        return;
      }
      await socket.join(roomFor(projectId));
      // tell the client which room it joined so it can subscribe its UI
      ack?.({ ok: true, room: roomFor(projectId) });
    });

    socket.on("project:leave", (payload: { projectId?: string }) => {
      if (payload?.projectId) void socket.leave(roomFor(payload.projectId));
    });

    /* ---------------- character events ----------------
     * The backend only ever sends SEMANTIC component ids / paths.
     * Coordinates, camera and animation are the frontend's job.
     */

    socket.on(
      "character:move",
      async (
        payload: {
          projectId?: string;
          /** Multi-hop walk — the character flies through this exact sequence. */
          path?: string[];
          /** Legacy single-hop fields (still accepted for older clients). */
          fromComponentId?: string | null;
          toComponentId?: string;
          triggeredBy?: "chat" | "user_click" | "telemetry";
        },
        ack?: (r: unknown) => void
      ) => {
        const projectId = payload?.projectId;
        const requestedPath: string[] = Array.isArray(payload?.path)
          ? payload.path.filter((id) => typeof id === "string" && id.length > 0)
          : payload?.toComponentId
            ? [payload.toComponentId] // legacy single-hop -> 1-element path
            : [];

        if (!projectId || requestedPath.length === 0) {
          ack?.({ ok: false, error: "projectId and path (or legacy toComponentId) are required" });
          return;
        }
        const owns = await assertOwnsProject(userId, projectId);
        if (!owns) {
          ack?.({ ok: false, error: "Forbidden" });
          return;
        }
        const architecture = await latestArchitecture(projectId);
        const validPath = requestedPath.filter((id) => componentExists(architecture, id));
        if (validPath.length === 0) {
          ack?.({ ok: false, error: "No valid component ids in move path" });
          return;
        }
        const triggeredBy: "chat" | "user_click" | "telemetry" =
          payload?.triggeredBy === "chat" || payload?.triggeredBy === "telemetry"
            ? payload.triggeredBy
            : "user_click";

        io.to(roomFor(projectId)).emit("character:move", {
          projectId,
          path: validPath,
          // kept for older clients still animating single hops:
          toComponentId: validPath[validPath.length - 1],
          ...(validPath.length > 1 ? { fromComponentId: validPath[0] } : {}),
          triggeredBy,
          requestedBy: userId
        });
        ack?.({ ok: true, path: validPath });
      }
    );

    socket.on(
      "character:explain",
      async (payload: { projectId?: string; path?: string[] }, ack?: (r: unknown) => void) => {
        const projectId = payload?.projectId;
        const path = Array.isArray(payload?.path) ? payload.path : [];
        if (!projectId || path.length === 0) {
          ack?.({ ok: false, error: "projectId and non-empty path are required" });
          return;
        }
        const owns = await assertOwnsProject(userId, projectId);
        if (!owns) {
          ack?.({ ok: false, error: "Forbidden" });
          return;
        }
        const architecture = await latestArchitecture(projectId);
        const validPath = path.filter((id) => componentExists(architecture, id));
        if (validPath.length === 0) {
          ack?.({ ok: false, error: "No valid component ids in path" });
          return;
        }
        io.to(roomFor(projectId)).emit("character:explain", {
          projectId,
          path: validPath,
          requestedBy: userId
        });
        ack?.({ ok: true, path: validPath });
      }
    );

    socket.on("disconnect", () => {
      logger.debug("socket disconnected", { socketId: socket.id });
    });
  });

  logger.info(
    `Socket.IO ready (JWT handshake required${
      env.nodeEnv === "development" ? ", dev mode" : ""
    })`
  );
}
