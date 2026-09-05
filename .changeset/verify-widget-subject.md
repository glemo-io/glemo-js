---
"@glemo/verify-widget": major
---

The widget stops presenting a scanned QR as a verified document.

It painted a bare "Verified" with no subject and no distinction between a signed file
and a code scanned off a page. The API contract states the reason this is dangerous in
its own words: a genuine QR can be photographed off a real certificate and placed on a
forged one, and the mismatch is only visible if the reader can see who the credential
is about. The widget now shows the name and what it certifies, and marks a QR verdict
as scanned from the page rather than the file.

MAJOR and not MINOR by this repository's own rule: VERSIONING.md counts a change to the
default appearance that a themed embed depends on as breaking, and this adds elements to
the default render.
