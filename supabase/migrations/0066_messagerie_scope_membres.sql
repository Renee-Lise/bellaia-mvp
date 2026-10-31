-- ═══════════════════════════════════════════════════════════
-- 0066_messagerie_scope_membres.sql
-- STATUT: PROPOSITION
-- Auteur : Claude Code · Date de rédaction : 2026-10-31
-- Objet : suite logique de la migration 0064 (qui a seulement cassé
--   la boucle infinie sur bconv_mbr_select) et de l'audit sécurité de
--   la migration 0065. bellaia_conversations (policy conv_auth) et
--   bellaia_messages avaient encore auth.role()='authenticated' comme
--   condition : n'importe quelle cliente connectée pouvait lire et
--   modifier TOUTES les conversations et TOUS les messages de la
--   plateforme, pas seulement les siens. Ces deux tables n'ont pas pu
--   être verrouillées en staff_seul comme la migration 0065 (une
--   cliente DOIT pouvoir lire/écrire SES propres messages) — il leur
--   fallait une policy scopée à l'appartenance, construite ici avec
--   la fonction est_membre_conversation() créée en 0064.
--
-- Vérifié dans src/modules/messaging/messagingApi.ts (code réel, pas
--   une supposition) avant d'écrire les policies :
--   - une conversation est créée avec { cree_par: userId } (POST sur
--     bellaia_conversations), puis la créatrice est ajoutée comme
--     membre juste après (POST sur bellaia_conv_membres) — donc au
--     moment du POST sur bellaia_conversations, aucune ligne de
--     membre n'existe encore : l'INSERT ne peut pas être conditionné
--     à "est déjà membre", seulement à "crée en son propre nom".
--   - un message est envoyé avec { conversation_id, auteur_id } où
--     auteur_id = l'utilisateur courant.
--   - supprimerMessage() fait un PATCH (suppression douce,
--     supprime:true) par id, sans vérifier que l'auteur du message
--     est l'auteur de la requête — la policy reproduit ce
--     comportement existant (n'importe quel membre de la conversation
--     peut modifier un message de la conversation), sans l'élargir ni
--     le restreindre par rapport à ce que l'app fait déjà.
--
-- Impact : policies remplacées sur bellaia_conversations et
--   bellaia_messages. Aucune donnée touchée. Les policies sur
--   bellaia_conv_membres (0064), bellaia_msg_reactions et
--   message_lus ne sont pas concernées ici (non signalées par
--   l'audit — probablement déjà scopées par auth.uid()).
-- ═══════════════════════════════════════════════════════════

-- ── bellaia_conversations ──────────────────────────────────
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='bellaia_conversations' loop
    execute format('drop policy if exists %I on public.bellaia_conversations', pol.policyname);
  end loop;
end $$;

create policy bconv_select on public.bellaia_conversations
  for select to authenticated
  using (public.est_membre_conversation(id));

create policy bconv_insert on public.bellaia_conversations
  for insert to authenticated
  with check (cree_par = auth.uid());

create policy bconv_update on public.bellaia_conversations
  for update to authenticated
  using (public.est_membre_conversation(id))
  with check (public.est_membre_conversation(id));

-- ── bellaia_messages ────────────────────────────────────────
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname='public' and tablename='bellaia_messages' loop
    execute format('drop policy if exists %I on public.bellaia_messages', pol.policyname);
  end loop;
end $$;

create policy bmsg_select on public.bellaia_messages
  for select to authenticated
  using (public.est_membre_conversation(conversation_id));

create policy bmsg_insert on public.bellaia_messages
  for insert to authenticated
  with check (
    public.est_membre_conversation(conversation_id)
    and auteur_id = auth.uid()
  );

create policy bmsg_update on public.bellaia_messages
  for update to authenticated
  using (public.est_membre_conversation(conversation_id))
  with check (public.est_membre_conversation(conversation_id));

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname='public' and tablename in ('bellaia_conversations','bellaia_messages')
--   order by tablename, cmd;
--   → attendu : 3 lignes pour bellaia_conversations (select/insert/update)
--     et 3 lignes pour bellaia_messages (select/insert/update) ;
--     plus aucune ligne avec qual/with_check = "authenticated".
--
--   Fonctionnel : dans l'écran Messages, vérifier que vous pouvez
--   toujours ouvrir une conversation existante, envoyer un message,
--   et en créer une nouvelle (direct ou groupe) sans erreur.
-- ═══════════════════════════════════════════════════════════
