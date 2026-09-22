// ═══════════════════════════════════════════════════════════
// ProductCard + favori + panier — src/app/bsh/ProductCardActions.tsx
//
// Compose ProductCard (fiche produit, Server-Component-safe) avec
// FavoriToggle et PanierButton (Client Components) sans transformer
// ProductCard lui-même — utilisé par Boutique et Coffrets.
// ═══════════════════════════════════════════════════════════
import ProductCard from "./ProductCard";
import FavoriToggle from "./FavoriToggle";
import PanierButton from "./PanierButton";
import type { ProduitBSH } from "./boutique/getProduits";

export default function ProductCardActions({ p }: { p: ProduitBSH }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ position: "relative" }}>
        <ProductCard p={p} />
        <div style={{ position: "absolute", top: 8, right: 8 }}>
          <FavoriToggle stockId={p.id} />
        </div>
      </div>
      <PanierButton stockId={p.id} />
    </div>
  );
}
