"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { CalendarContext } from "@/lib/calendar-model";
type Operation = "replace_snapshot" | "mark_stale" | "save_link";
const names: Record<Operation, string> = { replace_snapshot: "Replace calendar snapshot", mark_stale: "Mark a failed refresh", save_link: "Record a task-event link" };
const help: Record<Operation, string> = {
  replace_snapshot: "Import the complete verified result from Main and Tasks. Use expectedRevision 0 for a first import, or the saved snapshot revision for a refresh.",
  mark_stale: "Keep the last successful snapshot and record that its requested refresh failed. Include its current expectedRevision and a short message.",
  save_link: "Record an event already verified in Google Calendar after an explicit task-level request. Use expectedLinkRevision 0 for a new link, or the saved link revision for an update.",
};
async function readContext(): Promise<CalendarContext> {
  const response = await fetch("/api/calendar", { cache: "no-store" });
  const data = await response.json() as CalendarContext & { message?: string };
  if (!response.ok) throw new Error(data.message ?? "Calendar context is temporarily unavailable.");
  return data;
}
export default function CalendarMaintenance() {
  const [operation, setOperation] = useState<Operation>("replace_snapshot");
  const [payload, setPayload] = useState("");
  const [context, setContext] = useState<CalendarContext | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    try { setContext(await readContext()); setError(""); }
    catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  async function save(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setResult("");
    try {
      let data: unknown;
      try { data = JSON.parse(payload); } catch { throw new Error("Enter a valid JSON object. Your draft is kept."); }
      const response = await fetch("/api/calendar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation, data }) });
      const saved = await response.json() as { message?: string };
      if (!response.ok) throw new Error(saved.message ?? "The change was not confirmed. Read the current context before trying again.");
      // Read the durable state through a separate authenticated request before reporting success.
      setContext(await readContext()); setResult(saved.message ?? "Calendar data saved and verified");
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  return <main className="calendar-maintenance"><Link className="maintenance-back" href="/">Back to Life Board</Link><h1>Calendar maintenance</h1><p className="maintenance-intro">Save a verified calendar snapshot or task-event link in your private board. This page doesn&apos;t create, update or delete Google Calendar events.</p>
    <section className="maintenance-context" aria-labelledby="context-heading"><div className="maintenance-context-heading"><h2 id="context-heading">Saved context</h2><Button type="button" variant="outline" disabled={busy || loading} onClick={() => void refresh()}>Read current context</Button></div>{loading ? <p role="status">Reading…</p> : context && <><p>Snapshot revision: <strong id="snapshot-revision">{context.snapshot?.revision ?? 0}</strong> · {context.snapshot?.events.length ?? 0} saved events · {context.links.length} task-event links</p><p>{context.snapshot ? `${context.snapshot.calendars.map((c) => c.name).join(" + ")} · ${context.snapshot.stale ? "Stale" : "Saved"}` : "No calendar snapshot imported yet"}</p><details><summary>View saved calendar data</summary><pre id="calendar-context" className="maintenance-json">{JSON.stringify(context, null, 2)}</pre></details></>}</section>
    <form className="maintenance-form" onSubmit={save}><div className="field"><label id="maintenance-operation-label">Operation</label><Select value={operation} disabled={busy} onValueChange={(value) => { setOperation(value as Operation); setError(""); setResult(""); }}><SelectTrigger className="form-select" aria-labelledby="maintenance-operation-label"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(names).map(([value, name]) => <SelectItem key={value} value={value}>{name}</SelectItem>)}</SelectContent></Select></div><p id="maintenance-help" className="field-help">{help[operation]}</p><div className="field"><label htmlFor="calendar-payload">Verified data (JSON)</label><Textarea id="calendar-payload" className="maintenance-payload" value={payload} onChange={(event) => setPayload(event.target.value)} required disabled={busy} aria-describedby="maintenance-help" spellCheck={false} placeholder="Paste the validated snapshot or link fields" /></div>{error && <p className="save-error" role="alert">{error}</p>}{result && <p id="maintenance-result" className="maintenance-success" role="status">{result}</p>}<div className="maintenance-submit"><Button type="submit" disabled={busy || loading}>{busy ? "Saving and verifying…" : names[operation]}</Button></div></form>
  </main>;
}
