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
import { getJeuxBSH } from "./getJeux";
import SecretGamesClient from "./SecretGamesClient";
import Link from "next/link";
import BshFooter from "../BshFooter";

export const metadata: Metadata = {
  title: "BSH Secret Games",
  description: "Cartes et défis Bella'Secret Home — à découvrir à deux, avec élégance et discrétion.",
};

export default async function BshSecretGamesPage() {
  const { jeux, diagnostic: diagnosticJeux } = await getJeuxBSH();
  const jeuInitial = jeux[0] ?? null;
  const { cartes, diagnostic } = await getCartesBSH(jeuInitial?.id);
  return (
    <>
      <SecretGamesClient
        jeux={jeux}
        jeuInitial={jeuInitial}
        cartesInitiales={cartes}
        diagnostic={diagnostic || diagnosticJeux}
      />
      {/* Extensions réservées aux adultes : BSH Private Club (THE RED ROOM) et Secret World (maquette). Les jeux existants ci-dessus restent inchangés. */}
      <nav aria-label="Extensions BSH Secret Games" style={{ maxWidth: 760, margin: "8px auto 24px", padding: "0 16px", display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))" }}>
        <Link data-testid="lien-private-club" href="/bsh/private-club" style={{ display: "block", padding: 16, borderRadius: 14, border: "1px solid rgba(198,161,91,0.35)", background: "linear-gradient(150deg, #5a0f1c, #0b0709)", color: "#f1e7e2", textDecoration: "none" }}>
          <div style={{ fontSize: 20, color: "#e0c17e" }}>BSH Private Club</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>THE RED ROOM — le club des tentations · 8 univers</div>
        </Link>
        <Link data-testid="lien-secret-world" href="/bsh/secret-world" style={{ display: "block", padding: 16, borderRadius: 14, border: "1px solid rgba(198,161,91,0.2)", background: "linear-gradient(150deg, #2e1a2e, #0b0709)", color: "#f1e7e2", textDecoration: "none" }}>
          <div style={{ fontSize: 20, color: "#e0c17e" }}>BSH Secret World</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>Monde virtuel — maquette (joueur seul)</div>
        </Link>
      </nav>
      <BshFooter />
    </>
  );
}
