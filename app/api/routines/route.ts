import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createRoutine, listRoutines, changeRoutine, removeRoutine } from "@/lib/routines";
import { TaskError } from "@/lib/tasks";
import { ZodError } from "zod";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function error(e: unknown) {
  if (e instanceof ZodError) return Response.json({ message: e.issues[0]?.message ?? "Check the routine fields." }, { status: 400, headers });
  if (e instanceof TaskError) return Response.json({ message: e.message }, { status: e.status, headers });
  console.error("Routine storage operation failed", e);
  return Response.json({ message: "Your routine is temporarily unavailable. No change has been confirmed." }, { status: 503, headers });
}
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: "Sign in to see your routine." }, { status: 401, headers });
  try { return Response.json(await listRoutines(user.userId), { headers }); } catch (e) { return error(e); }
}
async function mutate(request: Request, operation: "create" | "change" | "remove") {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: "Sign in to change your routine." }, { status: 401, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ message: "Use this board to save changes." }, { status: 403, headers });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return Response.json({ message: "Send JSON." }, { status: 415, headers });
  try {
    const raw = await request.text(); if (new TextEncoder().encode(raw).length > 4096) throw new TaskError(413, "Request too large.");
    let body; try { body = JSON.parse(raw); } catch { throw new TaskError(400, "Check the routine fields."); }
    if (operation === "create") return Response.json({ routine: await createRoutine(user.userId, body) }, { status: 201, headers });
    if (operation === "change") return Response.json({ routine: await changeRoutine(user.userId, body) }, { headers });
    await removeRoutine(user.userId, body); return Response.json({ removed: true }, { headers });
  } catch (e) { return error(e); }
}
export const POST = (request: Request) => mutate(request, "create");
export const PATCH = (request: Request) => mutate(request, "change");
export const DELETE = (request: Request) => mutate(request, "remove");
