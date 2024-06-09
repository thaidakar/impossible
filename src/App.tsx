import * as React from "react"
import {
  ChakraProvider,
  Box,
  Button,
  Text,
  Link,
  VStack,
  Code,
  Grid,
  theme,
  Card as CardElement,
  CardBody,
  SimpleGrid,
  HStack,
  StackItem,
  Tooltip,
  useBoolean,
  MenuButton,
  Menu,
  IconButton,
  MenuList,
  Portal,
  MenuDivider,
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { GetNextCard, Card, suiteValues, cardValues, displayName, Suite, CardVal } from "./Logic/Deck";
import { HamburgerIcon, RepeatIcon } from "@chakra-ui/icons";
import { TutorialModal } from "./Components/TutorialModal";
import { AchievementsModal } from "./Components/AchievementsModal";
import './App.css';
import { FaUndo } from "react-icons/fa";

interface UndoState {
  board: Card[][];
  deck: Card[];
  openColumns: number[];
}

export const App = () => {

  const [board, setBoard] = React.useState<Card[][]>([[{ val: CardVal.Ace, suite: Suite.Spade, hidden: true},{ val: CardVal.Ace, suite: Suite.Spade, hidden: true},{ val: CardVal.Ace, suite: Suite.Spade, hidden: true},{ val: CardVal.Ace, suite: Suite.Spade, hidden: true}]]);
  const [deck, setDeck] = React.useState<Card[]>([]);
  const [reset, setReset] = useBoolean(true);
  const [addRow, setAddRow] = useBoolean(false);
  const [cleared, setCleared] = React.useState(0);
  const [openColumns, setOpenColumns] = React.useState<number[]>([]);
  const [isPageLoad, setIsPageLoad] = useBoolean(true);
  const [doParty, setDoParty] = React.useState(0);
  const [undo, setUndo] = useBoolean(false);
  const [undoState, setUndoState] = React.useState<UndoState | undefined>();
  const [undoRow, setUndoRow] = React.useState<Card[] | undefined>();
  const [addUndoRow, setAddUndoRow] = useBoolean(false);
  const [hasUndone, setHasUndone] = useBoolean(false);

  React.useEffect(() => {
    const handleSpacebarPress = (event: KeyboardEvent) => {
      if (event.key === " ") {
        setAddRow.on();
      }
      else if (event.key.toLowerCase() === "r") {
        setReset.on();
      }
    };

    document.addEventListener('keydown', handleSpacebarPress);

    return () => {
      document.removeEventListener('keydown', handleSpacebarPress);
    };
  }, []);

  React.useEffect(() => {
    if (addRow) {
      setAddRow.off();

      if (deck?.length > 0) {

        copyToUndoState();
        let _undoRow = undefined;
        if (addUndoRow && !!undoRow) {
          
          let doUn = true;
          for (let j = 0; j < board.length; j++) {
            for (let i = 0; i < board[j].length; i++) {
              const card = board[j][i]
              if (!!undoRow.find(c => c.suite == card.suite && c.val == card.val)) {
                doUn = false;
                break;
              }
            }
          }
          
          if (doUn) {
            _undoRow = undoRow;
            setAddUndoRow.off();
          }
        }
        
        const row = drawRow(undefined, undefined, _undoRow);
        
        setUndoRow([...row]);
      }
      else if (hasWon(board)) {
        setDoParty(Math.random());
      }
    }
  }, [addRow]);

  React.useEffect(() => {
    const init = () => {
      const _deck: Card[] = [];
      for (let suite in suiteValues) {
        for (let value in cardValues) {
          _deck.push({suite: suiteValues[suite], val: cardValues[value]});
        }
      }
      setReset.off();
      setDeck(_deck);
      setCleared(0);
      setOpenColumns([]);
      setDoParty(0);
      setUndoState(undefined);
      setUndoRow(undefined);
      setAddUndoRow.off();
    };
    
    if (reset)
      init();

    return () => {
      setDeck([]);
      setOpenColumns([]);
    }

  }, [reset]);

  React.useEffect(() => {
    // When the deck is full, display full board
    if (deck.length == 52) {
      const _deck = [...deck];
      const _board: Card[][] = [];
      for (let i = 0; i < 4; i++) {
        drawRow(_deck, _board);
      }
    }

    if (deck.length === 0 && board.length === 0 && !reset) {
      setReset.on();
    }

  }, [deck, board]);

  React.useEffect(() => {
    if (undo) {
      setUndo.off();

      if (!hasUndone) setHasUndone.on();

      if (!!undoState) {
        setAddUndoRow.on();

        setBoard(undoState.board);
        setDeck(undoState.deck);
        setOpenColumns(undoState.openColumns);

        setUndoState(undefined);
      }
    }

  }, [undo, undoState]);

  const resetDeck = () => {
    if (isPageLoad) {
      setIsPageLoad.off();
    }
    setReset.on();
  }

  const drawRow = (_deck?: Card[], _board?: Card[][], _row?: Card[]) => {
    if (deck.length === 0) {
      return [];
    }

    if (_deck === undefined) _deck = [...deck];

    let row: Card[] = [];
    if (!!_row) {
      row = [..._row];
      for (let i = 0; i < 4; i++) {
        const curCard = row[i];
        const idx = _deck.findIndex(x => x.suite == curCard.suite && x.val == curCard.val);
        _deck.splice(idx, 1);
      }
    }
    else {
      for (let i = 0; i < 4; i++) {
        const {idx, card} = GetNextCard(_deck);
        if (idx != undefined && card != undefined) {
          row.push(card);
          _deck.splice(idx, 1);
        }
        else break; // Deck is empty
      }
    }

    const colComp: number[] = [];
    if (_board === undefined) _board = [...board];

    const _boardCopy = _board.map((r, rowIndex) =>
    r.map((card, colIndex) => {
        if (colComp.length > 0 && colComp.indexOf(colIndex) > -1) 
          return card;
        if (!!card.hidden) {
          colComp.push(colIndex);
          return row[colIndex];
        }
        return card;
    }));

    const newRow: Card[] = [];
    if (colComp.length < 4) {
      for (let col = 0; col < 4; col++) {
        if (colComp.length > 0 && colComp.indexOf(col) > -1) newRow.push({ suite: Suite.Spade, val: CardVal.Ace, hidden: true});
        else newRow.push(row[col]);
      }
      _boardCopy.push(newRow);
    }

    setOpenColumns([]);
    setDeck(_deck);
    setBoard(_boardCopy);
    _board.splice(0,_board.length);
    _board.push(..._boardCopy);

    return row;
  };

  const canRemove = (card: Card, ridx: number, cidx: number) => {
    if (!canClick(ridx, cidx)) return false;
    
    // Cannot clear if there is not a higher card on the same row
    const colComp = [];
    for (let i = board.length - 1; i > -1; i--) {
      let rowComp;
      for (let j = 3; j > -1; j--) {
        if (j == cidx) continue; // don't count the column of the card we're looking at
        if (colComp.indexOf(j) > -1) continue;
        const compCard = board[i][j];
        if (!!compCard.hidden) {
          rowComp = false;
          continue;
        } 
        if (rowComp === undefined) rowComp = true;
        if (compCard.suite === card.suite && +compCard.val > +card.val) {
          return true;
        }
        colComp.push(j)
      }
      if (rowComp) break;
    }

    return false;
  }

  const copyToUndoState = () => {
    const _boardCopy: Card[][] = [];
    const _deckCopy: Card[] = [...deck];
    const _openColumnsCopy: number[] = [...openColumns];

    for (let i = 0; i < board.length; i++) {
      const row = [];
      for (let j = 0; j < board[i].length; j++) {
        const crd: Card = {
          ...board[i][j]
        }
        row.push(crd);
      }
      _boardCopy.push(row);
    }

    setUndoState({
      board: _boardCopy,
      deck: _deckCopy,
      openColumns: _openColumnsCopy
    });
  };

  const handleCardClick = (ridx: number, cidx: number) => {
    // Don't show selected animation for the empty columns
    if (!!board?.at(ridx)?.at(cidx)?.hidden) {
      return;
    }

    // No point checking if we can't click it...
    if (!canClick(ridx, cidx)) {
      return;
    }

    let boardCopy = [...board];    
    if (canRemove(boardCopy[ridx][cidx], ridx, cidx)) {
      copyToUndoState();

      boardCopy[ridx][cidx].hidden = true;
      boardCopy = boardCopy.filter(x => !x.every(y => y.hidden));
      if (hasWon(boardCopy)) {
        setUndoState(undefined);
        setUndoRow(undefined);
      }
      setCleared(c => ++c);
      setBoard(boardCopy);
      if (ridx === 0) {
        setOpenColumns(c => [...c, cidx]);
      }
      return;
    }
    else if (openColumns?.length > 0) {
      handleCardRightClick(ridx, cidx);
      return;
    }
  };

  function canClick(ridx: number, cidx: number) {
    // Cannot click if hidden
    if (!!board?.at(ridx)?.at(cidx)?.hidden) {
      return false;
    }

    // Cannot click if there is a card below
    if (ridx + 1 <= board.length - 1) {
      const cardBelow = board[ridx+1][cidx];
      if (!!cardBelow && !cardBelow.hidden) {
        return false;
      }
    }

    return true;
  }

  const handleCardRightClick = (ridx: number, cidx: number) => {

    if (ridx === 0) return;

    const openColIdx = openColumns?.at(0);
    if (openColIdx === undefined) {
      // No open columns
      return;
    }

    copyToUndoState();

    let boardCopy = [...board];
    boardCopy[0][openColIdx] = {...board[ridx][cidx]};
    boardCopy[ridx][cidx].hidden = true;
    boardCopy = boardCopy.filter(x => !x.every(y => y.hidden));

    if (hasWon(boardCopy)) {
      setUndoState(undefined);
      setUndoRow(undefined);
    }
    
    setOpenColumns(openColumns.filter(i => i != openColIdx));
    setBoard(boardCopy);
  };

  const hasWon = (b: Card[][]) => {
    if (b == undefined) return false;

    if (b.length > 1 || deck.length > 0) return false;

    if (!b[0].every(x => x.val == CardVal.Ace)) return false;

    return true;
  };

  const cardClick = (e: React.MouseEvent, ridx: number, cidx: number) => {
    if (e.type === 'click'){
      e.preventDefault()
      handleCardClick(ridx, cidx);
    } 
  }

  function getClass(card: Card, ridx: number, cidx: number) {
    let cardClass = 'card';

    if (ridx > 0) {
      cardClass += ' stacked';

      if (!!card.hidden) {
        cardClass += ' hide';
      }
    }
    else {
      if (!!card.hidden) {
        cardClass += ' empty';
      }

      if (card.val === CardVal.Ace) {
        cardClass += ' golden';
      }
    }
    if (!canClick(ridx,cidx)) {
      cardClass += ' no-tap';
    }
    return cardClass;
  }

  const displayBoard = () => {
    return board.map((row, ridx) => 
            row.map((card, cidx) => 
              <CardElement 
                style={{zIndex: ridx}} 
                className={getClass(card, ridx, cidx)}
                w={[85, 90, 100]} h={130} p={0} 
                key={card.suite + card.val + ridx + cidx}
                onClick={(e) => cardClick(e, ridx, cidx)} 
                onContextMenu={(e) => { e.preventDefault(); if (e.type === 'contextmenu') handleCardRightClick(ridx, cidx);}}>
                  <CardBody hidden={card.hidden} px={3} pt={2} className='card-body'>
                    <HStack right={[7.7, 0]} className={card.suite == Suite.Diamond || card.suite == Suite.Heart ? 'suite-r' : ''} justifyContent='space-between' style={{ position: card.val === CardVal.Ten ? 'relative' : 'inherit'}}>                      
                      <StackItem>
                        {displayName(card.val)}
                      </StackItem>
                      <StackItem>
                        {card.suite}
                      </StackItem>
                    </HStack>
                  </CardBody>
              </CardElement>
            )
          )
  };
  
  return (
    <ChakraProvider theme={theme}>
      <Box textAlign='center' fontSize='xl' overflow='hidden'> 
        <VStack h='100%' p={3} overflow='hidden'>
          <HStack w='100%' justifyContent='space-between'>
            <Button variant='ghost' onClick={resetDeck} className='reset'>
              <RepeatIcon key={`repeat-${reset}`} className={isPageLoad ? '' : 'rotating'} />
            </Button>
            <Button isDisabled={!undoState} variant='ghost' className='reset' onClick={setUndo.on}>
              <FaUndo size='14' key={`undo-${undo}`} className={!hasUndone ? '' : 'rotating'} />
            </Button>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label='Options'
                icon={<HamburgerIcon />}
                variant='ghost'
                className='no-tap'
              />
              <Portal>
                <MenuList zIndex={1000}>
                  <ColorModeSwitcher />
                  <MenuDivider border='none' />
                  <AchievementsModal deck={deck} doParty={doParty} board={board} cleared={cleared} openColumns={openColumns} deckSize={deck.length} reset={reset} />
                  <MenuDivider border='none'  />
                  <TutorialModal />
                </MenuList>
              </Portal>
            </Menu>
          </HStack>
          <VStack>
            <Box style={{ borderBottom: `${ board.length > 7 ? '2px solid black' : ''}`}} h={500} overflowX='hidden' overflowY='auto'>
              <SimpleGrid key={Math.random()} columns={4} spacingX={1}>
                {board && displayBoard()}
              </SimpleGrid>
            </Box>
            <button className='pushable' onClick={setAddRow.on}>
              <span className="shadow"></span>
              <span className="edge"></span>
              <span className='front'>
                {deck?.length > 0 ? `${deck?.length / 4 < 9 ? deck?.length / 4 : 9} row${deck?.length / 4 === 1 ? '' : 's'} left` : cleared == 48 ? 'woo hoo!' : 'womp womp'}
              </span>
            </button>
          </VStack>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}
