import {
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Portal,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { RunSummary } from "../Logic/Meta";

interface RunSummaryModalProps {
  summary: RunSummary | null;
  onClose: () => void;
  onVisitSanctum: () => void;
  onNewRun: () => void;
}

export const RunSummaryModal = (props: RunSummaryModalProps) => {
  const { summary, onClose, onVisitSanctum, onNewRun } = props;

  return (
    <Portal>
      <Modal isOpen={!!summary} onClose={onClose} isCentered closeOnOverlayClick={false}>
        <ModalOverlay />
        <ModalContent>
          {summary && (
            <>
              <ModalHeader>
                {summary.won ? '🏆 Run Complete!' : summary.mode === 'daily' ? '💀 Daily Challenge Failed' : '💀 Run Failed'}
              </ModalHeader>
              <ModalCloseButton />
              <ModalBody pb={6}>
                <VStack spacing={4} align='stretch'>
                  <HStack spacing={6} justify='center'>
                    <Stat>
                      <StatLabel>Score</StatLabel>
                      <StatNumber>{summary.score}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel>Shards Earned</StatLabel>
                      <StatNumber color='yellow.300'>+{summary.shardsEarned} 💠</StatNumber>
                    </Stat>
                  </HStack>
                  <Table size='sm'>
                    <Tbody>
                      <Tr>
                        <Td>Cards cleared</Td>
                        <Td isNumeric>{summary.cleared} / 48</Td>
                      </Tr>
                      <Tr>
                        <Td>Aces on the top row</Td>
                        <Td isNumeric>{summary.acesOnTop} / 4</Td>
                      </Tr>
                      <Tr>
                        <Td>Rows used</Td>
                        <Td isNumeric>{summary.rowsUsed} / {summary.maxRows}</Td>
                      </Tr>
                      <Tr>
                        <Td>Mode</Td>
                        <Td isNumeric>{summary.mode === 'daily' ? `Daily #${summary.seed}` : 'Standard'}</Td>
                      </Tr>
                    </Tbody>
                  </Table>
                  <HStack justify='space-between'>
                    <Button variant='outline' onClick={onVisitSanctum}>
                      🛕 Sanctum
                    </Button>
                    <Button colorScheme='green' onClick={onNewRun}>
                      New Run
                    </Button>
                  </HStack>
                </VStack>
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </Portal>
  );
};
