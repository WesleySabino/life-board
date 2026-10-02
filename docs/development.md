# Development and deployment

## Install and check

Use Node.js ≥22.13.0 and npm. Keep `package-lock.json`; `npm ci` installs its integrity-pinned versions. No application API key is needed. If a sandbox cannot write npm's default cache, set `NPM_CONFIG_CACHE` to a writable local directory. The optional `npm run install:ci` helper provides the starter's profile-aware install path.

```sh
npm ci
npm run typecheck
npm test
npm run lint
npm run build
```

`npm test` covers input validation for tasks, snapshot windows and event links. It does not replace integration tests of a deployed host's authentication or D1 behavior. `npm run build` emits a Cloudflare-compatible Worker and assets in `dist/`. The project includes portable development helpers; managed Sites environments can select their own ignored checkout-local execution profile.

## Local D1

Build first to emit `dist/server/wrangler.json`. Apply each checked-in migration once to the local `DB` binding with the same `.wrangler/state` persistence directory used by development:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tiny_roulette.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_powerful_sphinx.sql
npm run dev
```

Use `/signin-with-chatgpt?return_to=/` on the loopback development server to sign in as the fictional test identity; `/signout-with-chatgpt?return_to=/` signs out. Incoming identity headers are stripped by the local simulator. It accepts only loopback hostnames and connections and is absent from production builds. `npm start` runs the built Worker locally; it does not provide the Vite development sign-in simulator.

For schema changes, run `npm run db:generate`, inspect the generated SQL, rebuild, and apply only the pending migration. Never rewrite an applied migration or its matching Drizzle metadata. Keep real databases and exports outside source control.

## Production prerequisites

The implemented production path is ChatGPT Sites. The neutral `.openai/hosting.json` requests logical `DB` storage and MCP capability; it contains no existing deployment identity. Register a new private Site for your copy through the supported Sites workflow, keep the returned project ID in your private deployment checkout, and let Sites provision resources, authentication and the plugin. Configure any real runtime secrets through the host's secret settings, never this repository.

For later updates to your own deployment, reopen the same Site and preserve its project identity, access policy, logical DB binding and applied migrations. Publish a verified source commit through the supported Sites tools. A source update does not reset D1 data. A failed deployment may already have applied migrations; inspect the failure before changing history. Source publication to GitHub does not authorize a public personal board.

Sites supplies the authentication boundary and trusted Site-scoped identity headers. Every task/calendar call must retain user ownership checks. A service credential alone does not manufacture a user identity. Outside Sites, provide and test an equivalent authentication adapter, strip client-supplied identity headers, restrict direct backend access, and configure storage and MCP authorization yourself. None of that alternate hosting wiring is provided automatically by this source release.

## MCP and calendar checks

The stateless `POST /mcp` route supports initialization, discovery and these seven tools:

- `list_tasks`, `create_task`, `update_task`
- `get_calendar_context`, `replace_calendar_snapshot`, `mark_calendar_snapshot_stale`, `save_task_calendar_link`

Discovery contains no private records. Data-bearing calls require authenticated user context. Create retries reuse the same UUID; updates read and send the current revision. On a conflict, fetch the latest record and review it before retrying. Do not silently replace another edit.

After publication, install/connect the Site's own plugin, inspect its actual catalog, and verify a read plus a sample change. If your connection lacks newer calendar tools, the signed-in `/calendar/maintenance` form uses the same validation, ownership and revision checks. It stores supplied snapshot/link metadata and never writes to Google Calendar.

For snapshots, fetch all provider result pages successfully before importing a bounded window with `complete: true`. Preserve the configured source and task-destination calendar IDs. On an incomplete/failed refresh, keep the last good snapshot and mark it stale. No automatic provider refresh or cron job is included.

For a specifically requested task deadline event, read its current link, create/update the one private non-blocking all-day entry via the separately connected calendar tool, verify provider state, then save its immutable calendar/event identity and exported task revision. Use no attendees, notes, extra reminders or recurrence. If the provider write is uncertain, inspect its state instead of blindly retrying. Do not delete calendar entries when tasks are archived or completed, or infer personal appointment completion from elapsed time.
