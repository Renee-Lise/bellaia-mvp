// ═══════════════════════════════════════════════════════════
// EventsDevis — Éditeur devis fondatrice + Vue devis client
// ═══════════════════════════════════════════════════════════
// TODO Phase 2 : importer les helpers explicitement

function ModalGenerationDevis({ demande, user, onClose, onValide }) {
  // Lignes initiales : depuis lignes_devis sauvegardées, ou estimation automatique
  const lignesInit = React.useMemo(() => {
    if (demande.lignes_devis && Array.isArray(demande.lignes_devis) && demande.lignes_devis.length > 0) {
      return demande.lignes_devis;
    }
    return analyserDemandeClient({
      prestation: demande.prestation, message: demande.message,
      theme: demande.theme, couleurs: demande.couleurs,
      nbInvites: demande.nb_invites, typeEvt: demande.type_evenement,
      budget: demande.budget,
    });
  }, [demande]);

  const [lignes, setLignes] = React.useState(lignesInit);
  const [envoi,  setEnvoi]  = React.useState(false);
  const [succes, setSucces] = React.useState("");
  const [nouvelleLigne, setNouvelleLigne] = React.useState({libelle:"",pole:"EVENTS",categorie:"",qte:1,prixUnitaire:"",note:""});

  const totalFinal = lignes
    .filter(l => l.statut !== "suggestion" && l.total && l.total > 0)
    .reduce((s, l) => s + Number(l.total), 0);

  const acompte30 = Math.round(totalFinal * 0.3);

  const majLigne = (i, champ, val) => {
    setLignes(ls => ls.map((l, idx) => {
      if (idx !== i) return l;
      const updated = {...l, [champ]: val};
      if (champ === "prixUnitaire" || champ === "qte") {
        const pu = parseFloat(champ==="prixUnitaire"?val:l.prixUnitaire) || 0;
        const q  = parseInt(champ==="qte"?val:l.qte) || 1;
        updated.prixUnitaire = champ==="prixUnitaire" ? val : l.prixUnitaire;
        updated.total = pu * q;
        updated.statut = pu > 0 ? "automatique" : "a_completer";
      }
      return updated;
    }));
  };

  const supprimerLigne = (i) => setLignes(ls => ls.filter((_,idx) => idx !== i));

  const ajouterLigne = () => {
    if (!nouvelleLigne.libelle.trim()) return;
    const pu = parseFloat(nouvelleLigne.prixUnitaire) || 0;
    const q  = parseInt(nouvelleLigne.qte) || 1;
    setLignes(ls => [...ls, {
      ...nouvelleLigne, prixUnitaire: pu, total: pu*q,
      statut: pu > 0 ? "automatique" : "a_completer",
      source: "Ajout manuel fondatrice",
    }]);
    setNouvelleLigne({libelle:"",pole:"EVENTS",categorie:"",qte:1,prixUnitaire:"",note:""});
  };

  const validerEtEnvoyer = async () => {
    setEnvoi(true);
    const numDevis = demande.numero_devis || await genererReference("DEV");
    const montantFinal = totalFinal;
    const acompteFinal = Math.round(montantFinal * 0.3);
    const updates = {
      lignes_devis: JSON.stringify(lignes),
      statut: "devis_envoye",
      numero_devis: numDevis,
      montant_estime: montantFinal,
      montant_acompte: acompteFinal,
      montant_solde: montantFinal - acompteFinal,
      devis_genere_at: new Date().toISOString(),
      devis_envoye_at: new Date().toISOString(),
    };
    const res = await sbPatch("events_demandes", demande.id, updates);
    if (!res.ok) { alert("Erreur sauvegarde devis."); setEnvoi(false); return; }
    // Notification interne
    await creerNotification({
      pole:"EVENTS", type:"validation_devis",
      titre: "Devis "+numDevis+" généré",
      message: "Client : "+(demande.client_prenom||"")+" "+( demande.client_nom||"")+"\nMontant : "+montantFinal+"€\nRéférence : "+demande.reference,
      canal:"interne", user,
      sourceTable:"events_demandes", sourceId: demande.id,
    });
    // Message WhatsApp prérempli
    const lienSuivi = "https://bellaia-11-azure.vercel.app";
    const msgWA = [
      "Bonjour "+(demande.client_prenom||"")+",",
      "",
      "Votre devis Bella'Events est disponible.",
      "Référence : "+demande.reference,
      "Devis N° : "+numDevis,
      "Montant : "+montantFinal+"€",
      "Acompte (30%) : "+acompteFinal+"€",
      "",
      "Retrouvez votre dossier ici : "+lienSuivi,
      "",
      "Belle journée, Bella'Events ✨",
    ].join("\n");
    setSucces(numDevis+"|||"+encodeURIComponent(msgWA));
    setEnvoi(false);
  };

  if (succes) {
    const [numDevis, msgEnc] = succes.split("|||");
    const msgDecode = decodeURIComponent(msgEnc);
    return (
      <Mdl title={"Devis "+numDevis+" — Envoi"} onClose={onValide}>
        <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",borderRadius:12,padding:14,marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:"#10b981",marginBottom:4}}>✅ Devis généré — "+numDevis+"</div>
          <div style={{fontSize:11,color:B.muted}}>Statut mis à jour → devis_envoyé · Notification interne créée</div>
        </div>
        <div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:700,color:B.cream,marginBottom:6}}>Envoyer par WhatsApp</div>
          <div style={{fontSize:10,color:B.muted,background:B.surface,borderRadius:8,padding:"8px 10px",lineHeight:1.6,whiteSpace:"pre-wrap",marginBottom:8}}>{msgDecode}</div>
          <a href={WA(msgDecode)} target="_blank" rel="noreferrer"
            style={{display:"block",background:"rgba(37,211,102,0.12)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:10,padding:"11px",textAlign:"center",color:"#25d366",fontWeight:700,fontSize:13,textDecoration:"none",fontFamily:SA}}>
            💬 Ouvrir WhatsApp
          </a>
        </div>
        <div style={{background:"rgba(255,255,255,0.04)",border:"1px dashed rgba(255,255,255,0.15)",borderRadius:10,padding:12,marginBottom:14}}>
          <div style={{fontSize:11,color:B.muted}}>📧 E-mail automatique — service non configuré</div>
          <div style={{fontSize:10,color:B.muted,marginTop:4}}>Configurez SMTP dans les variables Vercel pour activer l'envoi automatique.</div>
        </div>
        <Btn v="gold" full onClick={onValide}>Fermer</Btn>
      </Mdl>
    );
  }

  const COL_STATUT_L = {automatique:"rgba(16,185,129,0.12)", a_completer:"rgba(201,168,76,0.12)", suggestion:"rgba(124,58,237,0.12)"};
  const TXT_STATUT_L = {automatique:"#10b981", a_completer:B.warning, suggestion:B.violetL};

  return (
    <Mdl title={"Devis — "+(demande.reference||demande.id)} onClose={onClose}>
      {/* Résumé client */}
      <div style={{background:B.surface,border:"1px solid "+B.border,borderRadius:10,padding:"10px 12px",marginBottom:12}}>
        <div style={{fontSize:12,fontWeight:700,color:B.cream}}>{demande.client_prenom} {demande.client_nom}</div>
        <div style={{fontSize:11,color:B.muted}}>{demande.prestation} · {demande.type_evenement}</div>
        {demande.date_souhaitee && <div style={{fontSize:10,color:B.muted}}>📅 {new Date(demande.date_souhaitee).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</div>}
      </div>

      {/* Lignes éditables */}
      <div style={{fontSize:11,fontWeight:700,color:B.cream,marginBottom:6}}>Lignes du devis</div>
      <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:10,maxHeight:260,overflowY:"auto"}}>
        {lignes.map((l, i) => (
          <div key={i} style={{background:COL_STATUT_L[l.statut]||"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 10px",border:"1px solid rgba(255,255,255,0.07)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <input value={l.libelle} onChange={e=>majLigne(i,"libelle",e.target.value)}
                style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"4px 8px",color:B.cream,fontSize:11,fontFamily:SA,marginRight:6}}/>
              <button onClick={()=>supprimerLigne(i)} style={{background:"none",border:"none",color:B.danger,cursor:"pointer",fontSize:14,padding:"0 4px"}}>✕</button>
            </div>
            <div style={{display:"flex",gap:6}}>
              <div style={{display:"flex",flexDirection:"column",flex:1}}>
                <label style={{fontSize:9,color:B.muted,marginBottom:2}}>Qté</label>
                <input type="number" value={l.qte||1} onChange={e=>majLigne(i,"qte",e.target.value)}
                  style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"4px 6px",color:B.cream,fontSize:11,fontFamily:SA,width:"100%"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",flex:2}}>
                <label style={{fontSize:9,color:B.muted,marginBottom:2}}>Prix unitaire (€)</label>
                <input type="number" value={l.prixUnitaire||""} onChange={e=>majLigne(i,"prixUnitaire",e.target.value)}
                  placeholder="À compléter"
                  style={{background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"4px 6px",color:B.cream,fontSize:11,fontFamily:SA,width:"100%"}}/>
              </div>
              <div style={{display:"flex",flexDirection:"column",flex:2,justifyContent:"flex-end"}}>
                <label style={{fontSize:9,color:B.muted,marginBottom:2}}>Total</label>
                <div style={{fontSize:13,fontWeight:700,color:l.total?TXT_STATUT_L[l.statut]:B.muted,padding:"4px 6px"}}>
                  {l.total ? l.total+"€" : "—"}
                </div>
              </div>
            </div>
            {l.note && <div style={{fontSize:9,color:B.muted,marginTop:3,fontStyle:"italic"}}>{l.note}</div>}
          </div>
        ))}
      </div>

      {/* Ajouter une ligne */}
      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 10px",marginBottom:12}}>
        <div style={{fontSize:10,color:B.muted,marginBottom:6}}>+ Ajouter une ligne</div>
        <input value={nouvelleLigne.libelle} onChange={e=>setNouvelleLigne({...nouvelleLigne,libelle:e.target.value})}
          placeholder="Libellé de la prestation"
          style={{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"6px 8px",color:B.cream,fontSize:11,fontFamily:SA,marginBottom:6,boxSizing:"border-box"}}/>
        <div style={{display:"flex",gap:6}}>
          <input type="number" value={nouvelleLigne.qte||1} onChange={e=>setNouvelleLigne({...nouvelleLigne,qte:e.target.value})}
            placeholder="Qté"
            style={{flex:1,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"5px 6px",color:B.cream,fontSize:11,fontFamily:SA}}/>
          <input type="number" value={nouvelleLigne.prixUnitaire||""} onChange={e=>setNouvelleLigne({...nouvelleLigne,prixUnitaire:e.target.value})}
            placeholder="Prix €"
            style={{flex:2,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:6,padding:"5px 6px",color:B.cream,fontSize:11,fontFamily:SA}}/>
          <button onClick={ajouterLigne} style={{background:B.violet,border:"none",borderRadius:6,padding:"5px 12px",color:"#fff",fontSize:11,cursor:"pointer",fontFamily:SA}}>+</button>
        </div>
      </div>

      {/* Total */}
      <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid rgba(16,185,129,0.2)",borderRadius:10,padding:"10px 12px",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:12,color:B.muted}}>Total</span>
          <span style={{fontSize:16,fontWeight:700,color:"#10b981"}}>{totalFinal}€</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
          <span style={{fontSize:11,color:B.muted}}>Acompte 30%</span>
          <span style={{fontSize:12,color:B.warning}}>{acompte30}€</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:2}}>
          <span style={{fontSize:11,color:B.muted}}>Solde</span>
          <span style={{fontSize:12,color:B.muted}}>{totalFinal - acompte30}€</span>
        </div>
      </div>

      <div style={{display:"flex",gap:8}}>
        <Btn onClick={validerEtEnvoyer} full v="gold" disabled={envoi}>
          {envoi?"Génération…":"✅ Valider et envoyer le devis"}
        </Btn>
        <Btn onClick={onClose} v="ghost">Annuler</Btn>
      </div>
    </Mdl>
  );
}


function DevisClientView({ dossier, onAccepte, onRefuse }) {
  const lignes = React.useMemo(() => {
    if (!dossier.lignes_devis) return [];
    try {
      const parsed = typeof dossier.lignes_devis === "string"
        ? JSON.parse(dossier.lignes_devis) : dossier.lignes_devis;
      return Array.isArray(parsed) ? parsed.filter(l => l.statut !== "suggestion") : [];
    } catch { return []; }
  }, [dossier.lignes_devis]);

  const total     = dossier.montant_estime   || 0;
  const acompte   = dossier.montant_acompte  || Math.round(total * 0.3);
  const solde     = dossier.montant_solde    || (total - acompte);
  const accepte   = dossier.client_reponse === "accepte" || dossier.statut === "accepte";
  const refuse    = dossier.client_reponse === "refuse"  || dossier.statut === "refuse";
  const [confirmer, setConfirmer] = React.useState(null); // "accepte"|"refuse"

  return (
    <div style={{background:"rgba(16,185,129,0.06)",border:"1px solid "+EV.line,borderRadius:14,padding:"16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <div style={{fontSize:11,color:EV.cremeD,fontWeight:700,letterSpacing:1}}>VOTRE DEVIS</div>
        <div style={{fontSize:10,color:EV.cremeD}}>{dossier.numero_devis || ""}</div>
      </div>

      {/* Lignes */}
      {lignes.length > 0 && (
        <div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:12}}>
          {lignes.map((l, i) => (
            <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid rgba(16,185,129,0.1)"}}>
              <div>
                <div style={{fontSize:12,color:EV.creme}}>{l.libelle}</div>
                {l.qte > 1 && <div style={{fontSize:10,color:EV.cremeD}}>× {l.qte}</div>}
              </div>
              <div style={{fontSize:12,fontWeight:600,color:l.total?EV.or:B.muted}}>{l.total ? l.total+"€" : "À confirmer"}</div>
            </div>
          ))}
        </div>
      )}

      {/* Totaux */}
      {total > 0 && (
        <div style={{background:"rgba(16,185,129,0.1)",borderRadius:10,padding:"10px 12px",marginBottom:12}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:12,color:EV.cremeD}}>Total</span>
            <span style={{fontSize:16,fontWeight:700,color:EV.or}}>{total}€</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
            <span style={{fontSize:11,color:EV.cremeD}}>Acompte (30%)</span>
            <span style={{fontSize:12,color:B.warning}}>{acompte}€</span>
          </div>
          <div style={{display:"flex",justifyContent:"space-between"}}>
            <span style={{fontSize:11,color:EV.cremeD}}>Solde restant</span>
            <span style={{fontSize:12,color:EV.cremeD}}>{solde}€</span>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div style={{fontSize:10,color:EV.cremeD,lineHeight:1.6,marginBottom:12}}>
        Devis valable 30 jours · Acompte de 30% requis à la confirmation · Prestation garantie après réception de l'acompte.
      </div>

      {/* Bouton PDF */}
      <button disabled style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px dashed rgba(255,255,255,0.15)",borderRadius:10,padding:"10px",color:"rgba(255,255,255,0.35)",fontSize:12,fontFamily:SA,cursor:"not-allowed",marginBottom:8,textAlign:"center"}}>
        📄 Télécharger le devis PDF — bientôt disponible
      </button>

      {/* Réponse client */}
      {!accepte && !refuse && !confirmer && (
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setConfirmer("accepte")} style={{flex:1,background:"rgba(16,185,129,0.15)",border:"1px solid #10b981",borderRadius:10,padding:"11px",color:"#10b981",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:SA}}>
            ✅ Accepter le devis
          </button>
          <button onClick={()=>setConfirmer("refuse")} style={{flex:1,background:"rgba(180,80,80,0.1)",border:"1px solid rgba(180,80,80,0.4)",borderRadius:10,padding:"11px",color:B.danger,fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:SA}}>
            ✕ Refuser
          </button>
        </div>
      )}

      {confirmer === "accepte" && (
        <div style={{background:"rgba(16,185,129,0.1)",border:"1px solid #10b981",borderRadius:10,padding:12}}>
          <div style={{fontSize:12,color:EV.creme,marginBottom:8}}>Confirmez-vous l'acceptation de ce devis ?</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onAccepte} style={{flex:1,background:"#10b981",border:"none",borderRadius:8,padding:"9px",color:"#062b1d",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:SA}}>✅ Oui, j'accepte</button>
            <button onClick={()=>setConfirmer(null)} style={{flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"9px",color:B.muted,fontSize:12,cursor:"pointer",fontFamily:SA}}>Annuler</button>
          </div>
        </div>
      )}

      {confirmer === "refuse" && (
        <div style={{background:"rgba(180,80,80,0.1)",border:"1px solid rgba(180,80,80,0.4)",borderRadius:10,padding:12}}>
          <div style={{fontSize:12,color:EV.creme,marginBottom:8}}>Êtes-vous sûr(e) de refuser ce devis ?</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={onRefuse} style={{flex:1,background:B.danger,border:"none",borderRadius:8,padding:"9px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:SA}}>✕ Oui, refuser</button>
            <button onClick={()=>setConfirmer(null)} style={{flex:1,background:"transparent",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"9px",color:B.muted,fontSize:12,cursor:"pointer",fontFamily:SA}}>Annuler</button>
          </div>
        </div>
      )}

      {accepte && <div style={{textAlign:"center",padding:10,fontSize:13,color:"#10b981",fontWeight:700}}>✅ Devis accepté — merci !</div>}
      {refuse  && <div style={{textAlign:"center",padding:10,fontSize:13,color:B.danger}}>Devis refusé. N'hésitez pas à nous contacter pour ajuster votre projet.</div>}
    </div>
  );
}


