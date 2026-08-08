-- Impossible roguelite persistence schema
-- Apply locally:  npx wrangler d1 execute impossible-db --local --file=schema.sql
-- Apply remotely: npx wrangler d1 execute impossible-db --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS profiles (
  player_id TEXT PRIMARY KEY,
  shards INTEGER NOT NULL DEFAULT 0,
  games_won INTEGER NOT NULL DEFAULT 0,
  games_lost INTEGER NOT NULL DEFAULT 0,
  best_score INTEGER NOT NULL DEFAULT 0,
  best_daily_score INTEGER NOT NULL DEFAULT 0,
  total_cleared INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_run_won INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  upgrades TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id TEXT NOT NULL UNIQUE,
  player_id TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'standard',
  seed INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  shards INTEGER NOT NULL DEFAULT 0,
  cleared INTEGER NOT NULL DEFAULT 0,
  aces_on_top INTEGER NOT NULL DEFAULT 0,
  rows_used INTEGER NOT NULL DEFAULT 0,
  max_rows INTEGER NOT NULL DEFAULT 12,
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_runs_player ON runs(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_runs_score ON runs(mode, seed, score DESC);
