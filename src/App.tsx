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
} from "@chakra-ui/react"
import { ColorModeSwitcher } from "./ColorModeSwitcher"
import { Logo } from "./Logo"
import { GetNextCard, Card, suiteValues, cardValues, displayName, Suite, CardVal } from "./Logic/Deck"
import './App.css';
import { RepeatIcon } from "@chakra-ui/icons"

export const App = () => {

  const [board, setBoard] = React.useState<Card[][]>([]);
  const [deck, setDeck] = React.useState<Card[]>([]);
  const [reset, setReset] = useBoolean(true);
  const [addRow, setAddRow] = useBoolean(false);
  const [cleared, setCleared] = React.useState(0);

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
    // Cannot clear if there is a card below
    if (ridx + 1 <= board[ridx].length - 1) {
      const cardBelow = board[ridx+1][cidx]
      if (!!cardBelow && !cardBelow.hidden) return false;
    }
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

    let _board = board.map((r, rowIndex) =>
    r.map((card, colIndex) => {
        if (rowIndex === ridx && colIndex === cidx)
          if (canRemove(card, ridx, cidx)) {
            setCleared(c => ++c);
            return {...card, hidden: true};
          }
          else 
            console.warn('Cannot clear this card');
        return card;
    }));

    setBoard(_board);
  };

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
                style={{visibility: card.hidden ? 'hidden' : 'visible', zIndex: ridx}} 
                className={(ridx === 0 ? '': 'stacked') + ' card'}
                w={100} h={130} p={0} 
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
      <Box textAlign="center" fontSize="xl">
        <Grid minH="100vh" p={3}>
          <ColorModeSwitcher justifySelf="flex-end" />
          <VStack spacing={8} top={-30} position='relative'>
            <Box minH={650} maxH={600} overflowX='hidden' overflowY='auto'>
            <SimpleGrid key={Math.random()} columns={4} spacingX={9}>
              {board && displayBoard()}
            </SimpleGrid>
            </Box>
            <VStack>
              <Button mr={5} onClick={() => drawRow()}>Get Next Row</Button>
              <Text>{deck?.length / 4} rows left</Text>
              <Text>{cleared} cards cleared</Text>
              <Tooltip label='Reset Deck' openDelay={300}>
                <Button variant='ghost' mt={5} onClick={resetDeck}>
                  <RepeatIcon />
                </Button>
              </Tooltip>
            </VStack>
          </VStack>
        </Grid>
      </Box>
    </ChakraProvider>
  );
}
