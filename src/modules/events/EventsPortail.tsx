// ═══════════════════════════════════════════════════════════
// EventsPortail — Portail suivi client, timeline, estimation
// ═══════════════════════════════════════════════════════════

function LignesDevisAuto({ lignes, nbInvites }) {
  if (!lignes || lignes.length === 0) return null;

  const totalAuto = lignes
    .filter(l => l.statut === "automatique" && l.total)
    .reduce((s, l) => s + l.total, 0);

  const COL_POLE = {EVENTS:"#065f46", FOOD:"#15803d", BSH:"#6B1A2B", ODYSSEE:"#3730a3"};
  const COL_STATUT = {automatique:"rgba(16,185,129,0.12)", a_completer:"rgba(201,168,76,0.12)", suggestion:"rgba(124,58,237,0.12)"};
  const TXT_STATUT = {automatique:EV.or, a_completer:B.warning, suggestion:B.violetL};
  const LBL_STATUT = {automatique:"Auto", a_completer:"À compléter", suggestion:"Suggestion"};

  return (
    <div style={{background:"rgba(16,185,129,0.05)",border:"1px solid "+EV.line,borderRadius:13,padding:"14px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
        <div style={{fontSize:11,fontWeight:700,color:EV.or,letterSpacing:1}}>✦ ESTIMATION AUTOMATIQUE</div>
        <div style={{fontSize:9,color:EV.cremeD}}>Prix de référence catalogue Bellaïa</div>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {lignes.map((l, i) => (
          <div key={l.id+"_"+i} style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",background:COL_STATUT[l.statut]||"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 10px"}}>
            <div style={{flex:1,marginRight:8}}>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:2}}>
                <span style={{fontSize:8,background:(COL_POLE[l.pole]||"rgba(255,255,255,0.1)")+"33",color:COL_POLE[l.pole]||EV.cremeD,borderRadius:3,padding:"1px 5px",fontWeight:700}}>{l.pole}</span>
                <span style={{fontSize:8,background:COL_STATUT[l.statut],color:TXT_STATUT[l.statut],borderRadius:3,padding:"1px 5px",fontWeight:700}}>{LBL_STATUT[l.statut]}</span>
              </div>
              <div style={{fontSize:12,color:EV.creme,fontWeight:500}}>{l.libelle}</div>
              {l.qte > 1 && <div style={{fontSize:10,color:EV.cremeD}}>× {l.qte}{l.pole==="FOOD"&&l.unite?" "+l.unite:""}</div>}
              {l.note && <div style={{fontSize:10,color:EV.cremeD,fontStyle:"italic",marginTop:2}}>{l.note}</div>}
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              {l.total ? (
                <div style={{fontSize:13,fontWeight:700,color:EV.or}}>{l.total}€</div>
              ) : l.prixUnitaire ? (
                <div style={{fontSize:13,fontWeight:700,color:EV.or}}>{l.prixUnitaire}€</div>
              ) : (
                <div style={{fontSize:11,color:B.warning}}>À compléter</div>
              )}
            </div>
          </div>
        ))}
      </div>
      {totalAuto > 0 && (
        <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid "+EV.line,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{fontSize:11,color:EV.cremeD}}>Total estimé (prix catalogue)</div>
          <div style={{fontSize:16,fontWeight:700,color:EV.or,fontFamily:FS}}>{totalAuto}€</div>
        </div>
      )}
      <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:8,lineHeight:1.5}}>
        Estimation indicative basée sur le catalogue Bellaïa. La fondatrice confirmera le devis final.
      </div>
    </div>
  );
}

// ─── Mapping statuts events_demandes → étapes de la timeline ───

function TimelineSuivi({ statutBrut, style }) {
  const statutNorm = normaliserStatut(statutBrut || "nouvelle_demande");
  const idxActuel  = ETAPES_SUIVI.findIndex(e => e.statut === statutNorm);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:0,...style}}>
      {ETAPES_SUIVI.map((e, i) => {
        const passe   = i <= idxActuel;
        const actuel  = i === idxActuel;
        const dernier = i === ETAPES_SUIVI.length - 1;
        return (
          <div key={e.statut} style={{display:"flex",alignItems:"stretch",gap:12}}>
            {/* Colonne icône + fil */}
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:28,flexShrink:0}}>
              <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,
                background:passe?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.05)",
                border:"2px solid "+(actuel?"#10b981":passe?"rgba(16,185,129,0.5)":"rgba(255,255,255,0.1)"),
                boxShadow:actuel?"0 0 8px rgba(16,185,129,0.5)":"none",
              }}>{passe?e.ico:"⚪"}</div>
              {!dernier && <div style={{flex:1,width:2,background:passe?"rgba(16,185,129,0.3)":"rgba(255,255,255,0.07)",margin:"3px 0"}}/>}
            </div>
            {/* Texte */}
            <div style={{paddingBottom: dernier?0:16,paddingTop:4}}>
              <div style={{fontSize:12,fontWeight:actuel?700:500,color:passe?"#10b981":actuel?"#34d399":"rgba(255,255,255,0.3)",lineHeight:1.4}}>{e.label}</div>
              {actuel && <div style={{fontSize:9,color:"rgba(16,185,129,0.6)",marginTop:2,letterSpacing:1}}>EN COURS</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Portail "Suivre ma demande" (accessible depuis l'accueil Events) ───
// ─── Vue devis côté client ──────────────────────────────────

function PortailSuiviClient({ onBack }) {
  const [ref,     setRef]     = useState("");
  const [dossier, setDossier] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur,  setErreur]  = useState("");

  const rechercher = async () => {
    if (!ref.trim()) return;
    setChargement(true); setErreur(""); setDossier(null);
    try {
      const token = await getTokenAsync();
      const r = await fetch(
        (SB_URL)+"/rest/v1/events_demandes?reference=eq."+encodeURIComponent(ref.trim())+"&select=*&limit=1",
        { headers: { apikey: SB_KEY, Authorization: "Bearer "+token, "Content-Type": "application/json" } }
      );
      const rows = await r.json();
      if (!r.ok || !rows?.length) {
        setErreur("Aucune demande trouvée pour la référence " + ref.trim() + ". Vérifiez la référence reçue par message.");
      } else {
        setDossier(rows[0]);
      }
    } catch {
      setErreur("Connexion impossible. Réessayez dans un instant.");
    }
    setChargement(false);
  };

  const fmt24 = (s) => {
    if (!s) return "";
    const d = new Date(s);
    return d.toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})+" à "+d.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
  };

  return (
    <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 20% 0%,"+EV.night+",#070d0a 65%)",display:"flex",flexDirection:"column",fontFamily:SA,color:EV.creme}}>
      {/* Header */}
      <div style={{padding:"12px 16px",borderBottom:"1px solid "+EV.line,display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)"}}>
        <div style={{fontFamily:FS,fontSize:14,color:EV.or}}>✨ Suivi de demande</div>
        <button onClick={onBack} style={{background:"none",border:"1px solid "+EV.line,borderRadius:8,padding:"4px 10px",color:EV.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Retour</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {/* Zone de recherche */}
        <div style={{marginBottom:24}}>
          <div style={{fontFamily:FS,fontSize:18,color:EV.or,marginBottom:6}}>Retrouvez votre dossier</div>
          <div style={{fontSize:12,color:EV.cremeD,marginBottom:16,lineHeight:1.6}}>Saisissez la référence reçue après l'envoi de votre demande.</div>
          <div style={{display:"flex",gap:8}}>
            <input
              value={ref} onChange={e=>setRef(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==="Enter" && rechercher()}
              placeholder="BE-2026-XXXXXX"
              style={{flex:1,background:"rgba(255,255,255,0.06)",border:"1px solid "+EV.line,borderRadius:10,padding:"11px 14px",color:EV.creme,fontSize:14,fontFamily:SA,outline:"none",letterSpacing:1}}
            />
            <button onClick={rechercher} disabled={chargement} style={{background:EV.or,border:"none",borderRadius:10,padding:"11px 18px",color:"#062b1d",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:SA,opacity:chargement?0.6:1}}>
              {chargement?"…":"Rechercher"}
            </button>
          </div>
          {erreur && <div style={{fontSize:12,color:"#f87171",marginTop:8,lineHeight:1.5}}>{erreur}</div>}
        </div>

        {/* Dossier trouvé */}
        {dossier && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {/* Carte identité du dossier */}
            <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid "+EV.line,borderRadius:14,padding:"16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                <div>
                  <div style={{fontSize:10,color:EV.cremeD,marginBottom:2}}>Référence</div>
                  <div style={{fontSize:16,fontWeight:700,color:EV.or,fontFamily:FS}}>{dossier.reference}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:EV.cremeD,marginBottom:2}}>Créée le</div>
                  <div style={{fontSize:11,color:EV.cremeD}}>{fmt24(dossier.created_at)}</div>
                </div>
              </div>
              <div style={{borderTop:"1px solid "+EV.line,paddingTop:10,display:"flex",flexDirection:"column",gap:5}}>
                {dossier.client_prenom && <div style={{fontSize:12,color:EV.creme}}><span style={{color:EV.cremeD}}>Client · </span>{dossier.client_prenom} {dossier.client_nom||""}</div>}
                {dossier.prestation    && <div style={{fontSize:12,color:EV.creme}}><span style={{color:EV.cremeD}}>Projet · </span>{dossier.prestation}</div>}
                {dossier.type_evenement&& <div style={{fontSize:12,color:EV.creme}}><span style={{color:EV.cremeD}}>Type · </span>{dossier.type_evenement}</div>}
                {dossier.date_souhaitee&& <div style={{fontSize:12,color:EV.creme}}><span style={{color:EV.cremeD}}>Date souhaitée · </span>{new Date(dossier.date_souhaitee).toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"})}</div>}
              </div>
            </div>

            {/* Statut actuel */}
            <div style={{background:B.card,border:"1px solid "+EV.line,borderRadius:14,padding:"16px"}}>
              <div style={{fontSize:11,color:EV.cremeD,marginBottom:10,fontWeight:700,letterSpacing:1}}>SUIVI DE VOTRE DEMANDE</div>
              <TimelineSuivi statutBrut={dossier.statut}/>
            </div>

            {/* Devis disponible */}
            {dossier.statut === "devis_envoye" || dossier.statut === "accepte" || dossier.statut === "refuse" ? (
              <DevisClientView dossier={dossier} onAccepte={async()=>{
                await sbPatch("events_demandes", dossier.id, {statut:"accepte", client_reponse:"accepte", client_reponse_at:new Date().toISOString()});
                await creerNotification({pole:"EVENTS",type:"confirmation_commande",titre:"Devis accepté — "+dossier.reference,message:"Le client a accepté le devis.",canal:"interne",sourceTable:"events_demandes",sourceId:dossier.id});
                setDossier({...dossier, statut:"accepte", client_reponse:"accepte"});
              }} onRefuse={async()=>{
                await sbPatch("events_demandes", dossier.id, {statut:"refuse", client_reponse:"refuse", client_reponse_at:new Date().toISOString()});
                await creerNotification({pole:"EVENTS",type:"refus_devis",titre:"Devis refusé — "+dossier.reference,message:"Le client a refusé le devis.",canal:"interne",sourceTable:"events_demandes",sourceId:dossier.id});
                setDossier({...dossier, statut:"refuse", client_reponse:"refuse"});
              }}/>
            ) : null}

            {/* Historique — prêt pour les futures données d'audit_log */}
            <div style={{background:B.card,border:"1px solid "+EV.line,borderRadius:14,padding:"16px"}}>
              <div style={{fontSize:11,color:EV.cremeD,marginBottom:10,fontWeight:700,letterSpacing:1}}>HISTORIQUE</div>
              <div style={{display:"flex",gap:10,paddingLeft:4}}>
                <div style={{width:2,background:"rgba(16,185,129,0.2)",borderRadius:2}}/>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:10}}>
                  <div>
                    <div style={{fontSize:10,color:EV.cremeD}}>{fmt24(dossier.created_at)}</div>
                    <div style={{fontSize:12,color:EV.creme,marginTop:1}}>Demande créée</div>
                  </div>
                  {dossier.updated_at && dossier.updated_at !== dossier.created_at && (
                    <div>
                      <div style={{fontSize:10,color:EV.cremeD}}>{fmt24(dossier.updated_at)}</div>
                      <div style={{fontSize:12,color:EV.creme,marginTop:1}}>Dossier mis à jour</div>
                    </div>
                  )}
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.2)",fontStyle:"italic"}}>L'historique détaillé sera disponible prochainement.</div>
                </div>
              </div>
            </div>

            {/* Notifications à venir */}
            <div style={{background:B.card,border:"1px solid "+EV.line,borderRadius:14,padding:"16px"}}>
              <div style={{fontSize:11,color:EV.cremeD,marginBottom:10,fontWeight:700,letterSpacing:1}}>NOTIFICATIONS</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>🔔 Les notifications apparaîtront ici : nouveau message, devis disponible, confirmation de réservation…</div>
            </div>

            {/* Bouton de téléchargement (désactivé — bientôt disponible) */}
            <button disabled style={{width:"100%",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"12px",color:"rgba(255,255,255,0.3)",fontSize:13,fontFamily:SA,cursor:"not-allowed"}}>
              📄 Télécharger mon devis — Bientôt disponible
            </button>

            {/* Contact WhatsApp */}
            <button onClick={()=>window.open(WA("Bonjour, ma référence est "+dossier.reference+". Je souhaite des informations sur mon dossier."),"_blank")} style={{width:"100%",background:"rgba(37,211,102,0.12)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:10,padding:"12px",color:"#25d366",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:SA}}>
              💬 Contacter Bella'Events
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


