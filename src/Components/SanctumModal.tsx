import {
  Box,
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
  StatNumber,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { Profile, UPGRADE_CATALOG } from "../Logic/Meta";

interface SanctumModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onPurchase: (upgradeId: string) => Promise<boolean>;
}

export const SanctumModal = (props: SanctumModalProps) => {
  const { isOpen, onClose, profile, onPurchase } = props;
  const toast = useToast();

  const buy = async (upgradeId: string) => {
    const ok = await onPurchase(upgradeId);
    toast({
      title: ok ? "Upgrade purchased" : "Not enough shards",
      status: ok ? "success" : "error",
      duration: 2500,
      isClosable: true,
    });
  };

  return (
    <Portal>
      <Modal isOpen={isOpen} onClose={onClose} scrollBehavior='inside'>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>🛕 The Sanctum</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack align='stretch' spacing={4}>
              <Stat>
                <StatNumber>💠 {profile?.shards ?? 0} shards</StatNumber>
              </Stat>

              {UPGRADE_CATALOG.map((def) => {
                const level = profile?.upgrades[def.id] ?? 0;
                const cost = def.costs[level];
                const maxed = cost === undefined;
                const affordable = !maxed && (profile?.shards ?? 0) >= cost;
                return (
                  <Box key={def.id} p={3} borderWidth='1px' borderRadius='md'>
                    <HStack justify='space-between' align='start'>
                      <Box>
                        <Text fontWeight='bold'>
                          {def.icon} {def.name}
                          <Text as='span' ml={2} fontSize='sm' opacity={0.7}>
                            {"●".repeat(level)}
                            {"○".repeat(def.costs.length - level)}
                          </Text>
                        </Text>
                        <Text fontSize='sm' opacity={0.8}>
                          {def.description}
                        </Text>
                        <Text fontSize='sm' color='teal.300'>
                          {def.levelDescription(level)}
                        </Text>
                      </Box>
                      <Button
                        size='sm'
                        colorScheme='yellow'
                        isDisabled={maxed || !affordable}
                        onClick={() => buy(def.id)}
                      >
                        {maxed ? "MAX" : `${cost} 💠`}
                      </Button>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Portal>
  );
};
