---
"@glemo/sdk": patch
"@glemo/verify-widget": patch
---

Harden the public type surface: the SDK exposes only curated `verify`/`issue` types, and the
internal API contract is no longer reachable through this package. Both packages now ship from the
public `glemo-js` repository, published over OIDC with provenance.
