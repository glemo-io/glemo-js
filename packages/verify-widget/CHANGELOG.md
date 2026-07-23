# @glemo/verify-widget

## 0.1.0

- `<glemo-verify>` custom element: verifies a credential by id with a publishable
  key (`verify:read` scope), rendered inside a Shadow DOM for style isolation.
  Ships an ESM module and a standalone IIFE browser bundle
  (`dist/index.global.js`, global `GlemoVerify`) for a `<script>` embed, resolvable
  from unpkg and jsDelivr.
