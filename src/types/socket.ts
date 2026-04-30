/** Server → client handshake payload (Phase 2). */
export interface WelcomePayload {
  socketId: string;
  serverTimeIso: string;
  message: string;
}

/** Ack payload for `test:ping`. */
export interface PongPayload {
  echoed: unknown;
  serverTimeMs: number;
}

/** Broadcast payload after `test:echo`. */
export interface EchoBroadcastPayload {
  from: string;
  text: string;
  at: number;
}

/** After connect: stable player id + assigned paint color (Phase 4). */
export interface SessionIdentityPayload {
  playerId: string;
  color: string;
}

/** Another user already owns this cell (Phase 4). */
export interface GridRejectPayload {
  row: number;
  col: number;
  reason: "claimed" | string;
}
