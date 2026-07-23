# Releasing

Releases are automated with [Changesets](https://github.com/changesets/changesets) and published
to npm with **OIDC Trusted Publishing**: there is no long-lived npm token anywhere. See
[VERSIONING.md](./VERSIONING.md) for what each version bump means.

## One-time setup (founder)

On [npmjs.com](https://www.npmjs.com), for **each** package (`@glemo/sdk` and
`@glemo/verify-widget`), link a Trusted Publisher:

1. Package Settings -> Trusted Publisher -> Add GitHub Actions.
2. Organization/user: `glemo-io`, repository: `glemo-js`, workflow filename: `release.yml`.

Until both are linked, the publish step fails with an authentication error. No `NPM_TOKEN`
secret is created or used.

## Cutting a release

1. Land your changes with a changeset (`pnpm changeset`) in each pull request.
2. When those merge to `main`, the `release` workflow opens a **Version Packages** pull request
   that applies the version bumps and updates each `CHANGELOG.md`.
3. Review and merge the Version Packages pull request. The workflow then builds, validates the
   packages (`check:pack`), and publishes over OIDC with provenance.

## Verifying a release

- `npm view @glemo/sdk version` shows the new version.
- The npm package page shows a **Provenance** section linking the published version to the exact
  commit and workflow run.
- `curl -sI https://unpkg.com/@glemo/verify-widget/dist/index.global.js` returns `200`.

## If OIDC fails

- Confirm the Trusted Publisher is linked for the package that failed.
- Confirm the workflow keeps `permissions: id-token: write`.
- The publish never falls back to a stored token; fix the OIDC link rather than adding one.
