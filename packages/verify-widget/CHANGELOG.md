# @glemo/verify-widget

## 0.1.1

### Patch Changes

- [`c326122`](https://github.com/glemo-io/glemo-js/commit/c3261225a9f44f9a7dc239eea477a1c4947ee6c7) Thanks [@DavidZapataOh](https://github.com/DavidZapataOh)! - Harden the public type surface: the SDK exposes only curated `verify`/`issue` types, and the
  internal API contract is no longer reachable through this package. Both packages now ship from the
  public `glemo-js` repository, published over OIDC with provenance.
- Updated dependencies [[`c326122`](https://github.com/glemo-io/glemo-js/commit/c3261225a9f44f9a7dc239eea477a1c4947ee6c7)]:
  - @glemo/sdk@0.2.1

## 0.1.0

- `<glemo-verify>` custom element: verifies a credential by id with a publishable
  key (`verify:read` scope), rendered inside a Shadow DOM for style isolation.
  Ships an ESM module and a standalone IIFE browser bundle
  (`dist/index.global.js`, global `GlemoVerify`) for a `<script>` embed, resolvable
  from unpkg and jsDelivr.
