import {
  UPGRADE_CATALOG,
  RunStats,
  computeScore,
  computeShards,
  effectiveMaxRows,
  goldenAceMultiplier,
  initialRows,
  maxUndos,
  upgradeCost,
} from "./Meta";

describe("upgrade catalog", () => {
  it("has five upgrades with three levels each", () => {
    expect(UPGRADE_CATALOG).toHaveLength(5);
    for (const def of UPGRADE_CATALOG) {
      expect(def.costs).toHaveLength(3);
      expect(upgradeCost(def, 3)).toBeUndefined();
    }
  });

  it("prices escalate per level", () => {
    for (const def of UPGRADE_CATALOG) {
      for (let i = 1; i < def.costs.length; i++) {
        expect(def.costs[i]).toBeGreaterThan(def.costs[i - 1]);
      }
    }
  });
});

describe("upgrade effects", () => {
  it("raises the row limit by two per level", () => {
    expect(effectiveMaxRows({})).toBe(12);
    expect(effectiveMaxRows({ tallerTable: 1 })).toBe(14);
    expect(effectiveMaxRows({ tallerTable: 3 })).toBe(18);
  });

  it("grants one extra undo per level on top of the base", () => {
    expect(maxUndos({})).toBe(1);
    expect(maxUndos({ undos: 2 })).toBe(3);
  });

  it("deals fewer starting rows with Slight Hand, never below one", () => {
    expect(initialRows({})).toBe(4);
    expect(initialRows({ slightHand: 2 })).toBe(2);
    expect(initialRows({ slightHand: 3 })).toBe(1);
  });

  it("scales ace shards by 1 + 0.5 per level", () => {
    expect(goldenAceMultiplier({})).toBe(1);
    expect(goldenAceMultiplier({ goldenAces: 1 })).toBe(1.5);
    expect(goldenAceMultiplier({ goldenAces: 3 })).toBe(2.5);
  });
});

describe("scoring", () => {
  const win: RunStats = {
    mode: "standard",
    won: true,
    cleared: 48,
    acesOnTop: 4,
    rowsUsed: 9,
    maxRows: 12,
  };

  it("scores a full standard win", () => {
    // 4800 + 1000 + 5000 + (12-9)*250 = 11550
    expect(computeScore(win)).toBe(11550);
  });

  it("applies the daily multiplier and rounds down", () => {
    expect(computeScore({ ...win, mode: "daily" })).toBe(Math.floor(11550 * 1.25));
  });

  it("does not award a negative grace bonus for overflowing runs", () => {
    const loss = { ...win, won: false, rowsUsed: 13, maxRows: 12 };
    expect(computeScore(loss)).toBe(4800 + 1000 + 0);
  });

  it("awards shards for clears, aces, and win bonuses", () => {
    // 48*5 + 4*50 + 300 = 740
    expect(computeShards(win, 1)).toBe(740);
  });

  it("adds a daily win bonus and scales ace shards", () => {
    // 48*5 + 4*50*1.5 + 300 + 75 = 915
    expect(computeShards({ ...win, mode: "daily" }, 1.5)).toBe(915);
  });

  it("pays only clear shards on a loss", () => {
    const loss = { ...win, won: false, acesOnTop: 0, cleared: 12 };
    expect(computeShards(loss, 1)).toBe(60);
  });
});
