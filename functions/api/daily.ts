import { json } from "./_lib";
import type { PageContext } from "./_lib";
import { dailySeed } from "./_lib";

export const onRequestGet = (context: PageContext) => {
  const seed = dailySeed();
  return json({ date: new Date().toISOString().slice(0, 10), seed });
};
