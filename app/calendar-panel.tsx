"use client";
import { CalendarDays } from "lucide-react";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { type CalendarContext, type CalendarEvent } from "@/lib/calendar-model";
function dateLabel(value: string, zone: string, allDay: boolean) {
  return new Date(allDay ? `${value}T12:00:00Z` : value).toLocaleDateString(undefined, { timeZone: allDay ? "UTC" : zone, weekday: "short", month: "short", day: "numeric" });
}
function eventWhen(event: CalendarEvent, zone: string) {
  if (event.allDay) {
    const last = new Date(`${event.end}T12:00:00Z`); last.setUTCDate(last.getUTCDate() - 1);
    const end = last.toISOString().slice(0, 10);
    return `${dateLabel(event.start, zone, true)}${end !== event.start ? ` – ${dateLabel(end, zone, true)}` : ""} · All day`;
  }
  const time = (value: string) => new Date(value).toLocaleTimeString([], { timeZone: zone, hour: "numeric", minute: "2-digit" });
  const startDay = dateLabel(event.start, zone, false), endDay = dateLabel(event.end, zone, false);
  return `${startDay} · ${time(event.start)}–${endDay === startDay ? "" : endDay + " "}${time(event.end)}`;
}
export default function CalendarPanel({ context, loading, error }: { context: CalendarContext; loading: boolean; error: string }) {
  const snapshot = context.snapshot;
  const events = snapshot ? [...snapshot.events].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title)) : [];
  return <section className="calendar-panel" aria-labelledby="calendar-heading"><div className="calendar-panel-header"><div><h2 id="calendar-heading"><CalendarDays size={19} aria-hidden="true" />Calendar</h2><p>{snapshot ? `${snapshot.calendars.map((c) => c.name).join(" + ")} · ${dateLabel(snapshot.windowStart, snapshot.timezone, false)} to ${dateLabel(new Date(Date.parse(snapshot.windowEnd) - 1).toISOString(), snapshot.timezone, false)}` : "Main + Tasks · Upcoming 14 days"}</p></div><div className="calendar-freshness"><span>Ask your dot to refresh</span>{snapshot && <span>Last checked {new Date(snapshot.sourceCheckedAt).toLocaleString([], { timeZone: snapshot.timezone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}</div></div>
    {(error || snapshot?.stale) && <p className="calendar-warning" role="status">{error || snapshot?.staleReason || "The latest calendar refresh didn't finish."}{snapshot ? " Showing the last saved snapshot." : ""}</p>}
    {loading && !snapshot ? <Skeleton className="calendar-skeleton" /> : !snapshot ? <Empty className="calendar-empty"><EmptyHeader><EmptyDescription>Your first calendar snapshot is pending. Ask your dot to bring it here.</EmptyDescription></EmptyHeader></Empty> : !events.length ? <Empty className="calendar-empty"><EmptyHeader><EmptyDescription>No events in this saved window</EmptyDescription></EmptyHeader></Empty> : <div className="calendar-events">{events.map((event) => <article className="calendar-event" key={JSON.stringify([event.calendarId, event.id])}><div className="calendar-event-main">{event.url ? <a href={event.url} target="_blank" rel="noopener noreferrer">{event.title || "Untitled event"}</a> : <span className="calendar-event-title">{event.title || "Untitled event"}</span>}<span className="calendar-event-when">{eventWhen(event, snapshot.timezone)}</span></div><span className="calendar-source">{snapshot.calendars.find((c) => c.id === event.calendarId)?.name ?? "Calendar"}</span></article>)}</div>}
    <p className="calendar-panel-note">Events are kept separate from your tasks. Appointments are marked complete only when you tell your dot.</p>
  </section>;
}
