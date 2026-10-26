import { Menu, MenuList } from "@chakra-ui/react";
import { act, fireEvent, screen } from "@testing-library/react";
import { render } from "../test-utils";
import { CardVal, Suite } from "../Logic/Deck";
import { AchievementsModal, AchievementsProps } from "./AchievementsModal";

jest.mock("./Confetti", () => ({
  Confetti: () => null,
}));

const achievementsKey = "achievements";

const defaultProps: AchievementsProps = {
  cleared: 0,
  openColumns: [],
  reset: false,
  deckSize: 36,
  board: [[
    { suite: Suite.Spade, val: CardVal.Two },
    { suite: Suite.Heart, val: CardVal.Three },
    { suite: Suite.Club, val: CardVal.Four },
    { suite: Suite.Diamond, val: CardVal.Five },
  ]],
  doParty: 0,
  deck: [],
};

const storedAchievements = () => JSON.parse(localStorage.getItem(achievementsKey) ?? "{}");

beforeEach(() => {
  jest.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  jest.useRealTimers();
});

test("records a win only once while the winning board remains mounted", () => {
  localStorage.setItem(achievementsKey, JSON.stringify({ ClearedFirstHand: 48 }));
  const aces = [
    { suite: Suite.Spade, val: CardVal.Ace },
    { suite: Suite.Heart, val: CardVal.Ace },
    { suite: Suite.Club, val: CardVal.Ace },
    { suite: Suite.Diamond, val: CardVal.Ace },
  ];

  render(<Menu><MenuList><AchievementsModal {...defaultProps} board={[aces]} cleared={48} deckSize={0} /></MenuList></Menu>);

  act(() => {
    jest.advanceTimersByTime(20);
  });
  expect(storedAchievements().GamesWon).toBe(1);

  act(() => {
    jest.advanceTimersByTime(200);
  });
  expect(storedAchievements().GamesWon).toBe(1);
});

test("records a loss before the reset pulse is cleared", () => {
  const { rerender } = render(<Menu><MenuList><AchievementsModal {...defaultProps} cleared={4} /></MenuList></Menu>);

  rerender(<Menu><MenuList><AchievementsModal {...defaultProps} cleared={4} reset={true} /></MenuList></Menu>);
  rerender(<Menu><MenuList><AchievementsModal {...defaultProps} cleared={4} reset={false} /></MenuList></Menu>);

  act(() => {
    jest.advanceTimersByTime(100);
  });

  expect(storedAchievements().GamesLost).toBe(1);
});

test("uses the achievable fourteen-card first-hand maximum", () => {
  localStorage.setItem(achievementsKey, JSON.stringify({ ClearedFirstHand: 14 }));
  render(<Menu><MenuList><AchievementsModal {...defaultProps} /></MenuList></Menu>);

  fireEvent.click(screen.getByText("Achievements"));

  expect(screen.getByText("14 / 14")).toBeInTheDocument();
});
