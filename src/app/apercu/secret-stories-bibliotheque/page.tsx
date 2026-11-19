"use client";
import GardeApercu from "../../../modules/portails/GardeApercu";
// Aperçu de la bibliothèque cliente BSH Secret Stories — PRÉVISUALISATION uniquement (désactivé en production).
// Le contenu dépend des contrôles serveur (adulte vérifiée, achats, abonnement).
import BibliothequeSecretStories from "../../../modules/secretStories/BibliothequeSecretStories";
export default function Apercu() {
  return <GardeApercu><BibliothequeSecretStories /></GardeApercu>;
}
