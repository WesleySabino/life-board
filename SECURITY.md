# Security and privacy

Life Board is intended for an owner-private deployment. Public source does not imply public access to your tasks or calendar snapshots.

## Hosting boundary

Production authentication is provided by ChatGPT Sites. The app trusts `oai-authenticated-user-*` headers injected by the authenticated dispatcher. The application does not independently verify a bearer token or sign-in session. Never expose the backend directly to untrusted clients who can supply these headers. A different host must strip client headers, validate identity, enforce private access and supply its own MCP authorization flow.

The loopback-only development sign-in uses a fictional identity and is not a real account. Keep development servers bound to a trusted local interface. Do not use mock identity injection or trusted-header impersonation in production.

## Data handling

- D1 stores task records, requested calendar snapshots and verified task-event links, scoped to the authenticated user
- No provider calendar credentials are stored in the application
- UI writes require the same origin; MCP rejects a supplied foreign origin and requires authenticated user context for data-bearing calls
- Revision checks guard writes; a task create UUID makes repeated creates duplicate-safe
- Data responses use private/no-store caching; external calendar links are validated and opened with `noopener noreferrer`
- Archive is recoverable; this version does not provide a permanent deletion or retention-management interface
- Keep `.env`, `.dev.vars`, Git credentials, logs, runtime databases, exports, uploads and personal screenshots outside source control

The source uses parameterized SQL and validates task/calendar input. These protections still depend on the host's authentication and access controls. This release is not a third-party penetration test or a guarantee that the app has no vulnerabilities.

## Dependencies

Keep the lockfile and review dependency advisories before production upgrades. `npm audit` can check the registry's current known advisories when network access is available; it is not a complete security review. Do not run `npm audit fix --force` without reviewing the resulting dependency and behavior changes. Build tools and native packages have their own licenses and supply-chain considerations; see `THIRD_PARTY_NOTICES.md`.

## Reporting

Do not post credentials, private task text, calendar IDs or a working exploit in a public issue. Use a private reporting channel if one is enabled on the repository. If none is available, contact the maintainer privately before disclosing details. No dedicated security response SLA is promised.
