import { getChatGPTUser } from "@/app/chatgpt-auth";
import { createTask, listTasks, TaskError, updateTask } from "@/lib/tasks";
import { ZodError } from "zod";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
function error(e: unknown) {
  if (e instanceof ZodError) return Response.json({ message: e.issues[0]?.message ?? "Check the task fields." }, { status: 400, headers });
  if (e instanceof TaskError) return Response.json({ message: e.message }, { status: e.status, headers });
  console.error("Task storage operation failed", e);
  return Response.json({ message: "Your board is temporarily unavailable. Your changes have not been confirmed. Please try again." }, { status: 503, headers });
}
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: "Sign in with ChatGPT to open your board." }, { status: 401, headers });
  try { return Response.json({ tasks: await listTasks(user.userId, new URL(request.url).searchParams.get("archived") === "true") }, { headers }); } catch (e) { return error(e); }
}
async function mutate(request: Request, update: boolean) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ message: "Sign in with ChatGPT to save your task." }, { status: 401, headers });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ message: "Use this board to save changes." }, { status: 403, headers });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return Response.json({ message: "Send task fields as JSON." }, { status: 415, headers });
  if (Number(request.headers.get("content-length") ?? 0) > 20000) return Response.json({ message: "Task is too large." }, { status: 413, headers });
  try {
    let body; try { body = await request.json(); } catch { throw new TaskError(400, "Check the task fields."); }
    return Response.json({ task: await (update ? updateTask(user.userId, body) : createTask(user.userId, body)) }, { status: update ? 200 : 201, headers });
  } catch (e) { return error(e); }
}
export const POST = (request: Request) => mutate(request, false);
export const PATCH = (request: Request) => mutate(request, true);
