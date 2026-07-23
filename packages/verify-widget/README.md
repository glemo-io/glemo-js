# @glemo/verify-widget

A drop-in `<glemo-verify>` web component that verifies a credential live. It renders
inside a Shadow DOM, so host page styles cannot leak in and the widget cannot leak out.

## Script tag (any page)

```html
<script src="https://unpkg.com/@glemo/verify-widget/dist/index.global.js"></script>

<glemo-verify
  credential-id="a1b2c3d4-0000-0000-0000-000000000000"
  publishable-key="glemo_test_..."
></glemo-verify>
```

The `publishable-key` only needs the `verify:read` scope.

## Bundler (npm)

```ts
import "@glemo/verify-widget"; // registers <glemo-verify>
```

## Attributes

- `credential-id` (required): the credential to verify.
- `publishable-key` (required): a key scoped to `verify:read`.
- `base-url` (optional): defaults to the Glemo API.
- `label-<status>` (optional): override any verdict label, e.g. `label-valid="Verified"`.

## Theming

Set CSS custom properties on the element:

```html
<glemo-verify style="--glemo-verify: #0a7d5a; --glemo-radius: 12px" ...></glemo-verify>
```
