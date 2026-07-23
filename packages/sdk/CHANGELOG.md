# @glemo/sdk

## 0.2.1

### Patch Changes

- [`c326122`](https://github.com/glemo-io/glemo-js/commit/c3261225a9f44f9a7dc239eea477a1c4947ee6c7) Thanks [@DavidZapataOh](https://github.com/DavidZapataOh)! - Harden the public type surface: the SDK exposes only curated `verify`/`issue` types, and the
  internal API contract is no longer reachable through this package. Both packages now ship from the
  public `glemo-js` repository, published over OIDC with provenance.

## 0.2.0

- `glemo.issue()`: issues an OB 3.0 credential (VC-JWT + SD-JWT) via `POST /issue`.
  Requires an API key with the `issue:write` scope. No retry by default (issuance
  is not idempotent); opt in with `issue(input, { retries: 1 })`.
- `verify({ domain, proof })` (0.1.x): cross-issuer verification via zkTLS.

## 0.1.0

- `glemo.verify()` (byHash / byVC) with typed errors, timeout, and retry.
