// ═══════════════════════════════════════════════════════════
// Réservations & expériences — src/app/bsh/espace/reservations/page.tsx
// (route réelle /bsh/espace/reservations)
//
// Suspense requis : ReservationsClient lit useSearchParams() (pour le
// pré-remplissage ?titre=... depuis /bsh/coffrets).
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { Suspense } from "react";
import ReservationsClient from "./ReservationsClient";

export const metadata: Metadata = {
  title: "Réservations & expériences",
  description: "Vos réservations d'expériences Bella'Secret Home.",
  robots: { index: false, follow: false },
};

export default function BshEspaceReservationsPage() {
  return (
    <Suspense fallback={null}>
      <ReservationsClient />
    </Suspense>
  );
}
