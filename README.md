# glemo-js

The official Glemo JavaScript and TypeScript packages: verify and issue credentials from any
issuer with one call, and drop a live verification widget into any page.

| Package | Description |
| --- | --- |
| [`@glemo/sdk`](./packages/sdk) | Typed client for the Glemo API (`verify`, `issue`). ESM + CJS. |
| [`@glemo/verify-widget`](./packages/verify-widget) | A `<glemo-verify>` web component that verifies a credential live, isolated in a Shadow DOM. |

## Install

```bash
npm install @glemo/sdk
```

```ts
import { createGlemo } from "@glemo/sdk";

const glemo = createGlemo({ apiKey: process.env.GLEMO_API_KEY });
const result = await glemo.verify({ credentialId: "a1b2c3d4-..." });
console.log(result.status); // "valid"
```

Or drop the widget into any page, no build step:

```html
<script src="https://unpkg.com/@glemo/verify-widget/dist/index.global.js"></script>
<glemo-verify credential-id="a1b2c3d4-..." publishable-key="glemo_test_..."></glemo-verify>
```

## Development

This is a pnpm monorepo. The Glemo API contract (OpenAPI) is the boundary; the SDK is generated
from it and hand-curated. See [CONTRIBUTING.md](./CONTRIBUTING.md) and [VERSIONING.md](./VERSIONING.md).

```bash
pnpm install
pnpm build      # build every package
pnpm test       # run the test suite
pnpm lint       # biome
pnpm typecheck  # tsc
```

## Documentation

Full docs and the API reference live at [glemo.io/docs](https://glemo.io/docs).

## License

MIT. See [LICENSE](./LICENSE).
