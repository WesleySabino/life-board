# Contributing

Small, focused improvements are welcome. Describe the problem and expected behavior in an issue or pull request. Use fictional tasks and calendar examples; never post credentials, personal board exports, real calendar IDs, private deployment links or user screenshots.

Start with [development and deployment](docs/development.md). Keep the existing npm lockfile and architecture. Run `npm ci`, `npm run typecheck`, `npm test`, `npm run lint` and `npm run build` before submitting a change. Explain any check you could not run. Schema changes use `npm run db:generate`; preserve applied migrations and their metadata.

For UI changes, check keyboard and touch interactions, narrow screens, draft retention after errors, repeated actions and concurrent edits. For storage or MCP changes, cover authentication, user isolation, revision conflicts and retry behavior. Keep the loopback development identity out of production. A deployed board must remain private unless its owner explicitly changes access.

Do not put an exploit or private data in a public issue. For a security concern, use a private reporting channel if the repository provides one; otherwise describe it privately to the maintainer before publishing details.

By submitting a contribution, you agree that your contribution may be distributed under the project's MIT license. Preserve existing third-party copyright and license notices.
