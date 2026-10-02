import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Life Board",
  description: "A private Kanban board for everything you want to get done.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
