# Impossible

Impossible is a roguelite browser adaptation of a difficult single-deck card
game. Clear all 48 cards from the deck while keeping the four Aces — but the
table only holds so many rows. Every run earns shards; spend them in the
Sanctum on permanent upgrades that stack run over run. A seeded Daily
Challenge gives every player the same deal, with an all-time leaderboard.

Built with React, Chakra UI, and Cloudflare Pages Functions backed by D1.

## The roguelite loop

- **Runs**: Start a Standard Run (random deal) or the Daily Challenge (seeded
  deal shared by every player, +25% score).
- **Failure**: Each deal grows the table. If the board ever exceeds the row
  limit (12 by default) the run is over. You can also Concede a stuck run, or
  Abandon one mid-run — all count as losses.
- **Rewards**: Shards are earned per cleared card, per Ace resting on the top
  row, and for wins (extra for daily wins). Score adds clears, aces, a win
  bonus, and a grace bonus for finishing with rows to spare.
- **The Sanctum** (persistent meta-progression, stored in D1):
  | Upgrade | Effect |
  | --- | --- |
  | 🪜 Taller Table | +2 max rows per level (12 → 18) |
  | 🔮 Scry | Peek at the next row before dealing |
  | ⏳ Timebend | +1 undo per run (base: 1) |
  | 🎩 Slight Hand | Start with fewer dealt rows |
  | 🏆 Golden Aces | Aces on the top row pay more shards |
- **Persistence**: Your profile, upgrades, and completed runs live in D1.
  In-progress runs are saved locally and resume after a refresh. If the API
  is unreachable the game falls back to local storage seamlessly.

## Development

```sh
npm install
npm run db:local   # apply schema.sql to the local D1 database
npm run api        # Cloudflare Pages Functions + D1 on http://localhost:8788
npm start          # React dev server on http://localhost:3000 (proxies /api)
```

`npm start` proxies `/api/*` to the Pages Functions dev server, so the game
works end-to-end locally. Run the test suite and production build with:

```sh
npm test -- --watchAll=false
npm run build
```

The `functions/` directory is typechecked separately with
`npx tsc --noEmit -p functions/tsconfig.json`.

## Cloudflare Pages + D1

The site is hosted on Cloudflare Pages; backend logic lives in `functions/`
(Pages Functions) and player data lives in a D1 database (`impossible-db`).

### First-time setup

1. Create the D1 database:

   ```sh
   npx wrangler d1 create impossible-db
   ```

   Copy the returned `database_id` into `wrangler.jsonc`.

2. Apply the schema (locally and in production):

   ```sh
   npm run db:local
   npm run db:remote
   ```

3. Connect the Pages project to this GitHub repository (production branch
   `main`, build command `npm run build`, output directory `build`,
   `NODE_VERSION=22`, `CI=true`).

4. Add the D1 binding to the Pages project in the dashboard: create a D1
   database binding named `DB` pointing at `impossible-db`.

### Local API development

`npm run api` serves the `functions/` directory and a local D1 replica with
`wrangler pages dev`. Local database state lives in `.wrangler/` (gitignored);
run `npm run db:local` after schema changes.
