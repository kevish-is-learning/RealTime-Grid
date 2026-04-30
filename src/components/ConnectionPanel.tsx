import { useEffect, useState } from "react";
import { getSocket } from "../socket/socket";
import type {
  EchoBroadcastPayload,
  PongPayload,
  WelcomePayload,
} from "../types/socket";
import "./ConnectionPanel.css";

export function ConnectionPanel() {
  const [connected, setConnected] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<WelcomePayload | null>(null);
  const [lastPong, setLastPong] = useState<PongPayload | null>(null);
  const [echoLog, setEchoLog] = useState<EchoBroadcastPayload[]>([]);
  const [echoInput, setEchoInput] = useState("hello from client");

  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      setConnected(true);
      setConnectError(null);
    };
    const onDisconnect = (reason: string) => {
      setConnected(false);
      if (reason === "io server disconnect") {
        setConnectError("Server closed the connection.");
      }
    };
    const onConnectError = (err: Error) => {
      setConnected(false);
      setConnectError(
        err.message || "Could not reach the server. Is `npm run server` running?"
      );
    };
    const onWelcome = (payload: WelcomePayload) => setWelcome(payload);
    const onBroadcast = (payload: EchoBroadcastPayload) => {
      setEchoLog((prev) => [payload, ...prev].slice(0, 8));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("test:welcome", onWelcome);
    socket.on("test:broadcast", onBroadcast);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("test:welcome", onWelcome);
      socket.off("test:broadcast", onBroadcast);
      socket.disconnect();
    };
  }, []);

  const sendPing = () => {
    const socket = getSocket();
    socket.emit("test:ping", { note: "ping", at: Date.now() }, (pong: PongPayload) => {
      setLastPong(pong);
    });
  };

  const sendEcho = () => {
    getSocket().emit("test:echo", echoInput);
  };

  return (
    <section className="conn-panel" aria-label="Socket.IO connection status">
      <div className="conn-row">
        <span
          className={`conn-dot ${connected ? "conn-dot--on" : "conn-dot--off"}`}
          aria-hidden
        />
        <span className="conn-status">
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      {connectError && (
        <p className="conn-error" role="alert">
          <strong>Connection error:</strong> {connectError}
        </p>
      )}

      {welcome && (
        <p className="conn-detail">
          <strong>Welcome:</strong> {welcome.message}{" "}
          <span className="conn-muted">({welcome.socketId.slice(0, 8)}…)</span>
        </p>
      )}

      <div className="conn-actions">
        <button type="button" className="conn-btn" onClick={sendPing}>
          Send test:ping
        </button>
        <button
          type="button"
          className="conn-btn conn-btn--ghost"
          onClick={sendEcho}
        >
          Broadcast test:echo
        </button>
      </div>

      <label className="conn-label">
        Echo message
        <input
          className="conn-input"
          value={echoInput}
          onChange={(e) => setEchoInput(e.target.value)}
        />
      </label>

      {lastPong && (
        <p className="conn-detail">
          <strong>Last pong (ack):</strong>{" "}
          <code className="conn-code">{JSON.stringify(lastPong)}</code>
        </p>
      )}

      {echoLog.length > 0 && (
        <ul className="conn-log">
          {echoLog.map((e) => (
            <li key={`${e.from}-${e.at}`}>
              <span className="conn-muted">{e.from.slice(0, 6)}…</span> →{" "}
              {e.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
