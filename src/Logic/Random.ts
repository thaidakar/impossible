/**
 * Deterministic PRNG (mulberry32) and seeded card picking.
 * Used for the daily challenge: the same seed must reproduce the same deal
 * for every player.
 */
export interface SeededRng {
  next: () => number;
  state: () => number;
}

export const createRng = (seedOrState: number): SeededRng => {
  let a = seedOrState >>> 0;
  return {
    next: () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    state: () => a,
  };
};

/** Legacy standalone PRNG function, equivalent to createRng(seed).next. */
export const mulberry32 = (seed: number): (() => number) => createRng(seed).next;
