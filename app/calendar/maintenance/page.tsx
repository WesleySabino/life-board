import { requireChatGPTUser } from "@/app/chatgpt-auth";
import CalendarMaintenance from "./maintenance";
export const dynamic = "force-dynamic";
export const metadata = { title: "Calendar maintenance · Life Board", robots: { index: false, follow: false } };
export default async function CalendarMaintenancePage() {
  await requireChatGPTUser("/calendar/maintenance");
  return <CalendarMaintenance />;
}
