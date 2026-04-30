import {
  applyCellClaim,
  buildPongPayload,
  buildWelcomePayload,
  getGridSnapshot,
  getLeaderboard,
  getPlayerRecord,
  isValidCell,
  registerPlayer,
  unregisterPlayer,
} from "../services/gridService.js";

/**
 * Registers Socket.IO namespaces / events. Kept separate from HTTP so the
 * transport layer can be tested and extended without touching Express.
 * @param {import('socket.io').Server} io
 */
export function registerGridHandlers(io) {
  io.on("connection", (socket) => {
    void (async () => {
      try {
        const { color } = await registerPlayer(socket.id);
        socket.emit("session:identity", {
          playerId: socket.id,
          color,
        });
        socket.emit("test:welcome", buildWelcomePayload(socket.id));
        io.emit("leaderboard:update", await getLeaderboard());
      } catch (err) {
        console.error("socket connection setup failed:", err);
        return;
      }

      socket.on("disconnect", async () => {
        try {
          const freed = await unregisterPlayer(socket.id);
          for (const patch of freed) {
            io.emit("grid:cell", patch);
          }
          io.emit("leaderboard:update", await getLeaderboard());
        } catch (e) {
          console.error("disconnect cleanup:", e);
        }
      });

      socket.on("grid:requestState", async () => {
        try {
          socket.emit("grid:state", await getGridSnapshot());
        } catch (e) {
          console.error("grid:requestState:", e);
        }
      });

      socket.on("session:requestIdentity", async () => {
        try {
          const record = await getPlayerRecord(socket.id);
          if (record) {
            socket.emit("session:identity", {
              playerId: socket.id,
              color: record.color,
            });
          }
        } catch (e) {
          console.error("session:requestIdentity:", e);
        }
      });

      socket.on("leaderboard:request", async () => {
        try {
          socket.emit("leaderboard:update", await getLeaderboard());
        } catch (e) {
          console.error("leaderboard:request:", e);
        }
      });

      socket.on("grid:paint", async (payload) => {
        try {
          const row = payload?.row;
          const col = payload?.col;
          if (!isValidCell(row, col)) return;

          const result = await applyCellClaim(socket.id, row, col);
          if (!result.ok) {
            if (result.reason === "claimed") {
              socket.emit("grid:reject", {
                row,
                col,
                reason: "claimed",
              });
            }
            return;
          }

          io.emit("grid:cell", {
            row: result.row,
            col: result.col,
            ownerId: result.ownerId,
            color: result.color,
          });
          io.emit("leaderboard:update", await getLeaderboard());
        } catch (e) {
          console.error("grid:paint:", e);
        }
      });

      socket.on("test:ping", (payload, ack) => {
        const pong = buildPongPayload(payload);
        if (typeof ack === "function") {
          ack(pong);
        }
      });

      socket.on("test:echo", (text) => {
        const message =
          typeof text === "string" && text.trim().length > 0
            ? text.trim()
            : "(empty)";
        io.emit("test:broadcast", {
          from: socket.id,
          text: message,
          at: Date.now(),
        });
      });
    })();
  });
}
