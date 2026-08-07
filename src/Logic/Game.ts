import { Card, CardVal, Suite, GetNextCard, cardValues, suiteValues } from "./Deck";

export interface UndoState {
  board: Card[][];
  deck: Card[];
  openColumns: number[];
  cleared: number;
}

export interface GameState {
  board: Card[][];
  deck: Card[];
  openColumns: number[];
  cleared: number;
  undoState?: UndoState;
  undoRow?: Card[];
  addUndoRow: boolean;
}

const HIDDEN_ACE: Card = { suite: Suite.Spade, val: CardVal.Ace, hidden: true };

export const sameCard = (a: Card, b: Card) => a.suite === b.suite && a.val === b.val;

const snapshot = (state: GameState): UndoState => ({
  board: state.board.map(r => r.map(c => ({ ...c }))),
  deck: [...state.deck],
  openColumns: [...state.openColumns],
  cleared: state.cleared,
});

/**
 * Creates a fresh game: a full 52-card deck with the initial four rows dealt.
 */
export function createNewGame(): GameState {
  const deck: Card[] = [];
  for (const suite of suiteValues) {
    for (const val of cardValues) {
      deck.push({ suite, val });
    }
  }

  let state: GameState = {
    board: [],
    deck,
    openColumns: [],
    cleared: 0,
    addUndoRow: false,
  };

  for (let i = 0; i < 4; i++) {
    state = drawRow(state).state;
  }

  return state;
}

export interface DrawResult {
  state: GameState;
  row: Card[];
}

/**
 * Draws up to four cards from the deck. Each column receives exactly one new
 * card: it fills the topmost hidden cell in that column, or (for columns with
 * no hidden cells) the new bottom row. The previously tracked open columns are
 * always reset, since drawing fills every open top-row cell.
 *
 * When `rowOverride` is provided the given cards are used instead of drawing
 * randomly, and are removed from the deck if present.
 */
export function drawRow(state: GameState, rowOverride?: Card[]): DrawResult {
  if (state.deck.length === 0) {
    return { state, row: [] };
  }

  const deck = [...state.deck];

  let row: Card[];
  if (rowOverride) {
    row = [...rowOverride];
    for (const card of row) {
      const idx = deck.findIndex(c => sameCard(c, card));
      if (idx > -1) {
        deck.splice(idx, 1);
      }
    }
  } else {
    row = [];
    for (let i = 0; i < 4; i++) {
      const { idx, card } = GetNextCard(deck);
      if (idx !== undefined && card !== undefined) {
        row.push(card);
        if (idx > -1) {
          deck.splice(idx, 1);
        }
      } else {
        break; // Deck is empty
      }
    }
  }

  const colComp: number[] = [];
  const boardCopy = state.board.map(r =>
    r.map((card, colIndex) => {
      if (colComp.indexOf(colIndex) > -1) {
        return card;
      }
      if (!!card.hidden) {
        colComp.push(colIndex);
        return row[colIndex] ?? card;
      }
      return card;
    })
  );

  if (colComp.length < 4) {
    const newRow: Card[] = [];
    for (let col = 0; col < 4; col++) {
      if (colComp.indexOf(col) > -1) {
        newRow.push({ ...HIDDEN_ACE });
      } else {
        newRow.push(row[col] ?? { ...HIDDEN_ACE });
      }
    }
    boardCopy.push(newRow);
  }

  return {
    state: {
      ...state,
      board: boardCopy,
      deck,
      openColumns: [],
    },
    row,
  };
}

export function canClick(state: GameState, ridx: number, cidx: number): boolean {
  const cell = state.board[ridx]?.[cidx];
  if (cell === undefined || !!cell.hidden) {
    return false;
  }

  if (ridx + 1 <= state.board.length - 1) {
    const cardBelow = state.board[ridx + 1][cidx];
    if (cardBelow !== undefined && !cardBelow.hidden) {
      return false;
    }
  }

  return true;
}

export function canRemove(state: GameState, card: Card, ridx: number, cidx: number): boolean {
  if (!canClick(state, ridx, cidx)) return false;

  if (card.val === CardVal.Ace) return false; // Cannot clear Aces

  // Cannot clear if there is not a higher card on the same row
  const colComp: number[] = [];
  for (let i = state.board.length - 1; i > -1; i--) {
    let rowComp: boolean | undefined;
    for (let j = 3; j > -1; j--) {
      if (j === cidx) continue; // don't count the column of the card we're looking at
      if (colComp.indexOf(j) > -1) continue;
      const compCard = state.board[i][j];
      if (compCard === undefined || !!compCard.hidden) {
        rowComp = false;
        continue;
      }
      if (rowComp === undefined) rowComp = true;
      if (compCard.suite === card.suite && +compCard.val > +card.val) {
        return true;
      }
      colComp.push(j);
    }
    if (rowComp) break;
  }

  return false;
}

/**
 * Clears the clicked card if possible; otherwise, when an open column exists,
 * moves the card up into it.
 */
export function handleCardClick(state: GameState, ridx: number, cidx: number): GameState {
  if (!canClick(state, ridx, cidx)) {
    return state;
  }

  const card = state.board[ridx][cidx];

  if (canRemove(state, card, ridx, cidx)) {
    let next: GameState = {
      ...state,
      undoState: snapshot(state),
      cleared: state.cleared + 1,
    };

    const boardCopy = state.board.map(r => [...r]);
    boardCopy[ridx][cidx] = { ...boardCopy[ridx][cidx], hidden: true };
    const filtered = boardCopy.filter(x => !x.every(y => y.hidden)); // Get rid of rows that are completely hidden

    if (hasWon(filtered, next.deck.length)) {
      // Can't undo once you win to prevent achievements from ticking up >1
      next = { ...next, undoState: undefined, undoRow: undefined };
    }

    next = { ...next, board: filtered };

    if (ridx === 0 && next.openColumns.indexOf(cidx) === -1) {
      next = { ...next, openColumns: [...next.openColumns, cidx] };
    }

    return next;
  }

  if (state.openColumns.length > 0) {
    return handleMoveUp(state, ridx, cidx);
  }

  return state;
}

/**
 * Moves the bottom-most visible card of a column into the top cell of the
 * first open column. Only visible, clickable cards can be moved: moving a
 * hidden card would place a phantom hidden card in the open column and
 * desynchronize the open-column tracking.
 */
export function handleMoveUp(state: GameState, ridx: number, cidx: number): GameState {
  if (ridx === 0) return state; // Once something is on the top row, it can't be moved to the top row...

  if (!canClick(state, ridx, cidx)) return state; // Hidden cards can't be moved

  if (state.openColumns.length === 0) return state; // Can't move anything up when there's nowhere to go

  const openColIdx = state.openColumns[0];
  if (openColIdx === undefined) {
    // Shouldn't happen, but still check
    return state;
  }

  let next: GameState = {
    ...state,
    undoState: snapshot(state),
  };

  const boardCopy = state.board.map(r => [...r]);
  boardCopy[0][openColIdx] = { ...state.board[ridx][cidx] };
  boardCopy[ridx][cidx] = { ...boardCopy[ridx][cidx], hidden: true };
  const filtered = boardCopy.filter(x => !x.every(y => y.hidden));

  if (hasWon(filtered, next.deck.length)) {
    next = { ...next, undoState: undefined, undoRow: undefined };
  }

  next = {
    ...next,
    board: filtered,
    openColumns: state.openColumns.filter(i => i !== openColIdx),
  };

  return next;
}

/**
 * Draws a new row of cards, capturing an undo snapshot first.
 *
 * After an undo, the previously drawn row is only replayed when those exact
 * cards are still in the deck (i.e. the undo restored them). If they were
 * cleared from the board, re-drawing them would create duplicate cards.
 */
export function addRowToGame(state: GameState): GameState {
  if (state.deck.length === 0) {
    return state;
  }

  let next: GameState = {
    ...state,
    undoState: snapshot(state),
  };

  let rowOverride: Card[] | undefined;
  if (next.addUndoRow && next.undoRow) {
    const rowInDeck = next.undoRow.every(c => next.deck.some(d => sameCard(d, c)));
    const rowOnBoard = next.undoRow.some(c => next.board.flat().some(b => sameCard(b, c)));
    if (rowInDeck && !rowOnBoard) {
      rowOverride = next.undoRow;
      next = { ...next, addUndoRow: false };
    }
  }

  const { state: drawn, row } = drawRow(next, rowOverride);

  return { ...drawn, undoRow: [...row] };
}

/**
 * Reverts the last action (draw, clear, or move).
 */
export function undoGame(state: GameState): GameState {
  if (!state.undoState) {
    return state;
  }

  return {
    ...state,
    addUndoRow: true,
    board: state.undoState.board,
    deck: state.undoState.deck,
    openColumns: state.undoState.openColumns,
    cleared: state.undoState.cleared,
    undoState: undefined,
  };
}

export function hasWon(board: Card[][] | undefined, deckLength: number): boolean {
  if (board === undefined) return false;

  if (board.length > 1 || deckLength > 0) return false;

  if (!board[0].every(x => x.val === CardVal.Ace)) return false;

  return true;
}
