export type GameMode = "standard" | "daily";

export interface Profile {
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
  upgrades: Record<string, number>;
  updated_at: string;
}

export interface RunMeta {
  mode: GameMode;
  seed: number;
  initialRows: number;
  maxRows: number;
  maxUndos: number;
  scry: boolean;
  startedAt: string;
  undosUsed: number;
  maxRowsUsed: number;
  rngState?: number;
  conceded: boolean;
}

export interface RunSummary {
  runId: string;
  mode: GameMode;
  seed: number;
  won: boolean;
  cleared: number;
  acesOnTop: number;
  rowsUsed: number;
  maxRows: number;
  score: number;
  shardsEarned: number;
  isDuplicate?: boolean;
}

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

export type UpgradeId =
  | "tallerTable"
  | "scry"
  | "undos"
  | "slightHand"
  | "goldenAces";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  icon: string;
  description: string;
  levelDescription: (level: number) => string;
  costs: number[];
}

export const UPGRADE_CATALOG: UpgradeDef[] = [
  {
    id: "tallerTable",
    name: "Taller Table",
    icon: "🪜",
    description: "Raise the height limit of the table.",
    levelDescription: (level) => `${BASE_MAX_ROWS + 2 * level} max rows`,
    costs: [150, 400, 900],
  },
  {
    id: "scry",
    name: "Scry",
    icon: "🔮",
    description: "Peek at the next row before you deal it.",
    levelDescription: () => "Peek the next row before dealing",
    costs: [120, 350, 800],
  },
  {
    id: "undos",
    name: "Timebend",
    icon: "⏳",
    description: "Bend time to undo a move or deal.",
    levelDescription: (level) => `${BASE_UNDOS + level} undos per run`,
    costs: [100, 300, 700],
  },
  {
    id: "slightHand",
    name: "Slight Hand",
    icon: "🎩",
    description: "The run begins with fewer rows on the table.",
    levelDescription: (level) => `Start with ${BASE_INITIAL_ROWS - level} rows`,
    costs: [200, 500, 1100],
  },
  {
    id: "goldenAces",
    name: "Golden Aces",
    icon: "🏆",
    description: "Aces resting on the top row pay out more shards.",
    levelDescription: (level) => `${1 + 0.5 * level}× ace shards`,
    costs: [180, 450, 1000],
  },
];

export const upgradeById = (id: string): UpgradeDef | undefined =>
  UPGRADE_CATALOG.find((u) => u.id === id);

export const upgradeCost = (def: UpgradeDef, currentLevel: number): number | undefined =>
  def.costs[currentLevel];

export const goldenAceMultiplier = (upgrades: Record<string, number>): number =>
  1 + 0.5 * (upgrades["goldenAces"] ?? 0);

export const effectiveMaxRows = (upgrades: Record<string, number>): number =>
  BASE_MAX_ROWS + 2 * (upgrades["tallerTable"] ?? 0);

export const maxUndos = (upgrades: Record<string, number>): number =>
  BASE_UNDOS + (upgrades["undos"] ?? 0);

export const initialRows = (upgrades: Record<string, number>): number =>
  Math.max(1, BASE_INITIAL_ROWS - (upgrades["slightHand"] ?? 0));

export interface RunStats {
  mode: GameMode;
  won: boolean;
  cleared: number;
  acesOnTop: number;
  rowsUsed: number;
  maxRows: number;
}

/**
 * Mirrors functions/api/_score.ts. Kept in sync so the offline fallback and
 * the run summary can compute identical rewards to the server.
 */
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

export const countAcesOnTopRow = (board: { val: string; hidden?: boolean }[][]): number => {
  const top = board[0];
  if (!top) return 0;
  return top.filter((c) => !c.hidden && c.val === "14").length;
};
