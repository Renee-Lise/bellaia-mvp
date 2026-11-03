-- ═══════════════════════════════════════════════════════════
-- 0075_bsh_billets_achat_paiement.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-03
-- Auteur : Claude Code · Date de rédaction : 2026-11-02
-- Objet : "On commence à gérer billetterie et paiement" — Phase 1
--   pour BSH Experiences. Audité avant d'écrire une ligne de SQL :
--   bsh_billets existe déjà (migration 0071, VALIDÉE) mais n'était
--   référencée nulle part dans le code — ni écran fondatrice, ni
--   achat client. Elle a volontairement 1 seule policy (fondatrice
--   ALL) et aucune policy d'update authenticated, pour que
--   statut_paiement ne soit jamais mis à 'paye' par un appel client
--   direct (commentaire d'origine : "en attendant un vrai
--   prestataire de paiement vérifié"). Ce prestataire existe déjà et
--   fonctionne en production pour d'autres univers (BSH boutique,
--   EVENTS) : SumUp, via /api/payments/sumup/create-checkout +
--   /api/payments/sumup/webhook + la table payments (toutes
--   préexistantes, non créées cette session). Phase 1 réutilise
--   exactement cette même chaîne, sans changer le principe de
--   sécurité d'origine : le client n'obtient JAMAIS d'INSERT/UPDATE
--   direct sur bsh_billets. La création du billet et son passage à
--   'paye' passent par deux routes serveur (clé service-role) :
--     - POST /api/bsh-experiences/billets/create-checkout (création
--       du billet en 'en_attente' + checkout SumUp)
--     - POST /api/payments/sumup/webhook (confirmation SumUp →
--       'paye'/'rembourse'/'annule', existant, étendu côté code)
--   Aucune policy RLS supplémentaire d'écriture n'est donc nécessaire
--   pour l'achat lui-même.
--
--   Colonnes ajoutées : identité acheteur (le champ existant
--   acheteur_nom suffisait pour une vente manuelle au guichet, pas
--   pour relier un billet à un compte Bellaïa ni contacter
--   l'acheteuse après l'achat), quantité (un même achat peut couvrir
--   plusieurs places), montant réellement facturé (prix × quantité,
--   calculé côté serveur au moment de l'achat — jamais recalculé
--   depuis le prix courant de l'événement, qui peut changer après
--   coup) et référence de paiement (pour retrouver la ligne
--   "payments" correspondante sans dépendre uniquement de
--   l'identifiant interne, utile en support client).
--
--   Policy ajoutée : bsh_billets_acheteur_select, pour qu'une
--   acheteuse connectée (client_id = son profil) puisse à terme voir
--   ses propres billets (ex. "Mes réservations") — lecture seule,
--   aucun écran ne l'exploite encore dans cette phase, mais elle
--   évite une migration séparée le jour où c'est demandé.
--
-- Impact : 5 colonnes ajoutées à bsh_billets (nullables ou avec
--   défaut, aucune donnée existante affectée — la table est vide,
--   jamais utilisée jusqu'ici), 1 policy SELECT ajoutée. Aucune table
--   ni colonne du système de paiement existant (payments) n'est
--   modifiée.
-- ═══════════════════════════════════════════════════════════

alter table public.bsh_billets
  add column if not exists client_id uuid references public.profiles(id) on delete set null,
  add column if not exists acheteur_email text,
  add column if not exists acheteur_tel text,
  add column if not exists quantite integer not null default 1,
  add column if not exists montant_total numeric,
  add column if not exists payment_reference text;

comment on column public.bsh_billets.montant_total is
  'Montant réellement facturé à l''achat (prix événement au moment de l''achat × quantité). Ne pas recalculer depuis bsh_evenements.prix, qui peut avoir changé depuis.';
comment on column public.bsh_billets.payment_reference is
  'Référence du paiement SumUp correspondant (payments.reference) — pour le support client, sans dépendre uniquement de l''id interne.';

drop policy if exists bsh_billets_acheteur_select on public.bsh_billets;
create policy bsh_billets_acheteur_select on public.bsh_billets
  for select to authenticated
  using (client_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='bsh_billets'
--     and column_name in ('client_id','acheteur_email','acheteur_tel','quantite','montant_total','payment_reference')
--   order by column_name;
--   → attendu : 6 lignes.
--
--   select tablename, policyname, cmd from pg_policies
--   where schemaname='public' and tablename='bsh_billets'
--   order by policyname;
--   → attendu : 2 lignes (bsh_billets_acheteur_select SELECT,
--     bsh_billets_fondatrice ALL — celle-ci existait déjà depuis la
--     migration 0071).
-- ═══════════════════════════════════════════════════════════
