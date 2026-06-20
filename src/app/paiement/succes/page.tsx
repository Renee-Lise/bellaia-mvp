import { Suspense } from "react";
import PaiementSuccesContent from "./content";

export default function PaiementSucces() {
  return (
    <Suspense fallback={
      <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#0d0b12",color:"#c9a84c",fontFamily:"Georgia,serif",fontSize:24}}>◎</div>
    }>
      <PaiementSuccesContent />
    </Suspense>
  );
}
