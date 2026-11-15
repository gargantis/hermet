# hermet

Hermet keeps a serverless browser app hermetic: the app depends on nothing and reveals nothing it hasn't declared. Like the hermit crab, it lives in a borrowed shell (whatever origin, IPFS gateway or browser session hosts it) and moves on.

[amorfus](https://github.com/gargantis/amorfus) and [roslambo](https://github.com/gargantis/roslambo) run these checks as part of `npm run check`, their definition of done. The code began in amorfus and was copied into roslambo, where it improved; it lives here so the two stop drifting apart.

| File | What it does | The app calls it from |
|---|---|---|
| `public-scan.mjs` | Fails on home paths, private key material and private denylist terms in the repo's tracked and untracked files | `scripts/public-scan.mjs` |
| `audit-dist.mjs` | Audits the built `dist/`: relative references only, no host outside `third-party.json`, no secrets, no forbidden files, exactly the expected licence notices, each with its licence text | `scripts/audit-dist.mjs` |
| `licenses.mjs` | Writes `dist/THIRD-PARTY-LICENSES.txt` from the licence JSON Vite emits | `scripts/licenses.mjs` |
| `room-config.ts` | Builds Trystero's `joinRoom` config from what the app declares only: the relays and STUN servers in `third-party.json`, and a receive budget the app sets. Trystero never falls back on its own relays, STUN servers or 256 MiB budget | `src/net/room-config.ts` |
| `eslint/exact-ops.mjs` | ESLint rule: only exactly rounded operations, for code that must hash the same on every machine | `eslint.config.mjs` |
| `eslint/base.mjs` | The ESLint setup both apps start from | `eslint.config.mjs` |
| `tsconfig.base.json` | The TypeScript strictness both apps share | `tsconfig.json` (`extends`) |
| `nostr-relay.mjs` | A minimal local Nostr relay, so networking end-to-end tests contact nothing public | `e2e/` |

## Use

An app mounts this repo as a git submodule at `vendor/hermet`:

```sh
git submodule add https://github.com/gargantis/hermet.git vendor/hermet
```

Clone an app with `--recurse-submodules`, or run `git submodule update --init` after cloning. Its CI checks out with `submodules: true`.

The app keeps its own policy in a few lines that call the shared code. For example, roslambo's `scripts/audit-dist.mjs`:

```js
import { runAuditDist } from '../vendor/hermet/audit-dist.mjs';

await runAuditDist({ ignoredHosts: ['stun'] });
```

What the shared code expects of an app:
- `third-party.json` at the repo root, an array of `{ host, url, kind, purpose, operator, sees }`, one entry per external host. The dist audit allows exactly those hosts.
- `scripts/expected-licenses.json`, the npm package names whose notices must ship.
- `build.license.fileName: '.license-npm.json'` in `vite.config.ts`.
- `@trystero-p2p/nostr` 0.26.0: `room-config.ts` is typed against its `JoinRoomConfig`, ships in the app's bundle, and is typechecked by the app's `tsc`.
- `vendor/hermet/**/*.test.{mjs,ts}` in its vitest `include`, so its `npm run check` also runs these tests, under its own versions of ESLint, ws and vitest. The ESLint base ignores `vendor/**`: this repo lints itself.

The shared code imports `eslint`, `@eslint/js`, `typescript-eslint`, `ws` and Trystero's types from the app's `node_modules`. This repo's `devDependencies` exist only to run its own checks.

## What stays in each app

Similar code that is not shared, and why:
- **Byte codecs and state hashes** (amorfus `src/core/codec/`, `src/core/sync/digest.ts`; roslambo `src/core/protocol/bytes.ts`, `src/core/sim/hash.ts`): same shape, different contracts. amorfus's reader throws and hashes with SHA-256; roslambo's flags `bad` and hashes with MurmurHash3. Each app's goldens and wire format pin its own.
- **The Trystero transport** (amorfus `src/net/trystero-transport.ts`, roslambo `src/net/trystero.ts`): both wrap one room and one binary action, but amorfus adds negotiated channels with room epochs, and roslambo a two-round handshake and pings. Each app keeps its own relay-health count too, three lines that say nothing about declared hosts.
- **Per-app data and targets:** `third-party.json` and its test, `wrangler.jsonc` and its test, `vite.config.ts`, `playwright.config.ts`, `index.html` and the CI workflow.
- **`.gitignore`, `.npmrc` and `.nvmrc`:** git and npm read them only from the repo itself.

## Change

In a standalone clone: `npm ci`, change the code, `npm run check` (lint, typecheck, public-scan and the tests), commit on a branch, land it on `main`, push. Then, in each app, on a session branch: check out the new commit in `vendor/hermet`, run the app's `npm run check`, and commit the new pin. Never edit an app's `vendor/hermet` in place.

## License

MIT; see [LICENSE](LICENSE).
