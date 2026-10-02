import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  status: text("status").notNull().default("inbox"),
  labels: text("labels").notNull().default("[]"),
  dueDate: text("due_date"),
  archived: integer("archived").notNull().default(0),
  revision: integer("revision").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("idx_tasks_owner_archived").on(table.ownerId, table.archived)]);


export const calendarSnapshots = sqliteTable("calendar_snapshots", {
  ownerId: text("owner_id").primaryKey(),
  revision: integer("revision").notNull().default(1),
  payload: text("payload").notNull(),
  stale: integer("stale").notNull().default(0),
  staleReason: text("stale_reason"),
  updatedAt: text("updated_at").notNull(),
});

export const taskCalendarLinks = sqliteTable("task_calendar_links", {
  ownerId: text("owner_id").notNull(),
  taskId: text("task_id").notNull(),
  revision: integer("revision").notNull().default(1),
  payload: text("payload").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [primaryKey({ columns: [table.ownerId, table.taskId] })]);
