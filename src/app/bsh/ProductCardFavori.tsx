// ═══════════════════════════════════════════════════════════
// ProductCard + bouton favori — src/app/bsh/ProductCardFavori.tsx
//
// Compose ProductCard (fiche produit, Server-Component-safe) avec
// FavoriToggle (Client Component) sans transformer ProductCard
// lui-même en Client Component — utilisé par Boutique et Coffrets.
// ═══════════════════════════════════════════════════════════
import ProductCard from "./ProductCard";
import FavoriToggle from "./FavoriToggle";
import type { ProduitBSH } from "./boutique/getProduits";

export default function ProductCardFavori({ p }: { p: ProduitBSH }) {
  return (
    <div style={{ position: "relative" }}>
      <ProductCard p={p} />
      <div style={{ position: "absolute", top: 8, right: 8 }}>
        <FavoriToggle stockId={p.id} />
      </div>
    </div>
  );
}
