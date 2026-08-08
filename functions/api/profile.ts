import { ensureProfile, json, readPlayerId } from "./_lib";
import type { PageContext } from "./_lib";

export const onRequestGet = async (context: PageContext) => {
  const playerId = readPlayerId(context.request);
  if (!playerId) {
    return json({ error: "playerId is required" }, 400);
  }

  const profile = await ensureProfile(context.env.DB, playerId);
  return json({ profile });
};
