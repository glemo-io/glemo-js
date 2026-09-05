---
"@glemo/sdk": minor
---

VerifyResult declares signedEvidence, the signed receipt a verification returns.

It is a Security Event Token (RFC 8417) with no expiry, verifiable against the
issuer's JWKS with any JWT library: no API key and no call to Glemo. The public
contract now publishes /.well-known/jwks.json too, because documenting a receipt
without the URL to check it against would be documenting nothing.
