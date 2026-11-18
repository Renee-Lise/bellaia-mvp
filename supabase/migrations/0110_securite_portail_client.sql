-- ═══════════════════════════════════════════════════════════
-- 0110_securite_portail_client.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-18
-- Auteur : Claude Code · Date de rédaction : 2026-11-18
-- Objet : PRIORITÉ SÉCURITÉ (demande fondatrice du 18/11).
--   Failles corrigées :
--   • events_demandes : lisible SANS connexion (« Lecture demande par
--     référence » = true) et lisible / modifiable / supprimable par tout
--     compte connecté → réservé à l'équipe (fondatrice, assistante) ; une
--     cliente ne voit que SES dossiers (e-mail ou téléphone de son compte ;
--     client_id est une fiche CRM bellaia_clients, jamais un compte).
--   • events_devis, bellaia_factures, bellaia_paiements : lecture ET
--     écriture ouvertes à tout compte connecté → équipe uniquement ; une
--     cliente peut seulement DÉCLARER un paiement « en attente » à son nom.
--   Parcours client préservé, mais exécuté CÔTÉ SERVEUR (fonctions
--   sécurisées) au lieu d'écrire directement dans les tables :
--   • client_mes_dossiers_events()            mes dossiers
--   • client_dossier_events(ref, contact)     suivi par référence + e-mail
--                                             ou téléphone du dossier
--   • client_repondre_devis(ref, contact, décision, message)
--       accepter → commande + facture créées une seule fois (idempotent)
--   • client_declarer_paiement(ref, contact, option, mode)
--   Les notes internes de la fondatrice ne sont jamais renvoyées.
-- Non destructif : ALTER POLICY (expressions resserrées), ajouts.
-- ═══════════════════════════════════════════════════════════

-- client_id référence bellaia_clients (fiche CRM), pas un compte : aucun défaut auth.uid().
alter table public.events_demandes alter column client_id drop default;
alter table public.bellaia_paiements alter column client_id drop default;
alter table public.bellaia_paiements alter column cree_par set default auth.uid();

-- Le dossier appartient-il au compte connecté ?
create or replace function public.events_dossier_est_a_moi(d public.events_demandes) returns boolean
language sql stable security definer set search_path = public as $$
  with moi as (
    select (select lower(email) from auth.users where id = auth.uid()) as email,
           right(regexp_replace(coalesce((select telephone from public.profiles where id = auth.uid()), ''), '\D', '', 'g'), 9) as tel
  )
  select auth.uid() is not null and (
    (d.client_email is not null and lower(trim(d.client_email)) = (select email from moi))
    or (length((select tel from moi)) = 9 and right(regexp_replace(coalesce(d.client_tel, ''), '\D', '', 'g'), 9) = (select tel from moi))
  ) from moi;
$$;

-- Le contact saisi correspond-il au dossier ? (e-mail ou 9 derniers chiffres du téléphone)
create or replace function public.events_contact_correspond(d public.events_demandes, p_contact text) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(trim(p_contact), '') <> '' and (
    (d.client_email is not null and lower(trim(d.client_email)) = lower(trim(p_contact)))
    or (length(regexp_replace(p_contact, '\D', '', 'g')) >= 9 and right(regexp_replace(coalesce(d.client_tel, ''), '\D', '', 'g'), 9) = right(regexp_replace(p_contact, '\D', '', 'g'), 9))
  );
$$;

create or replace function public.events_dossier_public(d public.events_demandes) returns jsonb
language sql immutable set search_path = public as $$ select to_jsonb(d) - 'fondatrice_notes' $$;

create or replace function public.client_mes_dossiers_events() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.events_dossier_public(d) order by d.created_at desc), '[]'::jsonb)
  from public.events_demandes d where public.events_dossier_est_a_moi(d);
$$;

create or replace function public.client_dossier_events(p_reference text, p_contact text) returns jsonb
language sql stable security definer set search_path = public as $$
  select public.events_dossier_public(d) from public.events_demandes d
  where upper(trim(d.reference)) = upper(trim(p_reference))
    and (public.events_dossier_est_a_moi(d) or public.events_contact_correspond(d, p_contact))
  limit 1;
$$;

create or replace function public.client_repondre_devis(p_reference text, p_contact text, p_decision text, p_message text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare d public.events_demandes; cmd_ref text; cmd_id uuid; fac_ref text; total numeric; acompte numeric;
begin
  select * into d from public.events_demandes where upper(trim(reference)) = upper(trim(p_reference)) for update;
  if not found or not (public.events_dossier_est_a_moi(d) or public.events_contact_correspond(d, p_contact)) then
    raise exception 'Dossier introuvable';
  end if;
  if p_decision = 'refuse' then
    update public.events_demandes set statut = 'refuse', client_reponse = 'refuse', client_reponse_at = now(), devis_refuse_at = now() where id = d.id;
  elsif p_decision = 'modifier' then
    update public.events_demandes set statut = 'a_modifier',
      fondatrice_notes = coalesce(fondatrice_notes, '') || '[Demande de modification ' || to_char(now() at time zone 'America/Cayenne', 'DD/MM/YYYY HH24:MI') || '] ' || left(coalesce(p_message, ''), 2000) || E'\n'
    where id = d.id;
  elsif p_decision = 'accepte' then
    if d.liaison_comptable is null then
      total := coalesce(d.montant_estime, 0);
      acompte := coalesce(d.montant_acompte, round(total * 0.3, 2));
      select id, reference into cmd_id, cmd_ref from public.bellaia_commandes where source_table = 'events_demandes' and source_id = d.id limit 1;
      if cmd_id is null then
        cmd_ref := public.prochaine_reference('CMD');
        insert into public.bellaia_commandes (bu, reference, source_table, source_id, client_nom, client_tel, statut, total, acompte, solde, date_commande, devis_ref, created_by)
        values ('EVENTS', cmd_ref, 'events_demandes', d.id, trim(coalesce(d.client_prenom, '') || ' ' || coalesce(d.client_nom, '')), d.client_tel, 'COMMANDE', total, acompte, total - acompte, current_date, d.numero_devis, auth.uid())
        returning id into cmd_id;
      end if;
      fac_ref := public.prochaine_reference('FAC');
      insert into public.bellaia_factures (reference, business_unit, commande_id, source_table, client_nom, client_tel, client_email, lignes, sous_total, total_ttc, acompte, acompte_paye, solde, statut, date_emission)
      values (fac_ref, 'EVENTS', cmd_id, 'events_demandes', trim(coalesce(d.client_prenom, '') || ' ' || coalesce(d.client_nom, '')), d.client_tel, d.client_email, d.lignes_devis, total, total, acompte, false, total - acompte, 'emise', current_date);
      update public.events_demandes set statut = 'converti_en_commande', client_reponse = 'accepte', client_reponse_at = now(), devis_accepte_at = now(),
        liaison_comptable = fac_ref, numero_commande = cmd_ref, numero_facture = fac_ref
      where id = d.id;
    end if;
  else
    raise exception 'Décision inconnue';
  end if;
  select * into d from public.events_demandes where id = d.id;
  return jsonb_build_object('dossier', public.events_dossier_public(d), 'commande', d.numero_commande, 'facture', d.numero_facture);
end $$;

create or replace function public.client_declarer_paiement(p_reference text, p_contact text, p_option text, p_mode text) returns text
language plpgsql security definer set search_path = public as $$
declare d public.events_demandes; ref text; total numeric; acompte numeric; montant numeric;
begin
  if p_mode not in ('virement', 'especes', 'cheque', 'sumup', 'carte') or p_option not in ('acompte', 'total') then raise exception 'Mode ou option invalide'; end if;
  select * into d from public.events_demandes where upper(trim(reference)) = upper(trim(p_reference));
  if not found or not (public.events_dossier_est_a_moi(d) or public.events_contact_correspond(d, p_contact)) then raise exception 'Dossier introuvable'; end if;
  total := coalesce(d.montant_estime, 0); acompte := coalesce(d.montant_acompte, round(total * 0.3, 2));
  montant := case when p_option = 'total' then total else acompte end;
  ref := public.prochaine_reference('PAY');
  insert into public.bellaia_paiements (reference, business_unit, module, montant, montant_total, montant_acompte, mode, type_paiement, statut, client_nom, client_email, dossier_ref, motif, notes, date_paiement, cree_par)
  values (ref, 'EVENTS', 'EVENTS', montant, total, acompte, p_mode, p_option, 'en_attente', trim(coalesce(d.client_prenom, '') || ' ' || coalesce(d.client_nom, '')), d.client_email, d.reference,
          case when p_option = 'total' then 'Paiement intégral' else 'Acompte' end, 'Déclaré par le client — à confirmer', now(), auth.uid());
  return ref;
end $$;

revoke all on function public.client_mes_dossiers_events() from public;
revoke all on function public.client_dossier_events(text, text) from public;
revoke all on function public.client_repondre_devis(text, text, text, text) from public;
revoke all on function public.client_declarer_paiement(text, text, text, text) from public;
grant execute on function public.client_mes_dossiers_events() to authenticated;
grant execute on function public.client_dossier_events(text, text) to anon, authenticated;
grant execute on function public.client_repondre_devis(text, text, text, text) to anon, authenticated;
grant execute on function public.client_declarer_paiement(text, text, text, text) to authenticated;

-- ── Politiques resserrées ─────────────────────────────────
alter policy "Lecture demande par référence" on public.events_demandes to authenticated using (public.est_staff_bellaia());
alter policy "events_demandes_select_authenticated" on public.events_demandes using (public.est_staff_bellaia());
alter policy "Lecture fondatrice/assistante" on public.events_demandes using (public.est_staff_bellaia());
alter policy "Mise à jour fondatrice/assistante" on public.events_demandes using (public.est_staff_bellaia());
alter policy "events_demandes_update_authenticated" on public.events_demandes using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
alter policy "events_demandes_delete_authenticated" on public.events_demandes using (public.est_staff_bellaia());
-- Formulaire public : création d'une NOUVELLE demande uniquement (aucun statut comptable)
alter policy "Insertion publique" on public.events_demandes with check (coalesce(statut, 'nouvelle_demande') in ('nouvelle_demande', 'Nouvelle demande', 'a_traiter', 'À traiter') and liaison_comptable is null and numero_facture is null and coalesce(acompte_paye, false) = false);
alter policy "events_demandes_insert_public" on public.events_demandes with check (coalesce(statut, 'nouvelle_demande') in ('nouvelle_demande', 'Nouvelle demande', 'a_traiter', 'À traiter') and liaison_comptable is null and numero_facture is null and coalesce(acompte_paye, false) = false);
do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'events_demandes' and policyname = 'events_demandes_staff') then
    create policy events_demandes_staff on public.events_demandes for all to authenticated using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'events_demandes' and policyname = 'events_demandes_cliente') then
    create policy events_demandes_cliente on public.events_demandes for select to authenticated using (public.events_dossier_est_a_moi(events_demandes));
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bellaia_paiements' and policyname = 'pay_client_declare') then
    create policy pay_client_declare on public.bellaia_paiements for insert to authenticated with check (statut = 'en_attente' and cree_par = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'bellaia_paiements' and policyname = 'pay_client_mes_declarations') then
    create policy pay_client_mes_declarations on public.bellaia_paiements for select to authenticated using (cree_par = auth.uid());
  end if;
end $$;
alter policy "Lecture devis authentifié" on public.events_devis to authenticated using (public.est_staff_bellaia());
alter policy "Écriture devis authentifié" on public.events_devis to authenticated using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
alter policy factures_auth on public.bellaia_factures to authenticated using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
alter policy paiements_auth on public.bellaia_paiements to authenticated using (public.est_staff_bellaia()) with check (public.est_staff_bellaia());
