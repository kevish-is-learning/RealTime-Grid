/**
 * Redis-backed grid + player registry (Phase 5). Use with Socket.IO Redis adapter
 * so multiple Node processes share both pub/sub and state.
 */

import { GRID_KEYS } from "./gridKeys.js";

const ROWS = 20;
const COLS = 20;

/** @type {import('redis').RedisClientType | null} */
let redis = null;

/** @param {import('redis').RedisClientType} client */
export function attachRedisClient(client) {
  redis = client;
}

function r() {
  if (!redis) {
    throw new Error("Redis client not attached; call attachRedisClient first.");
  }
  return redis;
}

/** Distinct fill colors assigned round-robin to new sockets. */
const PALETTE = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
  "#22c55e",
  "#eab308",
  "#ef4444",
  "#06b6d4",
  "#84cc16",
  "#f43f5e",
  "#a855f7",
  "#0ea5e9",
];

/**
 * Atomic claim / release / reject — safe with multiple server instances.
 * Returns Redis nested reply: claim | release | err
 */
const CLAIM_LUA = `
local cells = KEYS[1]
local players = KEYS[2]
local row = ARGV[1]
local col = ARGV[2]
local sid = ARGV[3]
local field = row .. ',' .. col

if redis.call('HEXISTS', players, sid) == 0 then
  return {'e', 'unknown_player'}
end

local mycol = redis.call('HGET', players, sid)
local cur = redis.call('HGET', cells, field)
if (not cur) or (cur == '') then
  redis.call('HSET', cells, field, sid)
  return {'c', row, col, sid, mycol}
end
if cur == sid then
  redis.call('HDEL', cells, field)
  return {'r', row, col}
end
return {'x', 'claimed'}
`;

export function getGridDimensions() {
  return { rows: ROWS, cols: COLS };
}

/**
 * @param {string} socketId
 * @returns {Promise<{ color: string } | null>}
 */
export async function getPlayerRecord(socketId) {
  const color = await r().hGet(GRID_KEYS.players, socketId);
  return color ? { color } : null;
}

/**
 * @param {string} socketId
 * @returns {Promise<{ color: string }>}
 */
export async function registerPlayer(socketId) {
  const cmd = r();
  const existing = await cmd.hGet(GRID_KEYS.players, socketId);
  if (existing) {
    return { color: existing };
  }
  const n = await cmd.incr(GRID_KEYS.paletteSeq);
  const color = PALETTE[(Number(n) - 1) % PALETTE.length];
  await cmd.hSet(GRID_KEYS.players, socketId, color);
  return { color };
}

/**
 * @param {string} socketId
 * @returns {Promise<Array<{ row: number; col: number; ownerId: null; color: null }>>}
 */
export async function unregisterPlayer(socketId) {
  const cmd = r();
  const all = await cmd.hGetAll(GRID_KEYS.cells);
  const patches = [];

  const pipeline = cmd.multi();
  for (const [field, owner] of Object.entries(all)) {
    if (owner === socketId) {
      pipeline.hDel(GRID_KEYS.cells, field);
      const [rs, cs] = field.split(",");
      patches.push({
        row: Number(rs),
        col: Number(cs),
        ownerId: null,
        color: null,
      });
    }
  }
  pipeline.hDel(GRID_KEYS.players, socketId);
  await pipeline.exec();

  return patches;
}

/** @param {number} row @param {number} col */
function cellToWire(row, col, ownerId, playersMap) {
  const o =
    ownerId && String(ownerId).length > 0 ? String(ownerId) : null;
  const color = o ? playersMap[o] ?? null : null;
  return { ownerId: o, color };
}

/** Full snapshot for new clients and reconnects. */
export async function getGridSnapshot() {
  const cmd = r();
  const [cellsMap, playersMap] = await Promise.all([
    cmd.hGetAll(GRID_KEYS.cells),
    cmd.hGetAll(GRID_KEYS.players),
  ]);

  const cells = [];
  for (let ri = 0; ri < ROWS; ri++) {
    const row = [];
    for (let ci = 0; ci < COLS; ci++) {
      const raw = cellsMap[`${ri},${ci}`];
      const ownerId =
        raw && String(raw).length > 0 ? String(raw) : null;
      row.push(cellToWire(ri, ci, ownerId, playersMap));
    }
    cells.push(row);
  }

  return {
    rows: ROWS,
    cols: COLS,
    cells,
  };
}

export function isValidCell(row, col) {
  return (
    Number.isInteger(row) &&
    Number.isInteger(col) &&
    row >= 0 &&
    row < ROWS &&
    col >= 0 &&
    col < COLS
  );
}

/**
 * @param {string} socketId
 * @param {number} row
 * @param {number} col
 */
export async function applyCellClaim(socketId, row, col) {
  const raw = await r().eval(CLAIM_LUA, {
    keys: [GRID_KEYS.cells, GRID_KEYS.players],
    arguments: [String(row), String(col), socketId],
  });

  if (!Array.isArray(raw) || raw.length < 1) {
    return { ok: false, reason: "server" };
  }

  const tag = String(raw[0]);
  if (tag === "e") {
    return { ok: false, reason: String(raw[1] || "unknown_player") };
  }
  if (tag === "x") {
    return { ok: false, reason: "claimed" };
  }
  if (tag === "c") {
    return {
      ok: true,
      row: Number(raw[1]),
      col: Number(raw[2]),
      ownerId: String(raw[3]),
      color: String(raw[4]),
    };
  }
  if (tag === "r") {
    return {
      ok: true,
      row: Number(raw[1]),
      col: Number(raw[2]),
      ownerId: null,
      color: null,
    };
  }

  return { ok: false, reason: "server" };
}

/** Sorted by cells claimed (desc). Players in registry show 0 until they claim. */
export async function getLeaderboard() {
  const cmd = r();
  const [cellsMap, playersMap] = await Promise.all([
    cmd.hGetAll(GRID_KEYS.cells),
    cmd.hGetAll(GRID_KEYS.players),
  ]);

  const counts = {};
  for (const owner of Object.values(cellsMap)) {
    if (owner) {
      counts[owner] = (counts[owner] || 0) + 1;
    }
  }

  const seen = new Set();
  const ranks = [];

  for (const [playerId, color] of Object.entries(playersMap)) {
    seen.add(playerId);
    ranks.push({
      playerId,
      color,
      cells: counts[playerId] || 0,
    });
  }

  for (const [playerId, n] of Object.entries(counts)) {
    if (!seen.has(playerId)) {
      ranks.push({
        playerId,
        color: "#94a3b8",
        cells: n,
      });
    }
  }

  ranks.sort((a, b) => b.cells - a.cells);

  return {
    updatedAt: Date.now(),
    ranks,
  };
}

/** @param {string} socketId */
export function buildWelcomePayload(socketId) {
  return {
    socketId,
    serverTimeIso: new Date().toISOString(),
    message: "Connected to Real-Time Grid server (Phase 5)",
  };
}

/** @param {unknown} clientPayload */
export function buildPongPayload(clientPayload) {
  return {
    echoed: clientPayload ?? null,
    serverTimeMs: Date.now(),
  };
}
