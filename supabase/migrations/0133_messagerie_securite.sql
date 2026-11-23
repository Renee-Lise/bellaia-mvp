-- ═══════════════════════════════════════════════════════════════════════════
-- 0133 — Messagerie interne : correction des règles d'accès (PRÉPARÉE, NON APPLIQUÉE)
-- À appliquer en production uniquement après accord écrit de la fondatrice,
-- sauvegarde vérifiée et présentation des résultats de tests.
--
-- Objectifs :
--  1. Empêcher l'ajout non autorisé d'un membre (on ne peut plus « rejoindre » seul).
--  2. Empêcher la lecture des messages par un non-membre (inchangé, renforcé).
--  3. Empêcher la modification des messages d'autrui (seul l'auteur ; champs clés figés).
--  4. Protéger les pièces jointes (compartiment privé, accès réservé aux membres).
--  5. Verrouiller l'ancien modèle de messagerie inutilisé (aucune donnée supprimée).
-- Idempotente (relançable). Retour arrière : rollback/0133_messagerie_securite_rollback.sql
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. Colonnes attendues par l'application (absentes : la création de conversation échouait)
alter table public.bellaia_conversations add column if not exists cree_par uuid default auth.uid();
alter table public.bellaia_conversations add column if not exists type text default 'direct';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'bconv_type_valide') then
    alter table public.bellaia_conversations add constraint bconv_type_valide check (type in ('direct','groupe','annonce'));
  end if;
end $$;

-- ── 2. Fonctions d'appartenance (SECURITY DEFINER, chemin de recherche figé)
create or replace function public.est_admin_conversation(p_conversation_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bellaia_conv_membres
                 where conversation_id = p_conversation_id and user_id = auth.uid() and role = 'admin');
$$;
create or replace function public.est_createur_conversation(p_conversation_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and exists (select 1 from public.bellaia_conversations
                 where id = p_conversation_id and cree_par = auth.uid());
$$;
create or replace function public.uuid_ou_null(t text) returns uuid
language sql immutable set search_path = public as $$
  select case when t ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then t::uuid end;
$$;
revoke all on function public.est_admin_conversation(uuid) from public, anon;
revoke all on function public.est_createur_conversation(uuid) from public, anon;
grant execute on function public.est_admin_conversation(uuid) to authenticated;
grant execute on function public.est_createur_conversation(uuid) to authenticated;

-- ── 3. Champs figés (déclencheurs)
create or replace function public.bconv_champs_figes() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.cree_par is distinct from old.cree_par then raise exception 'Le créateur d''une conversation ne peut pas être modifié.'; end if;
  return new;
end $$;
drop trigger if exists trg_bconv_champs_figes on public.bellaia_conversations;
create trigger trg_bconv_champs_figes before update on public.bellaia_conversations
  for each row execute function public.bconv_champs_figes();

create or replace function public.bmsg_champs_figes() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.conversation_id is distinct from old.conversation_id
     or new.auteur_id is distinct from old.auteur_id
     or new.created_at is distinct from old.created_at
     or new.expediteur is distinct from old.expediteur then
    raise exception 'Conversation, auteur et date d''un message ne peuvent pas être modifiés.';
  end if;
  return new;
end $$;
drop trigger if exists trg_bmsg_champs_figes on public.bellaia_messages;
create trigger trg_bmsg_champs_figes before update on public.bellaia_messages
  for each row execute function public.bmsg_champs_figes();

-- ── 4. Conversations
alter table public.bellaia_conversations enable row level security;
drop policy if exists bconv_insert on public.bellaia_conversations;
drop policy if exists bconv_select on public.bellaia_conversations;
drop policy if exists bconv_update on public.bellaia_conversations;
create policy bconv_insert on public.bellaia_conversations for insert to authenticated
  with check (cree_par = auth.uid());
create policy bconv_select on public.bellaia_conversations for select to authenticated
  using (public.est_membre_conversation(id) or cree_par = auth.uid());
create policy bconv_update on public.bellaia_conversations for update to authenticated
  using (public.est_admin_conversation(id)) with check (public.est_admin_conversation(id));

-- ── 5. Membres : seul un administrateur ou le créateur de la conversation ajoute des membres
alter table public.bellaia_conv_membres enable row level security;
drop policy if exists bconv_mbr_insert on public.bellaia_conv_membres;
drop policy if exists bconv_mbr_select on public.bellaia_conv_membres;
drop policy if exists bconv_mbr_update on public.bellaia_conv_membres;
drop policy if exists bconv_mbr_delete on public.bellaia_conv_membres;
create policy bconv_mbr_insert on public.bellaia_conv_membres for insert to authenticated
  with check (public.est_admin_conversation(conversation_id) or public.est_createur_conversation(conversation_id));
create policy bconv_mbr_select on public.bellaia_conv_membres for select to authenticated
  using (public.est_membre_conversation(conversation_id));
create policy bconv_mbr_update on public.bellaia_conv_membres for update to authenticated
  using (user_id = auth.uid() or public.est_admin_conversation(conversation_id))
  with check (user_id = auth.uid() or public.est_admin_conversation(conversation_id));
-- Un membre peut régler ses notifications, mais seul un administrateur change un rôle ou déplace un membre.
create or replace function public.bmbr_champs_figes() returns trigger
language plpgsql set search_path = public as $$
begin
  if (new.role is distinct from old.role or new.user_id is distinct from old.user_id or new.conversation_id is distinct from old.conversation_id)
     and not public.est_admin_conversation(old.conversation_id) then
    raise exception 'Seul un administrateur de la conversation peut modifier un rôle.';
  end if;
  return new;
end $$;
drop trigger if exists trg_bmbr_champs_figes on public.bellaia_conv_membres;
create trigger trg_bmbr_champs_figes before update on public.bellaia_conv_membres
  for each row execute function public.bmbr_champs_figes();
create policy bconv_mbr_delete on public.bellaia_conv_membres for delete to authenticated
  using (user_id = auth.uid() or public.est_admin_conversation(conversation_id));

-- ── 6. Messages : membres seulement ; modification par l'auteur uniquement
alter table public.bellaia_messages enable row level security;
drop policy if exists bmsg_insert on public.bellaia_messages;
drop policy if exists bmsg_select on public.bellaia_messages;
drop policy if exists bmsg_update on public.bellaia_messages;
create policy bmsg_insert on public.bellaia_messages for insert to authenticated
  with check (public.est_membre_conversation(conversation_id) and auteur_id = auth.uid());
create policy bmsg_select on public.bellaia_messages for select to authenticated
  using (public.est_membre_conversation(conversation_id));
create policy bmsg_update on public.bellaia_messages for update to authenticated
  using (auteur_id = auth.uid() and public.est_membre_conversation(conversation_id))
  with check (auteur_id = auth.uid() and public.est_membre_conversation(conversation_id));

-- ── 7. Réactions et pièces jointes : membres de la conversation du message
drop policy if exists bmsg_react_insert on public.bellaia_msg_reactions;
create policy bmsg_react_insert on public.bellaia_msg_reactions for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.bellaia_messages m
              where m.id = message_id and public.est_membre_conversation(m.conversation_id)));
drop policy if exists bmsg_att_insert on public.bellaia_msg_attachments;
create policy bmsg_att_insert on public.bellaia_msg_attachments for insert to authenticated
  with check (exists (select 1 from public.bellaia_messages m where m.id = message_id
              and m.auteur_id = auth.uid() and public.est_membre_conversation(m.conversation_id)));

-- ── 8. Stockage privé des pièces jointes : chemin <auteur>/<conversation>/<fichier>
insert into storage.buckets (id, name, public)
  values ('messaging-attachments', 'messaging-attachments', false)
  on conflict (id) do update set public = false;
do $$ begin
  if exists (select 1 from information_schema.columns where table_schema = 'storage' and table_name = 'buckets' and column_name = 'file_size_limit') then
    execute $q$update storage.buckets set file_size_limit = 26214400 where id = 'messaging-attachments'$q$;
  end if;
end $$;
drop policy if exists msg_pj_lecture on storage.objects;
drop policy if exists msg_pj_depot on storage.objects;
create policy msg_pj_lecture on storage.objects for select to authenticated
  using (bucket_id = 'messaging-attachments'
         and public.est_membre_conversation(public.uuid_ou_null((storage.foldername(name))[2])));
create policy msg_pj_depot on storage.objects for insert to authenticated
  with check (bucket_id = 'messaging-attachments'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.est_membre_conversation(public.uuid_ou_null((storage.foldername(name))[2])));

-- ── 9. Ancien modèle de messagerie (vide, non utilisé) : verrouillé, rien n'est supprimé
do $$ declare t text; begin
  foreach t in array array['conversations','conversation_membres','messages','message_attachments','message_reactions','message_lus','message_lu'] loop
    if to_regclass('public.' || t) is not null then
      execute format('revoke insert, update, delete on public.%I from anon, authenticated', t);
    end if;
  end loop;
end $$;

-- ── 10. Réception en direct (les règles d'accès s'appliquent aussi au temps réel)
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bellaia_messages') then
    alter publication supabase_realtime add table public.bellaia_messages;
  end if;
end $$;
