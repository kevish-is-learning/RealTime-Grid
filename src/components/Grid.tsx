import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { getSocket } from "../socket/socket";
import { usePlayerSession } from "../hooks/usePlayerSession";
import type {
  CellKey,
  GridCell,
  GridCellPatchPayload,
  GridDimensions,
  GridState,
  GridStatePayload,
  OwnerId,
} from "../types/grid";
import type { GridRejectPayload } from "../types/socket";
import "./Grid.css";

function makeEmptyGrid({ rows, cols }: GridDimensions): GridState {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      color: undefined,
      ownerId: null,
    }))
  );
}

function cellKey(row: number, col: number): CellKey {
  return `${row},${col}`;
}

function snapshotToState(payload: GridStatePayload): GridState {
  return payload.cells.map((row) =>
    row.map((c) => ({
      color: c.color ?? undefined,
      ownerId: c.ownerId ?? null,
    }))
  );
}

interface GridProps {
  dimensions?: GridDimensions;
}

export function Grid({ dimensions = { rows: 20, cols: 20 } }: GridProps) {
  const player = usePlayerSession();
  const [cells, setCells] = useState<GridState>(() =>
    makeEmptyGrid(dimensions)
  );
  const [rejectFlash, setRejectFlash] = useState<string | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onState = (payload: GridStatePayload) => {
      setCells(snapshotToState(payload));
    };

    const onCell = (patch: GridCellPatchPayload) => {
      setCells((prev) => {
        const next = prev.map((r) => r.map((c) => ({ ...c })));
        if (
          patch.row < 0 ||
          patch.row >= next.length ||
          patch.col < 0 ||
          patch.col >= (next[0]?.length ?? 0)
        ) {
          return prev;
        }
        next[patch.row][patch.col].color = patch.color ?? undefined;
        next[patch.row][patch.col].ownerId = patch.ownerId ?? null;
        return next;
      });
    };

    const onReject = (payload: GridRejectPayload) => {
      if (payload.reason === "claimed") {
        setRejectFlash(
          `That cell is claimed by another player (${payload.row + 1},${payload.col + 1}).`
        );
      }
    };

    const requestState = () => {
      socket.emit("grid:requestState");
    };

    socket.on("grid:state", onState);
    socket.on("grid:cell", onCell);
    socket.on("grid:reject", onReject);
    socket.on("connect", requestState);
    if (socket.connected) requestState();

    return () => {
      socket.off("grid:state", onState);
      socket.off("grid:cell", onCell);
      socket.off("grid:reject", onReject);
      socket.off("connect", requestState);
    };
  }, []);

  useEffect(() => {
    if (!rejectFlash) return;
    const id = window.setTimeout(() => setRejectFlash(null), 2200);
    return () => window.clearTimeout(id);
  }, [rejectFlash]);

  const paintCell = useCallback((row: number, col: number) => {
    getSocket().emit("grid:paint", { row, col });
  }, []);

  const gridStyle = useMemo(
    () =>
      ({
        gridTemplateColumns: `repeat(${dimensions.cols}, minmax(0, 1fr))`,
      }) as CSSProperties,
    [dimensions.cols]
  );

  const myId = player?.playerId ?? null;

  const ownerVariant = (ownerId: OwnerId | null): "self" | "other" | "free" => {
    if (ownerId === null) return "free";
    return ownerId === myId ? "self" : "other";
  };

  return (
    <div className="grid-shell">
      <header className="grid-header">
        <h1 className="grid-title">Shared grid</h1>
        <p className="grid-subtitle">
          Phase 5 — first click claims (Redis + Redis adapter); cells sync across
          instances ({dimensions.rows}×{dimensions.cols})
        </p>
        {player && (
          <p className="grid-identity" aria-label="Your player color">
            <span
              className="grid-identity-swatch"
              style={{ backgroundColor: player.color }}
            />
            Your color — click empty cells to claim; click your own cell to
            release.
          </p>
        )}
        {rejectFlash && (
          <p className="grid-reject" role="status">
            {rejectFlash}
          </p>
        )}
      </header>
      <div
        className="grid"
        style={gridStyle}
        role="grid"
        aria-label={`Paint grid ${dimensions.rows} by ${dimensions.cols}`}
      >
        {cells.map((row, rowIndex) =>
          row.map((cell: GridCell, colIndex) => (
            <button
              key={cellKey(rowIndex, colIndex)}
              type="button"
              className={`grid-cell grid-cell--${ownerVariant(cell.ownerId)}`}
              style={
                cell.color ? { backgroundColor: cell.color } : undefined
              }
              data-owner={ownerVariant(cell.ownerId)}
              role="gridcell"
              title={
                cell.ownerId
                  ? cell.ownerId === myId
                    ? "Your cell — click to release"
                    : "Claimed by another player"
                  : "Empty — click to claim"
              }
              aria-label={`Cell row ${rowIndex + 1} column ${colIndex + 1}`}
              onClick={() => paintCell(rowIndex, colIndex)}
            />
          ))
        )}
      </div>
    </div>
  );
}
