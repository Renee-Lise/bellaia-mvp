"use client";
import GardeApercu from "../../../modules/portails/GardeApercu";
// Aperçu du portail cliente — PRÉVISUALISATION uniquement (désactivé en production).
// Les données affichées sont celles de la session connectée, selon les règles d'accès en base.
import PortailClient from "../../../modules/portails/PortailClient";
export default function Apercu() {
  return <GardeApercu><PortailClient /></GardeApercu>;
}
