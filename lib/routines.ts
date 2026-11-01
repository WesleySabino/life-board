import { getRawDb } from "@/db/raw";
import { TaskError } from "@/lib/tasks";
import { changeRoutineSchema, createRoutineSchema, removeRoutineSchema, routineDate, isRoutineCompleted, historyDates, ROUTINE_TIME_ZONE, type Routine, type RoutineList } from "@/lib/routine-model";

type Row = { id: string; title: string; completed_date: string | null; revision: number; created_at: string; updated_at: string };
function toRoutine(row: Row, date: string): Routine { return { id: row.id, title: row.title, completed: isRoutineCompleted(row.completed_date, date), revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at }; }
async function get(owner: string, id: string, date: string): Promise<Routine | null> {
  const row = await getRawDb().prepare("SELECT * FROM routines WHERE owner_id = ? AND id = ?").bind(owner, id).first<Row>();
  return row ? toRoutine(row, date) : null;
}
export async function listRoutines(owner: string): Promise<RoutineList> {
  const date = routineDate();
  const rows = await getRawDb().prepare("SELECT * FROM routines WHERE owner_id = ? ORDER BY created_at, id LIMIT 1001").bind(owner).all<Row>();
  if (rows.results.length > 1000) throw new TaskError(422, "The routine list exceeds 1,000 items.");
  const dates = historyDates(date);
  const history = await getRawDb().prepare("SELECT date, COUNT(*) AS count FROM routine_completions WHERE owner_id = ? AND date >= ? AND date <= ? GROUP BY date ORDER BY date").bind(owner, dates[0], date).all<{ date: string; count: number }>();
  const counts = new Map(history.results.map((row) => [row.date, row.count]));
  return { date, timeZone: ROUTINE_TIME_ZONE, routines: rows.results.map((row) => toRoutine(row, date)), history: dates.map((day) => ({ date: day, count: counts.get(day) ?? 0 })) };
}
export async function createRoutine(owner: string, input: unknown): Promise<Routine> {
  const v = createRoutineSchema.parse(input); const now = new Date().toISOString();
  await getRawDb().prepare("INSERT INTO routines (id, owner_id, title, completed_date, revision, created_at, updated_at) VALUES (?, ?, ?, NULL, 1, ?, ?) ON CONFLICT(id) DO NOTHING").bind(v.id, owner, v.title, now, now).run();
  const saved = await get(owner, v.id, routineDate());
  if (!saved || saved.title !== v.title) throw new TaskError(409, "Routine ID already exists. Use a new ID.");
  return saved;
}
export async function changeRoutine(owner: string, input: unknown): Promise<Routine> {
  const v = changeRoutineSchema.parse(input); const date = routineDate();
  if (v.date !== date) throw new TaskError(409, "The day changed. Refresh today's routine before trying again.");
  const result = await getRawDb().prepare("UPDATE routines SET completed_date = CASE WHEN ? = 1 THEN ? WHEN completed_date = ? THEN NULL ELSE completed_date END, revision = revision + 1, updated_at = ? WHERE owner_id = ? AND id = ? AND revision = ?").bind(v.completed ? 1 : 0, date, date, new Date().toISOString(), owner, v.id, v.revision).run();
  if (!result.meta.changes) throw new TaskError(409, "This routine changed or was removed. Refresh and try again.");
  return (await get(owner, v.id, routineDate()))!;
}
export async function removeRoutine(owner: string, input: unknown): Promise<void> {
  const v = removeRoutineSchema.parse(input);
  const result = await getRawDb().prepare("DELETE FROM routines WHERE owner_id = ? AND id = ? AND revision = ?").bind(owner, v.id, v.revision).run();
  if (!result.meta.changes) throw new TaskError(409, "This routine changed or was removed. Refresh and try again.");
}
