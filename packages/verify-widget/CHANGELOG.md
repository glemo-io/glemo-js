# @glemo/verify-widget

## 1.0.0

### Major Changes

- [`5b2185b`](https://github.com/glemo-io/glemo-js/commit/5b2185be2f89ad01da55f2f8d3429d8a4155ecc6) Thanks [@DavidZapataOh](https://github.com/DavidZapataOh)! - The widget stops presenting a scanned QR as a verified document.

  It painted a bare "Verified" with no subject and no distinction between a signed file
  and a code scanned off a page. The API contract states the reason this is dangerous in
  its own words: a genuine QR can be photographed off a real certificate and placed on a
  forged one, and the mismatch is only visible if the reader can see who the credential
  is about. The widget now shows the name and what it certifies, and marks a QR verdict
  as scanned from the page rather than the file.

  MAJOR and not MINOR by this repository's own rule: VERSIONING.md counts a change to the
  default appearance that a themed embed depends on as breaking, and this adds elements to
  the default render.

### Patch Changes

- Updated dependencies [[`1a77ddc`](https://github.com/glemo-io/glemo-js/commit/1a77ddceb277ac72f4e9fa502e242826ec3eac4d), [`5b2185b`](https://github.com/glemo-io/glemo-js/commit/5b2185be2f89ad01da55f2f8d3429d8a4155ecc6)]:
  - @glemo/sdk@0.3.0

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
