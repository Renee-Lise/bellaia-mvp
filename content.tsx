"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function PaiementSuccesContent() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const [statut, setStatut] = useState<"loading"|"reçu"|"en_attente">("loading");
  const [montant, setMontant] = useState<number|null>(null);

  useEffect(() => {
    if (!ref) { setStatut("en_attente"); return; }
    const verifier = async () => {
      try {
        const r = await fetch(`/api/payments/sumup/verify-status?ref=${ref}`);
        const d = await r.json();
        setStatut(d.statut === "reçu" ? "reçu" : "en_attente");
        if (d.montant) setMontant(d.montant);
      } catch { setStatut("en_attente"); }
    };
    verifier();
    const t = setTimeout(verifier, 3000);
    return () => clearTimeout(t);
  }, [ref]);

  const WA = process.env.NEXT_PUBLIC_WA_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}?text=${encodeURIComponent("Bonjour, j'ai effectué un paiement sur Bellaïa.")}`
    : "#";

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0d0b12",fontFamily:"Inter,system-ui,sans-serif",color:"#e8e3d5",padding:20}}>
      <div style={{maxWidth:380,width:"100%",textAlign:"center"}}>
        <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:26,color:"#c9a84c",marginBottom:32,letterSpacing:2}}>◎ Bella'Studio</div>
        {statut === "loading" && (
          <div style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:20,padding:"32px 24px",marginBottom:20}}>
            <div style={{fontSize:44,marginBottom:12}}>◎</div>
            <div style={{fontSize:16,color:"#c9a84c"}}>Vérification en cours…</div>
          </div>
        )}
        {statut === "reçu" && (
          <div style={{background:"rgba(74,222,128,0.08)",border:"2px solid rgba(74,222,128,0.3)",borderRadius:20,padding:"32px 24px",marginBottom:20}}>
            <div style={{fontSize:52,marginBottom:12}}>✅</div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,color:"#4ade80",marginBottom:8}}>Paiement confirmé !</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>
              Merci pour votre règlement{montant ? ` de ${montant}€` : ""}.<br/>Bella'Studio a bien reçu votre paiement.
            </div>
            {ref && <div style={{marginTop:12,fontSize:10,color:"rgba(255,255,255,0.3)"}}>Référence : {ref}</div>}
          </div>
        )}
        {statut === "en_attente" && (
          <div style={{background:"rgba(245,158,11,0.08)",border:"2px solid rgba(245,158,11,0.3)",borderRadius:20,padding:"32px 24px",marginBottom:20}}>
            <div style={{fontSize:52,marginBottom:12}}>⏳</div>
            <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,color:"#f59e0b",marginBottom:8}}>Paiement en cours</div>
            <div style={{fontSize:14,color:"rgba(255,255,255,0.6)"}}>Votre paiement est en cours de traitement.</div>
          </div>
        )}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <a href="/" style={{display:"block",background:"linear-gradient(135deg,#7c3aed,#c9a84c)",borderRadius:12,padding:14,color:"#fff",fontWeight:700,fontSize:14,textDecoration:"none"}}>← Retour à Bella'Studio</a>
          <a href={WA} target="_blank" rel="noreferrer" style={{display:"block",background:"linear-gradient(135deg,#25d366,#128c7e)",borderRadius:12,padding:12,color:"#fff",fontWeight:600,fontSize:13,textDecoration:"none"}}>💬 Contacter Bella'Studio</a>
        </div>
        <div style={{marginTop:20,fontSize:10,color:"rgba(255,255,255,0.25)"}}>🔒 Paiement sécurisé SumUp · Bella'Studio ne stocke aucune donnée bancaire</div>
      </div>
    </div>
  );
}
