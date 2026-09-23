// ═══════════════════════════════════════════════════════════
// Espace privé BSH Members — src/app/bsh/espace/members/page.tsx
// (route réelle /bsh/espace/members)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import MembersPriveClient from "./MembersPriveClient";

export const metadata: Metadata = {
  title: "Espace BSH Members",
  description: "Votre espace privé BSH Members.",
  robots: { index: false, follow: false },
};

export default function BshEspaceMembersPage() {
  return <MembersPriveClient />;
}
