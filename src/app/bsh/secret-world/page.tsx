// BSH Secret World — route /bsh/secret-world (maquette phase 1, derrière la vérification d'âge de /bsh).
import type { Metadata } from "next";
import SecretWorldClient from "./SecretWorldClient";

export const metadata: Metadata = {
  title: "BSH Secret World",
  description: "Monde virtuel BSH — maquette de la phase 1 (joueur seul).",
  robots: { index: false, follow: false },
};

export default function BshSecretWorldPage() {
  return <SecretWorldClient />;
}
