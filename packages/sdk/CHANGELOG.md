# @glemo/sdk

## 0.2.0

- `glemo.issue()`: issues an OB 3.0 credential (VC-JWT + SD-JWT) via `POST /issue`.
  Requires an API key with the `issue:write` scope. No retry by default (issuance
  is not idempotent); opt in with `issue(input, { retries: 1 })`.
- `verify({ domain, proof })` (0.1.x): cross-issuer verification via zkTLS.

## 0.1.0

- `glemo.verify()` (byHash / byVC) with typed errors, timeout, and retry.
