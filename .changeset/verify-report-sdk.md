---
"@glemo/sdk": minor
---

VerifyResult declares the fields /verify actually returns.

Four image fields had been frozen since July because the generation chain regenerates
schema.d.ts, which is not exported, and never touches VerifyResult, which is written by
hand and is the only thing a consumer sees: running every sync step changed nothing in
the public API. Adds subject, imageLayer, imageAuthenticated, imageProvenance and the
new report (W3C VCDM 2.0 section 7.1), plus the byImage input variant, which was
missing while the image fields described a method the package could not invoke.

A contract-drift test now fails when the committed public contract declares a /verify
field the type does not.
