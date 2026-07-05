// ═══════════════════════════════════════════════════════════
// ClientEvents — Portail client Bella'Events (formulaire devis)
// ═══════════════════════════════════════════════════════════

function ClientEvents({ onBack, onNewCommande }) {
  const [cat, setCat] = useState(null);
  const [suivi, setSuivi] = useState(false);
  const [modal, setModal] = useState(null);   // {prestation, type} → ouvre le formulaire
  const [succes, setSucces] = useState(null); // référence après soumission
  const FORM_INIT = {prenom:"",nom:"",tel:"",email:"",date:"",heure:"",typeEvt:"",invites:"",theme:"",couleurs:"",budget:"",message:""};
  const [form, setForm] = useState(FORM_INIT);
  const [envoi, setEnvoi] = useState(false);

  // Prix d'affichage
  const prixAff = (p) => {
    if (p.sur_devis || p.prix == null) return "Sur devis";
    if (p.prix_max) return p.prix+"€ à "+p.prix_max+"€";
    if (p.prix_des) return "À partir de "+p.prix+"€";
    if (p.prix_jusqua) return "Jusqu'à "+p.prix+"€";
    return p.prix+"€"+(p.unite ? " / "+p.unite : "");
  };

  // Soumettre le formulaire devis/réservation — écrit en base (events_demandes)
  const soumettre = async () => {
    if (!form.prenom.trim() || !form.tel.trim()) { alert("Prénom et téléphone requis."); return; }
    setEnvoi(true);
    const p = modal.prestation;
    const type = modal.type;
    const ref = "EV" + Date.now().toString().slice(-6);
    const reference = await genererReference("BE");
    const montantNum = p.prix || 0;
    const lignesEstimees = analyserDemandeClient({
      prestation: p.nom, message: form.message, theme: form.theme,
      couleurs: form.couleurs, nbInvites: form.invites,
      typeEvt: form.typeEvt, budget: form.budget,
    });
    const totalEstime = lignesEstimees
      .filter(l => l.statut === "automatique" && l.total)
      .reduce((s, l) => s + l.total, 0);
    const montantEstimeFinal = totalEstime > 0 ? totalEstime : (montantNum || null);
    const acompteNum = Math.round(montantNum * (p.acompte_pct||30) / 100);
    const soldeNum   = montantNum - acompteNum;
    const demande = sanitizeEventsDemandePayload({
      reference,
      statut:           "nouvelle_demande",
      client_prenom:    form.prenom.trim(),
      client_nom:       form.nom.trim(),
      client_tel:       form.tel.trim(),
      client_email:     form.email.trim(),
      date_souhaitee:   form.date || null,
      heure_souhaitee:  form.heure || null,
      type_evenement:   form.typeEvt || null,
      nb_invites:       form.invites || null,
      theme:            form.theme || null,
      couleurs:         form.couleurs || null,
      budget:           form.budget || null,
      message:          form.message || null,
      pole:             "Bella'Events",
      categorie:        p.categorie || null,
      prestation:       p.nom,
      prix:             prixAff(p),
      acompte:          acompteNum > 0 ? acompteNum+"€" : null,
      delai:            p.delai_minimum || null,
      type_prestation:  p.type || "prestation",
      montant_estime:   montantEstimeFinal || null,
      montant_acompte:  acompteNum || null,
      montant_solde:    soldeNum   || null,
    });
    let echecEnregistrement = false;
    let erreurSb = null;
    try {
      const res = await sbPost("events_demandes", demande);
      console.log("Payload :", demande);
      console.log("Réponse Supabase :", res);
      if (!res.ok) {
        echecEnregistrement = true;
        erreurSb = res;
        console.error("Erreur Supabase :", res.error);
      } else {
        await ecrireAudit({
          module: "events_demandes", entiteId: ref, entiteRef: reference,
          action: "creation", nouveauStatut: "Nouvelle demande",
          commentaire: "Demande créée via formulaire client — "+p.nom,
        });
      }
    } catch (e) {
      echecEnregistrement = true;
      console.error("Erreur Supabase :", e);
    }
    if (echecEnregistrement) {
      const sb = erreurSb?.error;
      const lignes = [
        "Erreur HTTP "+erreurSb?.status,
        sb?.message    ? "Message : "+sb.message    : null,
        sb?.details    ? "Détails : "+sb.details    : null,
        sb?.hint       ? "Hint : "+sb.hint           : null,
        sb?.code       ? "Code : "+sb.code           : null,
        !sb            ? "Réponse : "+JSON.stringify(erreurSb?.data) : null,
      ].filter(Boolean).join("\n");
      alert("Échec enregistrement Supabase :\n\n"+lignes+"\n\nConsultez la console pour le diagnostic complet.");
      setEnvoi(false);
      return;
    }
    // Compat state local — alimente l'affichage immédiat côté fondatrice (en mémoire)
    const cmd = {
      id: ref,
      client: form.prenom+" "+form.nom.trim(),
      tel: form.tel, email: form.email,
      produit: p.nom,
      categorie: p.categorie, type: p.type||"prestation",
      prix: prixAff(p), montant: montantNum, acompte: acompteNum,
      statut: "Nouvelle demande",
      date: form.date || today(),
      heure: form.heure,
      typeEvt: form.typeEvt,
      invites: form.invites,
      theme: form.theme,
      couleurs: form.couleurs,
      budget: form.budget,
      message: form.message,
      pmt: "À confirmer",
      pole: "Events",
    };
    if (onNewCommande) onNewCommande(cmd);
    // Notification interne → fondatrice alertée d'une nouvelle demande
    creerNotification({
      pole: "EVENTS",
      type: "validation_devis",
      titre: "Nouvelle demande Events — "+p.nom,
      message: "Client : "+(form.prenom||"")+" "+(form.nom||"").trim()+"\nTél : "+(form.tel||"")+"\nPrestation : "+p.nom+"\nRéférence : "+reference,
      canal: "interne",
      clientEmail: form.email || null,
      clientTel: form.tel || null,
      sourceTable: "events_demandes",
      sourceId: ref,
    });
    // setSucces en premier — garantit que le re-render affiche l'écran de confirmation
    // avant que modal soit remis à null (évite le flash vers la vue catégorie)
    setSucces(reference);
    setEnvoi(false);
    setModal(null);
    setForm(FORM_INIT);
  };

  // Ouvrir le formulaire
  const ouvrir = (p, type) => {
    // Résoudre le nom lisible de la catégorie courante pour pré-remplir typeEvt
    const catObj = cat ? EVENTS_CATEGORIES.find(c => c.id === cat) : null;
    const typeEvtInit = catObj ? catObj.nom : "";
    setModal({prestation:p, type});
    setForm({...FORM_INIT, typeEvt: typeEvtInit});
    setSucces(null);
  };

  // Portail suivi de demande
  if (suivi) return <PortailSuiviClient onBack={()=>setSuivi(false)}/>;

  // Vue détail catégorie — seulement si aucune modale ni écran de succès actif
  if (cat && !modal && !succes) {
    const catObj = EVENTS_CATEGORIES.find(c => c.id === cat);
    const prestas = EVENTS_PRESTATIONS.filter(p => p.categorie === cat || p.sous === cat || (p.categories && p.categories.includes(cat)));
    return (
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"radial-gradient(ellipse at 20% 0%,"+EV.night+",#070d0a 65%)",fontFamily:SA,color:EV.creme}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid "+(EV.line),display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:22}}>{catObj?.ico}</span>
            <div><div style={{fontFamily:FS,fontSize:14,color:EV.or}}>{catObj?.nom}</div></div>
          </div>
          <button onClick={()=>setCat(null)} style={{background:"none",border:"1px solid "+(EV.line),borderRadius:8,padding:"4px 10px",color:EV.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Catégories</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:12}}>
          {/* Bannière catégorie */}
          <div style={{background:"linear-gradient(135deg,"+EV.or+"22,transparent)",border:"1px solid "+(EV.line),borderRadius:14,padding:"16px 18px"}}>
            <div style={{fontSize:13,color:EV.cremeD,lineHeight:1.6}}>{catObj?.desc}</div>
          </div>
          {prestas.length === 0 && <div style={{textAlign:"center",color:EV.cremeD,fontSize:13,padding:20}}>Prestations bientôt disponibles · contactez-nous pour un devis.</div>}
          {prestas.map((p, idx) => {
            const familles = cat === "unite" ? EVENTS_UNITE_FAMILLES : cat === "anniv" ? EVENTS_ANNIV_FAMILLES : null;
            const fam = familles && p.sous !== prestas[idx-1]?.sous
              ? familles.find(f => f.id === p.sous)
              : null;
            return (
            <React.Fragment key={p.id}>
              {fam && <div style={{fontSize:12,fontWeight:700,color:EV.or,marginTop:idx>0?8:0,paddingLeft:2}}>{fam.ico} {fam.nom}</div>}
            <div style={{background:EV.verre,border:"1px solid "+(EV.line),borderRadius:14,padding:"14px 16px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontFamily:FS,fontSize:14,fontWeight:700,color:EV.creme,flex:1}}>{p.nom}</div>
                <span style={{background:EV.or+"22",border:"1px solid "+(EV.or)+("55"),color:EV.or,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:700,whiteSpace:"nowrap",marginLeft:8}}>{prixAff(p)}</span>
              </div>
              <div style={{fontSize:12,color:EV.cremeD,marginBottom:8,lineHeight:1.5}}>{p.desc}</div>
              {p.note && <div style={{fontSize:10,color:EV.acc,marginBottom:10,fontStyle:"italic"}}>ℹ️ {p.note}</div>}
              {p.acompte_pct && <div style={{fontSize:10,color:EV.cremeD,marginBottom:10}}>Acompte {p.acompte_pct}%</div>}
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>ouvrir(p,"Demande de devis")} style={{flex:1,background:"transparent",border:"1px solid "+(EV.or),borderRadius:9,padding:"9px",color:EV.or,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:SA}}>📋 Demander un devis</button>
                {!p.sur_devis && <button onClick={()=>ouvrir(p,"Réservation")} style={{flex:1,background:EV.or,border:"none",borderRadius:9,padding:"9px",color:"#062b1d",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:SA}}>✓ Réserver</button>}
              </div>
            </div>
            </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  }

  // Modale formulaire devis / réservation
  if (modal) {
    const p = modal.prestation;
    const type = modal.type;
    const inp = (label, key, opts={}) => (
      <div style={{marginBottom:12}}>
        <label style={{fontSize:10,fontWeight:700,color:EV.cremeD,textTransform:"uppercase",letterSpacing:"0.06em",display:"block",marginBottom:4}}>{label}{opts.req?" *":""}</label>
        {opts.textarea
          ? <textarea value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} rows={3} placeholder={opts.ph||""} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid "+(EV.line),borderRadius:10,padding:"10px 12px",color:EV.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box",resize:"vertical"}}/>
          : <input type={opts.type||"text"} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={opts.ph||""} style={{width:"100%",background:"rgba(255,255,255,0.05)",border:"1px solid "+(EV.line),borderRadius:10,padding:"10px 12px",color:EV.creme,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
        }
      </div>
    );
    return (
      <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"radial-gradient(ellipse at 20% 0%,"+EV.night+",#070d0a 65%)",fontFamily:SA,color:EV.creme}}>
        <div style={{padding:"12px 16px",borderBottom:"1px solid "+(EV.line),display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
          <div style={{fontFamily:FS,fontSize:13,color:EV.or}}>✨ {type}</div>
          <button onClick={()=>setModal(null)} style={{background:"none",border:"1px solid "+(EV.line),borderRadius:8,padding:"4px 10px",color:EV.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>✕ Annuler</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:16}}>
          {/* Récap prestation */}
          <div style={{background:EV.or+"15",border:"1px solid "+(EV.line),borderRadius:12,padding:"12px 14px",marginBottom:16}}>
            <div style={{fontSize:11,color:EV.cremeD,marginBottom:3}}>Prestation sélectionnée</div>
            <div style={{fontSize:14,fontWeight:700,color:EV.creme}}>{p.nom}</div>
            <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
              <span style={{fontSize:10,color:EV.or,background:EV.or+"20",borderRadius:4,padding:"2px 7px"}}>{prixAff(p)}</span>
              <span style={{fontSize:10,color:EV.cremeD,background:"rgba(255,255,255,0.06)",borderRadius:4,padding:"2px 7px"}}>Acompte {p.acompte_pct||30}%</span>
              <span style={{fontSize:10,color:EV.cremeD,background:"rgba(255,255,255,0.06)",borderRadius:4,padding:"2px 7px"}}>Pôle Events</span>
            </div>
          </div>
          {/* Coordonnées */}
          <div style={{fontSize:11,fontWeight:700,color:EV.or,marginBottom:10}}>VOS COORDONNÉES</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>{inp("Prénom","prenom",{req:true})}</div>
            <div style={{flex:1}}>{inp("Nom","nom")}</div>
          </div>
          {inp("Téléphone","tel",{req:true,type:"tel",ph:"+594..."})}
          {inp("Email","email",{type:"email",ph:"votre@email.com"})}
          {/* ── VOTRE ÉVÉNEMENT — formulaire guidé ── */}
          <div style={{fontSize:11,fontWeight:700,color:EV.or,marginBottom:10,marginTop:4}}>VOTRE ÉVÉNEMENT</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>{inp("Date souhaitée","date",{type:"date"})}</div>
            <div style={{flex:1}}>{inp("Heure","heure",{ph:"14h00"})}</div>
          </div>

          {/* Type d'événement — menu déroulant */}
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,color:EV.cremeD,fontFamily:SA}}>Type d'événement</label>
            <select value={form.typeEvt||""}
              onChange={e=>setForm(f=>({...f,typeEvt:e.target.value}))}
              style={{background:"#1a1a2e",border:"1px solid "+EV.or+"44",borderRadius:8,
                padding:"8px 10px",color:form.typeEvt?"#fff":EV.cremeD,fontSize:12,
                fontFamily:SA,outline:"none",width:"100%"}}>
              <option value="">— Choisir le type —</option>
              {["Anniversaire","Baptême","Communion","Baby shower","Mariage","PACS",
                "Fiançailles","Gender reveal","Fête de fin d'année","Événement d'entreprise",
                "Repas en famille","Soirée entre amis","Retraite","Diplôme","Autre"].map(t=>(
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Prestation souhaitée — menu déroulant structuré */}
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,color:EV.cremeD,fontFamily:SA}}>Prestation principale</label>
            <select value={form.theme?.startsWith("PREST:")
                ? form.theme.replace("PREST:","") : ""}
              onChange={e=>setForm(f=>({...f,theme:"PREST:"+e.target.value}))}
              style={{background:"#1a1a2e",border:"1px solid "+EV.or+"44",borderRadius:8,
                padding:"8px 10px",color:"#fff",fontSize:12,fontFamily:SA,outline:"none",width:"100%"}}>
              <option value="">— Choisir une prestation —</option>
              <optgroup label="🎂 Pâtisserie">
                {["Gâteau classique","Gâteau forme carte de la Guyane","Layer cake",
                  "Bento cake","Number cake","Heart cake","Cupcakes",
                  "Entremets","Macarons","Mignardises"].map(o=>(
                  <option key={o} value={o}>{o}</option>
                ))}
              </optgroup>
              <optgroup label="🎨 Décoration">
                {["Décoration comestible","Décoration non comestible",
                  "Décoration complète","Arche de ballons","Arche de table",
                  "Fond de table / backdrop","Nappage","Éléments décoratifs thématiques"].map(o=>(
                  <option key={o} value={o}>{o}</option>
                ))}
              </optgroup>
              <optgroup label="📄 Papeterie">
                {["Papeterie personnalisée","Kit invité rempli","Invitations",
                  "Programme","Marque-places","Fanions"].map(o=>(
                  <option key={o} value={o}>{o}</option>
                ))}
              </optgroup>
              <optgroup label="🍽 Restauration">
                {["Menu enfant","Menu famille","Buffet","Repas végétarien",
                  "Boissons","Jus","Glaces","Traiteur complet"].map(o=>(
                  <option key={o} value={o}>{o}</option>
                ))}
              </optgroup>
              <optgroup label="📦 Location">
                {["Location vaisselle réutilisable","Pack événement complet"].map(o=>(
                  <option key={o} value={o}>{o}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Précision thème — champ libre complémentaire */}
          {inp("Thème / personnalisation","theme",{ph:"Jungle, princesse, super-héros, tropical..."})}

          <div style={{display:"flex",gap:8}}>
            <div style={{flex:1}}>{inp("Nombre d'invités","invites",{type:"number",ph:"20"})}</div>
            <div style={{flex:1}}>{inp("Couleurs","couleurs",{ph:"Rose, or, blanc..."})}</div>
          </div>

          {/* Saveur */}
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,color:EV.cremeD,fontFamily:SA}}>Saveur souhaitée</label>
            <select value={form.couleurs?.startsWith("SAV:")
                ? form.couleurs.replace("SAV:","") : ""}
              onChange={e=>setForm(f=>({...f,couleurs:"SAV:"+e.target.value}))}
              style={{background:"#1a1a2e",border:"1px solid "+EV.or+"44",borderRadius:8,
                padding:"8px 10px",color:"#fff",fontSize:12,fontFamily:SA,outline:"none",width:"100%"}}>
              <option value="">— Choisir une saveur (optionnel) —</option>
              {["Vanille","Chocolat","Chocolat blanc","Fraise","Citron","Caramel beurre salé",
                "Pralinée","Noix de coco","Fruits de la passion","Mangue","Rhum-raisin",
                "Sans gluten","Sans lactose","À définir ensemble"].map(s=>(
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Décoration */}
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,color:EV.cremeD,fontFamily:SA}}>Type de décoration</label>
            <select value={form.typeEvt?.startsWith("DEC:")
                ? form.typeEvt.replace("DEC:","") : ""}
              onChange={e=>setForm(f=>({...f,typeEvt:form.typeEvt?.startsWith("DEC:") ? e.target.value : form.typeEvt}))}
              style={{background:"#1a1a2e",border:"1px solid "+EV.or+"44",borderRadius:8,
                padding:"8px 10px",color:"#fff",fontSize:12,fontFamily:SA,outline:"none",width:"100%"}}>
              <option value="">— Décoration (optionnel) —</option>
              <option value="comestible">Comestible uniquement</option>
              <option value="non_comestible">Non comestible uniquement</option>
              <option value="mixte">Mixte (comestible + non comestible)</option>
              <option value="aucune">Sans décoration supplémentaire</option>
            </select>
          </div>

          {/* Options livraison / retrait */}
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            <label style={{fontSize:10,color:EV.cremeD,fontFamily:SA}}>Mode de récupération</label>
            <div style={{display:"flex",gap:6}}>
              {[["retrait","📦 Retrait à Sinnamary"],["livraison","🚗 Livraison (supplément)"]].map(([v,l])=>(
                <button key={v} type="button"
                  onClick={()=>setForm(f=>({...f,message:(f.message||"").replace(/\[livraison:[^\]]*\]/,"")+" [livraison:"+v+"]"}))}
                  style={{flex:1,padding:"8px",borderRadius:9,border:"none",cursor:"pointer",
                    fontSize:11,fontWeight:700,fontFamily:SA,
                    background:form.message?.includes("[livraison:"+v+"]")?"rgba(16,185,129,0.2)":"rgba(255,255,255,0.05)",
                    color:form.message?.includes("[livraison:"+v+"]")?EV.or:EV.cremeD}}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Allergies */}
          {inp("Allergies / contraintes alimentaires","message",{ph:"Intolérance lactose, gluten, noix..."})}
          {/* Budget */}
          {inp("Budget estimé (€)","budget",{type:"number",ph:"Optionnel — aide à personnaliser le devis"})}
          {/* Message libre */}
          {inp("Informations complémentaires","message",{textarea:true,ph:"Décrivez votre projet, vos envies, questions..."})}
          {/* Estimation automatique — se met à jour en temps réel */}
          {(()=>{
            const lignesAuto = analyserDemandeClient({
              prestation: p.nom, message: form.message,
              theme: form.theme, couleurs: form.couleurs,
              nbInvites: form.invites, typeEvt: form.typeEvt,
              budget: form.budget,
            });
            return lignesAuto.length > 0 ? <LignesDevisAuto lignes={lignesAuto} nbInvites={parseInt(form.invites)||0}/> : null;
          })()}
          {/* Boutons */}
          <button onClick={soumettre} disabled={envoi} style={{width:"100%",background:EV.or,border:"none",borderRadius:10,padding:"13px",color:"#062b1d",fontWeight:700,fontSize:14,cursor:envoi?"not-allowed":"pointer",fontFamily:SA,marginBottom:10,opacity:envoi?0.7:1}}>
            {envoi?"Envoi en cours…":"✓ Envoyer ma "+type.toLowerCase()}
          </button>
          <button onClick={()=>{
            const msg = [
              "✨ *" + type.toUpperCase() + " BELLA'EVENTS*",
              "",
              "Prestation : " + p.nom,
              "Tarif : " + prixAff(p),
              "Prénom : " + form.prenom,
              "Tél : " + form.tel,
              "Date : " + (form.date || "À définir"),
              "Thème : " + (form.theme || "À définir")
            ].join("\n");
            window.open(WA(msg),"_blank");
          }} style={{width:"100%",background:"transparent",border:"1px solid "+(EV.line),borderRadius:10,padding:"11px",color:EV.cremeD,fontSize:12,cursor:"pointer",fontFamily:SA}}>
            💬 Contacter sur WhatsApp (optionnel)
          </button>
        </div>
      </div>
    );
  }

  // Écran de succès
  if (succes) {
    const maintenant = new Date();
    const dateEnvoi  = maintenant.toLocaleDateString("fr-FR",{day:"2-digit",month:"long",year:"numeric"});
    const heureEnvoi = maintenant.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"});
    return (
      <div style={{minHeight:"100vh",background:"radial-gradient(ellipse at 20% 0%,"+EV.night+",#070d0a 65%)",display:"flex",flexDirection:"column",fontFamily:SA,color:EV.creme}}>
        {/* Header */}
        <div style={{padding:"12px 16px",borderBottom:"1px solid "+EV.line,display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)"}}>
          <div style={{fontFamily:FS,fontSize:14,color:EV.or}}>✨ Bella'Events</div>
          <div style={{fontSize:9,color:EV.cremeD,letterSpacing:2}}>CONFIRMATION</div>
        </div>

        <div style={{flex:1,overflowY:"auto",padding:"24px 20px"}}>
          {/* Icône + titre */}
          <div style={{textAlign:"center",marginBottom:24}}>
            <div style={{fontSize:52,marginBottom:12}}>✨</div>
            <div style={{fontFamily:FS,fontSize:22,color:EV.or,marginBottom:8}}>Demande envoyée !</div>
            <div style={{fontSize:14,color:EV.cremeD,lineHeight:1.7,maxWidth:320,margin:"0 auto"}}>Votre demande a bien été enregistrée.</div>
          </div>

          {/* Carte référence + date */}
          <div style={{background:"rgba(16,185,129,0.08)",border:"1px solid "+EV.or+"44",borderRadius:14,padding:"16px",marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:10,color:EV.cremeD,marginBottom:3,letterSpacing:1}}>RÉFÉRENCE</div>
                <div style={{fontSize:18,fontWeight:700,color:EV.or,fontFamily:FS}}>{succes}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:10,color:EV.cremeD,marginBottom:3,letterSpacing:1}}>ENVOYÉE LE</div>
                <div style={{fontSize:12,color:EV.creme}}>{dateEnvoi}</div>
                <div style={{fontSize:11,color:EV.cremeD}}>à {heureEnvoi}</div>
              </div>
            </div>
          </div>

          {/* Message délai */}
          <div style={{fontSize:13,color:EV.cremeD,lineHeight:1.7,marginBottom:24,textAlign:"center",padding:"0 8px"}}>
            Nous reviendrons vers vous sous 24 à 48 heures ouvrées afin de confirmer les détails de votre projet.
          </div>

          {/* Timeline des prochaines étapes */}
          <div style={{background:B.card,border:"1px solid "+EV.line,borderRadius:14,padding:"16px",marginBottom:20}}>
            <div style={{fontSize:10,color:EV.cremeD,fontWeight:700,letterSpacing:1,marginBottom:14}}>PROCHAINES ÉTAPES</div>
            <TimelineSuivi statutBrut="nouvelle_demande"/>
          </div>

          {/* Boutons */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <button onClick={()=>{setCat(null);setSucces(null);}} style={{background:EV.or,border:"none",borderRadius:10,padding:"13px 24px",color:"#062b1d",fontWeight:700,fontSize:14,cursor:"pointer",fontFamily:SA}}>← Retour aux catégories</button>
            <button onClick={()=>{setSucces(null);setModal(null);}} style={{background:"transparent",border:"1px solid "+EV.or+"66",borderRadius:10,padding:"12px 24px",color:EV.or,fontWeight:600,fontSize:13,cursor:"pointer",fontFamily:SA}}>+ Faire une autre demande</button>
            <button onClick={()=>window.open(WA("Bonjour, ma référence est "+succes+". Je souhaite des informations sur mon dossier."),"_blank")} style={{background:"rgba(37,211,102,0.1)",border:"1px solid rgba(37,211,102,0.3)",borderRadius:10,padding:"12px 24px",color:"#25d366",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:SA}}>💬 Contacter Bella'Events</button>
            <button disabled style={{background:"rgba(255,255,255,0.06)",border:"1px dashed rgba(255,255,255,0.2)",borderRadius:10,padding:"12px",color:"rgba(255,255,255,0.45)",fontSize:13,fontFamily:SA,cursor:"not-allowed",width:"100%",textAlign:"center"}}>
              📄 Télécharger mon devis — bientôt disponible
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vue liste des catégories
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100vh",background:"radial-gradient(ellipse at 20% 0%,"+EV.night+",#070d0a 65%)",fontFamily:SA,color:EV.creme}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid "+(EV.line),display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(0,0,0,0.3)",flexShrink:0}}>
        <div>
          <div style={{fontFamily:FS,fontSize:14,color:EV.or,letterSpacing:2}}>✨ Bella'Events</div>
          <div style={{fontSize:9,color:EV.cremeD,letterSpacing:2}}>ÉVÉNEMENTS · DÉCORATION · PAPETERIE</div>
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <button onClick={()=>setSuivi(true)} style={{background:"rgba(16,185,129,0.1)",border:"1px solid "+EV.line,borderRadius:8,padding:"4px 10px",color:EV.or,cursor:"pointer",fontSize:9,fontFamily:SA,fontWeight:700}}>🔍 Suivi</button>
          <button onClick={onBack} style={{background:"none",border:"1px solid "+EV.line,borderRadius:8,padding:"4px 10px",color:EV.cremeD,cursor:"pointer",fontSize:10,fontFamily:SA}}>‹ Portail</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:16}}>
        {/* Bannière principale */}
        <div style={{background:"linear-gradient(135deg,"+EV.or+"33,transparent)",border:"1px solid "+(EV.line),borderRadius:16,padding:"20px",marginBottom:16,textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:8}}>✨</div>
          <div style={{fontFamily:FS,fontSize:18,color:EV.or,marginBottom:6}}>Vos événements sur mesure</div>
          <div style={{fontSize:12,color:EV.cremeD,lineHeight:1.6}}>Décoration, papeterie, gâteaux et coordination. Demandez votre devis personnalisé.</div>
        </div>

        {/* Accès rapide Suivi — bien visible */}
        <button onClick={()=>setSuivi(true)} style={{width:"100%",background:"rgba(16,185,129,0.08)",border:"1px solid "+EV.line,borderRadius:12,padding:"13px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",marginBottom:16,textAlign:"left",fontFamily:SA}}>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:EV.or}}>🔎 Suivre ma demande</div>
            <div style={{fontSize:11,color:EV.cremeD,marginTop:2}}>Saisissez votre référence BE-2026-xxxxxx</div>
          </div>
          <span style={{color:EV.or,fontSize:16}}>›</span>
        </button>

        {/* Conditions clés */}
        <div style={{background:EV.verre,border:"1px solid "+(EV.line),borderRadius:12,padding:"12px 14px",marginBottom:16}}>
          <div style={{fontSize:10,color:EV.or,fontWeight:700,marginBottom:6}}>📋 CONDITIONS</div>
          <div style={{fontSize:11,color:EV.cremeD,lineHeight:1.7}}>
            Acompte {EVENTS_CONDITIONS.acompte_evenement}% (événementiel) · {EVENTS_CONDITIONS.acompte_gateau}% (gâteaux)<br/>
            Kit anniversaire : minimum {EVENTS_CONDITIONS.kit_min} exemplaires<br/>
            Livraison {EVENTS_CONDITIONS.livraison_km}€/km · forfait {EVENTS_CONDITIONS.livraison_forfait}€ au-delà de {EVENTS_CONDITIONS.livraison_seuil}km<br/>
            Délais : {EVENTS_CONDITIONS.delai_sucre} (pâte à sucre) · {EVENTS_CONDITIONS.delai_autre} (autres)
          </div>
        </div>
        {/* Grille catégories */}
        <div style={{fontSize:11,color:EV.cremeD,fontWeight:700,letterSpacing:"0.08em",marginBottom:10}}>NOS CATÉGORIES</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {EVENTS_CATEGORIES.map(c => {
            return (
              <div key={c.id} onClick={()=>setCat(c.id)} style={{background:EV.verre,border:"1px solid "+(EV.line),borderRadius:14,padding:"16px 12px",cursor:"pointer",textAlign:"center"}}>
                <div style={{fontSize:28,marginBottom:8}}>{c.ico}</div>
                <div style={{fontSize:12,fontWeight:700,color:EV.creme}}>{c.nom}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PORTAIL CLIENT BELLA'STRUCTURE — Modèles numériques
// ═══════════════════════════════════════════════════════════

