// ═══════════════════════════════════════════════════════════
// Permissions côté serveur (18/11)
// Une assistante n'a PLUS automatiquement les droits de la fondatrice :
// chaque accès sensible exige une permission accordée par la fondatrice
// (table bellaia_permissions, migration 0112). La fondatrice a tout.
// ═══════════════════════════════════════════════════════════

/** Avec un client Supabase porteur du jeton de l'utilisateur (RLS). */
export async function permisUtilisateur(sb: any, code: string, univers = "*", roleConnu?: string | null): Promise<boolean> {
  if (roleConnu === "fondatrice") return true;
  try {
    const { data, error } = await sb.rpc("a_permission", { p: code, u: univers });
    return !error && data === true;
  } catch { return false; }
}

/** Avec le client service (aucune RLS) : vérification explicite par identifiant. */
export async function permisParId(sbAdmin: any, userId: string, role: string | null | undefined, code: string, univers = "*"): Promise<boolean> {
  if (role === "fondatrice") return true;
  try {
    // « * » : compatible avant et après la migration 0136 (colonne « statut » : une permission révoquée ne compte plus)
    const { data } = await sbAdmin.from("bellaia_permissions").select("*")
      .eq("user_id", userId).in("permission", [code, "acces_complet"]);
    return (data || []).some((p: any) => (p.statut ?? "active") === "active" && (p.univers === "*" || p.univers === univers) && (!p.expire_le || new Date(p.expire_le) > new Date()));
  } catch { return false; }
}

/** Destinataires d'une alerte interne : fondatrice + personnes autorisées. */
export async function destinatairesAlertes(sbAdmin: any, code = "notifications.commandes"): Promise<string[]> {
  const ids = new Set<string>();
  const { data: f } = await sbAdmin.from("profiles").select("id").eq("role", "fondatrice");
  (f || []).forEach((p: any) => ids.add(p.id));
  try {
    const { data: perms } = await sbAdmin.from("bellaia_permissions").select("user_id,expire_le").in("permission", [code, "acces_complet"]);
    (perms || []).forEach((p: any) => { if (!p.expire_le || new Date(p.expire_le) > new Date()) ids.add(p.user_id); });
  } catch {}
  return Array.from(ids);
}
