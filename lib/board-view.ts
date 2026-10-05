import { statuses, type Status, type Task } from "./task-model";

export const COLUMN_PREVIEW_LIMIT = 5;

export function parseColumn(value: unknown): Status | undefined {
  return typeof value === "string" && (statuses as readonly string[]).includes(value) ? value as Status : undefined;
}

export function columnTasks(tasks: readonly Task[], status: Status): Task[] {
  const cards = tasks.filter((task) => task.status === status);
  // An edit is activity, not proof of completion. There is no completedAt field.
  // Keep all other columns in their existing board order.
  return status === "done" ? cards.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)) : cards;
}

export function previewTasks(tasks: readonly Task[], status: Status): Task[] {
  return columnTasks(tasks, status).slice(0, COLUMN_PREVIEW_LIMIT);
}

export function columnHref(status: Status, archived = false): string {
  return `/columns/${status}${archived ? "?archived=true" : ""}`;
}

export function boardHref(status?: Status, archived = false): string {
  const params = new URLSearchParams();
  if (status) params.set("column", status);
  if (archived) params.set("archived", "true");
  return `/${params.size ? `?${params}` : ""}`;
}
