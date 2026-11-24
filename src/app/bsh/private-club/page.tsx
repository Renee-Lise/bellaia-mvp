// BSH Private Club — route /bsh/private-club (derrière la vérification d'âge de /bsh).
import type { Metadata } from "next";
import PrivateClubClient from "./PrivateClubClient";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "BSH Private Club",
  description: "Jeux narratifs immersifs réservés aux adultes — THE RED ROOM, le club des tentations.",
  robots: { index: false, follow: false },
};

export default function BshPrivateClubPage() {
  return (<><PrivateClubClient /><BshFooter /></>);
}
