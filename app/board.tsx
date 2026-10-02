"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Archive, CalendarDays, Check, GripVertical, LayoutPanelLeft, Plus, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Toaster } from "@/components/ui/sonner";
import CalendarPanel from "./calendar-panel";
import { type CalendarContext } from "@/lib/calendar-model";
import { createTaskSchema, updateTaskSchema, statuses, statusNames, type Status, type Task } from "@/lib/task-model";

type Draft = { id: string; title: string; description: string; status: Status; labels: string; dueDate: string };
const emptyDraft = (status: Status = "inbox"): Draft => ({ id: crypto.randomUUID(), title: "", description: "", status, labels: "", dueDate: "" });
function fromTask(t: Task): Draft { return { id: t.id, title: t.title, description: t.description, status: t.status, labels: t.labels.join(", "), dueDate: t.dueDate ?? "" }; }
function today() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function readableDate(value: string) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: Number(value.slice(0,4)) === new Date().getFullYear() ? undefined : "numeric" }); }
async function request<T extends { message?: string } = { message?: string; tasks: Task[]; task: Task }>(path: string, options?: RequestInit) {
  let response: Response;
  try { response = await fetch(path, { ...options, cache: "no-store", headers: { "Content-Type": "application/json", ...options?.headers } }); }
  catch { throw new Error("Couldn't reach your board. Your draft is kept. Check your connection and retry."); }
  let data: T;
  try { data = await response.json() as typeof data; } catch { throw new Error("Your board didn't return a confirmation. Refresh to check the latest state before trying again."); }
  if (!response.ok) throw new Error(data.message ?? "Your board is temporarily unavailable.");
  return data;
}

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [calendar, setCalendar] = useState<CalendarContext>({ snapshot: null, links: [] });
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const calendarSequence = useRef(0);
  const [archived, setArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [checked, setChecked] = useState("");
  const [selected, setSelected] = useState<Status>("inbox");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dropOn, setDropOn] = useState<Status | null>(null);
  const loadSequence = useRef(0);
  const taskRef = useRef(tasks); taskRef.current = tasks;
  const archivedRef = useRef(archived); archivedRef.current = archived;
  const reloadRef = useRef<() => Promise<void>>(async () => {});

  const loadCalendar = useCallback(async () => {
    const sequence = ++calendarSequence.current;
    try { const data = await request<CalendarContext & { message?: string }>("/api/calendar"); if (sequence === calendarSequence.current) { setCalendar(data); setCalendarError(""); } }
    catch (e) { if (sequence === calendarSequence.current) setCalendarError((e as Error).message); }
    finally { if (sequence === calendarSequence.current) setCalendarLoading(false); }
  }, []);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    try {
      const data = await request(`/api/tasks?archived=${archived}`);
      if (sequence !== loadSequence.current) return;
      setTasks(data.tasks); setError(""); setChecked(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    } catch (e) { if (sequence === loadSequence.current) setError((e as Error).message); }
    finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [archived]);
  reloadRef.current = load;
  useEffect(() => {
    setLoading(true); setTasks([]); void load(); void loadCalendar();
    const interval = setInterval(() => { if (document.visibilityState === "visible") { void load(); void loadCalendar(); } }, 30000);
    const refresh = () => { if (document.visibilityState === "visible") { void load(); void loadCalendar(); } };
    window.addEventListener("focus", refresh); window.addEventListener("online", refresh); document.addEventListener("visibilitychange", refresh);
    return () => { ++loadSequence.current; ++calendarSequence.current; clearInterval(interval); window.removeEventListener("focus", refresh); window.removeEventListener("online", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load, loadCalendar]);

  const apply = useCallback((t: Task) => {
    ++loadSequence.current;
    setTasks((current) => t.archived !== archivedRef.current ? current.filter((v) => v.id !== t.id) : current.some((v) => v.id === t.id) ? current.map((v) => v.id === t.id ? t : v) : [...current, t]);
    setChecked(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }, []);
  const mutate = useCallback(async (input: unknown, update: boolean) => {
    const valid = update ? updateTaskSchema.parse(input) : createTaskSchema.parse(input);
    const data = await request("/api/tasks", { method: update ? "PATCH" : "POST", body: JSON.stringify(valid) });
    apply(data.task); return data.task as Task;
  }, [apply]);
  function add(status: Status = "inbox") { setEditing(null); setDraft(emptyDraft(status)); setSaveError(""); setOpen(true); }
  function edit(t: Task) { setEditing(t); setDraft(fromTask(t)); setSaveError(""); setOpen(true); }
  async function save(e: FormEvent) {
    e.preventDefault(); if (!draft || saving) return;
    setSaving(true); setSaveError("");
    const fields = { id: draft.id, title: draft.title, description: draft.description, status: draft.status, labels: draft.labels.split(",").map((v) => v.trim()).filter(Boolean), dueDate: draft.dueDate || null };
    try {
      await mutate(editing ? { ...fields, revision: editing.revision } : fields, Boolean(editing));
      setOpen(false); toast.success(editing ? "Task saved" : "Task added");
    } catch (e) {
      const message = e && typeof e === "object" && "issues" in e ? (e as { issues: { message: string }[] }).issues[0].message : (e as Error).message;
      setSaveError(message);
    } finally { setSaving(false); }
  }
  async function move(t: Task, status: Status) {
    if (t.status === status || busyId) return;
    setBusyId(t.id);
    try { await mutate({ id: t.id, revision: t.revision, status }, true); setSelected(status); toast.success(`Moved to ${statusNames[status]}`); }
    catch (e) { toast.error((e as Error).message); void load(); }
    finally { setBusyId(null); }
  }
  async function archiveTask(t: Task) {
    if (saving || busyId) return;
    setBusyId(t.id);
    try {
      const saved = await mutate({ id: t.id, revision: t.revision, archived: !t.archived }, true);
      setOpen(false);
      toast.success(t.archived ? "Task restored" : "Task archived", { action: { label: "Undo", onClick: async () => { try { await mutate({ id: saved.id, revision: saved.revision, archived: t.archived }, true); toast.success("Undone"); } catch (e) { toast.error((e as Error).message); } } } });
    } catch (e) { setSaveError((e as Error).message); toast.error((e as Error).message); }
    finally { setBusyId(null); }
  }

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options: { signal: AbortSignal }) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => { try { Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => {}); } catch {} };
    register({ name: "read_life_board", title: "Read Life Board", description: "Read tasks currently shown on the signed-in user's board. No changes.", inputSchema: { type: "object", properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async (input: unknown) => { if (!input || typeof input !== "object" || Object.keys(input).length) throw new Error("Use an empty object"); const data = await request(`/api/tasks?archived=${archivedRef.current}`); setTasks(data.tasks); await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); return { archived: archivedRef.current, tasks: data.tasks }; } });
    register({ name: "create_life_task", title: "Create task", description: "Create a task and update Life Board. Only for user-requested creation.", inputSchema: { type: "object", properties: { id: { type: "string", format: "uuid" }, title: { type: "string" }, description: { type: "string" }, status: { type: "string", enum: statuses }, labels: { type: "array", items: { type: "string" } }, dueDate: { type: ["string", "null"] } }, required: ["id", "title", "description", "status", "labels", "dueDate"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async (input: unknown) => { const t = await mutate(input, false); await reloadRef.current(); return { task: t }; } });
    register({ name: "update_life_task", title: "Update task", description: "Edit, move, archive or restore a task using its current revision. Archive is recoverable. Only for user-requested updates.", inputSchema: { type: "object", properties: { id: { type: "string", format: "uuid" }, revision: { type: "integer" }, title: { type: "string" }, description: { type: "string" }, status: { type: "string", enum: statuses }, labels: { type: "array", items: { type: "string" } }, dueDate: { type: ["string", "null"] }, archived: { type: "boolean" } }, required: ["id", "revision"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: true }, execute: async (input: unknown) => { const t = await mutate(input, true); await reloadRef.current(); return { task: t }; } });
    return () => lifecycle.abort();
  }, [mutate]);

  const overdue = tasks.filter((t) => t.dueDate && t.dueDate < today() && t.status !== "done").length;
  function lane(status: Status) {
    const cards = tasks.filter((t) => t.status === status);
    return <section key={status} className={`lane lane-${status} ${selected === status ? "selected" : ""} ${dropOn === status ? "drop-on" : ""}`} id={`lane-${status}`} aria-labelledby={`heading-${status}`} onDragOver={(e) => { if (!archived && !busyId) { e.preventDefault(); setDropOn(status); } }} onDragLeave={() => setDropOn(null)} onDrop={(e) => { e.preventDefault(); setDropOn(null); const t = tasks.find((v) => v.id === e.dataTransfer.getData("text/plain")); if (t) void move(t, status); }}>
      <div className="lane-heading"><h2 id={`heading-${status}`}>{statusNames[status]} <span className="count">{cards.length}</span></h2>{!archived && <Button variant="ghost" size="icon" className="lane-add" aria-label={`Add task to ${statusNames[status]}`} onClick={() => add(status)}><Plus /></Button>}</div>
      <div className="lane-content">
        {loading ? <><Skeleton className="card-skeleton" /><Skeleton className="card-skeleton short" /></> : cards.map((t) => <article key={t.id} className={`task-card ${busyId === t.id ? "card-busy" : ""}`} draggable={!archived && !busyId} onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); e.dataTransfer.effectAllowed = "move"; }} onDragEnd={() => setDropOn(null)}>
          <button className="card-body" onClick={() => edit(t)} aria-label={`Edit ${t.title}`}><span className="card-title">{t.title}</span>{t.description && <span className="card-description">{t.description}</span>}{t.labels.length > 0 && <span className="labels">{t.labels.map((label) => <span className="label-tag" key={label}>{label}</span>)}</span>}{t.dueDate && <span className={`due-date ${t.dueDate < today() && t.status !== "done" ? "overdue" : ""}`}><CalendarDays aria-hidden="true" size={15} />{readableDate(t.dueDate)}{t.dueDate < today() && t.status !== "done" ? " · Overdue" : t.dueDate === today() ? " · Today" : ""}</span>}</button>
          {calendar.links.find((v) => v.taskId === t.id) && (() => { const link = calendar.links.find((v) => v.taskId === t.id)!; const changed = link.syncedTitle !== t.title || link.syncedDueDate !== t.dueDate; return <div className="task-calendar-link">{link.url ? <a href={link.url} target="_blank" rel="noopener noreferrer"><CalendarDays size={14} aria-hidden="true" />Calendar entry</a> : <span>Calendar linked</span>}{changed && <span className="calendar-link-stale">Needs calendar update</span>}</div>; })()}
          <div className="card-footer">{archived ? <Button variant="ghost" className="restore-button" disabled={Boolean(busyId)} onClick={() => void archiveTask(t)}><RotateCcw size={15} />Restore</Button> : <><GripVertical className="grip" aria-hidden="true" size={17} /><Select value={t.status} disabled={Boolean(busyId)} onValueChange={(v) => void move(t, v as Status)}><SelectTrigger className="card-move" aria-label={`Move ${t.title}`}><SelectValue /></SelectTrigger><SelectContent>{statuses.map((v) => <SelectItem key={v} value={v}>{statusNames[v]}</SelectItem>)}</SelectContent></Select></>}</div>
        </article>)}
        {!loading && !cards.length && <Empty className="lane-empty"><EmptyHeader><EmptyDescription>{error ? "Couldn't load tasks" : archived ? "No archived tasks" : status === "inbox" ? "Capture something on your mind" : status === "done" ? "Finished tasks land here" : "Nothing here yet"}</EmptyDescription></EmptyHeader>{!archived && status === "inbox" && !error && <Button variant="outline" onClick={() => add()}>Add your first task</Button>}</Empty>}
      </div>
    </section>;
  }

  return <>
    <header className="app-header"><div className="brand"><span className="brand-mark"><LayoutPanelLeft aria-hidden="true" size={23} /></span><h1>Life Board</h1></div><div className="header-right"><span className="private-note">Private to you</span><Button className="new-task" onClick={() => add(selected)}><Plus size={18} />New task</Button></div></header>
    <main className="workspace"><div className="board-toolbar"><div className="board-meta"><span>{archived ? "Archive" : "Your board"}</span><span className="meta-divider" /> <span className="secondary">{tasks.length} {tasks.length === 1 ? "task" : "tasks"}</span>{overdue > 0 && !archived && <span className="overdue-summary">{overdue} overdue</span>}</div><div className="toolbar-actions"><div className="archive-toggle"><Switch id="archive-view" checked={archived} onCheckedChange={setArchived} /><label htmlFor="archive-view">Archive</label></div><Button variant="ghost" size="icon" aria-label="Refresh board" onClick={() => { void load(); void loadCalendar(); }} disabled={loading}><RefreshCw size={18} /></Button></div></div>
      {error && <div className="error-banner" role="alert"><span>{error}{tasks.length ? " Showing the last loaded tasks." : ""}</span><Button variant="outline" onClick={() => void load()}>Retry</Button><a href="/signin-with-chatgpt?return_to=%2F" target="_top">Sign in</a></div>}
      <Tabs value={selected} onValueChange={(v) => setSelected(v as Status)} className="mobile-tabs"><TabsList aria-label="Board columns" className="mobile-tabs-list">{statuses.map((s) => <TabsTrigger key={s} value={s} aria-controls={`lane-${s}`} className="mobile-tab">{statusNames[s]}<span>{tasks.filter((t) => t.status === s).length}</span></TabsTrigger>)}</TabsList></Tabs>
      <div className="board-grid">{statuses.map(lane)}</div>
      <CalendarPanel context={calendar} loading={calendarLoading} error={calendarError} /><footer className="board-footer"><span>{archived ? "Archived tasks can be restored anytime" : "Move cards by dragging or using the menu on each card"}</span><span role="status" aria-live="polite">{loading ? "Loading…" : error ? "Sync paused" : checked ? `Checked at ${checked}` : ""}</span></footer>
    </main>
    <Dialog open={open} onOpenChange={(v) => { if (!saving && !busyId) setOpen(v); }}><DialogContent className="task-dialog"><DialogHeader><DialogTitle>{editing ? "Edit task" : "New task"}</DialogTitle><DialogDescription>{editing?.archived ? "This task is in your archive" : "Only a title is required"}</DialogDescription></DialogHeader>{draft && <form onSubmit={save} className="task-form"><div className="field"><label htmlFor="task-title">Title</label><input id="task-title" autoFocus required maxLength={200} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="What do you want to get done?" /></div><div className="field"><label htmlFor="task-description">Notes <span>optional</span></label><textarea id="task-description" maxLength={6000} rows={3} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Details, links, or a small next step" /></div><div className="form-row"><div className="field"><label id="task-status-label">Column</label><Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v as Status })}><SelectTrigger className="form-select" aria-labelledby="task-status-label"><SelectValue /></SelectTrigger><SelectContent>{statuses.map((v) => <SelectItem key={v} value={v}>{statusNames[v]}</SelectItem>)}</SelectContent></Select></div><div className="field"><label htmlFor="task-date">Due date <span>optional</span></label><input id="task-date" aria-describedby="calendar-date-help" type="date" min="0001-01-01" max="9999-12-31" value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} /></div></div><div className="field"><label htmlFor="task-labels">Labels <span>optional</span></label><input id="task-labels" value={draft.labels} onChange={(e) => setDraft({ ...draft, labels: e.target.value })} placeholder="Work, Home, Health" aria-describedby="label-help" /><p id="calendar-date-help" className="field-help">Ask your dot to add a task&apos;s due date to Tasks. Calendar changes happen only when requested.</p><p id="label-help" className="field-help">Separate with commas · up to 8 labels</p></div>{saveError && <p role="alert" className="save-error">{saveError}</p>}<div className="form-actions">{editing && <Button type="button" variant="ghost" className="archive-action" disabled={saving || Boolean(busyId)} onClick={() => void archiveTask(editing)}>{editing.archived ? <RotateCcw size={17} /> : <Archive size={17} />}{editing.archived ? "Restore" : "Archive"}</Button>}<div className="save-actions"><Button type="button" variant="outline" disabled={saving || Boolean(busyId)} onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={saving || Boolean(busyId)}>{saving ? "Saving…" : editing ? "Save changes" : "Add task"}{!saving && <Check size={16} />}</Button></div></div></form>}</DialogContent></Dialog>
    <Toaster richColors position="bottom-right" />
  </>;
}
