import { z } from "zod";

export const statuses = ["inbox", "next", "doing", "waiting", "done"] as const;
export type Status = typeof statuses[number];
export const statusNames: Record<Status, string> = { inbox: "Inbox", next: "Next", doing: "Doing", waiting: "Waiting", done: "Done" };
export type Task = { id: string; title: string; description: string; status: Status; labels: string[]; dueDate: string | null; archived: boolean; revision: number; createdAt: string; updatedAt: string };
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => {
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Use a valid calendar date").nullable();
const fields = {
  title: z.string().trim().min(1, "Add a title").max(200),
  description: z.string().max(6000),
  status: z.enum(statuses),
  labels: z.array(z.string().trim().min(1).max(32)).max(8).transform((v) => [...new Set(v)]),
  dueDate: date,
};
export const createTaskSchema = z.object({ id: z.string().uuid(), ...fields }).strict();
export const updateTaskSchema = z.object({
  id: z.string().uuid(), revision: z.number().int().positive(),
  title: fields.title.optional(), description: fields.description.optional(),
  status: fields.status.optional(), labels: fields.labels.optional(), dueDate: fields.dueDate.optional(),
  archived: z.boolean().optional(),
}).strict().refine((v) => Object.keys(v).some((k) => k !== "id" && k !== "revision"), "Provide a field to update");
