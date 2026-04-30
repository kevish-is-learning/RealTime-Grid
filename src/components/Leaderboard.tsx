import { useEffect, useState } from "react";
import { getSocket } from "../socket/socket";
import type { LeaderboardPayload } from "../types/leaderboard";
import { usePlayerSession } from "../hooks/usePlayerSession";
import "./Leaderboard.css";

export function Leaderboard() {
  const me = usePlayerSession();
  const [board, setBoard] = useState<LeaderboardPayload | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onBoard = (payload: LeaderboardPayload) => {
      setBoard(payload);
    };

    const requestBoard = () => {
      socket.emit("leaderboard:request");
    };

    socket.on("leaderboard:update", onBoard);
    socket.on("connect", requestBoard);
    requestBoard();
    if (socket.connected) requestBoard();

    return () => {
      socket.off("leaderboard:update", onBoard);
      socket.off("connect", requestBoard);
    };
  }, []);

  if (!board) {
    return (
      <section className="lb-panel" aria-label="Leaderboard">
        <h2 className="lb-title">Cells claimed</h2>
        <p className="lb-empty">Loading…</p>
      </section>
    );
  }

  if (board.ranks.length === 0) {
    return (
      <section className="lb-panel" aria-label="Leaderboard">
        <h2 className="lb-title">Leaderboard</h2>
        <p className="lb-empty">No scores yet — claim some cells.</p>
      </section>
    );
  }

  return (
    <section className="lb-panel" aria-label="Leaderboard">
      <h2 className="lb-title">Cells claimed</h2>
      <ol className="lb-list">
        {board.ranks.map((entry, index) => (
          <li
            key={entry.playerId}
            className={`lb-row ${entry.playerId === me?.playerId ? "lb-row--me" : ""}`}
          >
            <span className="lb-rank">{index + 1}</span>
            <span
              className="lb-swatch"
              style={{ backgroundColor: entry.color }}
              aria-hidden
            />
            <span className="lb-id" title={entry.playerId}>
              {entry.playerId.slice(0, 8)}…
            </span>
            <span className="lb-count">{entry.cells}</span>
          </li>
        ))}
      </ol>
      <p className="lb-meta">
        Updated {new Date(board.updatedAt).toLocaleTimeString()}
      </p>
    </section>
  );
}
