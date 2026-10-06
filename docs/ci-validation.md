# Lint and CI validation

Validation date: October 6, 2026. Local changes based on upstream `main` commit `073a7b1c65de490e24f796611184a548e948d671`.

## Changes

- Calendar maintenance starts with its existing loading state and updates state from the initial request's asynchronous result. Its initial request is aborted on effect cleanup, and an aborted result cannot update the view. Manual reads still set loading immediately from their button event; save and durable verification behavior are unchanged.
- GitHub Actions runs four independent jobs: lint, typecheck, test and build. Push, pull-request and manual-dispatch triggers use Node.js 24, the checked-in lockfile and SHA-pinned checkout/setup-node actions. A failed job does not cancel the other checks. Repository permissions are read-only and checkout credentials are not persisted.
- Compact-column documentation records the user's October 6 confirmation that mobile behavior works, separately from automated checks.

## Local outcomes

Runtime: Windows, Node.js 24.19.0, npm 11.9.0, portable execution profile. npm was installed in the surrounding task workspace because the selected environment initially supplied Node.js without npm.

| Check | Result |
| --- | --- |
| `npm ci --include=dev --include=optional --no-audit --no-fund` | Passed; 686 packages installed; lockfile unchanged |
| Baseline `npm run lint` | Reproduced one `react-hooks/set-state-in-effect` error in calendar maintenance and two existing board warnings |
| Updated `npm run lint` | Passed; zero errors, two existing `react-hooks/exhaustive-deps` warnings at `app/board.tsx:80` |
| `npm run typecheck` | Passed |
| `npm test` | 19 passed, zero failures or skips |
| `npm run build` | Passed; client, RSC and SSR build completed, emitting `dist/server/wrangler.json` and the board, calendar maintenance, column, API and MCP routes |
| Workflow YAML inspection | Parsed successfully; checked triggers, four matrix commands, fail-fast disabled, read-only permissions and 40-character action SHA pins |
| `git diff --check` | Passed |

The first sandboxed test attempt failed because esbuild could not inspect a parent directory. The approved rerun outside that filesystem sandbox passed all 19 tests. The build used the same approved local execution mode.

## Scope and publication

This report records local validation performed before publication. The user subsequently authorized pushing the branch and opening a draft PR; hosted Ubuntu CI outcomes are tracked in that PR. No merge, deployment, production data access or branch-protection change is included. Local validation does not claim a new browser, production authentication, real database or calendar-provider end-to-end test. Merging or deploying the application requires separate authorization.
