"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaiementRetourContent() {
  const params  = useSearchParams();
  const ref     = params.get("ref");
  const statut_param = params.get("statut");

  const [etat, setEtat] = useState<"loading"|"reçu"|"en_attente"|"annulé">(
    statut_param === "annule" ? "annulé" : "loading"
  );
  const [montant, setMontant] = useState<number|null>(null);
  const [tentatives, setTentatives] = useState(0);

  useEffect(() => {
    if (statut_param === "annule") return;
    if (!ref) { setEtat("en_attente"); return; }
    verifier();
  }, []);

  const verifier = async () => {
    if (tentatives >= 4) { setEtat("en_attente"); return; }
    try {
      const r = await fetch(`/api/payments/sumup/verify-status?ref=${ref}`);
      const d = await r.json();
      if (d.montant) setMontant(d.montant);
      const s = d.statut;
      if (s === "reçu") { setEtat("reçu"); return; }
      if (s === "annulé") { setEtat("annulé"); return; }
      setTentatives(t => t + 1);
      setTimeout(verifier, 2500);
    } catch {
      setTentatives(t => t + 1);
      if (tentatives >= 3) setEtat("en_attente");
      else setTimeout(verifier, 3000);
    }
  };

  const WA = process.env.NEXT_PUBLIC_WA_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}?text=${encodeURIComponent("Bonjour, j'ai effectué un paiement sur Bellaïa.")}`
    : "#";

  const CFG: Record<string, {ico:string,col:string,titre:string,msg:string}> = {
    loading:    {ico:"◎",   col:"#7c3aed", titre:"Vérification…",       msg:"Confirmation de votre paiement en cours."},
    "reçu":     {ico:"✅",  col:"#4ade80", titre:"Paiement confirmé !",  msg:`Merci. Bella'Studio a bien reçu votre règlement${montant ? ` de ${montant}€` : ""}.`},
    en_attente: {ico:"⏳",  col:"#f59e0b", titre:"Paiement en cours",    msg:"Votre paiement est en cours de traitement."},
    "annulé":   {ico:"✕",   col:"#ef4444", titre:"Paiement annulé",      msg:"Le paiement n'a pas abouti. Vous pouvez réessayer."},
  };

  const c = CFG[etat] || CFG.loading;

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0d0b12",fontFamily:"Inter,system-ui,sans-serif",color:"#e8e3d5",padding:20}}>
      <div style={{maxWidth:380,width:"100%",textAlign:"center"}}>
        <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:26,color:"#c9a84c",marginBottom:32,letterSpacing:2}}>◎ Bella'Studio</div>
        <div style={{background:`${c.col}10`,border:`2px solid ${c.col}40`,borderRadius:20,padding:"32px 24px",marginBottom:20}}>
          <div style={{fontSize:52,marginBottom:12}}>{c.ico}</div>
          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,color:c.col,marginBottom:8}}>{c.titre}</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>{c.msg}</div>
          {ref && <div style={{marginTop:12,fontSize:10,color:"rgba(255,255,255,0.3)"}}>Réf : {ref}</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <a href="/" style={{display:"block",background:"linear-gradient(135deg,#7c3aed,#c9a84c)",borderRadius:12,padding:14,color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none"}}>← Retour à Bella'Studio</a>
          <a href={WA} target="_blank" rel="noreferrer" style={{display:"block",background:"linear-gradient(135deg,#25d366,#128c7e)",borderRadius:12,padding:12,color:"#fff",fontWeight:600,fontSize:13,textDecoration:"none"}}>💬 Contacter Bella'Studio</a>
        </div>
        <div style={{marginTop:20,fontSize:10,color:"rgba(255,255,255,0.25)"}}>🔒 Paiement sécurisé SumUp · Aucune donnée bancaire stockée</div>
      </div>
    </div>
  );
}
