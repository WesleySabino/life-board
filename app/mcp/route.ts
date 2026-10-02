import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createTask, listTasks, TaskError, updateTask } from "@/lib/tasks";
import { ZodError, z } from "zod";
import { calendarTools } from "@/lib/calendar-mcp";
import { getCalendarContext, replaceCalendarSnapshot, markCalendarStale, saveCalendarLink } from "@/lib/calendar";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const properties = {
  title: { type: "string", minLength: 1, maxLength: 200 }, description: { type: "string", maxLength: 6000 },
  status: { type: "string", enum: ["inbox", "next", "doing", "waiting", "done"] },
  labels: { type: "array", items: { type: "string", minLength: 1, maxLength: 32 }, maxItems: 8 },
  dueDate: { type: ["string", "null"], description: "Due date YYYY-MM-DD, or null to clear. Does not create a calendar event." },
};
const tools = [
  { name: "list_tasks", description: "Read the signed-in user's Life Board tasks. Archived tasks are recoverable and separate from the active board.", inputSchema: { type: "object", properties: { archived: { type: "boolean", default: false } }, additionalProperties: false }, annotations: { readOnlyHint: true, openWorldHint: false } },
  { name: "create_task", description: "Create one task on the signed-in user's Life Board. Use a new UUID as id; retrying the same id does not create duplicates. Use for user-requested tasks or the user's approved ongoing tracking of their assistant's work.", inputSchema: { type: "object", properties: { id: { type: "string", format: "uuid" }, ...properties }, required: ["id", "title", "description", "status", "labels", "dueDate"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false } },
  { name: "update_task", description: "Edit, move, archive or restore one existing task for the signed-in user. Read its current revision first; a stale revision fails without overwriting newer edits. Archive is recoverable. Does not modify a calendar. Use within user-requested updates or approved ongoing tracking of their assistant's verified work progress. For appointments, update completion only when the user reports the outcome; never infer completion from elapsed time.", inputSchema: { type: "object", properties: { id: { type: "string", format: "uuid" }, revision: { type: "integer", minimum: 1 }, ...properties, archived: { type: "boolean" } }, required: ["id", "revision"], additionalProperties: false }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false } },
];
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return Response.json({ message: "Invalid origin" }, { status: 403, headers });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return Response.json({ message: "Use application/json" }, { status: 415, headers });
  if (Number(request.headers.get("content-length") ?? 0) > 256000) return Response.json({ message: "Request too large" }, { status: 413, headers });
  let parsed: unknown;
  try { const raw = await request.text(); if (new TextEncoder().encode(raw).length > 256000) return Response.json({ message: "Request too large" }, { status: 413, headers }); parsed = JSON.parse(raw); } catch { return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers }); }
  const valid = z.object({ jsonrpc: z.literal("2.0"), method: z.string(), id: z.union([z.string(), z.number(), z.null()]).optional(), params: z.record(z.unknown()).optional() }).safeParse(parsed);
  if (!valid.success) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid request" } }, { status: 400, headers });
  const body = valid.data;
  const id = body.id ?? null;
  const requestedProtocol = typeof body.params?.protocolVersion === "string" ? body.params.protocolVersion : "";
  const result = (value: unknown) => Response.json({ jsonrpc: "2.0", id, result: value }, { headers });
  if (body.method.startsWith("notifications/") && body.id === undefined) return new Response(null, { status: 202, headers });
  if (body.method === "initialize") return result({ protocolVersion: ["2024-11-05", "2025-03-26", "2025-06-18"].includes(requestedProtocol) ? requestedProtocol : "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "life-board", version: "1.1.0" } });
  if (body.method === "ping") return result({});
  if (body.method === "tools/list") return result({ tools: [...tools, ...calendarTools] });
  if (body.method !== "tools/call") return Response.json({ jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found" } }, { headers });
  const user = await getChatGPTUser();
  if (!user) return Response.json({ jsonrpc: "2.0", id, error: { code: -32001, message: "Sign in with ChatGPT to access your tasks." } }, { status: 401, headers });
  try {
    const args = body.params?.arguments ?? {};
    let data;
    if (body.params?.name === "list_tasks") { const v = z.object({ archived: z.boolean().optional() }).strict().parse(args); data = { tasks: await listTasks(user.userId, v.archived) }; }
    else if (body.params?.name === "create_task") data = { task: await createTask(user.userId, args) };
    else if (body.params?.name === "update_task") data = { task: await updateTask(user.userId, args) };
    else if (body.params?.name === "get_calendar_context") { z.object({}).strict().parse(args); data = await getCalendarContext(user.userId); }
    else if (body.params?.name === "replace_calendar_snapshot") data = { snapshot: await replaceCalendarSnapshot(user.userId, args) };
    else if (body.params?.name === "mark_calendar_snapshot_stale") data = { snapshot: await markCalendarStale(user.userId, args) };
    else if (body.params?.name === "save_task_calendar_link") data = { link: await saveCalendarLink(user.userId, args) };
    else return Response.json({ jsonrpc: "2.0", id, error: { code: -32602, message: "Unknown tool" } }, { headers });
    return result({ content: [{ type: "text", text: JSON.stringify(data) }], structuredContent: data, isError: false });
  } catch (e) {
    const message = e instanceof ZodError ? e.issues[0]?.message : e instanceof TaskError ? e.message : "Your board is temporarily unavailable. No change has been confirmed.";
    if (!(e instanceof ZodError) && !(e instanceof TaskError)) console.error("MCP task operation failed", e);
    return result({ content: [{ type: "text", text: message }], isError: true });
  }
}
export const GET = () => new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });
