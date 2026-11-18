-- ═══════════════════════════════════════════════════════════
-- RETOUR ARRIÈRE de 0112 — NE PAS EXÉCUTER sans accord de la fondatrice
-- Définitions sauvegardées en base le 2026-11-18 juste avant 0112.
--
-- ÉTAPE 1 (sans perte de données) : rétablit le comportement d'avant
--   sur les fonctions, policies et contraintes MODIFIÉES. Les nouvelles
--   tables restent en place (vides ou avec leurs saisies) mais ne sont
--   plus utilisées par l'ancien code.
-- ÉTAPE 2 (optionnelle, DESTRUCTIVE) : supprime les nouvelles tables et
--   leurs données (organisations, rôles, permissions, journal,
--   collection de revente…). À n'exécuter que sur demande écrite.
-- ═══════════════════════════════════════════════════════════

-- ── ÉTAPE 1 ────────────────────────────────────────────────
create or replace function public.est_staff_bellaia() returns boolean
language sql stable security definer set search_path to 'public' as $function$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('fondatrice', 'assistante'));
$function$;

create or replace function public.is_assistante() returns boolean
language sql stable security definer as $function$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('fondatrice','assistante'));
$function$;

create or replace function public.mission_maj_assignee(p_id uuid, p_statut text, p_commentaire text)
returns void language plpgsql security definer set search_path to 'public' as $function$
begin
  if p_statut not in ('a_faire','en_cours','a_valider','fait') then raise exception 'Statut invalide'; end if;
  update public.bellaia_missions set statut = p_statut, commentaire_equipe = left(coalesce(p_commentaire, commentaire_equipe), 2000), updated_at = now()
  where id = p_id and assigne_a = auth.uid();
  if not found then raise exception 'Mission introuvable'; end if;
end $function$;

alter policy missions_equipe on public.bellaia_missions using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
alter policy bellaia_commandes_creer on public.bellaia_commandes with check (true);
drop trigger if exists trg_commande_client_controle on public.bellaia_commandes;
drop trigger if exists trg_mission_autorisation on public.bellaia_missions;
drop trigger if exists trg_actions_hist on public.bellaia_actions;
-- La contrainte élargie des pôles de mission est conservée (plus
-- permissive, compatible avec l'ancien code).

-- ── ÉTAPE 2 (DESTRUCTIVE — uniquement sur demande écrite) ──
-- drop view if exists public.v_catalogue_public;
-- drop table if exists public.food_revente_commandes_fournisseur, public.food_revente_propositions,
--   public.food_revente_conditions, public.food_revente_produits, public.bellaia_documents_partenaire,
--   public.bellaia_autorisations, public.bellaia_missions_fil, public.bellaia_journal,
--   public.bellaia_permissions, public.bellaia_roles, public.bellaia_organisations;
-- alter table public.bellaia_commandes drop column if exists total_verifie;
-- alter table public.bellaia_actions drop column if exists date_limite, drop column if exists pieces_jointes,
--   drop column if exists historique, drop column if exists depend_de;
