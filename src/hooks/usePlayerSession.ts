import { useEffect, useState } from "react";
import { getSocket } from "../socket/socket";
import type { SessionIdentityPayload } from "../types/socket";

export interface PlayerSession {
  playerId: string;
  color: string;
}

/** Subscribes to `session:identity` and recovers it if the UI mounted late. */
export function usePlayerSession(): PlayerSession | null {
  const [session, setSession] = useState<PlayerSession | null>(null);

  useEffect(() => {
    const socket = getSocket();

    const onSession = (payload: SessionIdentityPayload) => {
      setSession({ playerId: payload.playerId, color: payload.color });
    };

    const requestIdentity = () => {
      socket.emit("session:requestIdentity");
    };

    socket.on("session:identity", onSession);
    socket.on("connect", requestIdentity);
    requestIdentity();

    return () => {
      socket.off("session:identity", onSession);
      socket.off("connect", requestIdentity);
    };
  }, []);

  return session;
}
