// ═══════════════════════════════════════════════════════════
// BSH Members — src/app/bsh/members/page.tsx (route réelle /bsh/members)
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import MembersPublicClient from "./MembersPublicClient";

export const metadata: Metadata = {
  title: "BSH Members",
  description:
    "BSH Members — le club privé de Bella'Secret Home. Exclusivité, privilèges, accès réservé.",
};

export default function BshMembersPage() {
  return <MembersPublicClient />;
}
