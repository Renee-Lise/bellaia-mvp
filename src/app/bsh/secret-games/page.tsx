// ═══════════════════════════════════════════════════════════
// BSH Secret Games — src/app/bsh/secret-games/page.tsx
// (route réelle /bsh/secret-games)
//
// Remplace la simple redirection vers le site GitHub Pages externe
// (renee-lise.github.io/bsh-secret-games, localStorage uniquement,
// aucune donnée partagée) par un vrai jeu intégré : cartes lues
// depuis Supabase (public.bsh_jeux_cartes, gérées par la fondatrice
// depuis son espace BSH), historique réel pour les clientes
// connectées, et formulaire de proposition de thème qui alimente une
// vraie file de modération au lieu d'un simple export WhatsApp manuel.
//
// Le site GitHub Pages reste en ligne (lien conservé en bas de page,
// comme demandé : "maintenir accessible... en préparant son
// intégration") mais n'est plus le point d'entrée principal.
// ═══════════════════════════════════════════════════════════
import type { Metadata } from "next";
import { getCartesBSH } from "./getCartes";
import SecretGamesClient from "./SecretGamesClient";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "BSH Secret Games",
  description: "Cartes et défis Bella'Secret Home — à découvrir à deux, avec élégance et discrétion.",
};

export default async function BshSecretGamesPage() {
  const { cartes, diagnostic } = await getCartesBSH();
  return (
    <>
      <SecretGamesClient cartesInitiales={cartes} diagnostic={diagnostic} />
      <BshFooter />
    </>
  );
}
