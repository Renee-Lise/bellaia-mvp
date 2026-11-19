"use client";
import GardeApercu from "../../../modules/portails/GardeApercu";
// Aperçu du portail assistante — PRÉVISUALISATION uniquement (désactivé en production).
// Les données affichées sont celles de la session connectée, selon les règles d'accès en base.
import PortailAssistante from "../../../modules/portails/PortailAssistante";
export default function Apercu() {
  return <GardeApercu><PortailAssistante /></GardeApercu>;
}
