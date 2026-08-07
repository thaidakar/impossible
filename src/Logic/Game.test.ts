import { Card, CardVal, Suite } from "./Deck";
import {
  GameState,
  addRowToGame,
  canClick,
  canRemove,
  createNewGame,
  drawRow,
  handleCardClick,
  handleMoveUp,
  hasWon,
  sameCard,
  undoGame,
} from "./Game";

const c = (suite: Suite, val: CardVal, hidden: boolean = false): Card => ({ suite, val, hidden });
const h = (suite: Suite, val: CardVal): Card => c(suite, val, true);

const suit = (suite: Suite, vals: CardVal[]): Card[] => vals.map(v => c(suite, v));

const row = (...cards: Card[]): Card[] => cards;

// All 13 values per suite
const ALL_VALS: CardVal[] = [
  CardVal.Two, CardVal.Three, CardVal.Four, CardVal.Five, CardVal.Six, CardVal.Seven,
  CardVal.Eight, CardVal.Nine, CardVal.Ten, CardVal.Jack, CardVal.Queen, CardVal.King, CardVal.Ace,
];

// Full 52-card deck, minus any cards that are already on a board
const deckWithout = (boardCards: Card[]): Card[] => {
  const deck: Card[] = [];
  for (const suite of [Suite.Spade, Suite.Heart, Suite.Club, Suite.Diamond]) {
    for (const val of ALL_VALS) {
      if (!boardCards.some(b => sameCard(b, { suite, val }))) {
        deck.push({ suite, val });
      }
    }
  }
  return deck;
};

const makeState = (overrides: Partial<GameState>): GameState => ({
  board: [],
  deck: [],
  openColumns: [],
  cleared: 0,
  addUndoRow: false,
  ...overrides,
});

const boardCards = (board: Card[][]): Card[] => board.flat();

describe("createNewGame", () => {
  it("deals four rows of four visible cards", () => {
    const game = createNewGame();
    expect(game.board.length).toBe(4);
    expect(game.board.every(r => r.length === 4)).toBe(true);
    expect(game.board.flat().every(card => !card.hidden)).toBe(true);
    expect(game.deck.length).toBe(36);
    expect(game.openColumns).toEqual([]);
    expect(game.cleared).toBe(0);
  });

  it("never duplicates cards between the board and the deck", () => {
    const game = createNewGame();
    const all = [...boardCards(game.board), ...game.deck];
    expect(new Set(all.map(c => c.suite + c.val)).size).toBe(52);
  });
});

describe("canClick", () => {
  it("cannot click a hidden card", () => {
    const state = makeState({
      board: [row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), h(Suite.Club, CardVal.Seven), c(Suite.Diamond, CardVal.Eight))],
      deck: [],
    });
    expect(canClick(state, 0, 2)).toBe(false);
  });

  it("cannot click a card with a visible card below it", () => {
    const state = makeState({
      board: [
        row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Diamond, CardVal.Eight)),
        row(c(Suite.Spade, CardVal.Nine), c(Suite.Heart, CardVal.Ten), c(Suite.Club, CardVal.Jack), c(Suite.Diamond, CardVal.Queen)),
      ],
      deck: [],
    });
    expect(canClick(state, 0, 0)).toBe(false);
    expect(canClick(state, 1, 0)).toBe(true);
  });
});

describe("canRemove", () => {
  it("cannot remove an Ace", () => {
    const state = makeState({
      board: [row(c(Suite.Spade, CardVal.Ace), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Diamond, CardVal.Eight))],
      deck: [],
    });
    expect(canRemove(state, state.board[0][0], 0, 0)).toBe(false);
  });

  it("can remove a card when a higher card of the same suit is in the bottom row", () => {
    const state = makeState({
      board: [row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Spade, CardVal.King))],
      deck: [],
    });
    expect(canRemove(state, state.board[0][0], 0, 0)).toBe(true);
  });

  it("cannot remove a card without a higher card of the same suit in the bottom row", () => {
    const state = makeState({
      board: [row(c(Suite.Spade, CardVal.King), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Diamond, CardVal.Eight))],
      deck: [],
    });
    expect(canRemove(state, state.board[0][0], 0, 0)).toBe(false);
  });

  it("a higher card of a different suit does not count", () => {
    const state = makeState({
      board: [row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Heart, CardVal.King))],
      deck: [],
    });
    expect(canRemove(state, state.board[0][0], 0, 0)).toBe(false);
  });
});

describe("drawRow", () => {
  it("fills the topmost hidden cell of each column, one card per column", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), h(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });
    const deckBefore = state.deck.length;

    const { state: next, row: drawn } = drawRow(state);

    expect(drawn.length).toBe(4);
    expect(next.deck.length).toBe(deckBefore - 4);
    // The hidden cell (1,1) is filled with the new card for column 1
    expect(next.board[1][1]).toEqual(drawn[1]);
    expect(next.board[1][1].hidden).toBeFalsy();
    // A new bottom row is added: the column that was filled (1) gets a hidden
    // placeholder, the other columns get their new card
    expect(next.board.length).toBe(3);
    expect(next.board[2][0].hidden).toBeFalsy();
    expect(next.board[2][1].hidden).toBe(true);
    expect(next.board[2][2].hidden).toBeFalsy();
    expect(next.board[2][3].hidden).toBeFalsy();
    // The drawn cards are removed from the deck
    expect(drawn.every(card => !next.deck.some(d => sameCard(d, card)))).toBe(true);
  });

  it("does not fill the same column twice when it has multiple hidden cells", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), h(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
      row(h(Suite.Spade, CardVal.Ten), h(Suite.Heart, CardVal.Jack), c(Suite.Club, CardVal.Queen), c(Suite.Diamond, CardVal.King)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    const { state: next } = drawRow(state);

    // Column 1 gets exactly one card (in its topmost hidden cell, row 1)
    expect(next.board[1][1]).not.toEqual(board[1][1]);
    expect(next.board[1][1].hidden).toBeFalsy();
    expect(next.board[2][1].hidden).toBe(true);
    // Column 0 also fills its topmost hidden cell (row 2)
    expect(next.board[2][0].hidden).toBeFalsy();
  });

  it("resets open columns, since drawing fills every open top-row cell", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), h(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), h(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)), openColumns: [1] });

    const { state: next } = drawRow(state);

    expect(next.openColumns).toEqual([]);
    expect(next.board[0][1].hidden).toBeFalsy();
  });

  it("draws nothing when the deck is empty", () => {
    const state = makeState({ board: [row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five))], deck: [] });
    const { state: next, row: drawnRow } = drawRow(state);
    expect(drawnRow).toEqual([]);
    expect(next.board).toEqual(state.board);
    expect(next.deck).toEqual([]);
  });

  it("reuses the provided row and removes those cards from the deck", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
    ];
    const deck = deckWithout(boardCards(board));
    const replay = [deck[0], deck[1], deck[2], deck[3]];
    const state = makeState({ board, deck });

    const { state: next, row: drawn } = drawRow(state, replay);

    expect(drawn).toEqual(replay);
    expect(next.deck.length).toBe(deck.length - 4);
    expect(next.board[1]).toEqual(replay);
  });
});

describe("handleCardClick", () => {
  it("clears a removable card by hiding it", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Spade, CardVal.King)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    const next = handleCardClick(state, 0, 0);

    expect(next.board[0][0].hidden).toBe(true);
    expect(next.cleared).toBe(1);
    expect(next.board).not.toBe(state.board);
    expect(next.board[0]).not.toBe(state.board[0]);
  });

  it("removes rows that are fully hidden", () => {
    // Every bottom-row card can be cleared: each has a higher card of the same
    // suit in the same row (or the aces above once the row is nearly gone)
    const board = [
      row(c(Suite.Spade, CardVal.Ace), c(Suite.Heart, CardVal.King), c(Suite.Club, CardVal.King), c(Suite.Diamond, CardVal.King)),
      row(c(Suite.Spade, CardVal.Two), c(Suite.Spade, CardVal.Three), c(Suite.Spade, CardVal.Four), c(Suite.Spade, CardVal.Five)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    // clear all four cards of the bottom row
    let next = handleCardClick(state, 1, 0);
    next = handleCardClick(next, 1, 1);
    next = handleCardClick(next, 1, 2);
    next = handleCardClick(next, 1, 3);

    expect(next.board.length).toBe(1);
    expect(next.board[0]).toEqual(board[0]);
  });

  it("adds the column to openColumns when its top card is cleared", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Spade, CardVal.King)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    const next = handleCardClick(state, 0, 0);

    expect(next.openColumns).toEqual([0]);
  });

  it("does not add the same column to openColumns twice", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Spade, CardVal.King)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)), openColumns: [0] });

    const next = handleCardClick(state, 0, 0);

    expect(next.openColumns).toEqual([0]);
  });

  it("does not open a column when a non-top card is cleared", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), c(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Spade, CardVal.Nine)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    const next = handleCardClick(state, 1, 0);

    expect(next.openColumns).toEqual([]);
    expect(next.board[1][0].hidden).toBe(true);
  });

  it("captures an undo snapshot before clearing", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Spade, CardVal.King)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    const next = handleCardClick(state, 0, 0);

    expect(next.undoState).toBeDefined();
    expect(next.undoState!.board).toEqual(state.board);
    expect(next.undoState!.deck).toEqual(state.deck);
    expect(next.undoState!.cleared).toBe(0);
    // The snapshot must be a deep copy, not shared references
    expect(next.undoState!.board[0]).not.toBe(state.board[0]);
  });

  it("is a no-op on a hidden card", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Five), c(Suite.Heart, CardVal.Six), c(Suite.Club, CardVal.Seven), c(Suite.Diamond, CardVal.Eight)),
      row(h(Suite.Spade, CardVal.Nine), c(Suite.Heart, CardVal.Ten), c(Suite.Club, CardVal.Jack), c(Suite.Diamond, CardVal.Queen)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    const next = handleCardClick(state, 1, 0);

    expect(next).toBe(state);
  });

  it("disables undo once the game is won", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Ace), c(Suite.Heart, CardVal.Ace), c(Suite.Club, CardVal.Ace), c(Suite.Diamond, CardVal.Ace)),
      row(c(Suite.Spade, CardVal.Two), c(Suite.Spade, CardVal.Three), c(Suite.Heart, CardVal.Two), c(Suite.Heart, CardVal.Three)),
    ];
    const state = makeState({ board, deck: [], cleared: 44 });

    let next = state;
    // Clearing the last bottom-row card leaves only aces on the board
    next = handleCardClick(next, 1, 0);
    next = handleCardClick(next, 1, 1);
    next = handleCardClick(next, 1, 2);
    next = handleCardClick(next, 1, 3);

    expect(next.board.length).toBe(1);
    expect(next.board[0].every(x => x.val === CardVal.Ace)).toBe(true);
    expect(hasWon(next.board, next.deck.length)).toBe(true);
    expect(next.undoState).toBeUndefined();
    expect(next.undoRow).toBeUndefined();
  });
});

describe("handleMoveUp", () => {
  it("moves a visible card into the open column", () => {
    const board = [
      row(h(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), c(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)), openColumns: [0] });

    const next = handleMoveUp(state, 1, 0);

    expect(next.board[0][0]).toEqual(state.board[1][0]);
    expect(next.board[0][0].hidden).toBeFalsy();
    expect(next.board[1][0].hidden).toBe(true);
    expect(next.openColumns).toEqual([]);
    expect(next.undoState).toBeDefined();
  });

  it("does not move a hidden card into the open column", () => {
    const board = [
      row(h(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(h(Suite.Spade, CardVal.Six), c(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)), openColumns: [0] });

    const next = handleMoveUp(state, 1, 0);

    // A hidden card must never be moved: it would place a phantom hidden
    // card in the open column and corrupt open-column tracking.
    expect(next).toBe(state);
    expect(next.openColumns).toEqual([0]);
    expect(next.board[0][0].hidden).toBe(true);
  });

  it("does not move a card when there are no open columns", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), c(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)), openColumns: [] });

    const next = handleMoveUp(state, 1, 0);

    expect(next).toBe(state);
  });

  it("does not move a card from the top row", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), h(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)), openColumns: [1] });

    const next = handleMoveUp(state, 0, 0);

    expect(next).toBe(state);
  });
});

describe("undo", () => {
  it("restores board, deck, openColumns and cleared count", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Spade, CardVal.Three), c(Suite.Heart, CardVal.Two), c(Suite.Heart, CardVal.Three)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)), openColumns: [], cleared: 3 });

    const afterClear = handleCardClick(state, 0, 0);
    expect(afterClear.board[0][0].hidden).toBe(true);
    expect(afterClear.cleared).toBe(4);
    expect(afterClear.openColumns).toEqual([0]);

    const restored = undoGame(afterClear);

    expect(restored.board).toEqual(state.board);
    expect(restored.deck).toEqual(state.deck);
    expect(restored.openColumns).toEqual(state.openColumns);
    expect(restored.cleared).toBe(3);
    expect(restored.undoState).toBeUndefined();
  });

  it("is a no-op when there is no undo snapshot", () => {
    const state = makeState({ board: [row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five))], deck: [] });
    expect(undoGame(state)).toBe(state);
  });

  it("undoing a draw restores the deck so the same row can be drawn again", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), c(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    const afterDraw = addRowToGame(state);
    expect(afterDraw.deck.length).toBe(state.deck.length - 4);

    const restored = undoGame(afterDraw);
    expect(restored.deck).toEqual(state.deck);
    expect(restored.addUndoRow).toBe(true);

    const redrawn = addRowToGame(restored);
    // The exact same row is replayed, removed from the deck again
    expect(redrawn.board[redrawn.board.length - 1]).toEqual(afterDraw.board[afterDraw.board.length - 1]);
    expect(redrawn.deck.length).toBe(state.deck.length - 4);
    expect(redrawn.undoRow!.every(c => !redrawn.deck.some(d => sameCard(d, c)))).toBe(true);
    // No duplicate cards in play
    const all = [...boardCards(redrawn.board), ...redrawn.deck];
    expect(new Set(all.map(c => c.suite + c.val)).size).toBe(all.length);
  });
});

describe("addRowToGame", () => {
  it("draws a row of four cards and removes them from the deck", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), c(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
    ];
    const state = makeState({ board, deck: deckWithout(boardCards(board)) });

    const next = addRowToGame(state);

    expect(next.deck.length).toBe(state.deck.length - 4);
    expect(next.board.length).toBe(3);
    expect(next.board[2].every(card => !card.hidden)).toBe(true);
    expect(next.undoRow).toBeDefined();
    expect(next.undoState).toBeDefined();
  });

  it("does not replay the previous row after an undo when those cards were cleared", () => {
    // Scenario: a row R was drawn, every card of R was cleared, and then the
    // last clear was undone. R is neither on the board nor in the deck, so
    // re-drawing R would inject duplicate cards into the game.
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
    ];
    const deck = deckWithout(boardCards(board));
    // R is a row of cards that were drawn and then cleared: it is in neither
    // the deck nor the board.
    const clearedRow = [deck[0], deck[1], deck[2], deck[3]];
    const state = makeState({
      board,
      deck: deck.filter(d => !clearedRow.some(r => sameCard(r, d))),
      addUndoRow: true,
      undoRow: clearedRow,
    });

    const next = addRowToGame(state);

    // A fresh row must be drawn: the deck shrinks by 4
    expect(next.deck.length).toBe(state.deck.length - 4);
    // The cleared row must not reappear on the board
    for (const r of clearedRow) {
      expect(boardCards(next.board).some(b => sameCard(b, r))).toBe(false);
    }
    // No duplicate cards in play
    const all = [...boardCards(next.board), ...next.deck];
    expect(new Set(all.map(c => c.suite + c.val)).size).toBe(all.length);
  });

  it("replays the previous row after an undo when those cards are back in the deck", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five)),
      row(c(Suite.Spade, CardVal.Six), c(Suite.Heart, CardVal.Seven), c(Suite.Club, CardVal.Eight), c(Suite.Diamond, CardVal.Nine)),
    ];
    const deck = deckWithout(boardCards(board));
    const drawnRow = [deck[0], deck[1], deck[2], deck[3]];
    const state = makeState({
      board,
      deck,
      addUndoRow: true,
      undoRow: drawnRow,
    });

    const next = addRowToGame(state);

    expect(next.board[next.board.length - 1]).toEqual(drawnRow);
    expect(next.deck.length).toBe(deck.length - 4);
  });

  it("does not draw when the deck is empty", () => {
    const board = [
      row(c(Suite.Spade, CardVal.Ace), c(Suite.Heart, CardVal.Ace), c(Suite.Club, CardVal.Ace), c(Suite.Diamond, CardVal.Ace)),
    ];
    const state = makeState({ board, deck: [] });
    expect(addRowToGame(state)).toBe(state);
  });
});

describe("hasWon", () => {
  it("is true only for a single row of aces with an empty deck", () => {
    const aces = row(c(Suite.Spade, CardVal.Ace), c(Suite.Heart, CardVal.Ace), c(Suite.Club, CardVal.Ace), c(Suite.Diamond, CardVal.Ace));
    expect(hasWon([aces], 0)).toBe(true);
    expect(hasWon([aces], 1)).toBe(false);
    expect(hasWon([aces, row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five))], 0)).toBe(false);
    expect(hasWon([row(c(Suite.Spade, CardVal.Two), c(Suite.Heart, CardVal.Three), c(Suite.Club, CardVal.Four), c(Suite.Diamond, CardVal.Five))], 0)).toBe(false);
    expect(hasWon(undefined, 0)).toBe(false);
  });
});

describe("game invariants under random play", () => {
  // Seeded PRNG so failures are reproducible
  const mulberry32 = (seed: number) => () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const runPlay = (seed: number) => {
    const rng = mulberry32(seed);
    const originalRandom = Math.random;
    Math.random = () => rng();

    try {
      let state = createNewGame();
      const openColumnCount = (board: Card[][]) => {
        if (!board[0]) return 0;
        let n = 0;
        for (let col = 0; col < 4; col++) if (board[0][col].hidden) n++;
        return n;
      };

      const ops = 30 + Math.floor(rng() * 40);
      for (let i = 0; i < ops; i++) {
        const r = rng();
        if (r < 0.55) {
          const clickable: [number, number][] = [];
          for (let ridx = 0; ridx < state.board.length; ridx++) {
            for (let cidx = 0; cidx < 4; cidx++) {
              if (canClick(state, ridx, cidx)) clickable.push([ridx, cidx]);
            }
          }
          if (clickable.length === 0) continue;
          const [ridx, cidx] = clickable[Math.floor(rng() * clickable.length)];
          state = handleCardClick(state, ridx, cidx);
        } else if (r < 0.7) {
          state = addRowToGame(state);
        } else if (r < 0.85) {
          state = undoGame(state);
        } else {
          const ridx = Math.floor(rng() * state.board.length);
          const cidx = Math.floor(rng() * 4);
          state = handleMoveUp(state, ridx, cidx);
        }

        // Invariant 1: no visible card appears both on the board and in the deck
        // (hidden cells are either cleared cards or empty-cell placeholders,
        // both of which legitimately no longer match the deck)
        const boardKeys = new Set(state.board.flat().filter(c => !c.hidden).map(c => c.suite + c.val));
        for (const card of state.deck) {
          expect(boardKeys.has(card.suite + card.val)).toBe(false);
        }

        // Invariant 2: openColumns exactly matches the columns with a hidden top cell
        const expectedOpen = openColumnCount(state.board);
        expect(state.openColumns.length).toBe(expectedOpen);
        expect(new Set(state.openColumns).size).toBe(state.openColumns.length);

        // Invariant 3: the deck is always a multiple of 4
        expect(state.deck.length % 4).toBe(0);
      }
    } finally {
      Math.random = originalRandom;
    }
  };

  it("maintains board/deck and open-column invariants across random play", () => {
    for (let seed = 1; seed <= 50; seed++) {
      runPlay(seed);
    }
  });
});
