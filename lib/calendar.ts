import { getRawDb } from "@/db/raw";
import { TaskError } from "./tasks";
import { calendarLinkSchema, replaceCalendarSchema, staleCalendarSchema, type CalendarContext, type CalendarLink, type CalendarSnapshot } from "./calendar-model";
type SnapshotRow = { revision: number; payload: string; stale: number; stale_reason: string | null; updated_at: string };
type LinkRow = { revision: number; payload: string; updated_at: string };
function snapshot(row: SnapshotRow): CalendarSnapshot { return { ...JSON.parse(row.payload), revision: row.revision, stale: Boolean(row.stale), staleReason: row.stale_reason, savedAt: row.updated_at }; }
function link(row: LinkRow): CalendarLink { return { ...JSON.parse(row.payload), revision: row.revision, lastVerifiedAt: row.updated_at }; }
async function readSnapshot(owner: string): Promise<CalendarSnapshot | null> {
  const row = await getRawDb().prepare("SELECT * FROM calendar_snapshots WHERE owner_id = ?").bind(owner).first<SnapshotRow>();
  return row ? snapshot(row) : null;
}
export async function getCalendarContext(owner: string): Promise<CalendarContext> {
  const rows = await getRawDb().prepare("SELECT * FROM task_calendar_links WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 5001").bind(owner).all<LinkRow>();
  if (rows.results.length > 5000) throw new TaskError(422, "Calendar links exceed the supported board size.");
  return { snapshot: await readSnapshot(owner), links: rows.results.map(link) };
}
export async function replaceCalendarSnapshot(owner: string, input: unknown): Promise<CalendarSnapshot> {
  const { expectedRevision, ...payload } = replaceCalendarSchema.parse(input);
  const previous = await readSnapshot(owner);
  if (previous && Date.parse(payload.sourceCheckedAt) < Date.parse(previous.sourceCheckedAt)) throw new TaskError(409, "A newer calendar snapshot is already saved. Read the current context before replacing it.");
  if (previous && (previous.writeCalendarId !== payload.writeCalendarId || JSON.stringify(previous.calendars.map((c) => c.id).sort()) !== JSON.stringify(payload.calendars.map((c) => c.id).sort()))) throw new TaskError(403, "Refresh must preserve the configured calendars. Ask before changing calendar access or destination.");
  const now = new Date().toISOString();
  const statement = expectedRevision === 0
    ? getRawDb().prepare("INSERT INTO calendar_snapshots (owner_id, revision, payload, stale, stale_reason, updated_at) VALUES (?, 1, ?, 0, NULL, ?) ON CONFLICT(owner_id) DO NOTHING").bind(owner, JSON.stringify(payload), now)
    : getRawDb().prepare("UPDATE calendar_snapshots SET payload = ?, revision = revision + 1, stale = 0, stale_reason = NULL, updated_at = ? WHERE owner_id = ? AND revision = ?").bind(JSON.stringify(payload), now, owner, expectedRevision);
  const result = await statement.run();
  if (!result.meta.changes) throw new TaskError(409, "Calendar context changed. Read the current revision before saving the refreshed snapshot.");
  return (await readSnapshot(owner))!;
}
export async function markCalendarStale(owner: string, input: unknown): Promise<CalendarSnapshot> {
  const v = staleCalendarSchema.parse(input);
  const result = await getRawDb().prepare("UPDATE calendar_snapshots SET stale = 1, stale_reason = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND revision = ?").bind(v.message, new Date().toISOString(), owner, v.expectedRevision).run();
  if (!result.meta.changes) throw new TaskError(409, "Calendar context changed or has not been initialized. Read it before marking a failed refresh.");
  return (await readSnapshot(owner))!;
}
export async function saveCalendarLink(owner: string, input: unknown): Promise<CalendarLink> {
  const { expectedLinkRevision, ...payload } = calendarLinkSchema.parse(input);
  const owned = await getRawDb().prepare("SELECT id, revision FROM tasks WHERE id = ? AND owner_id = ?").bind(payload.taskId, owner).first<{ id: string; revision: number }>();
  if (!owned) throw new TaskError(404, "This task could not be found.");
  if (payload.sourceTaskRevision > owned.revision) throw new TaskError(400, "Source task revision is invalid.");
  const context = await readSnapshot(owner);
  if (!context || context.writeCalendarId !== payload.calendarId) throw new TaskError(403, "Use the configured Tasks destination calendar.");
  const existing = await getRawDb().prepare("SELECT * FROM task_calendar_links WHERE owner_id = ? AND task_id = ?").bind(owner, payload.taskId).first<LinkRow>();
  if (existing) {
    const current = link(existing);
    if (current.calendarId !== payload.calendarId || current.eventId !== payload.eventId) throw new TaskError(409, "This task already has a different calendar entry. Do not create or replace it without resolving the existing link.");
  }
  const now = new Date().toISOString();
  const statement = expectedLinkRevision === 0
    ? getRawDb().prepare("INSERT INTO task_calendar_links (owner_id, task_id, revision, payload, updated_at) VALUES (?, ?, 1, ?, ?) ON CONFLICT(owner_id, task_id) DO NOTHING").bind(owner, payload.taskId, JSON.stringify(payload), now)
    : getRawDb().prepare("UPDATE task_calendar_links SET payload = ?, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND task_id = ? AND revision = ?").bind(JSON.stringify(payload), now, owner, payload.taskId, expectedLinkRevision);
  const result = await statement.run();
  if (!result.meta.changes) throw new TaskError(409, "Task calendar link changed. Read the current link before saving verified details.");
  const saved = await getRawDb().prepare("SELECT * FROM task_calendar_links WHERE owner_id = ? AND task_id = ?").bind(owner, payload.taskId).first<LinkRow>();
  return link(saved!);
}
