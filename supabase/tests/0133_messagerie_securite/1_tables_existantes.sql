-- Reproduction de l'état de PRODUCTION relevé le 23/11/2026 (structure et règles d'accès, défauts compris),
-- sans aucune donnée réelle. Base jetable.
create table if not exists auth.users (id uuid primary key);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)] $$;
grant execute on function storage.foldername(text) to anon, authenticated;
create table public.bellaia_clients (id uuid primary key default gen_random_uuid());

create table public.bellaia_conversations (
  id uuid primary key default gen_random_uuid(), reference text unique, objet text, canal text default 'interne',
  client_id uuid references public.bellaia_clients(id) on delete set null, client_nom text, client_tel text,
  entite_table text, entite_id uuid, statut text default 'ouverte', nb_messages integer default 0,
  dernier_message timestamptz, created_at timestamptz default now(), updated_at timestamptz default now(),
  nom text, archive boolean default false, ref_id uuid, ref_type text, module text);
create table public.bellaia_conv_membres (
  conversation_id uuid not null references public.bellaia_conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade, role text default 'membre',
  notifs_actives boolean default true, rejoint_le timestamptz default now(), primary key (conversation_id, user_id));
create table public.bellaia_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid references public.bellaia_conversations(id) on delete cascade,
  expediteur text not null, expediteur_nom text, contenu text not null, canal text default 'interne', lu boolean default false,
  piece_jointe_url text, piece_jointe_nom text, entite_table text, entite_id uuid, created_at timestamptz default now(),
  type text default 'texte', metadata jsonb default '{}', reponse_a uuid references public.bellaia_messages(id) on delete set null,
  transfert_de uuid references public.bellaia_messages(id) on delete set null, supprime boolean default false,
  auteur_id uuid references auth.users(id) on delete set null);
create table public.bellaia_msg_reactions (message_id uuid, user_id uuid, emoji text, created_at timestamptz default now());
create table public.bellaia_msg_attachments (id uuid primary key default gen_random_uuid(), message_id uuid, nom_fichier text,
  type_mime text, taille_bytes bigint, storage_path text, miniature_url text, created_at timestamptz default now());

create or replace function public.est_membre_conversation(p_conversation_id uuid) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.bellaia_conv_membres where conversation_id = p_conversation_id and user_id = auth.uid());
$$;

alter table public.bellaia_conversations enable row level security;
alter table public.bellaia_conv_membres enable row level security;
alter table public.bellaia_messages enable row level security;
alter table public.bellaia_msg_reactions enable row level security;
alter table public.bellaia_msg_attachments enable row level security;
create policy bconv_insert on public.bellaia_conversations for insert to authenticated with check (true);
create policy bconv_select on public.bellaia_conversations for select to authenticated using (public.est_membre_conversation(id));
create policy bconv_update on public.bellaia_conversations for update to authenticated using (public.est_membre_conversation(id)) with check (public.est_membre_conversation(id));
create policy bconv_mbr_insert on public.bellaia_conv_membres for insert to public
  with check ((user_id = auth.uid()) or exists (select 1 from public.bellaia_conv_membres m
              where m.conversation_id = bellaia_conv_membres.conversation_id and m.user_id = auth.uid() and m.role = 'admin'));
create policy bconv_mbr_select on public.bellaia_conv_membres for select to public using (public.est_membre_conversation(conversation_id));
create policy bmsg_insert on public.bellaia_messages for insert to authenticated with check (public.est_membre_conversation(conversation_id) and auteur_id = auth.uid());
create policy bmsg_select on public.bellaia_messages for select to authenticated using (public.est_membre_conversation(conversation_id));
create policy bmsg_update on public.bellaia_messages for update to authenticated using (public.est_membre_conversation(conversation_id)) with check (public.est_membre_conversation(conversation_id));
create policy bmsg_react_insert on public.bellaia_msg_reactions for insert to public with check (user_id = auth.uid());
create policy bmsg_react_delete on public.bellaia_msg_reactions for delete to public using (user_id = auth.uid());
create policy bmsg_react_select on public.bellaia_msg_reactions for select to public using (exists (select 1 from public.bellaia_messages m
  join public.bellaia_conv_membres c on c.conversation_id = m.conversation_id where m.id = bellaia_msg_reactions.message_id and c.user_id = auth.uid()));
create policy bmsg_att_insert on public.bellaia_msg_attachments for insert to public
  with check (exists (select 1 from public.bellaia_messages m where m.id = bellaia_msg_attachments.message_id and m.auteur_id = auth.uid()));
create policy bmsg_att_select on public.bellaia_msg_attachments for select to public using (exists (select 1 from public.bellaia_messages m
  join public.bellaia_conv_membres c on c.conversation_id = m.conversation_id where m.id = bellaia_msg_attachments.message_id and c.user_id = auth.uid()));

-- Ancien modèle (vide en production) avec sa règle « rejoindre une conversation »
create table public.conversations (id uuid primary key default gen_random_uuid(), nom text, type text default 'direct', cree_par uuid, created_at timestamptz default now());
create table public.conversation_membres (conversation_id uuid references public.conversations(id) on delete cascade, user_id uuid, primary key (conversation_id, user_id));
create table public.messages (id uuid primary key default gen_random_uuid(), conversation_id uuid references public.conversations(id) on delete cascade, auteur_id uuid, contenu text not null, type text default 'texte', created_at timestamptz default now());
create table public.message_attachments (id uuid primary key default gen_random_uuid(), message_id uuid, nom_fichier text, storage_path text);
create table public.message_reactions (message_id uuid, user_id uuid, emoji text);
create table public.message_lus (message_id uuid, user_id uuid);
create table public.message_lu (message_id uuid, user_id uuid);
alter table public.conversation_membres enable row level security;
alter table public.messages enable row level security;
create policy "rejoindre une conversation" on public.conversation_membres for insert to public with check (user_id = auth.uid());
create policy "voir les membres" on public.conversation_membres for select to public using (exists (select 1 from public.conversation_membres cm where cm.conversation_id = conversation_membres.conversation_id and cm.user_id = auth.uid()));
create policy "voir les messages" on public.messages for select to public using (exists (select 1 from public.conversation_membres cm where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()));
