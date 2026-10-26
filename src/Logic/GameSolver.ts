import { Card, cardValues, suiteValues } from "./Deck";
import { SOLVABLE_DECKS } from "./SolvableDecks";
import { SOLVABLE_SOLUTIONS } from "./SolvableSolutions";
import {
  GameMove,
  GameState,
  addRowToGame,
  canClick,
  canRemove,
  handleCardClick,
  handleMoveUp,
  hasWon,
  createNewGame,
} from "./Game";

export type { GameMove } from "./Game";

export interface SolutionResult {
  solvable: boolean;
  moves: GameMove[];
  exhausted: boolean;
}

const stateKey = (state: GameState): string => {
  const board = state.board.map(row => row.map(card => {
    if (card.hidden) return "x";
    return `${card.suite}${card.val}`;
  }).join(",")).join("/");
  return `${state.deck.length}|${board}`;
};

/**
 * Searches the actual game transitions for a winning line. The node budget
 * keeps an unusually difficult deal from freezing the browser; `exhausted`
 * distinguishes a proven loss from a search that ran out of its budget.
 */
export function findSolution(initial: GameState, nodeBudget: number = 25000): SolutionResult {
  const visited = new Set<string>();
  const moves: GameMove[] = [];
  let nodes = 0;
  let exhausted = true;

  const search = (state: GameState): boolean => {
    if (hasWon(state.board, state.deck.length)) return true;
    if (nodes >= nodeBudget) {
      exhausted = false;
      return false;
    }

    const key = stateKey(state);
    if (visited.has(key)) return false;
    visited.add(key);
    nodes++;

    const candidates: { next: GameState; move: GameMove }[] = [];
    for (let ridx = 0; ridx < state.board.length; ridx++) {
      for (let cidx = 0; cidx < 4; cidx++) {
        if (!canClick(state, ridx, cidx)) continue;
        const card = state.board[ridx][cidx];
        if (canRemove(state, card, ridx, cidx)) {
          candidates.push({
            next: handleCardClick(state, ridx, cidx),
            move: { type: "clear", row: ridx, column: cidx },
          });
        }
        if (ridx > 0 && state.openColumns.length > 0) {
          candidates.push({
            next: handleMoveUp(state, ridx, cidx),
            move: { type: "move", row: ridx, column: cidx },
          });
        }
      }
    }

    candidates.sort((a, b) => {
      if (a.move.type === b.move.type) return 0;
      if (a.move.type === "clear") return -1;
      if (b.move.type === "clear") return 1;
      return 0;
    });

    if (state.deck.length > 0) {
      candidates.push({ next: addRowToGame(state), move: { type: "draw" } });
    }

    for (const candidate of candidates) {
      const next = { ...candidate.next, undoState: undefined, undoRow: undefined, addUndoRow: false };
      moves.push(candidate.move);
      if (search(next)) return true;
      moves.pop();
    }

    return false;
  };

  const solvable = search(initial);
  return { solvable, moves: solvable ? [...moves] : [], exhausted };
}

const shuffledIndices = (): number[] => {
  const indices = [0, 1, 2, 3];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices;
};

/**
 * Creates a solver-verified deal, then applies suit and column symmetries.
 * Both transformations preserve the winning line, so this is instant and does
 * not need to run a search on the player's device.
 */
export function createPermutedGame(base: number[], suits: number[], columns: number[]): GameState {
  const deck: Card[] = [];
  for (let row = 0; row < 13; row++) {
    for (let column = 0; column < 4; column++) {
      const encoded = base[row * 4 + columns[column]];
      const suite = suits[Math.floor(encoded / cardValues.length)];
      const val = cardValues[encoded % cardValues.length];
      deck.push({ suite: suiteValues[suite], val });
    }
  }
  return createNewGame(deck);
}

export interface SolvableDeal {
  game: GameState;
  solution: GameMove[];
}

export const decodeSolution = (encoded: number[], columns: number[]): GameMove[] => encoded.map(move => {
  if (move === 52) return { type: "draw" };
  const cell = move > 52 ? move - 53 : move;
  return {
    type: move > 52 ? "move" : "clear",
    row: Math.floor(cell / 4),
    column: columns.indexOf(cell % 4),
  };
});

export function createSolvableDeal(): SolvableDeal {
  const index = Math.floor(Math.random() * SOLVABLE_DECKS.length);
  const columns = shuffledIndices();
  return {
    game: createPermutedGame(SOLVABLE_DECKS[index], shuffledIndices(), columns),
    solution: decodeSolution(SOLVABLE_SOLUTIONS[index], columns),
  };
}

export function createSolvableGame(): GameState {
  return createSolvableDeal().game;
}
