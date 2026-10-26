import { CardVal, Suite, cardValues } from "./Deck";
import {
  GameMove,
  GameState,
  addRowToGame,
  applyGameMove,
  hasWon,
} from "./Game";
import { createPermutedGame, createSolvableDeal, createSolvableGame, decodeSolution, findSolution } from "./GameSolver";
import { SOLVABLE_DECKS } from "./SolvableDecks";
import { SOLVABLE_SOLUTIONS } from "./SolvableSolutions";

const replay = (initial: GameState, moves: GameMove[]): GameState =>
  moves.reduce(applyGameMove, initial);

describe("findSolution", () => {
  it("proves that a final row with one card of each suit and no support is unwinnable", () => {
    const state: GameState = {
      board: [[
        { suite: Suite.Spade, val: CardVal.Two },
        { suite: Suite.Heart, val: CardVal.Three },
        { suite: Suite.Club, val: CardVal.Four },
        { suite: Suite.Diamond, val: CardVal.Five },
      ]],
      deck: [],
      openColumns: [],
      cleared: 0,
      addUndoRow: false,
    };

    const result = findSolution(state);
    expect(result.solvable).toBe(false);
    expect(result.exhausted).toBe(true);
  });
});

describe("solver-verified deals", () => {
  it("replays a winning path for every base deal and its suit/column permutations", () => {
    const suits = [2, 0, 3, 1];
    const columns = [2, 0, 3, 1];

    expect(SOLVABLE_SOLUTIONS.length).toBe(SOLVABLE_DECKS.length);

    SOLVABLE_DECKS.forEach((encoded, index) => {
      const finalRowSuits = encoded.slice(-4).map(card => Math.floor(card / cardValues.length));
      expect(new Set(finalRowSuits).size).toBeLessThan(4);

      const permuted = createPermutedGame(encoded, suits, columns);
      const won = replay(permuted, decodeSolution(SOLVABLE_SOLUTIONS[index], columns));
      expect(hasWon(won.board, won.deck.length)).toBe(true);
    });
  });

  it("returns a valid deal together with its winning path", () => {
    for (let i = 0; i < 20; i++) {
      const deal = createSolvableDeal();
      const won = replay(deal.game, deal.solution);
      expect(hasWon(won.board, won.deck.length)).toBe(true);
    }
  });

  it("creates valid full-deck games", () => {
    for (let i = 0; i < 12; i++) {
      const game = createSolvableGame();
      const all = [...game.board.flat(), ...game.deck];

      expect(game.board.length).toBe(4);
      expect(game.deck.length).toBe(36);
      expect(all.length).toBe(52);
      expect(new Set(all.map(card => card.suite + card.val)).size).toBe(52);
      expect(all.every(card => !card.hidden)).toBe(true);
    }
  });

  it("keeps the final row in the same predetermined order after every deal", () => {
    const game = createSolvableGame();
    const finalRow = game.deck.slice(-4);
    let state = game;
    while (state.deck.length > 4) state = addRowToGame(state);

    const next = addRowToGame(state);
    expect(next.undoRow).toEqual(finalRow);
    expect(next.deck).toEqual([]);
  });
});
