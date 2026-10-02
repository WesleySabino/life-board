import { z } from "zod";
const id = z.string().min(1).max(256);
export const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((v) => { const d = new Date(`${v}T12:00:00Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; }, "Use a valid calendar date");
const timestamp = z.string().datetime({ offset: true });
const timezone = z.string().min(1).max(80).refine((v) => { try { new Intl.DateTimeFormat("en", { timeZone: v }); return true; } catch { return false; } }, "Use a valid IANA timezone");
const calendarUrl = z.string().url().max(2048).refine((v) => { try { const u = new URL(v); return u.protocol === "https:" && (u.hostname === "calendar.google.com" || (u.hostname === "www.google.com" && u.pathname.startsWith("/calendar/"))); } catch { return false; } }, "Use a Google Calendar event link").nullable();
export const calendarEventSchema = z.object({
  id, calendarId: id, title: z.string().max(500), allDay: z.boolean(), start: z.string().max(40), end: z.string().max(40), url: calendarUrl,
}).strict().superRefine((v, ctx) => {
  const schema = v.allDay ? calendarDate : timestamp;
  if (!schema.safeParse(v.start).success || !schema.safeParse(v.end).success) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Check event date boundaries" });
  if (v.end <= v.start && v.allDay || !v.allDay && Date.parse(v.end) <= Date.parse(v.start)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Event end must follow its start" });
});
export const replaceCalendarSchema = z.object({
  expectedRevision: z.number().int().min(0), complete: z.literal(true),
  calendars: z.array(z.object({ id, name: z.string().min(1).max(100) }).strict()).min(1).max(2),
  writeCalendarId: id,
  windowStart: timestamp, windowEnd: timestamp, timezone, sourceCheckedAt: timestamp,
  events: z.array(calendarEventSchema).max(200),
}).strict().superRefine((v, ctx) => {
  if (!timestamp.safeParse(v.windowStart).success || !timestamp.safeParse(v.windowEnd).success || !timezone.safeParse(v.timezone).success) return;
  const localParts = (value: string) => {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone: v.timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
    const get = (name: string) => parts.find((p) => p.type === name)?.value ?? "00";
    return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}:${get("second")}` };
  };
  const from = localParts(v.windowStart), to = localParts(v.windowEnd);
  const days = (Date.parse(to.date + "T12:00:00Z") - Date.parse(from.date + "T12:00:00Z")) / 86400000;
  if (days < 0 || days > 14 || days === 14 && to.time > from.time) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use no more than 14 local calendar days" });
  const elapsed = Date.parse(v.windowEnd) - Date.parse(v.windowStart);
  if (elapsed <= 0 || elapsed > 14 * 86400000 + 7200000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Use a bounded window of at most 14 days (allowing daylight-saving changes)" });
  if (Date.parse(v.sourceCheckedAt) > Date.now() + 300000) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Source check time cannot be in the future" });
  const selected = new Set(v.calendars.map((c) => c.id));
  if (selected.size !== v.calendars.length || !selected.has(v.writeCalendarId)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Calendar selection must be unique and include the task destination" });
  const eventKeys = new Set<string>();
  for (const e of v.events) {
    const key = JSON.stringify([e.calendarId, e.id]);
    if (!selected.has(e.calendarId) || eventKeys.has(key)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Events must be unique and belong to a selected calendar" });
    const overlaps = e.allDay ? e.end > from.date && (to.time === "00:00:00" ? e.start < to.date : e.start <= to.date) : Date.parse(e.end) > Date.parse(v.windowStart) && Date.parse(e.start) < Date.parse(v.windowEnd);
    if (!overlaps) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Every event must overlap the snapshot window" });
    eventKeys.add(key);
  }
});
export const staleCalendarSchema = z.object({ expectedRevision: z.number().int().positive(), message: z.string().trim().min(1).max(300) }).strict();
export const calendarLinkSchema = z.object({
  taskId: z.string().uuid(), expectedLinkRevision: z.number().int().min(0), calendarId: id, eventId: id, url: calendarUrl,
  sourceTaskRevision: z.number().int().positive(), syncedTitle: z.string().trim().min(1).max(200), syncedDueDate: calendarDate,
  startDate: calendarDate, endDate: calendarDate,
}).strict().superRefine((v, ctx) => {
  if (!calendarDate.safeParse(v.startDate).success || !calendarDate.safeParse(v.endDate).success) return;
  const next = new Date(`${v.startDate}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1);
  if (v.startDate !== v.syncedDueDate || next.toISOString().slice(0, 10) !== v.endDate) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Task entries must be one all-day date with an exclusive next-day end" });
});
export type CalendarEvent = z.infer<typeof calendarEventSchema>;
export type CalendarSnapshot = Omit<z.infer<typeof replaceCalendarSchema>, "expectedRevision"> & { revision: number; stale: boolean; staleReason: string | null; savedAt: string };
export type CalendarLink = Omit<z.infer<typeof calendarLinkSchema>, "expectedLinkRevision"> & { revision: number; lastVerifiedAt: string };
export type CalendarContext = { snapshot: CalendarSnapshot | null; links: CalendarLink[] };
