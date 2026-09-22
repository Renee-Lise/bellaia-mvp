// ═══════════════════════════════════════════════════════════
// Messages & notifications — src/app/bsh/espace/messages/page.tsx
// (route réelle /bsh/espace/messages)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import MessagesClient from "./MessagesClient";

export const metadata: Metadata = {
  title: "Messages & notifications",
  description: "Vos notifications Bella'Secret Home.",
  robots: { index: false, follow: false },
};

export default function BshEspaceMessagesPage() {
  return <MessagesClient />;
}
