# Versioning policy

The packages in this repo follow [Semantic Versioning](https://semver.org) (`MAJOR.MINOR.PATCH`)
and are released with [Changesets](https://github.com/changesets/changesets). Each package is
versioned independently: a change to one does not force a bump of the other.

This document is the contract. Any release must respect it.

## How a release happens

1. Every pull request that changes a published package includes a **changeset**
   (`pnpm changeset`), which records the affected packages and the bump type.
2. Merging to `main` opens (or updates) a **Version Packages** pull request that applies the
   bumps and updates each `CHANGELOG.md`.
3. Merging the Version Packages pull request publishes the new versions from CI.

Never publish by hand. See [RELEASING.md](./RELEASING.md).

## What each bump means

### `@glemo/sdk`

- **MAJOR** — a backwards-incompatible change to the public TypeScript API (a removed or renamed
  export, a changed function signature, a narrowed type) or a change in the observed behavior of
  `verify`/`issue` (for example a different default, or a thrown error where one was not thrown).
- **MINOR** — a backwards-compatible capability: a new method, a new optional field, a new
  verification input, a new error subclass.
- **PATCH** — a bug fix, a documentation fix, an internal change with no effect on the public API.

The public API is the surface exported from `src/index.ts`. The internal API contract (the full
OpenAPI `paths`) is **never** part of the public surface and never triggers a version bump.

### `@glemo/verify-widget`

- **MAJOR** — a backwards-incompatible change to the `<glemo-verify>` custom element: a removed or
  renamed attribute, a changed default verdict wording that consumers rely on, a change to the
  default appearance that a themed embed depends on, or a change to the CDN entry path.
- **MINOR** — a new attribute, a new verdict state, a new theming variable, a new label override.
- **PATCH** — a bug fix, a visual fix, or an internal change that keeps the bundle within its size
  budget and the public attributes stable.

## Pre-releases

Pre-release versions ship under a dist-tag, never `latest`:

- `next` for release candidates: `pnpm changeset pre enter next`, then release as usual.
- `beta` for experimental work that may change.

Consumers opt in with `npm install @glemo/sdk@next`. Exit a pre-release window with
`pnpm changeset pre exit` before the stable release.

## Deprecation policy

To remove something from the public API:

1. Mark it `@deprecated` in the source with a one-line note pointing to the replacement, and ship
   that in a **MINOR** release.
2. Keep the deprecated surface working for at least one further minor release.
3. Remove it in the next **MAJOR**, documented in the changeset and `CHANGELOG.md`.

Security fixes are exempt from the deprecation window when a fix requires removing an unsafe
surface; those ship as soon as they are ready, documented clearly.
