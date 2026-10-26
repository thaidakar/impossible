import { Menu } from "@chakra-ui/react";
import { waitFor } from "@testing-library/react";
import { Card, CardVal, Suite } from "../Logic/Deck";
import { render } from "../test-utils";
import { AchievementsModal } from "./AchievementsModal";

jest.mock("./Confetti", () => ({ Confetti: () => null }));

const winningBoard: Card[][] = [[
  { suite: Suite.Spade, val: CardVal.Ace },
  { suite: Suite.Heart, val: CardVal.Ace },
  { suite: Suite.Club, val: CardVal.Ace },
  { suite: Suite.Diamond, val: CardVal.Ace },
]];

const renderAchievements = (isSolutionReplay: boolean) => render(
  <Menu>
    <AchievementsModal
      board={winningBoard}
      cleared={48}
      deck={[]}
      deckSize={0}
      isSolutionReplay={isSolutionReplay}
      openColumns={[]}
      reset={false}
    />
  </Menu>
);

const storedAchievements = () => JSON.parse(localStorage.getItem("achievements") ?? "{}");

describe("AchievementsModal", () => {
  beforeEach(() => localStorage.clear());

  it("does not record a win when the winning path replay finishes", async () => {
    renderAchievements(true);

    await waitFor(() => expect(localStorage.getItem("achievements")).not.toBeNull());
    expect(storedAchievements().GamesWon).toBeUndefined();
  });

  it("records a real win only once while the winning board stays visible", async () => {
    renderAchievements(false);

    await waitFor(() => expect(storedAchievements().GamesWon).toBe(1));
    await new Promise(resolve => window.setTimeout(resolve, 250));
    expect(storedAchievements().GamesWon).toBe(1);
  });

  it("re-arms the win guard for the next game without cascading", async () => {
    const { rerender } = renderAchievements(false);

    await waitFor(() => expect(storedAchievements().GamesWon).toBe(1));

    rerender(
      <Menu>
        <AchievementsModal
          board={[]}
          cleared={0}
          deck={[]}
          deckSize={0}
          isSolutionReplay={false}
          openColumns={[]}
          reset
        />
      </Menu>
    );

    rerender(
      <Menu>
        <AchievementsModal
          board={winningBoard}
          cleared={48}
          deck={[]}
          deckSize={0}
          isSolutionReplay={false}
          openColumns={[]}
          reset={false}
        />
      </Menu>
    );

    await waitFor(() => expect(storedAchievements().GamesWon).toBe(2));
    await new Promise(resolve => window.setTimeout(resolve, 250));
    expect(storedAchievements().GamesWon).toBe(2);
  });

  it("records a loss when a game is restarted before winning", async () => {
    const losingProps = {
      board: [] as Card[][],
      cleared: 0,
      deck: [] as Card[],
      deckSize: 0,
      isSolutionReplay: false,
      openColumns: [] as number[],
    };

    const { rerender } = render(
      <Menu>
        <AchievementsModal {...losingProps} reset={false} />
      </Menu>
    );

    await waitFor(() => expect(localStorage.getItem("achievements")).not.toBeNull());

    rerender(
      <Menu>
        <AchievementsModal {...losingProps} reset />
      </Menu>
    );

    await waitFor(() => expect(storedAchievements().GamesLost).toBe(1));

    rerender(
      <Menu>
        <AchievementsModal {...losingProps} reset={false} />
      </Menu>
    );

    await waitFor(() => expect(storedAchievements().GamesLost).toBe(1));
  });
});
