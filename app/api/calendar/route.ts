import { getChatGPTUser } from "@/app/chatgpt-auth";
import { z, ZodError } from "zod";
import { TaskError } from "@/lib/tasks";
import { getCalendarContext, replaceCalendarSnapshot, markCalendarStale, saveCalendarLink } from "@/lib/calendar";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: "Sign in with ChatGPT to read your calendar panel." }, { status: 401, headers });
  try { return Response.json(await getCalendarContext(user.userId), { headers }); }
  catch (e) { console.error("Calendar panel storage failed", e); return Response.json({ message: "Calendar panel is temporarily unavailable. Please try again." }, { status: 503, headers }); }
}

const changeSchema = z.object({ operation: z.enum(["replace_snapshot", "mark_stale", "save_link"]), data: z.unknown() }).strict();
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: "Sign in with ChatGPT to save your calendar data." }, { status: 401, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ message: "Use this Site's calendar maintenance form." }, { status: 403, headers });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return Response.json({ message: "Send calendar fields as JSON." }, { status: 415, headers });
  if (Number(request.headers.get("content-length") ?? 0) > 256000) return Response.json({ message: "Calendar data is too large." }, { status: 413, headers });
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > 256000) return Response.json({ message: "Calendar data is too large." }, { status: 413, headers });
    let body: unknown;
    try { body = JSON.parse(raw); } catch { throw new TaskError(400, "Enter valid JSON calendar fields."); }
    const change = changeSchema.parse(body);
    let message: string;
    if (change.operation === "replace_snapshot") { await replaceCalendarSnapshot(user.userId, change.data); message = "Calendar snapshot saved and verified"; }
    else if (change.operation === "mark_stale") { await markCalendarStale(user.userId, change.data); message = "Prior snapshot retained and marked stale"; }
    else { await saveCalendarLink(user.userId, change.data); message = "Task-event link saved and verified"; }
    return Response.json({ message }, { headers });
  } catch (e) {
    if (e instanceof ZodError) return Response.json({ message: e.issues[0]?.message ?? "Check the calendar fields." }, { status: 400, headers });
    if (e instanceof TaskError) return Response.json({ message: e.message }, { status: e.status, headers });
    console.error("Calendar maintenance storage failed", e);
    return Response.json({ message: "Calendar data was not confirmed. Your draft is kept. Read the current context before trying again." }, { status: 503, headers });
  }
}
