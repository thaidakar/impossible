import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  Portal,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Table,
  Tbody,
  Tr,
  Td,
  Text,
  Spinner,
  Badge,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { api, LeaderboardData } from "../api";

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LeaderboardTable = (props: { rows: LeaderboardData["allTime"]; playerId: string; displayName: (id: string) => string }) => {
  const { rows, playerId, displayName } = props;
  if (rows.length === 0) {
    return <Text opacity={0.6}>No runs recorded yet. Play a run!</Text>;
  }
  return (
    <Table size='sm'>
      <Tbody>
        {rows.map((row, i) => {
          const mine = row.player_id === playerId;
          return (
            <Tr key={`${row.player_id}-${row.created_at}-${i}`} bg={mine ? 'yellow.100' : undefined} _dark={{ bg: mine ? 'yellow.900' : undefined }}>
              <Td>{i + 1}</Td>
              <Td>
                {displayName(row.player_id)}
                {mine && <Badge ml={1} colorScheme='yellow'>you</Badge>}
              </Td>
              <Td isNumeric>{row.score}</Td>
              <Td isNumeric>{row.won ? '🏆' : '💀'}</Td>
            </Tr>
          );
        })}
      </Tbody>
    </Table>
  );
};

export const LeaderboardModal = (props: LeaderboardModalProps) => {
  const { isOpen, onClose } = props;
  const [data, setData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setData(null);
    api.getLeaderboard().then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  return (
    <Portal>
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🏆 Leaderboard</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {!data && <Spinner />}
            {data && (
              <Tabs>
                <TabList>
                  <Tab>All-Time</Tab>
                  <Tab>Daily</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <LeaderboardTable rows={data.allTime} playerId={api.playerId} displayName={api.displayName} />
                  </TabPanel>
                  <TabPanel px={0}>
                    <LeaderboardTable rows={data.daily} playerId={api.playerId} displayName={api.displayName} />
                  </TabPanel>
                </TabPanels>
              </Tabs>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </Portal>
  );
};
