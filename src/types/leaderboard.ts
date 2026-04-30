export interface LeaderboardEntry {
  playerId: string;
  color: string;
  cells: number;
}

export interface LeaderboardPayload {
  updatedAt: number;
  ranks: LeaderboardEntry[];
}
