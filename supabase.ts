import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// Rôles Bellaïa V1.0 — cahier des charges officiel
export type Role =
  | "fondatrice"   // Accès total
  | "assistante"   // Accès administratif (sans données sensibles)
  | "prestataire"  // Accès missions assignées uniquement
  | "cliente"      // Accès ses données uniquement
  // Legacy — compatibilité base de données existante
  | "client"
  | "hote"
  | "partenaire";

// Mapping legacy → V1 (pour l'affichage)
export const ROLE_LABEL: Record<Role, string> = {
  fondatrice:  "Fondatrice",
  assistante:  "Assistante",
  prestataire: "Prestataire",
  cliente:     "Cliente",
  client:      "Cliente",      // legacy
  hote:        "Hôte / Talent", // legacy
  partenaire:  "Partenaire",   // legacy
};

// Rôles avec accès back-office
export const ROLES_ADMIN: Role[] = ["fondatrice", "assistante"];

// Rôles avec accès portail client
export const ROLES_CLIENT: Role[] = ["cliente", "client"];

// Rôles avec accès espace hôte
export const ROLES_HOTE: Role[] = ["prestataire", "hote"];

// Rôles avec accès espace partenaire
export const ROLES_PARTENAIRE: Role[] = ["partenaire"];

export function getEspace(role: Role): "fondatrice" | "client" | "hote" | "partenaire" {
  if (role === "fondatrice" || role === "assistante") return "fondatrice";
  if (role === "cliente" || role === "client")        return "client";
  if (role === "prestataire" || role === "hote")      return "hote";
  return "partenaire";
}

export interface Profile {
  id: string;
  email: string;
  nom: string | null;
  role: Role;
  tel: string | null;
  avatar_url: string | null;
  created_at: string;
}
