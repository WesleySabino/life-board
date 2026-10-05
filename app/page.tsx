import { requireChatGPTUser } from "./chatgpt-auth";
import Board from "./board";
import { boardHref, parseColumn } from "@/lib/board-view";
export const dynamic = "force-dynamic";
export default async function Home({ searchParams }: { searchParams: Promise<{ column?: string; archived?: string }> }) {
  const query = await searchParams;
  const selected = parseColumn(query.column);
  const archived = query.archived === "true";
  await requireChatGPTUser(boardHref(selected, archived));
  return <Board initialSelected={selected} initialArchived={archived} />;
}
