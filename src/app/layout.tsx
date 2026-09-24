import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Decision Trail", template: "%s · Decision Trail" },
  description:
    "Conversation-first memory for decisions, changes, and their evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-background font-sans text-sm text-foreground antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
