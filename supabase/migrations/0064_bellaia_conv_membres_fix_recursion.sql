-- ═══════════════════════════════════════════════════════════
-- 0064_bellaia_conv_membres_fix_recursion.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-31
-- Objet : corrige l'erreur "infinite recursion detected in policy for
--   relation bellaia_conv_membres" vue en direct dans l'écran Messages
--   (capture d'écran fournie par Renée-Lise).
--
-- Cause : la policy SELECT existante (bconv_mbr_select, non créée par
--   une migration suivie ici — table antérieure au suivi des
--   migrations) vérifie l'appartenance avec une sous-requête qui
--   interroge bellaia_conv_membres DEPUIS une policy sur
--   bellaia_conv_membres :
--     exists (select 1 from bellaia_conv_membres m
--             where m.conversation_id = bellaia_conv_membres.conversation_id
--               and m.user_id = auth.uid())
--   Postgres réévalue la policy pour chaque ligne lue par la
--   sous-requête elle-même → boucle infinie. Confirmé par la requête
--   de diagnostic sur pg_policies.
--
-- Fix (pattern standard Supabase, déjà utilisé dans ce projet pour
--   est_staff_bellaia()/is_fondatrice()) : la vérification
--   d'appartenance est déplacée dans une fonction SECURITY DEFINER.
--   Exécutée avec les privilèges du propriétaire de la fonction, elle
--   n'est plus soumise à la policy RLS de bellaia_conv_membres au
--   moment de son propre SELECT interne → plus de boucle. Le résultat
--   logique de la policy est inchangé : une cliente voit toujours
--   exactement les lignes de membres des conversations dont elle
--   fait elle-même partie, ni plus ni moins.
--
-- Impact : 1 fonction ajoutée, 1 policy remplacée (même sémantique).
--   Aucune donnée touchée, aucune autre table/policy modifiée (la
--   policy bconv_mbr_insert et la policy conv_auth de
--   bellaia_conversations ne sont pas concernées par cette erreur et
--   seront traitées dans la migration de sécurité globale séparée).
-- ═══════════════════════════════════════════════════════════

create or replace function public.est_membre_conversation(p_conversation_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.bellaia_conv_membres
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$;

comment on function public.est_membre_conversation is
  'Vrai si l''auteur de la requête (auth.uid()) est membre de la conversation donnée. SECURITY DEFINER pour casser la récursion de bconv_mbr_select (voir migration 0064) — ne contient qu''une lecture fixe, aucune écriture, aucun paramètre libre autre que l''id de conversation.';

drop policy if exists bconv_mbr_select on public.bellaia_conv_membres;

create policy bconv_mbr_select on public.bellaia_conv_membres
  for select
  using (public.est_membre_conversation(conversation_id));

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select proname from pg_proc where proname = 'est_membre_conversation';
--   → attendu : 1 ligne.
--
--   select policyname, cmd, qual from pg_policies
--   where schemaname='public' and tablename='bellaia_conv_membres'
--     and policyname='bconv_mbr_select';
--   → attendu : cmd = 'SELECT', qual contient 'est_membre_conversation'.
--
--   Fonctionnel : rouvrir l'écran Messages (celui qui affichait
--   l'erreur "infinite recursion detected...") → doit maintenant
--   charger normalement, sans erreur.
-- ═══════════════════════════════════════════════════════════
