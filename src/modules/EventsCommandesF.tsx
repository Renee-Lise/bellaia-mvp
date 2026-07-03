// ═══════════════════════════════════════════════════════════
// EventsCommandesF — Module Bella'Events
// Extrait de BellaiaApp.tsx — refactor Phase 1
// ═══════════════════════════════════════════════════════════
// TODO Phase 2 : ajouter les imports explicites des helpers Supabase

function BellaEventsCommandes({ user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { data: cmds, reload } = useP1Data("events_commandes", { select:"*", order:"created_at.desc", limit:100 }, []);

  const CMD_COL = {
    "Demande reçue":"rgba(201,168,76,0.2)","Devis envoyé":"rgba(124,58,237,0.2)",
    "Acompte reçu":"rgba(13,148,136,0.2)","En préparation":"rgba(59,130,246,0.2)",
    "Livraison / Installation":"rgba(16,185,129,0.2)","Réalisé":"rgba(80,180,120,0.2)",
    "Archivé":"rgba(80,80,80,0.2)","Annulé":"rgba(180,80,80,0.2)"
  };
  const CMD_TXT = {
    "Demande reçue":B.warning,"Devis envoyé":B.violetL,"Acompte reçu":"#0d9488",
    "En préparation":"#3b82f6","Livraison / Installation":"#10b981","Réalisé":B.success,
    "Archivé":B.muted,"Annulé":B.danger
  };

  const save = async () => {
    if (!form.client_nom?.trim()) return;
    const ancienStatut = form._edit ? cmds.find(x=>x.id===form._edit)?.statut : null;
    const d = {...form, fondatrice_id:user?.id};
    delete d._edit;
    if (form._edit) {
      await sbPatch("events_commandes", form._edit, d);
      if (ancienStatut && ancienStatut !== d.statut) {
        await ecrireAudit({ module:"events_commandes", entiteId:form._edit, entiteRef:d.reference, action:"changement_statut", ancienStatut, nouveauStatut:d.statut, user });
      }
    } else {
      const reference = await genererReference("BEC");
      d.reference = reference;
      await sbPost("events_commandes", d);
      await ecrireAudit({ module:"events_commandes", entiteId:reference, entiteRef:reference, action:"creation", nouveauStatut:d.statut, user });
    }
    reload(); setModal(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:13,fontWeight:800,color:B.cream}}>Commandes Events ({cmds.length})</span>
        <Btn sm onClick={()=>{setForm({statut:"Demande reçue",date_creation:today()});setModal("cmd");}}>+ Commande</Btn>
      </div>
      {cmds.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucune commande</div>}
      {cmds.map(c=>(
        <div key={c.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:13,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
            <div>
              {c.reference && <div style={{fontSize:10,color:B.gold,fontWeight:700,marginBottom:2}}>{c.reference}</div>}
              <div style={{fontSize:13,fontWeight:700,color:B.cream,marginBottom:2}}>{c.client_nom}</div>
              <div style={{fontSize:10,color:B.muted}}>{c.type_evenement} · {c.date_evenement?fmt(c.date_evenement):"Date à définir"}</div>
              {c.nb_invites&&<div style={{fontSize:10,color:B.muted}}>👥 {c.nb_invites} invités</div>}
            </div>
            <div style={{textAlign:"right"}}>
              <span style={{background:CMD_COL[c.statut],color:CMD_TXT[c.statut],borderRadius:99,padding:"3px 9px",fontSize:9,fontWeight:700,display:"block",marginBottom:4}}>{c.statut}</span>
              {c.montant_total&&<div style={{fontSize:13,fontWeight:700,color:B.gold}}>{c.montant_total}€</div>}
            </div>
          </div>
          {c.detail_besoin&&<div style={{fontSize:11,color:B.muted,marginBottom:6,lineHeight:1.5}}>{c.detail_besoin.slice(0,80)}{c.detail_besoin.length>80?"…":""}</div>}
          <div style={{display:"flex",gap:5}}>
            <Btn sm v="ghost" onClick={()=>{setForm({...c,_edit:c.id});setModal("cmd");}}>✏</Btn>
            <Btn sm v="gold" onClick={()=>window.open(WA("Bonjour "+(c.client_nom)+", suite à votre commande Events..."),"_blank")}>💬</Btn>
            <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("events_commandes",c.id).then(reload);}}>✕</Btn>
          </div>
        </div>
      ))}

      {modal==="cmd"&&(
        <Mdl title={form._edit?"Modifier commande":"Nouvelle commande Events"} onClose={()=>setModal(null)}>
          <Fld label="Nom client *"><Inp value={form.client_nom||""} onChange={e=>setForm({...form,client_nom:e.target.value})} placeholder="Nom du client"/></Fld>
          <Fld label="Téléphone"><Inp value={form.client_tel||""} onChange={e=>setForm({...form,client_tel:e.target.value})} placeholder="+594..."/></Fld>
          <Fld label="Type d'événement"><Sel value={form.type_evenement||"Anniversaire"} onChange={e=>setForm({...form,type_evenement:e.target.value})} options={BE_FILTRES.slice(1)}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Date événement"><Inp type="date" value={form.date_evenement||""} onChange={e=>setForm({...form,date_evenement:e.target.value})}/></Fld>
            <Fld label="Nb invités"><Inp type="number" value={form.nb_invites||""} onChange={e=>setForm({...form,nb_invites:parseInt(e.target.value)||null})}/></Fld>
          </div>
          <Fld label="Détail du besoin"><Inp value={form.detail_besoin||""} onChange={e=>setForm({...form,detail_besoin:e.target.value})} placeholder="Décrivez les besoins du client" rows={3}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Montant total €"><Inp type="number" value={form.montant_total||""} onChange={e=>setForm({...form,montant_total:parseFloat(e.target.value)||null})}/></Fld>
            <Fld label="Acompte €"><Inp type="number" value={form.acompte||""} onChange={e=>setForm({...form,acompte:parseFloat(e.target.value)||null})}/></Fld>
          </div>
          <Fld label="Statut"><Sel value={form.statut||"Demande reçue"} onChange={e=>setForm({...form,statut:e.target.value})} options={BE_STATUTS_CMD}/></Fld>
          <Fld label="Notes internes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Notes" rows={2}/></Fld>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

