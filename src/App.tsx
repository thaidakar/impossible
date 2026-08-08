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
import { Card, displayName, Suite, CardVal } from "./Logic/Deck";
import { GameState, canClick, createNewGame, addRowToGame, handleCardClick, handleMoveUp, hasWon, undoGame } from "./Logic/Game";
import { HamburgerIcon, RepeatIcon } from "@chakra-ui/icons";
import { TutorialModal } from "./Components/TutorialModal";
import { AchievementsModal } from "./Components/AchievementsModal";
import { FaUndo } from "react-icons/fa";
import packageInfo from '../package.json';
import './App.css';

export const App = () => {

  const [game, setGame] = React.useState<GameState>(() => createNewGame());
  const [reset, setReset] = useBoolean(true);
  const [addRow, setAddRow] = useBoolean(false);
  const [doParty, setDoParty] = React.useState(0);
  const [isPageLoad, setIsPageLoad] = useBoolean(true);
  const [undo, setUndo] = useBoolean(false);
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

      if (game.deck.length > 0) {
        setGame(prev => addRowToGame(prev));
      }
      else if (hasWon(game.board, game.deck.length)) {
        setDoParty(Math.random());
      }
    }
  }, [addRow, game]);

  React.useEffect(() => {
    if (reset) {
      setGame(createNewGame());
      setDoParty(0);
      setReset.off();
    }
  }, [reset]);

  React.useEffect(() => {
    // When the deck is empty and the board is fully cleared, start a new game
    if (game.deck.length === 0 && game.board.length === 0 && !reset) {
      setReset.on();
    }
  }, [game, reset]);

  React.useEffect(() => {
    if (undo) {
      setUndo.off();

      if (!hasUndone) setHasUndone.on();

      setGame(prev => undoGame(prev));
    }
  }, [undo]);

  const resetDeck = () => {
    if (isPageLoad) {
      setIsPageLoad.off();
    }
    setReset.on();
  }

  const getClass = (card: Card, ridx: number, cidx: number) => {
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
    if (!canClick(game, ridx, cidx)) {
      cardClass += ' no-tap';
    }
    return cardClass;
  }

  const displayBoard = () => {
    return game.board.map((row, ridx) =>
            row.map((card, cidx) =>
              <CardElement
                style={{zIndex: ridx}}
                className={getClass(card, ridx, cidx)}
                w={[85, 90, 100]} h={130} p={0}
                key={card.suite + card.val + ridx + cidx}
                onClick={(e) => { e.preventDefault(); setGame(prev => handleCardClick(prev, ridx, cidx)); }}
                onContextMenu={(e) => { e.preventDefault(); setGame(prev => handleMoveUp(prev, ridx, cidx)); }}>
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
    <Box textAlign='center' fontSize='xl' overflow='hidden'>
      <VStack h='100%' p={3} overflow='hidden'>
        <HStack w='100%' justifyContent='space-between'>
          <Button variant='ghost' onClick={resetDeck} className='reset'>
            <RepeatIcon key={`repeat-${reset}`} className={isPageLoad ? '' : 'rotating'} />
          </Button>
          <Button isDisabled={!game.undoState} variant='ghost' className='reset' onClick={setUndo.on}>
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
                <AchievementsModal deck={game.deck} doParty={doParty} board={game.board} cleared={game.cleared} openColumns={game.openColumns} deckSize={game.deck.length} reset={reset} />
                <MenuDivider border='none'  />
                <TutorialModal />
                <MenuDivider />
                  <Box display='flex' justifyContent='center'>
                    <Text opacity={0.5}>
                      Version {packageInfo?.version}
                    </Text>
                  </Box>
              </MenuList>
            </Portal>
          </Menu>
        </HStack>
        <VStack>
          <Box style={{ borderBottom: `${ game.board.length > 7 ? '2px solid black' : ''}`}} h={500} overflowX='hidden' overflowY='auto'>
            <SimpleGrid key={Math.random()} columns={4} spacingX={1}>
              {game.board && displayBoard()}
            </SimpleGrid>
          </Box>
          <button className='pushable' onClick={setAddRow.on}>
            <span className="shadow"></span>
            <span className="edge"></span>
            <span className='front'>
              {game.deck?.length > 0 ? `${game.deck?.length / 4 < 9 ? game.deck?.length / 4 : 9} row${game.deck?.length / 4 === 1 ? '' : 's'} left` : game.cleared == 48 ? 'woo hoo!' : 'womp womp'}
            </span>
          </button>
        </VStack>
      </VStack>
    </Box>
  );
}
