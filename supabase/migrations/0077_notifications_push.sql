-- ═══════════════════════════════════════════════════════════
-- 0077_notifications_push.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-11-03
-- Objet : notifications push façon Shein/WhatsApp/TikTok (demande
--   explicite de Renée-Lise, suite à l'absence de notification
--   visible sur l'écran d'accueil fondatrice lors d'une nouvelle
--   commande Food). Standard Web Push (VAPID) — fonctionne sur
--   Android dès aujourd'hui, et sur iPhone si l'app est installée
--   sur l'écran d'accueil (iOS l'exige pour les PWA, pas pour Safari
--   classique). Aucun compte tiers payant requis.
--
--   Une "souscription" (endpoint + clés de chiffrement du
--   navigateur) est créée par appareil quand la fondatrice ou
--   l'assistante active les notifications — jamais pour une cliente,
--   jamais sans action explicite de sa part (bouton "Activer les
--   notifications", pas de demande de permission automatique au
--   chargement). Plusieurs appareils (téléphone + ordinateur) =
--   plusieurs lignes, toutes notifiées.
--
-- Sécurité : écriture et lecture réservées au propriétaire de la
--   souscription (user_id = auth.uid()) — une souscription appartient
--   à un compte, jamais visible ni modifiable par un autre. L'envoi
--   réel passe par une route serveur (clé service-role), jamais par
--   un accès direct à la clé privée VAPID depuis le client.
--
-- Impact : 1 table créée, 2 policies. Aucune table existante
--   modifiée.
-- ═══════════════════════════════════════════════════════════

create table if not exists public.bellaia_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.bellaia_push_subscriptions enable row level security;

drop policy if exists bellaia_push_subscriptions_proprietaire on public.bellaia_push_subscriptions;
create policy bellaia_push_subscriptions_proprietaire on public.bellaia_push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select to_regclass('public.bellaia_push_subscriptions');
--   → attendu : non nul.
--
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='bellaia_push_subscriptions'
--   order by policyname;
--   → attendu : 1 ligne (bellaia_push_subscriptions_proprietaire, ALL).
-- ═══════════════════════════════════════════════════════════
