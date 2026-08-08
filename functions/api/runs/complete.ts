import { ensureProfile, isValidMode, json, parseUpgrades, readPlayerId } from "../_lib";
import type { PageContext, Upgrades } from "../_lib";
import { computeScore, computeShards, goldenAceMultiplier } from "../_score";

interface RunPayload {
  runId: string;
  mode: "standard" | "daily";
  seed?: number;
  won: boolean;
  cleared: number;
  acesOnTop: number;
  rowsUsed: number;
  maxRows: number;
  undone?: number;
}

export const onRequestPost = async (context: PageContext) => {
  const playerId = readPlayerId(context.request);
  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  let body: RunPayload;
  try {
    body = (await context.request.json()) as RunPayload;
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  if (!body.runId || typeof body.runId !== "string") {
    return json({ error: "runId is required" }, 400);
  }
  if (!isValidMode(body.mode)) {
    return json({ error: "mode must be 'standard' or 'daily'" }, 400);
  }

  const cleared = Math.min(Math.max(Math.floor(body.cleared) || 0, 0), 48);
  const acesOnTop = Math.min(Math.max(Math.floor(body.acesOnTop) || 0, 0), 4);
  const rowsUsed = Math.max(Math.floor(body.rowsUsed) || 0, 1);
  const maxRows = Math.min(Math.max(Math.floor(body.maxRows) || 12, 1), 24);
  const seed = Math.floor(body.seed ?? 0);

  const profile = await ensureProfile(context.env.DB, playerId);
  const upgrades: Upgrades = parseUpgrades(profile.upgrades);

  const stats = {
    mode: body.mode,
    won: !!body.won,
    cleared,
    acesOnTop,
    rowsUsed,
    maxRows,
  };
  const score = computeScore(stats);
  const shardsEarned = computeShards(stats, goldenAceMultiplier(upgrades));

  const newStreak = stats.won ? profile.streak + 1 : 0;
  const longestStreak = Math.max(profile.longest_streak, newStreak);
  const now = new Date().toISOString();

  const existing = await context.env.DB.prepare(
    `SELECT score, shards FROM runs WHERE run_id = ?`
  )
    .bind(body.runId)
    .first<{ score: number; shards: number }>();
  if (existing) {
    const profile = await context.env.DB.prepare(
      `SELECT * FROM profiles WHERE player_id = ?`
    )
      .bind(playerId)
      .first();
    return json({ profile, score: existing.score, shardsEarned: existing.shards, isDuplicate: true });
  }

  await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE profiles SET
         shards = shards + ?,
         games_won = games_won + ?,
         games_lost = games_lost + ?,
         best_score = MAX(best_score, ?),
         best_daily_score = MAX(best_daily_score, CASE WHEN ? = 'daily' THEN ? ELSE best_daily_score END),
         total_cleared = total_cleared + ?,
         streak = ?,
         last_run_won = ?,
         longest_streak = ?,
         updated_at = ?
       WHERE player_id = ?`
    )
      .bind(
        shardsEarned,
        stats.won ? 1 : 0,
        stats.won ? 0 : 1,
        score,
        stats.mode,
        score,
        cleared,
        newStreak,
        stats.won ? 1 : 0,
        longestStreak,
        now,
        playerId
      ),
    context.env.DB.prepare(
      `INSERT INTO runs (run_id, player_id, mode, seed, won, score, shards, cleared, aces_on_top, rows_used, max_rows, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      body.runId,
      playerId,
      stats.mode,
      seed,
      stats.won ? 1 : 0,
      score,
      shardsEarned,
      cleared,
      acesOnTop,
      rowsUsed,
      maxRows,
      now
    ),
  ]);

  const updated = await context.env.DB.prepare(
    `SELECT * FROM profiles WHERE player_id = ?`
  )
    .bind(playerId)
    .first();

  return json({ profile: updated, score, shardsEarned, isDuplicate: false });
};
