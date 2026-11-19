"use client";
import GardeApercu from "../../../modules/portails/GardeApercu";
// Aperçu du portail fondatrice premium — PRÉVISUALISATION uniquement (désactivé en production).
// Les données affichées respectent les règles d'accès : hors session fondatrice, les indicateurs restent vides.
import PortailFondatrice from "../../../modules/portails/PortailFondatrice";
export default function ApercuPortail() {
  return <GardeApercu><PortailFondatrice /></GardeApercu>;
}
