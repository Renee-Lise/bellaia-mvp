"use client";
// ═══════════════════════════════════════════════════════════
// Stepper de quantité — src/app/bsh/QuantityStepper.tsx
//
// Composant purement présentationnel (pas d'accès données) partagé
// par PanierButton (Boutique/Coffrets) et la page panier de Mon
// espace BSH, pour ne pas dupliquer les deux boutons +/−.
// ═══════════════════════════════════════════════════════════
import { BSH_PALETTE as C } from "./bshTokens";

export default function QuantityStepper({
  quantite,
  busy,
  onDecrement,
  onIncrement,
}: {
  quantite: number;
  busy: boolean;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        border: `1px solid ${C.borderM}`,
        borderRadius: 2,
        padding: "3px 4px",
      }}
    >
      <StepperBtn onClick={onDecrement} disabled={busy} label="−" />
      <span style={{ fontSize: 11, color: C.cream, minWidth: 18, textAlign: "center" }}>{quantite}</span>
      <StepperBtn onClick={onIncrement} disabled={busy} label="+" />
    </div>
  );
}

function StepperBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 22,
        height: 22,
        borderRadius: 2,
        border: "none",
        background: "rgba(198,161,91,0.12)",
        color: C.goldL,
        fontSize: 13,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {label}
    </button>
  );
}
