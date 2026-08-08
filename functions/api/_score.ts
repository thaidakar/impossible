import type { Upgrades } from "./_lib";

export const BASE_MAX_ROWS = 12;
export const BASE_UNDOS = 1;
export const BASE_INITIAL_ROWS = 4;

export const SCORE_PER_CLEAR = 100;
export const SCORE_PER_ACE = 250;
export const SCORE_WIN_BONUS = 5000;
export const SCORE_GRACE_PER_ROW = 250;
export const DAILY_MULTIPLIER = 1.25;

export const SHARDS_PER_CLEAR = 5;
export const SHARDS_PER_ACE = 50;
export const SHARDS_WIN_BONUS = 300;
export const SHARDS_DAILY_WIN_BONUS = 75;

export interface RunStats {
  mode: "standard" | "daily";
  won: boolean;
  cleared: number;
  acesOnTop: number;
  rowsUsed: number;
  maxRows: number;
}

export const goldenAceMultiplier = (upgrades: Upgrades): number =>
  1 + 0.5 * (upgrades["goldenAces"] ?? 0);

export const effectiveMaxRows = (upgrades: Upgrades): number =>
  BASE_MAX_ROWS + 2 * (upgrades["tallerTable"] ?? 0);

export const maxUndos = (upgrades: Upgrades): number =>
  BASE_UNDOS + (upgrades["undos"] ?? 0);

export const initialRows = (upgrades: Upgrades): number =>
  Math.max(1, BASE_INITIAL_ROWS - (upgrades["slightHand"] ?? 0));

export const computeScore = (stats: RunStats): number => {
  const grace = Math.max(0, stats.maxRows - stats.rowsUsed);
  const base =
    stats.cleared * SCORE_PER_CLEAR +
    stats.acesOnTop * SCORE_PER_ACE +
    (stats.won ? SCORE_WIN_BONUS : 0) +
    grace * SCORE_GRACE_PER_ROW;
  return stats.mode === "daily" ? Math.floor(base * DAILY_MULTIPLIER) : base;
};

export const computeShards = (
  stats: RunStats,
  aceMultiplier: number
): number => {
  return (
    stats.cleared * SHARDS_PER_CLEAR +
    Math.floor(stats.acesOnTop * SHARDS_PER_ACE * aceMultiplier) +
    (stats.won ? SHARDS_WIN_BONUS : 0) +
    (stats.won && stats.mode === "daily" ? SHARDS_DAILY_WIN_BONUS : 0)
  );
};
