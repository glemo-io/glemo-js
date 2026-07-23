# Contributing to glemo-js

Thanks for helping improve the Glemo JavaScript packages.

## Setup

```bash
pnpm install
pnpm build
pnpm test
```

Requires Node 18 or newer and pnpm.

## Before you open a pull request

- `pnpm lint` and `pnpm typecheck` pass.
- `pnpm test` passes.
- `pnpm check:pack` passes (package validation with publint and are-the-types-wrong).
- You added a changeset for any change to a published package: run `pnpm changeset` and follow
  the prompts. See [VERSIONING.md](./VERSIONING.md) for what counts as major, minor and patch.

## Contract

The public API surface is intentionally small and stable. The SDK types are generated from the
Glemo API OpenAPI contract and then curated: the internal API surface is never exported. If your
change would expose an internal endpoint or type, that is a bug, not a feature.

## Reporting security issues

Do not open a public issue for a vulnerability. See [SECURITY.md](./SECURITY.md).
