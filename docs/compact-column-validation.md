# Compact column previews

Validation date: October 5, 2026.

## Behavior

- Each overview column shows at most five cards, its full total, a “Showing N of total” caption, and a View all link
- `/columns/inbox`, `/columns/next`, `/columns/doing`, `/columns/waiting`, and `/columns/done` show the full selected column
- Back to board restores the selected mobile column; archive state survives navigation and reload
- Inbox, Next, Doing and Waiting preserve their existing order
- Done is explicitly labeled **Recently updated** and sorts by `updatedAt` descending, then `createdAt` descending and ID ascending for stable ties
- Updates include edits and moves. This does not represent completion chronology; no completion dates are inferred or backfilled
- The same cards and edit, move, archive and restore handlers are used on the overview and full pages
- No database migration, ownership, authentication, calendar or plugin changes are required

## Checks

- TypeScript: passed
- Model and board-view tests: 19 passed, including all-column caps/counts, order, filtering, nonmutation, status validation and archive-aware navigation
- Production build: passed with all five full-column routes
- Isolated React DOM workflow checks: 40 assertions passed for counts, full list, moves, archive/restore, conflict drafts, Cancel, and new-task destination. The unchanged third-party presentation primitives were mocked, so these are not real-browser interaction or visual-layout checks
- Local built-Worker route/API/MCP smoke checks: 27 assertions passed with fictional local data, including authenticated routes, unauthenticated rejection, invalid route, duplicate-safe creation, revision conflicts, user isolation, moves, archive/restore and seven-tool discovery
- Changed-file ESLint: no errors; two existing request-sequence cleanup warnings
- Repository ESLint still reports one inherited `react-hooks/set-state-in-effect` error in the separate calendar maintenance view

Real-browser layout and physical mobile/keyboard interaction were not verified: the available cloud browser rejected the loopback preview URL with `ERR_BLOCKED_BY_CLIENT`. No browser restriction was bypassed. These checks do not claim production authentication, deployment infrastructure or calendar-provider end-to-end testing.

## User verification — October 6, 2026

The user confirmed that the compact columns work on mobile. This is user-reported verification of the mobile behavior, separate from the October 5 automated and isolated checks above. No new browser, keyboard or calendar-provider test is claimed.

The inherited calendar-maintenance lint error was subsequently fixed in the local October 6 changes. See [CI validation](ci-validation.md) for current check outcomes and publication status.
