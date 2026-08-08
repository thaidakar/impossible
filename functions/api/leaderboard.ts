import { json, readPlayerId } from "./_lib";
import type { PageContext } from "./_lib";

interface LeaderboardRow {
  player_id: string;
  score: number;
  won: number;
  cleared: number;
  created_at: string;
}

export const onRequestGet = async (context: PageContext) => {
  const url = new URL(context.request.url);
  const mode = url.searchParams.get("mode") === "daily" ? "daily" : "standard";
  const seed = Number(url.searchParams.get("seed") ?? 0);
  const playerId = readPlayerId(context.request);

  const allTime = await context.env.DB.prepare(
    `SELECT player_id, score, won, cleared, created_at
     FROM runs
     ORDER BY score DESC, created_at ASC
     LIMIT 10`
  ).all<LeaderboardRow>();

  const daily = await context.env.DB.prepare(
    `SELECT player_id, score, won, cleared, created_at
     FROM runs
     WHERE mode = 'daily' AND seed = ?
     ORDER BY score DESC, created_at ASC
     LIMIT 10`
  )
    .bind(seed)
    .all<LeaderboardRow>();

  let playerRank: number | null = null;
  if (playerId) {
    const rankRow = await context.env.DB.prepare(
      `SELECT (SELECT COUNT(*) FROM runs r2 WHERE r2.score > r.score OR (r2.score = r.score AND r2.created_at < r.created_at)) + 1 AS rank
       FROM runs r
       WHERE r.player_id = ? AND r.mode = ?
       ORDER BY r.score DESC
       LIMIT 1`
    )
      .bind(playerId, mode)
      .first<{ rank: number }>();
    playerRank = rankRow?.rank ?? null;
  }

  return json({ allTime: allTime.results, daily: daily.results, playerRank });
};
