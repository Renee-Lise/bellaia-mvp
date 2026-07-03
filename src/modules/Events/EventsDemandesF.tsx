// ═══════════════════════════════════════════════════════════
// EventsDemandesF — Module Bella'Events
// Extrait de BellaiaApp.tsx — refactor Phase 1
// ═══════════════════════════════════════════════════════════
// TODO Phase 2 : ajouter les imports explicites des helpers Supabase

function BellaEventsF({ user }) {
  const [ong, setOng] = useState("demandes");
  const [modalDevis, setModalDevis] = useState(false);
  const [formDevis, setFormDevis] = useState({});
  const [modalConflit, setModalConflit] = useState(null); // {demande, conflits, dateDebut, dateFin}
  const [modalDevisGen, setModalDevisGen] = useState(null); // demande → ouverture éditeur devis
  // Demandes reçues via le formulaire client (table events_demandes)
  const [demandesEvents, setDemandesEvents] = useState([]);
  const [lDem, setLDem] = useState(true);
  const [erreurDem, setErreurDem] = useState(null);
  const rDem = useCallback(async () => {
    setLDem(true); setErreurDem(null);
    try {
      const token = await getTokenAsync();
      const r = await fetch((SB_URL)+"/rest/v1/events_demandes?select=*&order=created_at.desc&limit=100", {
        headers: { apikey: SB_KEY, Authorization: "Bearer "+(token), "Content-Type": "application/json" },
      });
      if (!r.ok) {
        const errBody = await r.text();
        console.error("[Bellaïa][events_demandes] Erreur lecture HTTP "+r.status+":", errBody);
        setErreurDem("Impossible de charger les demandes (erreur "+r.status+"). Vérifiez la connexion ou la configuration Supabase.");
        setDemandesEvents([]);
      } else {
        const rows = await r.json();
        console.log("[Bellaïa][events_demandes] "+(rows?.length||0)+" demande(s) récupérée(s).");
        setDemandesEvents(Array.isArray(rows) ? rows : []);
      }
    } catch (e) {
      console.error("[Bellaïa][events_demandes] Erreur réseau:", e);
      setErreurDem("Connexion impossible au serveur. Réessayez dans un instant.");
      setDemandesEvents([]);
    }
    setLDem(false);
  }, []);
  useEffect(() => { rDem(); }, [rDem]);
  const nbNouvelles = demandesEvents.filter(c => c.statut === "Nouvelle demande").length;

  const STATUTS_EV = ["Nouvelle demande","À traiter","Devis envoyé","Accepté","Refusé","Converti en commande"];
  const COL_STATUT = {
    "Nouvelle demande":"rgba(201,168,76,0.2)","À traiter":"rgba(124,58,237,0.2)",
    "Devis envoyé":"rgba(59,130,246,0.2)","Accepté":"rgba(16,185,129,0.2)",
    "Refusé":"rgba(180,80,80,0.2)","Converti en commande":"rgba(80,180,120,0.2)"
  };
  const TXT_STATUT = {
    "Nouvelle demande":B.warning,"À traiter":B.violetL,"Devis envoyé":"#3b82f6",
    "Accepté":B.success,"Refusé":B.danger,"Converti en commande":B.success
  };

  const changerStatut = async (d, statut) => {
    const ancienStatut = d.statut;
    await sbPatch("events_demandes", d.id, { statut, updated_at: new Date().toISOString() });
    await ecrireAudit({
      module: "events_demandes", entiteId: d.id, entiteRef: d.reference,
      action: "changement_statut", ancienStatut, nouveauStatut: statut, user,
    });
    rDem();
  };

  // Création manuelle d'un devis interne par la fondatrice — écrit dans events_demandes
  const creerDevisInterne = async () => {
    if (!formDevis.client?.trim() || !formDevis.tel?.trim()) { alert("Client et téléphone requis."); return; }
    const ref = "EV" + Date.now().toString().slice(-6);
    const reference = await genererReference("BE");
    const montantNum = parseFloat(formDevis.montant) || 0;
    const acompteNum = parseFloat(formDevis.acompte) || 0;
    const soldeNum   = montantNum - acompteNum;
    const demande = sanitizeEventsDemandePayload({
      reference,
      statut:          formDevis.statut || "nouvelle_demande",
      client_prenom:   formDevis.client.trim(),
      client_nom:      "",
      client_tel:      formDevis.tel.trim(),
      client_email:    formDevis.email || null,
      date_souhaitee:  formDevis.date  || null,
      heure_souhaitee: formDevis.heure || null,
      nb_invites:      formDevis.invites || null,
      theme:           formDevis.theme   || null,
      couleurs:        formDevis.couleurs|| null,
      budget:          formDevis.budget  || null,
      pole:            "Bella'Events",
      categorie:       formDevis.categorie || null,
      prestation:      formDevis.prestation || "Devis interne",
      type_prestation: "prestation",
      acompte:         acompteNum > 0 ? acompteNum+"€" : null,
      montant_estime:  montantNum || null,
      montant_acompte: acompteNum || null,
      montant_solde:   soldeNum   || null,
    });
    const res = await sbPost("events_demandes", demande);
    if (!res.ok) {
      console.error("[Bellaïa] Échec création devis interne:", res.error);
      const sb = res.error;
      const msg = [
        "Erreur HTTP "+res.status,
        sb?.message ? "Message : "+sb.message : null,
        sb?.details ? "Détails : "+sb.details : null,
        sb?.hint    ? "Hint : "+sb.hint       : null,
      ].filter(Boolean).join("\n");
      alert("Le devis n'a pas pu être enregistré :\n\n"+msg);
      return;
    }
    await ecrireAudit({
      module: "events_demandes", entiteId: ref, entiteRef: reference,
      action: "creation", nouveauStatut: demande.statut,
      commentaire: "Devis créé manuellement côté fondatrice", user,
    });
    setModalDevis(false);
    setFormDevis({});
    rDem();
  };

  // Convertir une demande en commande validée (events_commandes)
  const convertirEnCommande = async (d) => {
    const referenceCmd = await genererReference("BEC");
    const cmd = {
      reference: referenceCmd,
      client_nom: (d.client_prenom+" "+(d.client_nom||"")).trim(),
      client_tel: d.client_tel,
      type_evenement: d.type_evenement || d.presta_nom,
      date_evenement: d.date_souhaitee,
      nb_invites: d.nb_invites ? parseInt(d.nb_invites)||null : null,
      detail_besoin: d.message || d.presta_nom,
      montant_total: d.montant || null,
      acompte: d.acompte || null,
      statut: "Demande reçue",
      notes: "Convertie depuis demande "+(d.reference||d.id),
      fondatrice_id: user?.id,
    };
    await sbPost("events_commandes", cmd);
    await ecrireAudit({
      module: "events_commandes", entiteId: d.id, entiteRef: referenceCmd,
      action: "creation", commentaire: "Convertie depuis demande "+(d.reference||d.id), user,
    });
    await changerStatut(d, "Converti en commande");

    // Création automatique dans le planning si une date est connue
    if (d.date_souhaitee) {
      const heure = d.heure_souhaitee || "10:00";
      const dateDebut = new Date(d.date_souhaitee+"T"+(heure.replace("h",":").padEnd(5,"0")));
      const dureeMin = d.duree_estimee_min || 120;
      const dateFin = new Date(dateDebut.getTime() + dureeMin*60000);
      const res = await creerEvenementPlanning({
        pole: "EVENTS", titre: (d.presta_nom||"Événement")+" — "+(d.client_prenom||""),
        dateDebut, dateFin, typeActivite: "evenement",
        sourceTable: "events_commandes", sourceId: referenceCmd,
      }, { user });
      if (!res.ok) {
        setModalConflit({ demande: d, conflits: res.conflits, dateDebut, dateFin, referenceCmd });
      }
    }
  };

  // Forcer la création planning malgré le conflit (fondatrice uniquement)
  const forcerCreationPlanning = async () => {
    if (!modalConflit) return;
    const { demande, dateDebut, dateFin, referenceCmd } = modalConflit;
    await creerEvenementPlanning({
      pole: "EVENTS", titre: (demande.presta_nom||"Événement")+" — "+(demande.client_prenom||""),
      dateDebut, dateFin, typeActivite: "evenement",
      sourceTable: "events_commandes", sourceId: referenceCmd,
    }, { force: true, user });
    setModalConflit(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:"linear-gradient(135deg,rgba(6,95,70,0.3),rgba(16,185,129,0.1))",border:"1px solid rgba(6,95,70,0.4)",borderRadius:16,padding:"14px 16px",textAlign:"center"}}>
        <div style={{fontSize:32,marginBottom:4}}>✨</div>
        <div style={{fontFamily:FS,fontSize:17,fontWeight:900,color:B.cream,marginBottom:2}}>Bella'Events</div>
        <div style={{fontSize:11,color:B.muted}}>Papeterie · Décoration · Location · Coordination légère</div>
      </div>
      {/* Onglets */}
      <div style={{display:"flex",gap:5,overflowX:"auto"}}>
        {[["demandes","📋 Demandes"+(nbNouvelles>0 ? " ("+(nbNouvelles)+")" : "")],["catalogue","🛍 Catalogue"],["commandes","📦 Commandes"],["documents","📄 Documents"]].map(([id,l])=>(
          <button key={id} onClick={()=>setOng(id)} style={{padding:"6px 12px",borderRadius:99,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,background:ong===id?"#065f46":B.card,color:ong===id?"#fff":B.muted,fontFamily:SA,flexShrink:0,position:"relative"}}>{l}</button>
        ))}
      </div>

      {/* Onglet Demandes */}
      {ong==="demandes" && (
        <div style={{display:"flex",flexDirection:"column",gap:9}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <div style={{fontSize:13,fontWeight:800,color:B.cream}}>Demandes de devis & réservations ({demandesEvents.length})</div>
            <Btn sm v="gold" onClick={()=>{setFormDevis({statut:"À traiter"});setModalDevis(true);}}>+ Créer un devis</Btn>
          </div>
          {lDem && <div style={{textAlign:"center",padding:"20px",color:B.muted,fontSize:12}}>Chargement…</div>}
          {!lDem && erreurDem && (
            <div style={{background:"rgba(180,80,80,0.12)",border:"1px solid rgba(180,80,80,0.35)",borderRadius:12,padding:"14px",textAlign:"center"}}>
              <div style={{fontSize:12,color:B.danger,fontWeight:700,marginBottom:6}}>⚠ {erreurDem}</div>
              <Btn sm v="ghost" onClick={rDem}>Réessayer</Btn>
            </div>
          )}
          {!lDem && !erreurDem && demandesEvents.length===0 && <div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucune demande reçue pour le moment</div>}
          {!lDem && !erreurDem && demandesEvents.map(c=>(
            <div key={c.id} style={{background:B.card,border:"1px solid "+B.border,borderRadius:13,padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <div>
                  <span style={{fontSize:10,color:B.gold,fontWeight:700,marginRight:6}}>{c.reference || c.id}</span>
                  <span style={{background:COL_STATUT[c.statut]||"rgba(255,255,255,0.05)",color:TXT_STATUT[c.statut]||B.muted,fontSize:9,fontWeight:700,borderRadius:4,padding:"2px 7px"}}>{c.statut}</span>
                </div>
                <span style={{fontSize:11,color:B.muted}}>{c.created_at ? fmt(c.created_at.split("T")[0]) : ""}</span>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:B.cream,marginBottom:2}}>{c.client_prenom} {c.client_nom}</div>
              <div style={{fontSize:11,color:B.muted,marginBottom:4}}>{c.prestation}{c.categorie?" · "+c.categorie:""}{c.prix?" · "+c.prix:""}</div>
              {c.client_tel && <div style={{fontSize:10,color:B.muted}}>📞 {c.client_tel}</div>}
              {c.client_email && <div style={{fontSize:10,color:B.muted}}>✉️ {c.client_email}</div>}
              {(c.date_souhaitee || c.heure_souhaitee) && <div style={{fontSize:10,color:B.muted}}>📅 {c.date_souhaitee?fmt(c.date_souhaitee):"Date à définir"}{c.heure_souhaitee?" à "+c.heure_souhaitee:""}</div>}
              {c.type_evenement && <div style={{fontSize:10,color:B.muted}}>{"🎉 "+c.type_evenement+(c.nb_invites?" · "+c.nb_invites+" invités":"")}</div>}
              {c.theme && <div style={{fontSize:10,color:B.muted}}>🎨 Thème : {c.theme}</div>}
              {c.budget && <div style={{fontSize:10,color:B.muted}}>💰 Budget : {c.budget}</div>}
              {c.message && <div style={{fontSize:10,color:B.muted,marginTop:4,fontStyle:"italic"}}>"{c.message}"</div>}
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                {STATUTS_EV.map(s=>(
                  <button key={s} onClick={()=>changerStatut(c, s)} style={{fontSize:9,padding:"3px 7px",borderRadius:4,border:"1px solid "+(s===c.statut?"#10b981":"rgba(255,255,255,0.1)"),background:s===c.statut?"rgba(16,185,129,0.15)":"transparent",color:s===c.statut?"#10b981":B.muted,cursor:"pointer",fontFamily:SA}}>{s}</button>
                ))}
              </div>
              {/* Estimation devis automatique fondatrice */}
              {(()=>{
                const lg = analyserDemandeClient({
                  prestation: c.prestation, message: c.message,
                  theme: c.theme, couleurs: c.couleurs,
                  nbInvites: c.nb_invites, typeEvt: c.type_evenement,
                  budget: c.budget,
                });
                return lg.length > 0 ? <div style={{marginTop:8}}><LignesDevisAuto lignes={lg} nbInvites={parseInt(c.nb_invites)||0}/></div> : null;
              })()}
              {c.statut!=="Converti en commande" && (
                <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                  {c.statut!=="devis_envoye" && c.statut!=="accepte" && (
                    <Btn sm v="gold" onClick={()=>setModalDevisGen(c)}>📄 Générer le devis</Btn>
                  )}
                  {(c.statut==="devis_envoye"||c.statut==="accepte") && (
                    <Btn sm v="ghost" onClick={()=>setModalDevisGen(c)}>✏ Modifier le devis</Btn>
                  )}
                  <Btn sm v="ghost" onClick={()=>convertirEnCommande(c)}>→ Convertir en commande</Btn>
                </div>
              )}
            </div>
          ))}
        </div>

      )}
      {ong==="catalogue" && <BellaEventsCatalogue user={user}/>}
      {ong==="commandes" && <BellaEventsCommandes user={user}/>}
      {ong==="documents" && <BellaEventsDocuments user={user}/>}

      {/* Modale génération / édition devis fondatrice */}
      {modalDevisGen && (
        <ModalGenerationDevis
          demande={modalDevisGen}
          user={user}
          onClose={()=>setModalDevisGen(null)}
          onValide={()=>{setModalDevisGen(null); rDem();}}
        />
      )}

      {/* Modale création devis interne fondatrice */}
      {modalDevis && (
        <Mdl title="Créer un devis" onClose={()=>{setModalDevis(false);setFormDevis({});}}>
          <Fld label="Client *"><Inp value={formDevis.client||""} onChange={e=>setFormDevis({...formDevis,client:e.target.value})} placeholder="Nom du client"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Téléphone *"><Inp value={formDevis.tel||""} onChange={e=>setFormDevis({...formDevis,tel:e.target.value})} placeholder="+594..."/></Fld>
            <Fld label="Email"><Inp type="email" value={formDevis.email||""} onChange={e=>setFormDevis({...formDevis,email:e.target.value})} placeholder="email@..."/></Fld>
          </div>
          <Fld label="Prestation"><Inp value={formDevis.prestation||""} onChange={e=>setFormDevis({...formDevis,prestation:e.target.value})} placeholder="Nom de la prestation"/></Fld>
          <Fld label="Catégorie"><Sel value={formDevis.categorie||""} onChange={e=>setFormDevis({...formDevis,categorie:e.target.value})} options={["", ...EVENTS_CATEGORIES.map(c=>c.id)]}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Date"><Inp type="date" value={formDevis.date||""} onChange={e=>setFormDevis({...formDevis,date:e.target.value})}/></Fld>
            <Fld label="Heure"><Inp value={formDevis.heure||""} onChange={e=>setFormDevis({...formDevis,heure:e.target.value})} placeholder="14h00"/></Fld>
          </div>
          <Fld label="Nombre d'invités"><Inp type="number" value={formDevis.invites||""} onChange={e=>setFormDevis({...formDevis,invites:e.target.value})}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Thème"><Inp value={formDevis.theme||""} onChange={e=>setFormDevis({...formDevis,theme:e.target.value})}/></Fld>
            <Fld label="Couleurs"><Inp value={formDevis.couleurs||""} onChange={e=>setFormDevis({...formDevis,couleurs:e.target.value})}/></Fld>
          </div>
          <Fld label="Budget annoncé (€)"><Inp type="number" value={formDevis.budget||""} onChange={e=>setFormDevis({...formDevis,budget:e.target.value})}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Montant (€)"><Inp type="number" value={formDevis.montant||""} onChange={e=>setFormDevis({...formDevis,montant:e.target.value})}/></Fld>
            <Fld label="Acompte (€)"><Inp type="number" value={formDevis.acompte||""} onChange={e=>setFormDevis({...formDevis,acompte:e.target.value})}/></Fld>
          </div>
          <Fld label="Statut"><Sel value={formDevis.statut||"À traiter"} onChange={e=>setFormDevis({...formDevis,statut:e.target.value})} options={STATUTS_EV}/></Fld>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={creerDevisInterne} full v="gold">Créer le devis</Btn>
            <Btn onClick={()=>{setModalDevis(false);setFormDevis({});}} v="ghost">Annuler</Btn>
          </div>
        </Mdl>
      )}

      {/* Modale conflit planning */}
      {modalConflit && (
        <Mdl title="⚠ Conflit de planning détecté" onClose={()=>setModalConflit(null)}>
          <div style={{background:"rgba(180,80,80,0.12)",border:"1px solid rgba(180,80,80,0.35)",borderRadius:12,padding:"12px 14px",marginBottom:14}}>
            <div style={{fontSize:12,color:B.danger,fontWeight:700,marginBottom:6}}>Ce créneau chevauche déjà une activité prévue :</div>
            {modalConflit.conflits.map(c=>(
              <div key={c.id} style={{fontSize:12,color:B.cream,marginBottom:4,paddingLeft:6,borderLeft:"2px solid "+B.danger}}>
                <strong>{c.titre}</strong> ({c.pole})<br/>
                <span style={{fontSize:10,color:B.muted}}>{new Date(c.date_debut).toLocaleString("fr-FR")} → {new Date(c.date_fin).toLocaleString("fr-FR")}</span>
              </div>
            ))}
          </div>
          <div style={{fontSize:12,color:B.muted,marginBottom:16,lineHeight:1.6}}>
            La commande a bien été créée, mais elle n'a pas été ajoutée au planning pour éviter un double engagement. Choisissez une autre date depuis la fiche commande, ou forcez l'ajout si vous confirmez pouvoir gérer ce chevauchement.
          </div>
          {user?.role !== "assistante" ? (
            <div style={{display:"flex",gap:8}}>
              <Btn v="danger" full onClick={forcerCreationPlanning}>Forcer malgré le conflit</Btn>
              <Btn v="ghost" onClick={()=>setModalConflit(null)}>Choisir une autre date</Btn>
            </div>
          ) : (
            <div>
              <div style={{fontSize:11,color:B.warning,marginBottom:10}}>Seule la fondatrice peut forcer un créneau en conflit.</div>
              <Btn v="ghost" full onClick={()=>setModalConflit(null)}>Choisir une autre date</Btn>
            </div>
          )}
        </Mdl>
      )}
    </div>
  );
}


