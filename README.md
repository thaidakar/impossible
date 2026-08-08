# Impossible

Impossible is a browser version of a difficult single-deck card game. It is built with React and Chakra UI.

## Development

```sh
npm install
npm start
```

Run the test suite and production build locally with:

```sh
npm test -- --watchAll=false
npm run build
```

## Cloudflare Pages

The site is intended to be hosted on Cloudflare Pages. Connect the Pages project to this GitHub repository to deploy the `main` branch automatically. GitHub Actions runs the tests and production build separately on pushes and pull requests.

Create the Pages project from **Workers & Pages > Create application > Pages > Import an existing Git repository** with these settings:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `build` |
| Environment variable | `NODE_VERSION=20` |
| Environment variable | `CI=false` |

The `homepage` setting is intentionally absent from `package.json`, so asset paths are generated for a root Cloudflare Pages site rather than a GitHub Pages project subpath.

Cloudflare Pages can later serve backend functionality from a `functions/` directory and bind to D1 without requiring a separate hosting project.
