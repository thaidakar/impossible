import { QuestionIcon } from '@chakra-ui/icons';
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    Portal,
    Button,
    Text,
    MenuItem,
    Accordion,
    AccordionItem,
    AccordionButton,
    Box,
    AccordionIcon,
    AccordionPanel
  } from '@chakra-ui/react'

export const TutorialModal = () => {

    const { isOpen, onOpen, onClose } = useDisclosure();

    return (
        <>
            <MenuItem onClick={onOpen}>
                <QuestionIcon />
                <Text ml={5}>
                    Tutorial
                </Text>
            </MenuItem>
            <Portal>
                {isOpen &&
                <Modal isOpen={isOpen} onClose={onClose}>
                    <ModalOverlay />
                    <ModalContent>
                        <ModalHeader>Tutorial</ModalHeader>
                        <ModalCloseButton />
                        <ModalBody pb={10}>
                            <Accordion>
                                <AccordionItem>
                                    <h2>
                                        <AccordionButton>
                                            <Box as='span' flex='1' textAlign='left'>
                                                What is the goal?
                                            </Box>
                                            <AccordionIcon />
                                        </AccordionButton>
                                    </h2>
                                    <AccordionPanel pb={4}>
                                        The goal of this game is to clear all cards except for the four Aces, which are 
                                        considered the highest value.
                                        <br/>
                                        <br/>
                                        Most games will be losses, but that's part of what makes a win such an achievement!
                                    </AccordionPanel>
                                </AccordionItem>
                                <AccordionItem>
                                    <h2>
                                        <AccordionButton>
                                            <Box as='span' flex='1' textAlign='left'>
                                                How do I clear a card?
                                            </Box>
                                            <AccordionIcon />
                                        </AccordionButton>
                                    </h2>
                                    <AccordionPanel pb={4}>
                                        Tap a card to clear it.
                                        <br/>
                                        <br/>
                                        You may only clear the cards in the bottom row of each column. You can only
                                        clear a card when there is a "higher value" card of the same suit in another 
                                        column in the bottom row.
                                    </AccordionPanel>
                                </AccordionItem>
                                <AccordionItem>
                                    <h2>
                                        <AccordionButton>
                                            <Box as='span' flex='1' textAlign='left'>
                                                What happens when I clear a column?
                                            </Box>
                                            <AccordionIcon />
                                        </AccordionButton>
                                    </h2>
                                    <AccordionPanel pb={4}>
                                        When an entire column has been cleared, the next card you select (of the bottom cards only) is 
                                        moved to that open space (unless it is also able to be cleared, in which 
                                        case it is cleared).
                                    </AccordionPanel>
                                </AccordionItem>
                            </Accordion>
                        </ModalBody>
                    </ModalContent>
                </Modal> 
                }
            </Portal>
        </>
    );
}