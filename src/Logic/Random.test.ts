import { mulberry32 } from "./Random";
import { Card, CardVal, GetNextCard, Suite, cardValues, suiteValues } from "./Deck";

const makeDeck = (): Card[] =>
  suiteValues.flatMap((suite) =>
    cardValues.map((val) => ({ suite, val } as Card))
  );

describe("mulberry32", () => {
  it("is deterministic for the same seed", () => {
    const a = mulberry32(20260808);
    const b = mulberry32(20260808);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it("differs for different seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it("always returns values in [0, 1)", () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("seeded draws", () => {
  it("draws the entire deck exactly once with a fixed seed", () => {
    const rng = mulberry32(12345);
    const deck = makeDeck();
    const seen = new Map<string, number>();

    while (deck.length > 0) {
      const { idx, card } = GetNextCard(deck, rng);
      expect(idx).toBeDefined();
      expect(card).toBeDefined();
      deck.splice(idx as number, 1);
      const key = `${(card as Card).suite}${(card as Card).val}`;
      seen.set(key, (seen.get(key) ?? 0) + 1);
    }

    expect(deck.length).toBe(0);
    expect(seen.size).toBe(52);
    seen.forEach((count) => expect(count).toBe(1));
  });

  it("reproduces the same deal for the same seed", () => {
    const deal = (seed: number): Card[] => {
      const rng = mulberry32(seed);
      const deck = makeDeck();
      const dealt: Card[] = [];
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const { idx, card } = GetNextCard(deck, rng);
          deck.splice(idx as number, 1);
          dealt.push(card as Card);
        }
      }
      return dealt;
    };

    expect(deal(20260808)).toEqual(deal(20260808));
    expect(deal(20260808)).not.toEqual(deal(20260809));
  });
});
