import { io, type Socket } from "socket.io-client";

/**
 * Where Socket.IO connects:
 * - If `VITE_SOCKET_URL` is set → use that (direct to API; you must allow CORS on the server).
 * - Otherwise use the current page origin. In `npm run dev` that is Vite, which proxies
 *   `/socket.io` to the backend (see `vite.config.ts`) so the app works without CORS issues.
 */
function resolveSocketBaseUrl(): string {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (typeof explicit === "string" && explicit.trim().length > 0) {
    return explicit.trim();
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

let socket: Socket | null = null;

/** Singleton Socket.IO client — one connection per tab is typical for this app. */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(resolveSocketBaseUrl(), {
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}
