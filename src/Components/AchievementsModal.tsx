import { CheckIcon, StarIcon } from '@chakra-ui/icons';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    Portal,
    Text,
    MenuItem,
    useToast,
    Table,
    TableContainer,
    Tbody,
    Tr,
    Td,
    useBoolean
  } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Confetti } from './Confetti';
import { Card, CardVal } from '../Logic/Deck';


export interface AchievementsProps {
    cleared: number;
    openColumns: number[];
    reset: boolean;
    deckSize: number;
    board: Card[][];
    doParty: number;
}

interface Achievements {
    ColsCleared?: number;
    GamesWon?: number;
    GamesLost?: number;
    ClearedFirstHand?: number;
    MaxColumns?: number;
    AllStars?: boolean;
}

const achievements_key = 'achievements';

export const AchievementsModal = (props: AchievementsProps) => {
    const { cleared, openColumns, reset, deckSize, board, doParty } = props;
    
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [achievements, setAchievements] = useState<Achievements>();
    const [isFirstNewRow, setIsFirstNewRow] = useBoolean(true);
    const [throwConfetti, setThrowConfetti] = useBoolean(false);

    const loadAchievements = () => {
        const _achievements = localStorage.getItem(achievements_key);
        if (!!_achievements && _achievements != undefined) {
            return JSON.parse(_achievements) as Achievements;
        }

        return {} as Achievements;
    };

    useEffect(() => {
        setAchievements(loadAchievements());
    }, []);

    useEffect(() => {
        if (!!achievements) {
            localStorage.setItem(achievements_key, JSON.stringify(achievements));
        }
    }, [achievements]);

    useEffect(() => {
        if (safeCnt(achievements?.ColsCleared) < openColumns.length) {
            setTimeout(() => {
                const newAchievement: Achievements = {
                    ...loadAchievements(),
                    ColsCleared: openColumns.length
                };

                setAchievements(newAchievement);
                showToast(openColumns.length === 1 ? 
                    'Cleared a column' : 
                    `Cleared ${openColumns.length} columns simultaneously`
                    , openColumns.length === 3);
            }, 10);
        }
    }, [openColumns]);

    useEffect(() => {
        if (board.length == 1 && board?.at(0)?.every(x => x.val == CardVal.Ace) && cleared >= 48 && openColumns.length === 0) {
            setTimeout(() => {
                const newAchievement: Achievements = {
                    ...loadAchievements(),
                    GamesWon: safeInc(achievements?.GamesWon)
                };

                setAchievements(newAchievement);

                if (newAchievement.GamesWon === 1) showToast('Win a game');

                setThrowConfetti.on();
            }, 20);
        }
    }, [cleared, openColumns, board]);

    useEffect(() => {
        if (isFirstNewRow && safeCnt(achievements?.ClearedFirstHand) < cleared) {
            setTimeout(() => {
                const newAchievement: Achievements = {
                    ...loadAchievements(),
                    ClearedFirstHand: cleared
                };

                setAchievements(newAchievement);

                if (cleared > 11) {
                    showToast(cleared === 12 ? 
                        'Three rows cleared in the first hand' :
                        `All but ${16 - cleared} cards cleared in the first hand`
                    , cleared === 15);
                }
            }, 30);
        }
        
        if (deckSize < 36) setIsFirstNewRow.off();

    }, [deckSize, cleared]);

    useEffect(() => {
        if (reset && cleared < 48 && !!achievements) {
            setTimeout(() => {
                const newAchievement: Achievements = {
                    ...loadAchievements(),
                    GamesLost: safeInc(achievements.GamesLost)
                };

                setAchievements(newAchievement);
            }, 40);
        } 

        setIsFirstNewRow.on();
    }, [reset]);

    const showToast = (desc: string, isComplete?: boolean) => {
        toast({
            title: !!isComplete ? 'Maximum Achievement!' : 'New Achievement!',
            description: desc,
            status: !!isComplete ? 'success' : 'info',
            duration: 9_000,
            isClosable: true,
            icon: !!isComplete ? <CheckIcon /> : <StarIcon />
        });
    };

    const safeInc = (toInc?: number) => {
        return !!toInc ? toInc + 1 : 1;
    }

    const safeCnt = (toCnt?: number) => {
        return !!toCnt ? toCnt : 0;
    }

    const getCompStyle = (isMax: boolean) => {
        return { color: isMax ? 'goldenrod' : ''};
    }

    return (
        <>
            <MenuItem onClick={onOpen}>
                <StarIcon />
                <Text ml={5}>
                    Achievements
                </Text>
            </MenuItem>
            <Portal>
                <Modal isOpen={isOpen} onClose={onClose}>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Achievements</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody pb={10}>
                            <TableContainer>
                                <Table>
                                    <Tbody>
                                        <Tr>
                                            <Td>Games Won</Td>
                                            <Td isNumeric>{safeCnt(achievements?.GamesWon)}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>Games Lost</Td>
                                            <Td isNumeric>{safeCnt(achievements?.GamesLost)}</Td>
                                        </Tr>
                                        <Tr style={getCompStyle(achievements?.ColsCleared === 3)}>
                                            <Td>Simultaneously Cleared Columns</Td>
                                            <Td isNumeric>{safeCnt(achievements?.ColsCleared)} / 3</Td>
                                        </Tr>
                                        
                                        <Tr style={getCompStyle(safeCnt(achievements?.ClearedFirstHand) === 15)}>
                                            <Td>Cards cleared in the first hand</Td>
                                            <Td isNumeric>{safeCnt(achievements?.ClearedFirstHand)} / 15</Td>
                                        </Tr>
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        </ModalBody>
                    </ModalContent>
                </Modal> 
            </Portal>
            <Portal>
                {throwConfetti && <Confetti gamesWon={loadAchievements()?.GamesWon ?? 1} onComplete={() => setThrowConfetti.off()} />}
                {!!doParty && <Confetti key={`party-${doParty}`} gamesWon={loadAchievements()?.GamesWon ?? 1} onComplete={() => setThrowConfetti.off()} />}
            </Portal>
        </>
    );
}