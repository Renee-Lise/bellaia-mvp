// Affichage de l'identité de l'éditeur (pages légales) et des mentions qui restent à valider.
import React from "react";
import type { Editeur } from "./editeur";
import { ACompleter } from "./PageLegale";

export default function BlocEditeur({ e }: { e: Editeur }) {
  return <>
    {e.champs.length > 0 && <dl style={{ display: "grid", gridTemplateColumns: "minmax(110px, auto) 1fr", gap: "4px 12px", margin: "0 0 10px" }}>
      {e.champs.map(c => <React.Fragment key={c.libelle}><dt style={{ color: "#4a4f6b" }}>{c.libelle}</dt><dd style={{ margin: 0 }}>{c.valeur ?? <ACompleter>à compléter</ACompleter>}</dd></React.Fragment>)}
    </dl>}
    <div style={{ fontSize: 13, color: "#4a4f6b" }}>Source : fiche « Émetteur Général » saisie dans Bellaïa (Administratif › Mes informations légales).</div>
    {e.aValider.length > 0 && <div role="note" style={{ marginTop: 10, background: "#fff4dc", border: "1px solid #8a5a00", color: "#8a5a00", borderRadius: 10, padding: "8px 12px", fontSize: 14 }}>
      <strong>À valider avant publication :</strong>
      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>{e.aValider.map(a => <li key={a}>{a}</li>)}</ul>
    </div>}
  </>;
}
