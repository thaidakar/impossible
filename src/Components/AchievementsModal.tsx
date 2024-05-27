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
import { Card } from '../Logic/Deck';
import { useEffect, useState } from 'react';


export interface AchievementsProps {
    cleared: number;
    openColumns: number[];
    reset: boolean;
    deckSize: number;
}

interface Achievements {
    ColsCleared?: number;
    GamesWon?: number;
    LoseStreak?: number;
    ClearedFirstHand?: number;
    MaxColumns?: number;
}

const achievements_key = 'achievements';

export const AchievementsModal = (props: AchievementsProps) => {
    const { cleared, openColumns, reset, deckSize } = props;
    
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [achievements, setAchievements] = useState<Achievements>();
    const toast = useToast();
    const [gamesLost, setGamesLost] = useState(0);
    const [isFirstNewRow, setIsFirstNewRow] = useBoolean(true);

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
        if (openColumns?.length > 0 && (!achievements?.ColsCleared || achievements.ColsCleared < openColumns.length)) {
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
        if (cleared === 48) {
            setTimeout(() => {
                const newAchievement: Achievements = {
                    ...loadAchievements(),
                    GamesWon: safeIncrement(achievements?.GamesWon)
                };

                setAchievements(newAchievement);

                if (newAchievement.GamesWon === 1) showToast('Win a game');

            }, 20);

            setGamesLost(0);
        }
    }, [cleared]);

    useEffect(() => {
        if (isFirstNewRow && cleared > 0 && (!achievements?.ClearedFirstHand || achievements.ClearedFirstHand < cleared)) {
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
            const newGamesLost = gamesLost + 1;
            setGamesLost(newGamesLost);

            if (newGamesLost > (achievements.LoseStreak ?? 0)) {
                setTimeout(() => {
                    const newAchievement: Achievements = {
                        ...loadAchievements(),
                        LoseStreak: newGamesLost
                    };
                    setAchievements(newAchievement);
                }, 40);
            }
        } 

        setIsFirstNewRow.on();
    }, [reset]);

    const showToast = (desc: string, isComplete?: boolean) => {
        toast({
            title: !!isComplete ? 'Maximum Achievement!' : 'New Achievement!',
            description: desc,
            status: !!isComplete ? 'info' : 'success',
            duration: 9000,
            isClosable: true,
            icon: !!isComplete ? <CheckIcon /> : <StarIcon />
        });
    };

    const safeIncrement = (toInc?: number) => {
        return !!toInc ? toInc + 1 : 1;
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
                                            <Td isNumeric>{achievements?.GamesWon ?? 0}</Td>
                                        </Tr>
                                        <Tr>
                                            <Td>Longest Loss Streak</Td>
                                            <Td isNumeric>{achievements?.LoseStreak ?? 0}</Td>
                                        </Tr>
                                        <Tr style={getCompStyle(achievements?.ColsCleared === 3)}>
                                            <Td>Simultaneously Cleared Columns</Td>
                                            <Td isNumeric>{achievements?.ColsCleared ?? 0} / 3</Td>
                                        </Tr>
                                        
                                        <Tr style={getCompStyle(achievements?.ClearedFirstHand === 15)}>
                                            <Td>Cards cleared in the first hand</Td>
                                            <Td isNumeric>{(achievements?.ClearedFirstHand ?? 0)} / 15</Td>
                                        </Tr>
                                    </Tbody>
                                </Table>
                            </TableContainer>
                        </ModalBody>
                    </ModalContent>
                </Modal> 
            </Portal>
        </>
    );
}