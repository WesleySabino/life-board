import { getRawDb } from "@/db/raw";
import { createTaskSchema, updateTaskSchema, type Task } from "./task-model";

export class TaskError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
type Row = { id: string; title: string; description: string; status: Task["status"]; labels: string; due_date: string | null; archived: number; revision: number; created_at: string; updated_at: string };
function task(row: Row): Task {
  return { id: row.id, title: row.title, description: row.description, status: row.status, labels: JSON.parse(row.labels), dueDate: row.due_date, archived: Boolean(row.archived), revision: row.revision, createdAt: row.created_at, updatedAt: row.updated_at };
}
export async function listTasks(owner: string, archived = false): Promise<Task[]> {
  const rows = await getRawDb().prepare("SELECT * FROM tasks WHERE owner_id = ? AND archived = ? ORDER BY created_at ASC, id ASC LIMIT 5001").bind(owner, archived ? 1 : 0).all<Row>();
  if (rows.results.length > 5000) throw new TaskError(422, "This view exceeds 5,000 tasks. Archive some tasks to keep the board manageable.");
  return rows.results.map(task);
}
async function getTask(owner: string, id: string): Promise<Task | null> {
  const row = await getRawDb().prepare("SELECT * FROM tasks WHERE id = ? AND owner_id = ?").bind(id, owner).first<Row>();
  return row ? task(row) : null;
}
export async function createTask(owner: string, input: unknown): Promise<Task> {
  const v = createTaskSchema.parse(input);
  const now = new Date().toISOString();
  await getRawDb().prepare("INSERT INTO tasks (id, owner_id, title, description, status, labels, due_date, archived, revision, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?) ON CONFLICT(id) DO NOTHING")
    .bind(v.id, owner, v.title, v.description, v.status, JSON.stringify(v.labels), v.dueDate, now, now).run();
  const saved = await getTask(owner, v.id);
  if (!saved) throw new TaskError(409, "Task ID already exists. Please create a new task.");
  return saved;
}
export async function updateTask(owner: string, input: unknown): Promise<Task> {
  const v = updateTaskSchema.parse(input);
  const current = await getTask(owner, v.id);
  if (!current) throw new TaskError(404, "This task could not be found.");
  const result = await getRawDb().prepare("UPDATE tasks SET title = ?, description = ?, status = ?, labels = ?, due_date = ?, archived = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND owner_id = ? AND revision = ?")
    .bind(v.title ?? current.title, v.description ?? current.description, v.status ?? current.status, JSON.stringify(v.labels ?? current.labels), v.dueDate === undefined ? current.dueDate : v.dueDate, (v.archived ?? current.archived) ? 1 : 0, new Date().toISOString(), v.id, owner, v.revision).run();
  if (!result.meta.changes) throw new TaskError(409, "This task changed on another device. Your draft is kept. Close and reopen it to review the latest version.");
  return (await getTask(owner, v.id))!;
}
