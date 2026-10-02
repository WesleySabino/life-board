import assert from "node:assert/strict";
import test from "node:test";
import { createTaskSchema, updateTaskSchema } from "../lib/task-model.ts";
import { replaceCalendarSchema, calendarLinkSchema } from "../lib/calendar-model.ts";

const task = () => ({ id: "11111111-1111-4111-8111-111111111111", title: "Plan a weekend hike", description: "Fictional example", status: "inbox", labels: ["Personal"], dueDate: "2026-10-10" });
const snapshot = () => ({
  expectedRevision: 0, complete: true,
  calendars: [{ id: "example-main", name: "Main" }, { id: "example-tasks", name: "Tasks" }],
  writeCalendarId: "example-tasks", timezone: "Etc/UTC",
  windowStart: "2026-10-01T00:00:00Z", windowEnd: "2026-10-15T00:00:00Z", sourceCheckedAt: "2026-10-01T00:00:00Z", events: [],
});
const link = () => ({
  taskId: task().id, expectedLinkRevision: 0, calendarId: "example-tasks", eventId: "example-event", url: null,
  sourceTaskRevision: 1, syncedTitle: task().title, syncedDueDate: "2026-10-10", startDate: "2026-10-10", endDate: "2026-10-11",
});

test("task input trims a title and deduplicates labels", () => {
  const result = createTaskSchema.parse({ ...task(), title: "  Plan a weekend hike  ", labels: ["Personal", "Personal"] });
  assert.equal(result.title, task().title); assert.deepEqual(result.labels, ["Personal"]);
});
test("task input rejects impossible dates and client-supplied ownership", () => {
  assert.equal(createTaskSchema.safeParse({ ...task(), dueDate: "2026-02-30" }).success, false);
  assert.equal(createTaskSchema.safeParse({ ...task(), ownerId: "another-user" }).success, false);
});
test("task updates require a positive revision and an actual update", () => {
  assert.equal(updateTaskSchema.safeParse({ id: task().id, revision: 0, status: "doing" }).success, false);
  assert.equal(updateTaskSchema.safeParse({ id: task().id, revision: 1 }).success, false);
  assert.equal(updateTaskSchema.safeParse({ id: task().id, revision: 1, dueDate: null }).success, true);
});
test("task limits reject overlong titles and more than eight labels", () => {
  assert.equal(createTaskSchema.safeParse({ ...task(), title: "x".repeat(201) }).success, false);
  assert.equal(createTaskSchema.safeParse({ ...task(), labels: Array.from({ length: 9 }, (_, i) => `Label${i}`) }).success, false);
});
test("a complete fourteen-day snapshot with fictional selections is valid", () => {
  assert.equal(replaceCalendarSchema.safeParse(snapshot()).success, true);
});
test("snapshots reject incomplete imports and windows longer than fourteen days", () => {
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), complete: false }).success, false);
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), windowEnd: "2026-10-15T00:00:01Z" }).success, false);
});
test("snapshot selections must be unique and include the task destination", () => {
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), writeCalendarId: "unselected" }).success, false);
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), calendars: [snapshot().calendars[0], snapshot().calendars[0]] }).success, false);
});
test("snapshot events must belong to selected calendars and overlap the window", () => {
  const event = { id: "example-event", calendarId: "example-main", title: "Fictional appointment", allDay: true, start: "2026-10-10", end: "2026-10-11", url: null };
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), events: [event] }).success, true);
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), events: [{ ...event, calendarId: "unselected" }] }).success, false);
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), events: [{ ...event, start: "2026-11-10", end: "2026-11-11" }] }).success, false);
});
test("snapshot events reject duplicates and untrusted links", () => {
  const event = { id: "example-event", calendarId: "example-main", title: "Fictional appointment", allDay: true, start: "2026-10-10", end: "2026-10-11", url: null };
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), events: [event, event] }).success, false);
  assert.equal(replaceCalendarSchema.safeParse({ ...snapshot(), events: [{ ...event, url: "https://example.invalid/event" }] }).success, false);
});
test("calendar links cover exactly one due-date day", () => {
  assert.equal(calendarLinkSchema.safeParse(link()).success, true);
  assert.equal(calendarLinkSchema.safeParse({ ...link(), endDate: "2026-10-12" }).success, false);
  assert.equal(calendarLinkSchema.safeParse({ ...link(), syncedDueDate: "2026-10-09" }).success, false);
});
