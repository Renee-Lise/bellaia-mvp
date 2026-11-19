"use client";
import GardeApercu from "../../../modules/portails/GardeApercu";
// Aperçu du studio BSH Secret Stories — PRÉVISUALISATION uniquement (désactivé en production).
// Sans migration 0129 : mode simulation, rien n'est enregistré.
import StudioSecretStories from "../../../modules/secretStories/StudioSecretStories";
export default function Apercu() {
  return <GardeApercu><StudioSecretStories /></GardeApercu>;
}
