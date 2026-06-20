import { Suspense } from "react";
import PaiementRetourContent from "./content";

export default function PaiementRetour() {
  return (
    <Suspense fallback={
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0d0b12",color:"#c9a84c",fontFamily:"Georgia,serif",fontSize:24}}>◎</div>
    }>
      <PaiementRetourContent />
    </Suspense>
  );
}
