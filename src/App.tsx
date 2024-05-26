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
  CardHeader,
  HStack,
  Stack,
  StackItem,
  Tooltip,
  useBoolean,
  MenuButton,
  Menu,
  IconButton,
  MenuList,
  MenuItem,
  Portal,
  MenuDivider,
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { GetNextCard, Card, suiteValues, cardValues, displayName, Suite, CardVal } from "./Logic/Deck";
import { HamburgerIcon, QuestionIcon, RepeatIcon } from "@chakra-ui/icons";
import { TutorialModal } from "./Components/TutorialModal";
import './App.css';

export const App = () => {

  const [board, setBoard] = React.useState<Card[][]>([]);
  const [deck, setDeck] = React.useState<Card[]>([]);
  const [reset, setReset] = useBoolean(true);
  const [addRow, setAddRow] = useBoolean(false);
  const [cleared, setCleared] = React.useState(0);
  const [moveNext, setMoveNext] = useBoolean(false);

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
    if (!!addRow)
      drawRow();
      setAddRow.off();
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
    };
    
    if (reset)
      init();

    return () => {
      setDeck([]);
      setBoard([]);
    }

  }, [reset]);

  React.useEffect(() => {
    // When the deck is full, display full board
    if (deck.length == 52 && board.length == 0) {
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

  const resetDeck = () => {
    setReset.on();
    setBoard([]);
  }

  const drawRow = (_deck?: Card[], _board?: Card[][]) => {
    if (deck.length === 0) {
      console.log("Deck is empty");
      return;
    }

    if (_deck === undefined) _deck = [...deck];
    const row: Card[] = [];
    for (let i = 0; i < 4; i++) {
      const {idx, card} = GetNextCard(_deck);
      if (idx != undefined && card != undefined) {
        row.push(card);
        _deck.splice(idx,1);
      }
      else break; // Deck is empty
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

    setDeck(_deck);
    setBoard(_boardCopy);
    _board.splice(0,_board.length)
    _board.push(..._boardCopy)
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

  const handleCardClick = (ridx: number, cidx: number) => {

    let mRidx = -1;
    let mCidx = -1;
    
    let _board = board.map((r, rowIndex) =>
    r.map((card, colIndex) => {
        if (rowIndex === ridx && colIndex === cidx) {
          if (canRemove(card, ridx, cidx)) {
            setCleared(c => ++c);
            if (ridx === 0) setMoveNext.on();
            return {...card, hidden: true};
          }
          else {
            if (moveNext && ridx > 0 && canClick(ridx, cidx)) {
              mRidx = ridx;
              mCidx = cidx;
              setMoveNext.off();
              return card;
            }
            console.warn('Cannot clear this card');
          }
        }
        return card;
    }));

    if (mRidx > -1 && mCidx > -1) {
      handleCardRightClick(mRidx, mCidx);
      return;
    }

    setBoard(_board);
  };

  function canClick(ridx: number, cidx: number) {
    // Cannot click if there is a card below
    debugger
    if (ridx + 1 <= board.length - 1) {
      const cardBelow = board[ridx+1][cidx];
      if (!!cardBelow && !cardBelow.hidden) {
        return false;
      }
    }
    return true;
  }

  const handleCardRightClick = (ridx: number, cidx: number) => {

    let openColIdx: number | undefined;
    for (let i = 0; i < 4; i++) {
      if (!!board[0][i].hidden) {
        openColIdx = i;
        break;
      }
    }

    if (openColIdx === undefined) {
      console.warn("No open columns");
      return;
    }

    let _board = board.map((r, rowIndex) =>
      r.map((card, colIndex) => {
          if (rowIndex === 0 && colIndex === openColIdx)
            return board[ridx][cidx]
          if (rowIndex === ridx && colIndex === cidx)
            return {...card, hidden: true};
          return card;
    }));

    setBoard(_board);
  };

  const cardClick = (e: React.MouseEvent, ridx: number, cidx: number) => {
    if (e.type === 'click') handleCardClick(ridx, cidx);
  }

  const displayBoard = () => {
    return board.map((row, ridx) => 
            row.map((card, cidx) => 
              <CardElement 
                style={{visibility: card.hidden && ridx !== 0 ? 'hidden' : 'visible', zIndex: ridx}} 
                className={`${(ridx === 0 ? '': 'stacked')} ${ridx === 0 && !!card.hidden ? 'empty' : ''} ${card.val === CardVal.Ace && ridx === 0 ? 'golden' : ''} card`}
                w={[85, 90, 100]} h={130} p={0} 
                key={card.suite + card.val}
                onClick={(e) => cardClick(e, ridx, cidx)} 
                onContextMenu={(e) => { e.preventDefault(); if (e.type === 'contextmenu') handleCardRightClick(ridx, cidx);}}>
                  <CardBody hidden={card.hidden} px={3} pt={2} className='card-body'>
                    <HStack justifyContent={'space-between'} className={card.suite == Suite.Diamond || card.suite == Suite.Heart ? 'suite-r' : ''}>
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
      <Box textAlign="center" fontSize='xl' overflowY='hidden'> 
        <VStack minH="100vh" p={3} overflowY='hidden'>
          <HStack w='100%' justifyContent='space-between'>
            <Tooltip label='Reset Deck' openDelay={300}>
              <Button variant='ghost' onClick={resetDeck}>
                <RepeatIcon />
              </Button>
            </Tooltip>
            <Box>{deck?.length / 4} rows left</Box>
            <Menu>
              <MenuButton
                as={IconButton}
                aria-label='Options'
                icon={<HamburgerIcon />}
                variant='ghost'
              />
              <Portal>
                <MenuList>
                  <ColorModeSwitcher />
                  <MenuDivider />
                  <TutorialModal />
                </MenuList>
              </Portal>
            </Menu>
          </HStack>
          <VStack>
            <Box style={{ borderBottom: `${ board.length > 8 ? '2px solid black' : ''}`}} h={550} overflowX='hidden' overflowY='auto'>
              <SimpleGrid key={Math.random()} columns={4} spacingX={[1, 9]}>
                {board && displayBoard()}
              </SimpleGrid>
            </Box>
            <Button w='100%' onClick={() => drawRow()} isDisabled={deck?.length == 0}>{deck?.length > 0 ? 'Add Row' : cleared == 48 ? 'woo hoo!' : 'womp womp'}</Button>
          </VStack>
        </VStack>
      </Box>
    </ChakraProvider>
  );
}