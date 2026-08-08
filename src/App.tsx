import * as React from "react"
import {
  Box,
  Button,
  Text,
  VStack,
  Card as CardElement,
  CardBody,
  SimpleGrid,
  HStack,
  StackItem,
  useBoolean,
  MenuButton,
  Menu,
  IconButton,
  MenuList,
  MenuItem,
  Portal,
  MenuDivider,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useToast,
} from "@chakra-ui/react";
import { ColorModeSwitcher } from "./ColorModeSwitcher";
import { Card, displayName, Suite, CardVal, GetNextCard } from "./Logic/Deck";
import { GameState, canClick, createNewGame, addRowToGame, handleCardClick, handleMoveUp, hasWon, undoGame } from "./Logic/Game";
import { HamburgerIcon, RepeatIcon, StarIcon } from "@chakra-ui/icons";
import { QuestionIcon } from "@chakra-ui/icons";
import { TutorialModal } from "./Components/TutorialModal";
import { AchievementsModal } from "./Components/AchievementsModal";
import { TitleScreen } from "./Components/TitleScreen";
import { SanctumModal } from "./Components/SanctumModal";
import { LeaderboardModal } from "./Components/LeaderboardModal";
import { RunSummaryModal } from "./Components/RunSummaryModal";
import { FaUndo } from "react-icons/fa";
import packageInfo from '../package.json';
import './App.css';
import { api, DailyInfo, CompleteRunPayload, newRunSummary } from "./api";
import {
  Profile,
  RunMeta,
  RunSummary,
  countAcesOnTopRow,
  effectiveMaxRows,
  initialRows,
  maxUndos,
} from "./Logic/Meta";
import { createRng } from "./Logic/Random";

type Phase = 'loading' | 'title' | 'run';

const RUN_STORAGE_KEY = 'impossible-run-v1';

interface SavedRun {
  game: GameState;
  runMeta: RunMeta;
}

const loadSavedRun = (): SavedRun | null => {
  try {
    const raw = localStorage.getItem(RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedRun;
    if (!parsed.game?.board || !parsed.runMeta?.seed) return null;
    return parsed;
  } catch {
    return null;
  }
};

const clearSavedRun = () => localStorage.removeItem(RUN_STORAGE_KEY);

export const App = () => {

  const [phase, setPhase] = React.useState<Phase>('loading');
  const [game, setGame] = React.useState<GameState>(() => createNewGame());
  const [runMeta, setRunMeta] = React.useState<RunMeta | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [daily, setDaily] = React.useState<DailyInfo | null>(null);
  const [summary, setSummary] = React.useState<RunSummary | null>(null);
  const [doParty, setDoParty] = React.useState(0);
  const [sanctumOpen, setSanctumOpen] = useBoolean(false);
  const [leaderboardOpen, setLeaderboardOpen] = useBoolean(false);
  const [peekOpen, setPeekOpen] = useBoolean(false);
  const [peekCards, setPeekCards] = React.useState<Card[]>([]);
  const [abandonOpen, setAbandonOpen] = useBoolean(false);
  const [achReset, setAchReset] = useBoolean(false);
  const [achSignal, setAchSignal] = React.useState(0);
  const [tutSignal, setTutSignal] = React.useState(0);

  const runRngRef = React.useRef<ReturnType<typeof createRng> | null>(null);

  const toast = useToast();

  // Load profile, daily info, and any saved run on startup.
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([api.getProfile(), api.getDaily()]);
      if (cancelled) return;
      setProfile(p);
      setDaily(d);
      const saved = loadSavedRun();
      if (saved) {
        runRngRef.current = createRng(saved.runMeta.rngState ?? saved.runMeta.seed);
        if (hasWon(saved.game.board, saved.game.deck.length)) {
          endRun(true, saved.game, saved.runMeta);
        } else {
          setGame(saved.game);
          setRunMeta(saved.runMeta);
          setPhase('run');
        }
      } else {
        setPhase('title');
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (phase !== 'run' || !runMeta) return;
      if (event.key === ' ') {
        event.preventDefault();
        handleDealButton();
      }
      else if (event.key.toLowerCase() === 'r') {
        setAbandonOpen.on();
      }
    };
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, runMeta, game]);

  // Persist the in-progress run so a refresh resumes it.
  React.useEffect(() => {
    if (phase === 'run' && runMeta) {
      localStorage.setItem(RUN_STORAGE_KEY, JSON.stringify({ game, runMeta }));
    }
  }, [game, runMeta, phase]);

  React.useEffect(() => {
    if (achReset) {
      const t = window.setTimeout(() => setAchReset.off(), 100);
      return () => window.clearTimeout(t);
    }
  }, [achReset, setAchReset]);

  const startRun = (mode: 'standard' | 'daily') => {
    const upgrades = profile?.upgrades ?? {};
    const seed = mode === 'daily' ? (daily?.seed ?? 0) : Math.floor(Math.random() * 1e9);
    const meta: RunMeta = {
      mode,
      seed,
      initialRows: initialRows(upgrades),
      maxRows: effectiveMaxRows(upgrades),
      maxUndos: maxUndos(upgrades),
      scry: (upgrades['scry'] ?? 0) > 0,
      startedAt: new Date().toISOString(),
      undosUsed: 0,
      maxRowsUsed: 0,
      conceded: false,
    };
    const rng = createRng(seed);
    runRngRef.current = rng;
    const fresh = createNewGame(meta.initialRows, rng.next);
    setGame(fresh);
    setRunMeta({ ...meta, maxRowsUsed: fresh.board.length, rngState: rng.state() });
    setPeekOpen.off();
    setPeekCards([]);
    setPhase('run');
  };

  const resumeRun = () => {
    const saved = loadSavedRun();
    if (!saved) return;
    runRngRef.current = createRng(saved.runMeta.rngState ?? saved.runMeta.seed);
    setGame(saved.game);
    setRunMeta(saved.runMeta);
    setPhase('run');
  };

  const endRun = (won: boolean, state: GameState, meta: RunMeta) => {
    const acesOnTop = countAcesOnTopRow(state.board);
    const rowsUsed = meta.maxRowsUsed;
    const runId =
      (crypto as unknown as { randomUUID?: () => string })?.randomUUID?.() ??
      `run-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

    const payload: CompleteRunPayload = {
      runId,
      mode: meta.mode,
      seed: meta.seed,
      won,
      cleared: state.cleared,
      acesOnTop,
      rowsUsed,
      maxRows: meta.maxRows,
    };

    api.completeRun(payload).then((res) => {
      setProfile(res.profile);
      setSummary(
        newRunSummary(res, {
          runId,
          mode: meta.mode,
          seed: meta.seed,
          won,
          cleared: state.cleared,
          acesOnTop,
          rowsUsed,
          maxRows: meta.maxRows,
        })
      );
    });

    clearSavedRun();
    setRunMeta(null);
    setPeekOpen.off();
    if (won) {
      setDoParty(Math.random());
    } else {
      setAchReset.on();
    }
    setPhase('title');
  };

  /**
   * Simulates the next draw with a cloned RNG so the peek reveals the exact
   * row that will be dealt (without consuming the run's RNG stream).
   */
  const peekNextRow = (): Card[] => {
    const rng = runRngRef.current;
    const deck = [...game.deck];
    if (!rng) return deck.slice(0, 4);
    const simRng = createRng(rng.state());
    const row: Card[] = [];
    for (let i = 0; i < 4; i++) {
      const { idx, card } = GetNextCard(deck, simRng.next);
      if (idx === undefined || card === undefined) break;
      row.push(card);
      deck.splice(idx, 1);
    }
    return row;
  };

  const deal = () => {
    if (!runMeta || game.deck.length === 0) return;
    const rng = runRngRef.current ?? createRng(runMeta.seed);
    const next = addRowToGame(game, rng.next);
    runRngRef.current = rng;
    const maxRowsUsed = Math.max(runMeta.maxRowsUsed, next.board.length);
    const meta: RunMeta = { ...runMeta, maxRowsUsed, rngState: rng.state() };
    setGame(next);
    setRunMeta(meta);
    setPeekOpen.off();

    if (hasWon(next.board, next.deck.length)) {
      endRun(true, next, meta);
    } else if (next.board.length > meta.maxRows) {
      toast({
        title: '💀 The table overflowed',
        description: 'Too many rows. The run is over.',
        status: 'error',
        duration: 4000,
        isClosable: true,
      });
      endRun(false, next, meta);
    }
  };

  const handleDealButton = () => {
    if (!runMeta) return;
    if (game.deck.length === 0) {
      if (!hasWon(game.board, game.deck.length)) {
        endRun(false, game, { ...runMeta, conceded: true });
      }
      return;
    }
    if (runMeta.scry && !peekOpen) {
      setPeekCards(peekNextRow());
      setPeekOpen.on();
      return;
    }
    deal();
  };

  const handleUndo = () => {
    if (!runMeta || !game.undoState) return;
    if (runMeta.undosUsed >= runMeta.maxUndos) {
      toast({
        title: '⏳ No timebends left',
        description: 'Spend shards in the Sanctum to unlock more.',
        status: 'warning',
        duration: 2500,
        isClosable: true,
      });
      return;
    }
    setGame((prev) => undoGame(prev));
    setRunMeta((m) => (m ? { ...m, undosUsed: m.undosUsed + 1 } : m));
  };

  const purchaseUpgrade = async (upgradeId: string): Promise<boolean> => {
    const before = profile?.shards ?? 0;
    const updated = await api.purchaseUpgrade(upgradeId);
    setProfile(updated);
    return updated.shards < before;
  };

  const abandonRun = () => {
    setAbandonOpen.off();
    if (!runMeta) return;
    endRun(false, game, { ...runMeta, conceded: true });
  };

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
                    <HStack right={[7.7, 0]} className={card.suite === Suite.Diamond || card.suite === Suite.Heart ? 'suite-r' : ''} justifyContent='space-between' style={{ position: card.val === CardVal.Ten ? 'relative' : 'inherit'}}>
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

  const peekCardsRender = peekOpen && peekCards.length > 0
    ? peekCards
    : [];

  const deckRowsLeft = game.deck.length > 0 ? game.deck.length / 4 : 0;
  const dangerRows = runMeta ? game.board.length >= runMeta.maxRows - 2 : false;
  const undoCharges = runMeta ? Math.max(0, runMeta.maxUndos - runMeta.undosUsed) : 0;

  return (
    <Box textAlign='center' fontSize='xl' overflow='hidden'>
      <VStack h='100%' p={3} overflow='hidden'>

        {phase === 'loading' && <Box pt={40}>Loading…</Box>}

        {phase === 'title' && (
          <TitleScreen
            profile={profile}
            daily={daily}
            canResume={!!loadSavedRun()}
            onStart={startRun}
            onResume={resumeRun}
            onOpenSanctum={setSanctumOpen.on}
            onOpenLeaderboard={setLeaderboardOpen.on}
            onOpenAchievements={() => setAchSignal((s) => s + 1)}
            onOpenTutorial={() => setTutSignal((s) => s + 1)}
          />
        )}

        {phase === 'run' && runMeta && (
          <>
            <HStack w='100%' justifyContent='space-between'>
              <HStack spacing={2}>
                <Button variant='ghost' className='reset' onClick={setAbandonOpen.on} title='Abandon run (R)'>
                  <RepeatIcon key={`repeat-${runMeta.startedAt}`} className='rotating' />
                </Button>
                <Badge variant='subtle' colorScheme='yellow' fontSize='sm'>
                  💠 {profile?.shards ?? 0}
                </Badge>
                <Badge variant='subtle' colorScheme='red' fontSize='sm'>
                  🔥 {profile?.streak ?? 0}
                </Badge>
                {runMeta.mode === 'daily' && (
                  <Badge variant='subtle' colorScheme='purple' fontSize='sm'>
                    Daily #{runMeta.seed}
                  </Badge>
                )}
              </HStack>
              <Text fontSize='sm' opacity={0.7} title='Rows used / max rows'>
                {game.board.length}/{runMeta.maxRows} rows
              </Text>
              <HStack spacing={2}>
                <Button
                  isDisabled={!game.undoState || undoCharges === 0}
                  variant='ghost'
                  className='reset'
                  onClick={handleUndo}
                  title={`Timebend (${undoCharges} left)`}
                >
                  <FaUndo size='14' />
                  <Text as='span' ml={1} fontSize='sm'>{undoCharges}</Text>
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
                      <MenuItem onClick={() => setAchSignal((s) => s + 1)}>
                        <StarIcon />
                        <Text ml={5}>
                          Achievements
                        </Text>
                      </MenuItem>
                      <MenuItem onClick={() => setTutSignal((s) => s + 1)}>
                        <QuestionIcon />
                        <Text ml={5}>
                          Tutorial
                        </Text>
                      </MenuItem>
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
            </HStack>
            <VStack>
              <Box
                style={{ borderBottom: `${ game.board.length > 7 ? '2px solid black' : ''}`}}
                className={dangerRows ? 'danger' : undefined}
                h={500}
                overflowX='hidden'
                overflowY='auto'
              >
                <SimpleGrid key={Math.random()} columns={4} spacingX={1}>
                  {game.board && displayBoard()}
                </SimpleGrid>
              </Box>
              {peekOpen && peekCardsRender.length > 0 && (
                <Box className='peek' p={2} borderRadius='md' display='flex' gap={1} flexWrap='wrap' justifyContent='center'>
                  {peekCardsRender.map((card, i) => (
                    <Box
                      key={`${card.suite}${card.val}${i}`}
                      w={16} h={22} p={1}
                      borderRadius='sm'
                      borderWidth='1px'
                      bg='gray.100'
                      _dark={{ bg: 'gray.700' }}
                      fontSize='md'
                    >
                      {displayName(card.val)}{card.suite}
                    </Box>
                  ))}
                </Box>
              )}
              <button className='pushable' onClick={handleDealButton}>
                <span className="shadow"></span>
                <span className="edge"></span>
                <span className='front'>
                  {peekOpen
                    ? 'Deal Row'
                    : game.deck?.length > 0
                      ? `${deckRowsLeft < 9 ? deckRowsLeft : 9} row${deckRowsLeft === 1 ? '' : 's'} left${runMeta.scry ? ' 🔮' : ''}`
                      : hasWon(game.board, game.deck.length)
                        ? 'woo hoo!'
                        : 'Concede Run'}
                </span>
              </button>
            </VStack>
          </>
        )}
      </VStack>

      {phase !== 'loading' && (
        <AchievementsModal asMenuItem={false} openSignal={achSignal} deck={game.deck} doParty={doParty} board={game.board} cleared={game.cleared} openColumns={game.openColumns} deckSize={game.deck.length} reset={achReset} />
      )}

      <TutorialModal asMenuItem={false} openSignal={tutSignal} />

      <SanctumModal
        isOpen={sanctumOpen}
        onClose={setSanctumOpen.off}
        profile={profile}
        onPurchase={purchaseUpgrade}
      />
      <LeaderboardModal isOpen={leaderboardOpen} onClose={setLeaderboardOpen.off} />
      <RunSummaryModal
        summary={summary}
        onClose={() => setSummary(null)}
        onVisitSanctum={() => { setSummary(null); setSanctumOpen.on(); }}
        onNewRun={() => setSummary(null)}
      />

      <Portal>
        <Modal isOpen={abandonOpen} onClose={setAbandonOpen.off} isCentered>
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Abandon run?</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <Text mb={4}>The run will end as a loss. You keep shards earned so far.</Text>
              <HStack justify='space-between'>
                <Button variant='outline' onClick={setAbandonOpen.off}>Keep Playing</Button>
                <Button colorScheme='red' onClick={abandonRun}>Abandon</Button>
              </HStack>
            </ModalBody>
          </ModalContent>
        </Modal>
      </Portal>
    </Box>
  );
}
