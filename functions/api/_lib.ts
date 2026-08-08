export interface Env {
  DB: D1Database;
}

export interface PageContext {
  env: Env;
  request: Request;
  params: Record<string, string>;
}

export interface ProfileRow {
  player_id: string;
  shards: number;
  games_won: number;
  games_lost: number;
  best_score: number;
  best_daily_score: number;
  total_cleared: number;
  streak: number;
  last_run_won: number;
  longest_streak: number;
  upgrades: string;
  updated_at: string;
}

export type Upgrades = Record<string, number>;

export const json = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export const readPlayerId = (request: Request): string => {
  const url = new URL(request.url);
  return url.searchParams.get("playerId") ?? request.headers.get("x-player-id") ?? "";
};

export const parseUpgrades = (raw: string): Upgrades => {
  try {
    return JSON.parse(raw) as Upgrades;
  } catch {
    return {};
  }
};

export const isValidMode = (mode: string): mode is "standard" | "daily" =>
  mode === "standard" || mode === "daily";

export const ensureProfile = async (db: D1Database, playerId: string): Promise<ProfileRow> => {
  await db
    .prepare(
      `INSERT OR IGNORE INTO profiles (player_id, updated_at) VALUES (?, ?)`
    )
    .bind(playerId, new Date().toISOString())
    .run();
  return db
    .prepare(`SELECT * FROM profiles WHERE player_id = ?`)
    .bind(playerId)
    .first<ProfileRow>()
    .then((row) => row ?? ({} as ProfileRow));
};

export const dailySeed = (): number =>
  Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));
