import {
  Profile,
  RunStats,
  RunSummary,
  computeScore,
  computeShards,
  goldenAceMultiplier,
} from "./Logic/Meta";

const PLAYER_KEY = "impossible-player-id";
const META_KEY = "impossible-meta-v1";
const RUNS_KEY = "impossible-runs-v1";

export interface LeaderboardRow {
  player_id: string;
  score: number;
  won: number;
  cleared: number;
  created_at: string;
}

export interface LeaderboardData {
  allTime: LeaderboardRow[];
  daily: LeaderboardRow[];
  playerRank: number | null;
}

export interface DailyInfo {
  date: string;
  seed: number;
}

export interface CompleteRunPayload {
  runId: string;
  mode: "standard" | "daily";
  seed: number;
  won: boolean;
  cleared: number;
  acesOnTop: number;
  rowsUsed: number;
  maxRows: number;
}

export interface CompleteRunResult {
  profile: Profile;
  score: number;
  shardsEarned: number;
  isDuplicate: boolean;
}

const getOrCreatePlayerId = (): string => {
  let id = localStorage.getItem(PLAYER_KEY);
  if (!id) {
    const g = globalThis as { crypto?: { randomUUID?: () => string } };
    id =
      g.crypto?.randomUUID?.() ??
      `player-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
    localStorage.setItem(PLAYER_KEY, id);
  }
  return id;
};

const playerId = getOrCreatePlayerId();

const upsertProfile = (profile: Profile): void => {
  localStorage.setItem(META_KEY, JSON.stringify(profile));
};

/** D1 stores upgrades as a JSON string; normalize into an object. */
const normalizeProfile = (raw: Profile): Profile => {
  if (typeof raw.upgrades === "string") {
    try {
      return { ...raw, upgrades: JSON.parse(raw.upgrades) as Record<string, number> };
    } catch {
      return { ...raw, upgrades: {} };
    }
  }
  return { ...raw, upgrades: raw.upgrades ?? {} };
};

const loadProfile = (): Profile | null => {
  const raw = localStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Profile;
    return { ...parsed, upgrades: parsed.upgrades ?? {} };
  } catch {
    return null;
  }
};

const emptyProfile = (): Profile => ({
  player_id: playerId,
  shards: 0,
  games_won: 0,
  games_lost: 0,
  best_score: 0,
  best_daily_score: 0,
  total_cleared: 0,
  streak: 0,
  last_run_won: 0,
  longest_streak: 0,
  upgrades: {},
  updated_at: new Date().toISOString(),
});

const localCompleteRun = (payload: CompleteRunPayload): CompleteRunResult => {
  const stats: RunStats = {
    mode: payload.mode,
    won: payload.won,
    cleared: payload.cleared,
    acesOnTop: payload.acesOnTop,
    rowsUsed: payload.rowsUsed,
    maxRows: payload.maxRows,
  };

  const existing: { runId: string; score: number; shards: number }[] = JSON.parse(
    localStorage.getItem(RUNS_KEY) ?? "[]"
  );
  const dup = existing.find((r) => r.runId === payload.runId);

  const profile = loadProfile() ?? emptyProfile();
  const score = dup?.score ?? computeScore(stats);
  const shardsEarned = dup?.shards ?? computeShards(stats, goldenAceMultiplier(profile.upgrades));

  if (!dup) {
    const newStreak = stats.won ? profile.streak + 1 : 0;
    profile.shards += shardsEarned;
    profile.games_won += stats.won ? 1 : 0;
    profile.games_lost += stats.won ? 0 : 1;
    profile.best_score = Math.max(profile.best_score, score);
    if (stats.mode === "daily") {
      profile.best_daily_score = Math.max(profile.best_daily_score, score);
    }
    profile.total_cleared += stats.cleared;
    profile.streak = newStreak;
    profile.last_run_won = stats.won ? 1 : 0;
    profile.longest_streak = Math.max(profile.longest_streak, newStreak);
    profile.updated_at = new Date().toISOString();
    existing.push({
      ...payload,
      score,
      shards: shardsEarned,
    });
    localStorage.setItem(RUNS_KEY, JSON.stringify(existing));
    upsertProfile(profile);
  }

  return { profile, score, shardsEarned, isDuplicate: !!dup };
};

const dailySeedLocal = (): number =>
  Number(new Date().toISOString().slice(0, 10).replace(/-/g, ""));

const shortName = (id: string): string =>
  id.length > 8 ? `${id.slice(0, 4)}…${id.slice(-4)}` : id;

const localLeaderboard = (): LeaderboardData => {
  const runs: (CompleteRunPayload & { score: number; created_at: string })[] = JSON.parse(
    localStorage.getItem(RUNS_KEY) ?? "[]"
  );
  const today = dailySeedLocal();
  const rows = runs
    .map((r) => ({
      player_id: playerId,
      score: r.score,
      won: r.won ? 1 : 0,
      cleared: r.cleared,
      created_at: r.created_at,
    }))
    .sort((a, b) => b.score - a.score);

  return {
    allTime: rows.slice(0, 10),
    daily: rows
      .filter((_, i) => {
        const run = runs[i];
        return run && run.mode === "daily" && run.seed === today;
      })
      .slice(0, 10),
    playerRank: rows.length ? 1 : null,
  };
};

export interface Api {
  playerId: string;
  getProfile(): Promise<Profile>;
  purchaseUpgrade(upgradeId: string): Promise<Profile>;
  completeRun(payload: CompleteRunPayload): Promise<CompleteRunResult>;
  getLeaderboard(): Promise<LeaderboardData>;
  getDaily(): Promise<DailyInfo>;
  displayName(id: string): string;
}

class CloudApi implements Api {
  playerId = playerId;
  private offline = false;

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) {
      throw new Error(`${path} -> ${res.status}`);
    }
    return (await res.json()) as T;
  }

  private async withFallback<T>(remote: () => Promise<T>, local: () => T): Promise<T> {
    if (this.offline) return local();
    try {
      const value = await remote();
      this.offline = false;
      return value;
    } catch {
      this.offline = true;
      return local();
    }
  }

  getProfile = (): Promise<Profile> =>
    this.withFallback(
      async () =>
        normalizeProfile(
          (await this.request<{ profile: Profile }>(`/api/profile?playerId=${playerId}`)).profile
        ),
      () => loadProfile() ?? emptyProfile()
    );

  purchaseUpgrade = (upgradeId: string): Promise<Profile> =>
    this.withFallback(
      async () =>
        normalizeProfile(
          (
            await this.request<{ profile: Profile }>(`/api/upgrade?playerId=${playerId}`, {
              method: "POST",
              body: JSON.stringify({ upgradeId }),
            })
          ).profile
        ),
      () => {
        const profile = loadProfile() ?? emptyProfile();
        const current = profile.upgrades[upgradeId] ?? 0;
        const costs: Record<string, number[]> = {
          tallerTable: [150, 400, 900],
          scry: [120, 350, 800],
          undos: [100, 300, 700],
          slightHand: [200, 500, 1100],
          goldenAces: [180, 450, 1000],
        };
        const cost = costs[upgradeId]?.[current];
        if (cost === undefined || profile.shards < cost) {
          return profile;
        }
        profile.shards -= cost;
        profile.upgrades = { ...profile.upgrades, [upgradeId]: current + 1 };
        upsertProfile(profile);
        return profile;
      }
    );

  completeRun = (payload: CompleteRunPayload): Promise<CompleteRunResult> =>
    this.withFallback(
      async () => {
        const result = await this.request<CompleteRunResult>(
          `/api/runs/complete?playerId=${playerId}`,
          {
            method: "POST",
            body: JSON.stringify(payload),
          }
        );
        return { ...result, profile: normalizeProfile(result.profile) };
      },
      () => localCompleteRun(payload)
    );

  getLeaderboard = (): Promise<LeaderboardData> =>
    this.withFallback(
      async () =>
        await this.request<LeaderboardData>(`/api/leaderboard?playerId=${playerId}`),
      () => localLeaderboard()
    );

  getDaily = (): Promise<DailyInfo> =>
    this.withFallback(
      async () => await this.request<DailyInfo>(`/api/daily`),
      () => ({ date: new Date().toISOString().slice(0, 10), seed: dailySeedLocal() })
    );

  displayName = (id: string): string => shortName(id);
}

export const api: Api = new CloudApi();

export const newRunSummary = (
  apiResult: CompleteRunResult,
  partial: Omit<RunSummary, "score" | "shardsEarned">
): RunSummary => ({
  ...partial,
  score: apiResult.score,
  shardsEarned: apiResult.shardsEarned,
  isDuplicate: apiResult.isDuplicate,
});