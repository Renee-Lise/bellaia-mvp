import Link from "next/link";

const modules = [
  { icon: "◈", title: "Boutique & commandes", detail: "Catalogue, stocks, ventes et livraisons", status: "À relier" },
  { icon: "♠", title: "Secret Games", detail: "Cartes, thèmes, propositions et modération", status: "Démo disponible" },
  { icon: "✧", title: "Événements", detail: "Calendrier, réservations et participants", status: "À relier" },
  { icon: "♙", title: "Hôtes & hôtesses", detail: "Missions, disponibilités et affectations", status: "À construire" },
  { icon: "◇", title: "BSH Members", detail: "Adhésions, statuts et avantages", status: "À relier" },
  { icon: "▥", title: "Finances & rapports", detail: "Paiements, dépenses et indicateurs", status: "À construire" },
];

export default function BshFounderPreview() {
  return (
    <main style={{ minHeight: "100vh", background: "radial-gradient(circle at top right,#351425 0,#140d18 42%,#09070e 100%)", color: "#f6e9e7", fontFamily: "system-ui,-apple-system,sans-serif", padding: "24px 16px 72px" }}>
      <div style={{ maxWidth: 1020, margin: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, letterSpacing: 3, color: "#d6b68a" }}>BELLAÏA / FONDATRICE</span>
          <span style={{ fontSize: 11, border: "1px solid #9b765a", borderRadius: 99, padding: "6px 12px", color: "#e6c69b" }}>MAQUETTE — DONNÉES FICTIVES</span>
        </div>
        <header style={{ padding: "50px 0 32px" }}>
          <p style={{ color: "#c78e9e", fontSize: 12, letterSpacing: 4, margin: 0 }}>UNIVERS PRIVÉ · 18+</p>
          <h1 style={{ fontFamily: "Georgia,serif", fontWeight: 400, fontSize: "clamp(36px,7vw,62px)", margin: "12px 0" }}>Bella’Secret <span style={{ color: "#d6b68a" }}>Home</span></h1>
          <p style={{ color: "#c9b8c3", maxWidth: 590, lineHeight: 1.7 }}>Votre centre de pilotage BSH. Retrouvez les opérations, les jeux, les événements et votre équipe dans un seul univers.</p>
        </header>
        <section aria-label="Navigation des univers" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 28 }}>
          {["Vue générale", "Bella’Secret Home", "Bella’Odyssée", "Bella’Events", "Bella’Food"].map((name) => <span key={name} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #624451", background: name === "Bella’Secret Home" ? "#6b253e" : "#211723", fontSize: 12 }}>{name}</span>)}
        </section>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 12, marginBottom: 30 }}>
          {["Commandes", "Participations jeux", "Événements", "Hôtes actifs"].map(label => <div key={label} style={{ background: "#211522", border: "1px solid #543345", borderRadius: 16, padding: 20 }}><div style={{ color: "#c7aab9", fontSize: 13 }}>{label}</div><div style={{ fontFamily: "Georgia,serif", fontSize: 30, marginTop: 10 }}>—</div><div style={{ color: "#a78d9b", fontSize: 11 }}>Données non connectées</div></div>)}
        </section>
        <h2 style={{ fontFamily: "Georgia,serif", fontWeight: 400, fontSize: 27, marginBottom: 18 }}>Gérer mon univers</h2>
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 14 }}>
          {modules.map(item => <article key={item.title} style={{ background: "linear-gradient(145deg,#2b1928,#1a121d)", border: "1px solid #654453", borderRadius: 18, padding: 22, minHeight: 172 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }}><span style={{ fontSize: 28, color: "#d6b68a" }}>{item.icon}</span><span style={{ fontSize: 10, color: "#e4bb8e", border: "1px solid #765b4a", borderRadius: 99, padding: "5px 9px" }}>{item.status}</span></div>
            <h3 style={{ fontSize: 17, margin: "18px 0 8px" }}>{item.title}</h3><p style={{ color: "#c2aeba", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{item.detail}</p>
          </article>)}
        </section>
        <div style={{ marginTop: 30, padding: 20, border: "1px solid #755b4b", borderRadius: 16, background: "#271d25" }}>
          <strong style={{ color: "#e1bd88" }}>Secret Games est déjà en ligne</strong>
          <p style={{ fontSize: 13, color: "#d5bfca", lineHeight: 1.6 }}>Le jeu reste indépendant pendant l’intégration. Les participations et les propositions de thèmes ne sont pas encore synchronisées avec Bellaïa.</p>
          <a href="https://renee-lise.github.io/bsh-secret-games/" target="_blank" rel="noopener noreferrer" style={{ color: "#e8c68f" }}>Ouvrir la démo Secret Games ↗</a>
        </div>
        <footer style={{ marginTop: 36, fontSize: 12, color: "#ad93a3" }}>Prévisualisation de conception uniquement. Aucun accès administrateur ni donnée privée n’est exposé par cette page. <Link href="/" style={{ color: "#e4bf90" }}>Retour à Bellaïa</Link></footer>
      </div>
    </main>
  );
}
