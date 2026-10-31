# hermet: agent instructions

The checks that keep amorfus and roslambo hermetic, mounted in each as the submodule `vendor/hermet`. [README.md](README.md) says what that means, what is here and how the apps call it.

The name is not a typo: it is hermetic and hermit at once. Never correct it to either word.

This repo is **public**. Never commit home paths, account names or other identity details; `npm run public-scan` enforces the built-in patterns.

## `npm run check` is the definition of done

Lint, public-scan and the unit tests. It must pass before a commit lands. Never weaken it to make a build pass: fix the code.

## Contracts that are easy to break

- No app's policy lives here. What differs between the apps (a denylist variable, IPFS file rules, a host-shaped string to ignore) is an option the app passes from its own wrapper, documented where the option is defined. Defaults stay at the strictest common behaviour.
- The code runs under each app's versions of ESLint, ws and vitest, resolved from the app's `node_modules`. Use only what those versions share.
- A change reaches an app only when the app moves its `vendor/hermet` pin, on its own session branch, with its own `npm run check` passing. A change in behaviour says in its commit what each app must do at its next bump.
- Never edit an app's `vendor/hermet` checkout in place: change this repo, then move the pins.

## Branch workflow

Every session works on its own branch, created before the first edit and kept after merging; `main` moves only by fast-forward. Push only when asked: pushing `main` publishes what the apps' pins will fetch.
