# @glemo/sdk

```ts
import { createGlemo } from "@glemo/sdk";

const glemo = createGlemo({ apiKey: process.env.GLEMO_API_KEY! });

// Issue (scope issue:write): the recipient only needs an email.
const credential = await glemo.issue({
  recipient: { email: "ada@university.edu", name: "Ada Lovelace" },
  achievement: { name: "Avalanche Fundamentals" },
});
// credential.publicUrl is where anyone can verify it

// Verify (scope verify:read):
const result = await glemo.verify({ credentialId: credential.credentialId });
// result.status: "valid" | "revoked" | "expired" | ...
```

Typed errors: `AuthenticationError` (401), `PermissionError` (403),
`RateLimitError` (429, with `retryAfter`), `ValidationError` (422),
`ApiError` (5xx), `NetworkError` (network/timeout). All extend `GlemoError`.

Node ≥18, browser, and edge. ESM + CJS. `verify({ jwt })` verifies a portable VC
(VC-JWT or SD-JWT presentation); `verify({ credentialId })` checks the registry;
`verify({ domain, proof })` verifies a credential from a NON-integrated issuer via
a zkTLS proof plus the curated schema registry (the response includes `claims`).
`issue()` ships with the Issue API.

The contract comes from the backend's OpenAPI spec (`pnpm gen:schema` regenerates
`src/schema.d.ts`); the SDK does not reimplement types.
