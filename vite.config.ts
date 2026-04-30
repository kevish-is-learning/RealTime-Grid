import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * In dev, the browser talks to Vite (e.g. :5173) and we proxy WebSocket + HTTP
 * to the API so Socket.IO is same-origin (no CORS) and the path always matches.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget =
    env.VITE_API_PROXY || env.VITE_SOCKET_URL || "http://localhost:8080";
  const origin = apiTarget.replace(/\/$/, "");

  const proxy = {
    "/socket.io": {
      target: origin,
      ws: true,
      changeOrigin: true,
    },
    "/health": {
      target: origin,
      changeOrigin: true,
    },
    "/api": {
      target: origin,
      changeOrigin: true,
    },
  };

  return {
    plugins: [react()],
    server: {
      proxy,
    },
    preview: {
      proxy,
    },
  };
});
