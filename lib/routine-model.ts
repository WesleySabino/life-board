import { z } from "zod";

export const ROUTINE_TIME_ZONE = "America/Asuncion";
const formatter = new Intl.DateTimeFormat("en-US", { timeZone: ROUTINE_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" });
export function routineDate(now = new Date()): string {
  const parts = formatter.formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${part("year")}-${part("month")}-${part("day")}`;
}
export function createRoutineClock(initialDate: string, onDateChange: (date: string) => void, refresh: () => void) {
  let observedDate = initialDate;
  const update = (date: string) => { if (date !== observedDate) { observedDate = date; onDateChange(date); return true; } return false; };
  return {
    tick(date: string) { if (update(date)) refresh(); },
    resume(date: string) { update(date); refresh(); },
  };
}
export function isRoutineCompleted(completedDate: string | null, date: string): boolean { return completedDate === date; }
export type Routine = { id: string; title: string; completed: boolean; revision: number; createdAt: string; updatedAt: string };
export type RoutineHistory = { date: string; count: number };
export type RoutineList = { date: string; timeZone: string; routines: Routine[]; history: RoutineHistory[] };
export function historyDates(end: string, days = 30): string[] {
  const date = new Date(end + "T00:00:00Z");
  return Array.from({ length: days }, (_, i) => new Date(date.getTime() - (days - 1 - i) * 86400000).toISOString().slice(0, 10));
}
export const createRoutineSchema = z.object({ id: z.string().uuid(), title: z.string().trim().min(1, "Add a routine task").max(200) }).strict();
export const changeRoutineSchema = z.object({ id: z.string().uuid(), revision: z.number().int().positive(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), completed: z.boolean() }).strict();
export const removeRoutineSchema = z.object({ id: z.string().uuid(), revision: z.number().int().positive() }).strict();
