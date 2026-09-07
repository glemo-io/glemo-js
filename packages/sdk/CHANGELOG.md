# @glemo/sdk

## 0.3.0

### Minor Changes

- [`1a77ddc`](https://github.com/glemo-io/glemo-js/commit/1a77ddceb277ac72f4e9fa502e242826ec3eac4d) Thanks [@DavidZapataOh](https://github.com/DavidZapataOh)! - VerifyResult declares signedEvidence, the signed receipt a verification returns.

  It is a Security Event Token (RFC 8417) with no expiry, verifiable against the
  issuer's JWKS with any JWT library: no API key and no call to Glemo. The public
  contract now publishes /.well-known/jwks.json too, because documenting a receipt
  without the URL to check it against would be documenting nothing.

- [`5b2185b`](https://github.com/glemo-io/glemo-js/commit/5b2185be2f89ad01da55f2f8d3429d8a4155ecc6) Thanks [@DavidZapataOh](https://github.com/DavidZapataOh)! - VerifyResult declares the fields /verify actually returns.

  Four image fields had been frozen since July because the generation chain regenerates
  schema.d.ts, which is not exported, and never touches VerifyResult, which is written by
  hand and is the only thing a consumer sees: running every sync step changed nothing in
  the public API. Adds subject, imageLayer, imageAuthenticated, imageProvenance and the
  new report (W3C VCDM 2.0 section 7.1), plus the byImage input variant, which was
  missing while the image fields described a method the package could not invoke.

  A contract-drift test now fails when the committed public contract declares a /verify
  field the type does not.

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
