// ═══════════════════════════════════════════════════════════
// EventsCatalogue — Module Bella'Events
// Extrait de BellaiaApp.tsx — refactor Phase 1
// ═══════════════════════════════════════════════════════════
// TODO Phase 2 : ajouter les imports explicites des helpers Supabase

function BellaEventsCatalogue({ user }) {
  const [filtre, setFiltre] = useState("Tous");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const { data: items, reload } = useP1Data("events_catalogue", { select:"*", order:"ordre.asc", limit:200 }, []);

  const itemsFiltres = items.filter(i => {
    const matchF = filtre==="Tous" || i.sous_categorie===filtre || i.categorie===filtre;
    const matchS = !search || i.nom.toLowerCase().includes(search.toLowerCase());
    return matchF && matchS;
  });

  const TYPES = ["prestation","location","creation","pack"];
  const CATS = ["Papeterie personnalisée","Créations personnalisées","Décoration événementielle","Location de matériel","Packs","Coordination légère"];
  const TYPE_ICO = {prestation:"⚡",location:"🔑",creation:"✨",pack:"📦"};
  const TYPE_COL = {prestation:"rgba(124,58,237,0.2)",location:"rgba(13,148,136,0.2)",creation:"rgba(201,168,76,0.2)",pack:"rgba(6,95,70,0.2)"};
  const TYPE_TXT = {prestation:B.violetL,location:"#0d9488",creation:B.gold,pack:"#10b981"};

  const save = async () => {
    if (!form.nom?.trim()) return;
    const d = {...form, fondatrice_id:user?.id, updated_at:new Date().toISOString()};
    delete d._edit;
    if (form._edit) await sbPatch("events_catalogue", form._edit, d);
    else await sbPost("events_catalogue", d);
    reload(); setModal(null);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",justifyContent:"flex-end"}}>
        <Btn sm onClick={()=>{setForm({type_item:"creation",statut:"actif",visible_client:true,categorie:"Papeterie personnalisée"});setModal("item");}}>+ Prestation</Btn>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{width:"100%",background:B.surface,border:"1px solid "+(B.border),borderRadius:10,padding:"8px 12px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
      <div style={{display:"flex",gap:4,overflowX:"auto",paddingBottom:2}}>
        {BE_FILTRES.map(f=>(
          <button key={f} onClick={()=>setFiltre(f)} style={{padding:"4px 9px",borderRadius:99,border:"1px solid "+(B.border),cursor:"pointer",fontSize:9,fontWeight:700,background:filtre===f?B.surface:"transparent",color:filtre===f?B.cream:B.muted,flexShrink:0,fontFamily:SA}}>{f}</button>
        ))}
      </div>

      {itemsFiltres.length===0&&<div style={{textAlign:"center",padding:"24px",color:B.muted,fontSize:13}}>Aucun article — exécute le SQL bellaia-events-catalogue.sql</div>}
      {itemsFiltres.map(i=>(
        <div key={i.id} style={{background:B.card,border:"1px solid "+(B.border),borderRadius:12,padding:"12px 14px"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:3,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:B.cream}}>{i.nom}</span>
                <span style={{background:TYPE_COL[i.type_item],color:TYPE_TXT[i.type_item],borderRadius:4,padding:"2px 6px",fontSize:9,fontWeight:700}}>{TYPE_ICO[i.type_item]} {i.type_item}</span>
              </div>
              <div style={{fontSize:10,color:B.muted,marginBottom:3}}>{i.sous_categorie||i.categorie}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:13,fontWeight:700,color:B.gold,marginBottom:3}}>{i.prix_unitaire?(i.prix_unitaire+"€"):(i.prix_note||"Sur devis")}</div>
              <div style={{display:"flex",gap:3}}>
                <Btn sm v="ghost" onClick={()=>{setForm({...i,_edit:i.id});setModal("item");}}>✏</Btn>
                <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("events_catalogue",i.id).then(reload);}}>✕</Btn>
              </div>
            </div>
          </div>
          {i.description&&<div style={{fontSize:10,color:B.muted,lineHeight:1.5}}>{i.description.slice(0,100)}{i.description.length>100?"…":""}</div>}
        </div>
      ))}

      {modal==="item"&&(
        <Mdl title={form._edit?"Modifier":"Nouvelle prestation"} onClose={()=>setModal(null)}>
          <Fld label="Nom *"><Inp value={form.nom||""} onChange={e=>setForm({...form,nom:e.target.value})} placeholder="Nom"/></Fld>
          <Fld label="Catégorie"><Sel value={form.categorie||"Papeterie personnalisée"} onChange={e=>setForm({...form,categorie:e.target.value})} options={CATS}/></Fld>
          <Fld label="Sous-catégorie"><Inp value={form.sous_categorie||""} onChange={e=>setForm({...form,sous_categorie:e.target.value})} placeholder="Sous-catégorie"/></Fld>
          <Fld label="Type"><Sel value={form.type_item||"creation"} onChange={e=>setForm({...form,type_item:e.target.value})} options={TYPES}/></Fld>
          <Fld label="Description"><Inp value={form.description||""} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Description" rows={2}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Prix €"><Inp type="number" value={form.prix_unitaire||""} onChange={e=>setForm({...form,prix_unitaire:parseFloat(e.target.value)||null})}/></Fld>
            <Fld label="Note prix"><Inp value={form.prix_note||""} onChange={e=>setForm({...form,prix_note:e.target.value})} placeholder="À partir de..."/></Fld>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <input type="checkbox" checked={!!form.visible_client} onChange={e=>setForm({...form,visible_client:e.target.checked})} id="vc_ev" style={{accentColor:B.violet,width:16,height:16}}/>
            <label htmlFor="vc_ev" style={{fontSize:12,color:B.cream,cursor:"pointer"}}>Visible par les clients</label>
          </div>
          <div style={{display:"flex",gap:8}}><Btn onClick={save} full>Enregistrer</Btn><Btn onClick={()=>setModal(null)} v="ghost">Annuler</Btn></div>
        </Mdl>
      )}
    </div>
  );
}

