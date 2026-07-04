// ═══════════════════════════════════════════════════════════
// EventsDocumentsF — Module Bella'Events
// Extrait de BellaiaApp.tsx — refactor Phase 1
// ═══════════════════════════════════════════════════════════
// TODO Phase 2 : ajouter les imports explicites des helpers Supabase

function BellaEventsDocuments({ user }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { data: docs, reload } = useP1Data("documents", { select:"*", filters:{pole:"EVENTS"}, order:"created_at.desc", limit:100 }, []);

  const TYPES_DOC = ["devis","contrat_location","contrat_prestation","facture","checklist","planning","fiche_client","cahier_charges","autre"];
  const TYPE_ICO = {devis:"📋",contrat_location:"🔑",contrat_prestation:"📝",facture:"💰",checklist:"✅",planning:"📅",fiche_client:"👤",cahier_charges:"📑",autre:"📄"};

  const save = async () => {
    if (!form.titre?.trim()) return;
    const d = {...form, fondatrice_id:user?.id, pole:"EVENTS", updated_at:new Date().toISOString()};
    delete d._edit;
    if (form._edit) await sbPatch("documents", form._edit, d);
    else await sbPost("documents", d);
    reload(); setModal(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:9}}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <span style={{fontSize:13,fontWeight:800,color:B.cream}}>Documents Events ({docs.length})</span>
        <Btn sm onClick={()=>{setForm({type_doc:"devis",statut:"brouillon",pole:"EVENTS",partage_client:false});setModal("doc");}}>+ Document</Btn>
      </div>
      {docs.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucun document</div>}
      {docs.map(d=>(
        <div key={d.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"11px 13px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:3}}>
                <span style={{fontSize:16}}>{TYPE_ICO[d.type_doc]||"📄"}</span>
                <span style={{fontSize:12,fontWeight:700,color:B.cream}}>{d.titre}</span>
              </div>
              <div style={{display:"flex",gap:5}}>
                <Bdg s={d.statut}/>
                {d.signe&&<span style={{fontSize:9,background:"rgba(201,168,76,0.2)",color:B.gold,borderRadius:4,padding:"2px 5px",fontWeight:700}}>Signé</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:4}}>
              <Btn sm v="ghost" onClick={()=>{setForm({...d,_edit:d.id});setModal("doc");}}>✏</Btn>
              <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("documents",d.id).then(reload);}}>✕</Btn>
            </div>
          </div>
        </div>
      ))}

      {modal==="doc"&&(
        <Mdl title={form._edit?"Modifier document":"Nouveau document"} onClose={()=>setModal(null)}>
          <Fld label="Titre *"><Inp value={form.titre||""} onChange={e=>setForm({...form,titre:e.target.value})} placeholder="Titre du document"/></Fld>
          <Fld label="Type"><Sel value={form.type_doc||"devis"} onChange={e=>setForm({...form,type_doc:e.target.value})} options={TYPES_DOC}/></Fld>
          <Fld label="Statut"><Sel value={form.statut||"brouillon"} onChange={e=>setForm({...form,statut:e.target.value})} options={["brouillon","actif","archivé"]}/></Fld>
          <Fld label="Notes"><Inp value={form.notes||""} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Contenu ou notes" rows={3}/></Fld>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <input type="checkbox" checked={!!form.signe} onChange={e=>setForm({...form,signe:e.target.checked})} id="sg_ev" style={{accentColor:B.violet,width:16,height:16}}/>
            <label htmlFor="sg_ev" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Document signé</label>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// PORTAIL CLIENT BELLA'EVENTS — Catalogue commercial
// ═══════════════════════════════════════════════════════════
// Couleurs Events (vert émeraude)
