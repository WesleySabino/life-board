# Source release validation

Checked on 2026-10-02. This is a source-only release. No private deployment was changed as part of preparing it.

## Passed

- TypeScript: `npm run typecheck`
- Input-model tests: `npm test`, 10 tests passed
- Production Worker/assets build: `npm run build`
- Dependency resolution: the checked Next/React/RSC/Vite/image-size/undici/ws dependency tree has no reported resolution problems
- Local D1: both checked-in migrations applied successfully
- Local API smoke checks: 17 assertions covering missing authentication, stripping forged identity headers in development, seven-tool discovery, sign-in, readback, foreign-origin rejection, durable task creation, duplicate-safe create retry, revision conflict rejection, snapshot validation/readback/conflicts and archive
- Production build inspection: fictional development identity/cookie strings are absent from generated JavaScript/JSON
- Static source/privacy review: no credentials, real task/calendar records, private deployment identity, runtime databases, logs, uploads, screenshots or inherited private Git history in the publishable source tree
- Third-party notice map and the license inventory match the locked dependency source metadata
- README visuals: two synthetic, source-grounded SVG infographics rendered and visually inspected; XML checked, with no scripts or external assets

The API checks used a local fictional identity and local data. They do not test the production hosting provider's authentication service or establish a penetration-test result. Full browser interaction/accessibility regression testing of this release was not performed.

## Dependency hardening

The public source uses patched Next 16.3.8, React/React DOM/React Server Components 19.2.8 and Vite 8.0.16, plus same-major overrides for image-size 2.0.3, undici 7.29.1 and ws 8.21.0. Compatible transitive refreshes were also applied. Vinext remains on the existing beta line; the app was not redesigned. The complete 66-version delta is in [release-dependency-changes.json](release-dependency-changes.json).

Primary project references include the [Next 16.3.8 release](https://github.com/vercel/next.js/releases/tag/v16.3.8), [React 19.2.8 release](https://github.com/react/react/releases/tag/v19.2.8), [Vite's patched-version advisory](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff), [undici 7.29.1 release](https://github.com/nodejs/undici/releases/tag/v7.29.1) and [ws 8.21.0 release](https://github.com/websockets/ws/releases/tag/8.21.0). The [image-size advisory](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) records the 2.0.3 patched version.

At the final pre-publication check, `npm audit --omit=dev` reported zero known findings. The full `npm audit` reported zero high/critical entries, but **twelve development-tool dependency entries remain**: four moderate and eight low. They involve the Drizzle/esbuild helper chain and Vite/Vinext/Cloudflare/Wrangler development and build tools. The earlier preparation snapshot had six entries; the registry reported additional advisory propagation during the final check. This is a registry advisory snapshot, not proof that every runtime path is safe. Keep development servers local and review future upgrades. No force upgrade or major dependency replacement was applied to hide these findings.

These are twelve dependency entries propagating two underlying esbuild advisories: the [older development-server cross-origin issue](https://github.com/advisories/GHSA-67mh-4wv8-2f99) and a [Windows-only development-server arbitrary-file-read issue](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr). Avoid exposing development servers and do not serve untrusted requests with affected tooling. The production dependency audit is a separate scope from development/build tooling.

## Known lint limitations

`npm run lint` still fails with five inherited React-hook errors and two warnings:

- `app/board.tsx`: three `react-hooks/refs` errors, one `react-hooks/set-state-in-effect` error and two effect-cleanup `react-hooks/exhaustive-deps` warnings
- `app/calendar/maintenance/maintenance.tsx`: one `react-hooks/set-state-in-effect` error

Mechanical JSX/link/import/type cleanups were applied. Hook lifecycle changes were deferred because they require behavior-focused UI regression work. Passing type checks, model tests and the build does not mean lint passed.

## Scope

The MIT release covers authored source, with separate upstream notices and licenses preserved. It excludes built artifacts and installed native packages. Binary redistribution compliance and alternative-host production authentication need their own review. No automated GitHub CI workflow is included in this version.
