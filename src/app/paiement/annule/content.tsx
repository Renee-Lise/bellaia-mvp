"use client";
import { useSearchParams } from "next/navigation";

export default function PaiementAnnuleContent() {
  const params = useSearchParams();
  const ref = params.get("ref");
  const WA = process.env.NEXT_PUBLIC_WA_NUMBER
    ? `https://wa.me/${process.env.NEXT_PUBLIC_WA_NUMBER}?text=${encodeURIComponent("Bonjour, mon paiement n'a pas abouti. Pouvez-vous m'aider ?")}`
    : "#";

  return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0d0b12",fontFamily:"Inter,system-ui,sans-serif",color:"#e8e3d5",padding:20}}>
      <div style={{maxWidth:380,width:"100%",textAlign:"center"}}>
        <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:26,color:"#c9a84c",marginBottom:32,letterSpacing:2}}>◎ Bella'Studio</div>
        <div style={{background:"rgba(239,68,68,0.08)",border:"2px solid rgba(239,68,68,0.3)",borderRadius:20,padding:"32px 24px",marginBottom:20}}>
          <div style={{fontSize:52,marginBottom:12}}>✕</div>
          <div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",fontSize:22,color:"#ef4444",marginBottom:8}}>Paiement annulé</div>
          <div style={{fontSize:14,color:"rgba(255,255,255,0.6)",lineHeight:1.7}}>Le paiement n'a pas abouti. Vous pouvez réessayer ou nous contacter.</div>
          {ref && <div style={{marginTop:12,fontSize:10,color:"rgba(255,255,255,0.3)"}}>Référence : {ref}</div>}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <a href="/" style={{display:"block",background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:12,padding:12,color:"#e8e3d5",fontWeight:600,fontSize:13,textDecoration:"none"}}>← Retour</a>
          <a href={WA} target="_blank" rel="noreferrer" style={{display:"block",background:"linear-gradient(135deg,#25d366,#128c7e)",borderRadius:12,padding:12,color:"#fff",fontWeight:700,fontSize:13,textDecoration:"none"}}>💬 Contacter Bella'Studio</a>
        </div>
        <div style={{marginTop:20,fontSize:10,color:"rgba(255,255,255,0.25)"}}>🔒 Paiement sécurisé SumUp</div>
      </div>
    </div>
  );
}
