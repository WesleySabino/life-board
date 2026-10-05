import { notFound } from "next/navigation";
import { requireChatGPTUser } from "@/app/chatgpt-auth";
import Board from "@/app/board";
import { columnHref, parseColumn } from "@/lib/board-view";

export const dynamic = "force-dynamic";

export default async function ColumnPage({ params, searchParams }: {
  params: Promise<{ status: string }>;
  searchParams: Promise<{ archived?: string }>;
}) {
  const status = parseColumn((await params).status);
  if (!status) notFound();
  const archived = (await searchParams).archived === "true";
  await requireChatGPTUser(columnHref(status, archived));
  return <Board column={status} initialSelected={status} initialArchived={archived} />;
}
