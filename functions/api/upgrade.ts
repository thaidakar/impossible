import { ensureProfile, json, parseUpgrades, readPlayerId } from "./_lib";
import type { PageContext, Upgrades } from "./_lib";

interface UpgradeDef {
  costs: number[];
}

const MAX_LEVEL = 3;

const UPGRADES: Record<string, UpgradeDef> = {
  tallerTable: { costs: [150, 400, 900] },
  scry: { costs: [120, 350, 800] },
  undos: { costs: [100, 300, 700] },
  slightHand: { costs: [200, 500, 1100] },
  goldenAces: { costs: [180, 450, 1000] },
};

export const onRequestPost = async (context: PageContext) => {
  const playerId = readPlayerId(context.request);
  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  let body: { upgradeId?: string };
  try {
    body = (await context.request.json()) as { upgradeId?: string };
  } catch {
    return json({ error: "invalid JSON body" }, 400);
  }

  const def = body.upgradeId ? UPGRADES[body.upgradeId] : undefined;
  if (!def) {
    return json({ error: "unknown upgrade" }, 400);
  }

  const profile = await ensureProfile(context.env.DB, playerId);
  const upgrades: Upgrades = parseUpgrades(profile.upgrades);
  const currentLevel = upgrades[body.upgradeId as string] ?? 0;

  if (currentLevel >= MAX_LEVEL) {
    return json({ error: "upgrade already at max level" }, 400);
  }

  const cost = def.costs[currentLevel];
  if (profile.shards < cost) {
    return json({ error: "not enough shards" }, 400);
  }

  const nextUpgrades: Upgrades = { ...upgrades, [body.upgradeId as string]: currentLevel + 1 };
  const result = await context.env.DB.batch([
    context.env.DB.prepare(
      `UPDATE profiles SET shards = shards - ?, upgrades = ?, updated_at = ?
       WHERE player_id = ? AND shards >= ?`
    ).bind(cost, JSON.stringify(nextUpgrades), new Date().toISOString(), playerId, cost),
    context.env.DB.prepare(`SELECT * FROM profiles WHERE player_id = ?`).bind(playerId),
  ]);

  const updatedRows = result[0]?.meta?.changes ?? 0;
  const profileAfter = result[1]?.results?.[0];

  return json({
    profile: profileAfter,
    upgradeId: body.upgradeId,
    level: currentLevel + 1,
    shardsSpent: cost,
    failed: updatedRows === 0,
  });
};
