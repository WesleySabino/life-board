"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Check, MoreHorizontal, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routineDate, createRoutineClock, type Routine, type RoutineList } from "@/lib/routine-model";

async function request<T>(method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch("/api/routines", { method, cache: "no-store", headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) }); }
  catch { throw new Error("Couldn't reach your routine. Check your connection and refresh before retrying."); }
  const data = await response.json().catch(() => null) as ({ message?: string } & T) | null;
  if (!data) throw new Error("No confirmation received. Refresh before retrying.");
  if (!response.ok) throw new Error(data.message || "Couldn't update your routine.");
  return data as T;
}
export default function RoutinePanel() {
  const [list, setList] = useState<RoutineList | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [managing, setManaging] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const addInput = useRef<HTMLInputElement>(null);
  const addTrigger = useRef<HTMLButtonElement>(null);
  const wasAdding = useRef(false);
  const [clockDate, setClockDate] = useState(() => routineDate());
  const initialClockDate = useRef(clockDate);
  const seq = useRef(0);
  const createId = useRef<string | null>(null);
  const load = useCallback(async () => {
    const n = ++seq.current;
    try { const data = await request<RoutineList>(); if (n === seq.current) { setList(data); setError(""); } }
    catch (e) { if (n === seq.current) setError((e as Error).message); }
  }, []);
  useEffect(() => {
    // Network results update state asynchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const monitor = createRoutineClock(initialClockDate.current, setClockDate, () => { void load(); });
    const tick = () => monitor.tick(routineDate());
    const refresh = () => { if (document.visibilityState === "visible") monitor.resume(routineDate()); };
    const clock = setInterval(tick, 1000);
    const sync = setInterval(refresh, 30000);
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { ++seq.current; clearInterval(clock); clearInterval(sync); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load]);
  useEffect(() => {
    if (showAdd) {
      if (!wasAdding.current) addInput.current?.focus();
      wasAdding.current = true;
    } else if (wasAdding.current && !busy) {
      addTrigger.current?.focus();
      wasAdding.current = false;
    }
  }, [showAdd, busy]);
  const current = !!list && list.date === clockDate;
  async function add(e: FormEvent) {
    e.preventDefault(); if (busy || !title.trim()) return;
    setBusy(true); setError(""); ++seq.current;
    const id = createId.current ?? crypto.randomUUID(); createId.current = id;
    try { await request("POST", { id, title: title.trim() }); createId.current = null; setTitle(""); setShowAdd(false); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  }
  async function update(item: Routine, remove = false) {
    if (busy || !list || !current) return;
    setBusy(true); setError(""); ++seq.current;
    try { await request(remove ? "DELETE" : "PATCH", remove ? { id: item.id, revision: item.revision } : { id: item.id, revision: item.revision, date: list.date, completed: !item.completed }); setRemoving(null); await load(); }
    catch (e) { await load(); setError((e as Error).message); }
    finally { setBusy(false); }
  }
  const done = list?.routines.filter((r) => r.completed).length ?? 0;
  const total = list?.routines.length ?? 0;
  const progress = total ? done / total * 100 : 0;
  const history = list?.history ?? [];
  const maxCount = Math.max(1, ...history.map((day) => day.count));
  const historyDate = (date?: string) => date ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)) : "";
  return <section className="routine-panel" aria-labelledby="routine-heading">
    <div className="routine-heading">
      <div className="routine-heading-copy"><h2 id="routine-heading">Daily routine</h2><p>Resets daily · Paraguay</p></div>
      <div className="routine-actions">
        <Button ref={addTrigger} className="routine-add-trigger" aria-expanded={showAdd} aria-controls="routine-add-form" onClick={() => setShowAdd((open) => !open)} disabled={busy}><Plus size={17} aria-hidden="true" />Add routine</Button>
        <Button variant="ghost" size="icon" aria-label="Refresh routine" onClick={() => void load()} disabled={busy}><RefreshCw size={17} aria-hidden="true" /></Button>
        <Button variant={managing ? "secondary" : "ghost"} size={managing ? "sm" : "icon"} aria-label={managing ? "Finish managing routines" : "Manage routines"} aria-pressed={managing} onClick={() => { setManaging((value) => !value); setRemoving(null); }} disabled={busy || !current || !total}>{managing ? <><Check size={17} aria-hidden="true" />Done</> : <MoreHorizontal size={19} aria-hidden="true" />}</Button>
      </div>
    </div>
    {error && <p className="routine-error" role="alert">{error} <button type="button" onClick={() => void load()}>Refresh</button></p>}
    <div className="routine-content">
      <div className="routine-main">
        {current ? <div className="routine-progress-row">
          <span className="routine-progress-count" role="status">{done} of {total} complete</span>
          <div className="routine-progress" role="progressbar" aria-label="Daily routine progress" aria-valuemin={0} aria-valuemax={Math.max(1, total)} aria-valuenow={done} aria-valuetext={`${done} of ${total} complete`}><span style={{ width: `${progress}%` }} /></div>
          <span className="routine-progress-percent" aria-hidden="true">{Math.round(progress)}%</span>
        </div> : <p className="routine-loading" role="status">Refreshing today’s checklist…</p>}
        {showAdd && <form id="routine-add-form" className="routine-add" onSubmit={add} onKeyDown={(event) => { if (event.key === "Escape" && !busy) { event.preventDefault(); setShowAdd(false); } }}>
          <label className="sr-only" htmlFor="routine-title">New routine task</label><input ref={addInput} id="routine-title" value={title} maxLength={200} placeholder="What do you do every day?" onChange={(e) => { setTitle(e.target.value); createId.current = null; }} disabled={busy} />
          <Button type="submit" disabled={busy || !title.trim()}>{busy ? "Adding…" : "Add"}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => setShowAdd(false)}>Cancel</Button>
        </form>}
        {managing && <p className="routine-manage-note">Choose a routine to remove. Its completion history is kept.</p>}
        {list && current && (total ? <ul className="routine-list">{list.routines.map((item) => <li key={item.id} className={`routine-tile${item.completed ? " is-complete" : ""}`}>
          <label><input type="checkbox" checked={item.completed} disabled={busy} onChange={() => void update(item)} /><span className="routine-checkbox" aria-hidden="true">{item.completed && <Check size={18} strokeWidth={2.5} />}</span><span className={`routine-title${item.completed ? " routine-done" : ""}`}>{item.title}</span></label>
          {managing && <div className="routine-tile-actions">{removing === item.id ? <div className="routine-confirm"><span>Remove?</span><button type="button" disabled={busy} onClick={() => void update(item, true)}>Yes, remove</button><button type="button" disabled={busy} onClick={() => setRemoving(null)}>Cancel</button></div> : <button type="button" className="routine-remove" aria-label={`Remove ${item.title} from routine`} disabled={busy} onClick={() => setRemoving(item.id)}><Trash2 size={15} aria-hidden="true" />Remove</button>}</div>}
        </li>)}</ul> : <p className="routine-empty">No routine tasks yet. Add something you do every day.</p>)}
      </div>
      {current && <figure className="routine-chart">
        <figcaption><strong>Last 30 days</strong><span>Daily completions</span></figcaption>
        <div className="routine-chart-plot" aria-hidden="true"><div className="routine-y-axis"><span>{maxCount}</span><span>0</span></div><div className="routine-plot-main"><div className="routine-bars">{history.map((day) => <div className="routine-bar-track" key={day.date} title={`${day.date}: ${day.count} completed`}><span className="routine-bar" style={{ height: `${day.count / maxCount * 100}%` }} /></div>)}</div><div className="routine-axis-dates"><span>{historyDate(history[0]?.date)}</span><span>{historyDate(history[14]?.date)}</span><span>{historyDate(history.at(-1)?.date)}</span></div></div></div>
        <p className="routine-chart-note">Yesterday {history.at(-2)?.count ?? 0} · Today {history.at(-1)?.count ?? 0}</p>
        <details className="routine-chart-details"><summary>View counts</summary><table><caption>Recorded daily completions · Paraguay time. Removing a routine keeps its history.</caption><thead><tr><th scope="col">Date</th><th scope="col">Completed</th></tr></thead><tbody>{history.map((day) => <tr key={day.date}><th scope="row">{day.date}</th><td>{day.count}</td></tr>)}</tbody></table></details>
      </figure>}
    </div>
  </section>;
}
