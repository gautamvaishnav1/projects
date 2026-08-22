import type { Server, Socket } from "socket.io";

let io: Server | null = null;

export function setIO(server: Server): void {
  io = server;
}

export function getIO(): Server {
  if (!io) throw new Error("Socket.IO server not initialized yet");
  return io;
}

export function tryIO(): Server | null {
  return io;
}

export type { Socket };
