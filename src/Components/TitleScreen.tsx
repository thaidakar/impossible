import {
  Badge,
  Box,
  Button,
  HStack,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  VStack,
} from "@chakra-ui/react";
import { Profile } from "../Logic/Meta";
import { DailyInfo } from "../api";

interface TitleScreenProps {
  profile: Profile | null;
  daily: DailyInfo | null;
  canResume: boolean;
  onStart: (mode: "standard" | "daily") => void;
  onResume: () => void;
  onOpenSanctum: () => void;
  onOpenLeaderboard: () => void;
  onOpenAchievements: () => void;
  onOpenTutorial: () => void;
}

export const TitleScreen = (props: TitleScreenProps) => {
  const { profile, daily, canResume, onStart, onResume, onOpenSanctum, onOpenLeaderboard, onOpenAchievements, onOpenTutorial } = props;

  return (
    <VStack h='100vh' justify='center' spacing={8} p={4}>
      <VStack spacing={1}>
        <Text fontSize='5xl' fontWeight='bold' letterSpacing='0.1em'>
          IMPOSSIBLE
        </Text>
        <Text opacity={0.6} fontSize='md'>
          A roguelite of patience
        </Text>
      </VStack>

      <HStack spacing={8} flexWrap='wrap' justify='center'>
        <Stat>
          <StatLabel>Shards</StatLabel>
          <StatNumber>💠 {profile?.shards ?? 0}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Streak</StatLabel>
          <StatNumber>🔥 {profile?.streak ?? 0}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Best Score</StatLabel>
          <StatNumber>{profile?.best_score ?? 0}</StatNumber>
        </Stat>
        <Stat>
          <StatLabel>Games Won</StatLabel>
          <StatNumber>{profile?.games_won ?? 0}</StatNumber>
        </Stat>
      </HStack>

      <VStack spacing={3} w='full' maxW='sm'>
        {canResume && (
          <Button colorScheme='yellow' size='lg' w='full' onClick={onResume}>
            Resume Run
          </Button>
        )}
        <Button colorScheme='green' size='lg' w='full' onClick={() => onStart("standard")}>
          Standard Run
        </Button>
        <Button
          colorScheme='purple'
          size='lg'
          w='full'
          onClick={() => onStart("daily")}
        >
          Daily Challenge
          {daily && <Badge ml={2} variant='subtle'>#{daily.seed}</Badge>}
        </Button>
        <HStack spacing={3} pt={2}>
          <Button onClick={onOpenSanctum}>🛕 Sanctum</Button>
          <Button onClick={onOpenLeaderboard}>🏆 Leaderboard</Button>
        </HStack>
        <HStack spacing={3}>
          <Button onClick={onOpenAchievements}>⭐ Achievements</Button>
          <Button onClick={onOpenTutorial}>❓ Tutorial</Button>
        </HStack>
      </VStack>

      <Stack direction='row' spacing={6} opacity={0.5} fontSize='sm'>
        <Text>Cleared {profile?.total_cleared ?? 0} cards all-time</Text>
        <Text>{profile?.longest_streak ?? 0} win streak best</Text>
      </Stack>

      <Box h={4} />
    </VStack>
  );
};
