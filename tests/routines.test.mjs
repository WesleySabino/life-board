import { test } from "node:test";
import assert from "node:assert/strict";
import { routineDate, createRoutineClock, isRoutineCompleted, historyDates, createRoutineSchema, changeRoutineSchema, removeRoutineSchema } from "../lib/routine-model.ts";

test("Paraguay day boundary is independent of UTC and client locale", () => {
  assert.equal(routineDate(new Date("2026-10-31T02:59:59Z")), "2026-10-30");
  assert.equal(routineDate(new Date("2026-10-31T03:00:00Z")), "2026-10-31");
  assert.equal(routineDate(new Date("2027-01-01T02:59:59Z")), "2026-12-31");
  assert.equal(routineDate(new Date("2027-01-01T03:00:00Z")), "2027-01-01");
});
test("routine writes require an identity, current revision and date", () => {
  const id = "9a1c4c31-cf3f-4a72-ae20-711e4001f10a";
  assert.equal(createRoutineSchema.parse({ id, title: "  Stretch  " }).title, "Stretch");
  assert.equal(createRoutineSchema.safeParse({ id, title: "  " }).success, false);
  assert.equal(changeRoutineSchema.safeParse({ id, revision: 1, date: "2026-10-31", completed: false }).success, true);
  assert.equal(changeRoutineSchema.safeParse({ id, revision: 0, date: "2026-10-31", completed: true }).success, false);
  assert.equal(changeRoutineSchema.safeParse({ id, revision: 1, completed: true }).success, false);
  assert.equal(removeRoutineSchema.safeParse({ id, revision: 1, owner: "other" }).success, false);
});

test("completion applies only to its saved day; definitions persist", () => {
  assert.equal(isRoutineCompleted("2026-10-30", "2026-10-30"), true);
  assert.equal(isRoutineCompleted("2026-10-30", "2026-10-31"), false);
  assert.equal(isRoutineCompleted(null, "2026-10-31"), false);
});

test("history range crosses month and year boundaries without local timezone drift", () => {
  const days = historyDates("2027-01-02");
  assert.equal(days.length, 30); assert.equal(days[0], "2026-12-04"); assert.equal(days.at(-1), "2027-01-02");
});

test("an open tab refreshes once at midnight and refreshes on resume", () => {
  const events = []; const clock = createRoutineClock("2026-10-30", (date) => events.push(date), () => events.push("refresh"));
  clock.tick("2026-10-30"); assert.deepEqual(events, []);
  clock.tick("2026-10-31"); clock.tick("2026-10-31"); assert.deepEqual(events, ["2026-10-31", "refresh"]);
  clock.resume("2026-11-01"); assert.deepEqual(events.slice(-2), ["2026-11-01", "refresh"]);
  clock.resume("2026-11-01"); assert.equal(events.at(-1), "refresh"); assert.equal(events.length, 5);
});
