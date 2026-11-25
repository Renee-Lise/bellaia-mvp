-- Retour arrière de 0133 : rétablit EXACTEMENT les règles d'accès relevées en production le 23/11/2026
-- (y compris leurs défauts). Aucune donnée supprimée : les colonnes cree_par/type et le compartiment
-- de pièces jointes sont conservés (sans effet sur l'existant).
drop trigger if exists trg_bconv_champs_figes on public.bellaia_conversations;
drop trigger if exists trg_bmsg_champs_figes on public.bellaia_messages;
drop trigger if exists trg_bmbr_champs_figes on public.bellaia_conv_membres;
drop policy if exists msg_pj_lecture on storage.objects;
drop policy if exists msg_pj_depot on storage.objects;
-- Rétablit les deux règles antérieures, telles que relevées en production le 25/11
drop policy if exists msg_read_participant on storage.objects;
create policy msg_read_participant on storage.objects as permissive for select to authenticated using (((bucket_id = 'messaging-attachments'::text) and (((storage.foldername(name))[1] = (auth.uid())::text) or (exists (select 1 from public.profiles where ((profiles.id = auth.uid()) and (profiles.role = 'fondatrice'::text)))) or (exists (select 1 from public.bellaia_conv_membres cm where ((cm.user_id = auth.uid()) and ((cm.conversation_id)::text = (storage.foldername(objects.name))[2])))))));
drop policy if exists msg_upload_participant on storage.objects;
create policy msg_upload_participant on storage.objects as permissive for insert to authenticated with check (((bucket_id = 'messaging-attachments'::text) and ((storage.foldername(name))[1] = (auth.uid())::text)));

drop policy if exists bconv_insert on public.bellaia_conversations;
drop policy if exists bconv_select on public.bellaia_conversations;
drop policy if exists bconv_update on public.bellaia_conversations;
create policy bconv_insert on public.bellaia_conversations for insert to authenticated with check (true);
create policy bconv_select on public.bellaia_conversations for select to authenticated using (public.est_membre_conversation(id));
create policy bconv_update on public.bellaia_conversations for update to authenticated using (public.est_membre_conversation(id)) with check (public.est_membre_conversation(id));

drop policy if exists bconv_mbr_insert on public.bellaia_conv_membres;
drop policy if exists bconv_mbr_select on public.bellaia_conv_membres;
drop policy if exists bconv_mbr_update on public.bellaia_conv_membres;
drop policy if exists bconv_mbr_delete on public.bellaia_conv_membres;
create policy bconv_mbr_insert on public.bellaia_conv_membres for insert to public
  with check ((user_id = auth.uid()) or exists (select 1 from public.bellaia_conv_membres m
              where m.conversation_id = bellaia_conv_membres.conversation_id and m.user_id = auth.uid() and m.role = 'admin'));
create policy bconv_mbr_select on public.bellaia_conv_membres for select to public using (public.est_membre_conversation(conversation_id));

drop policy if exists bmsg_insert on public.bellaia_messages;
drop policy if exists bmsg_select on public.bellaia_messages;
drop policy if exists bmsg_update on public.bellaia_messages;
create policy bmsg_insert on public.bellaia_messages for insert to authenticated with check (public.est_membre_conversation(conversation_id) and auteur_id = auth.uid());
create policy bmsg_select on public.bellaia_messages for select to authenticated using (public.est_membre_conversation(conversation_id));
create policy bmsg_update on public.bellaia_messages for update to authenticated using (public.est_membre_conversation(conversation_id)) with check (public.est_membre_conversation(conversation_id));

drop policy if exists bmsg_react_insert on public.bellaia_msg_reactions;
create policy bmsg_react_insert on public.bellaia_msg_reactions for insert to public with check (user_id = auth.uid());
drop policy if exists bmsg_att_insert on public.bellaia_msg_attachments;
create policy bmsg_att_insert on public.bellaia_msg_attachments for insert to public
  with check (exists (select 1 from public.bellaia_messages m where m.id = bellaia_msg_attachments.message_id and m.auteur_id = auth.uid()));

do $$ declare t text; begin
  foreach t in array array['conversations','conversation_membres','messages','message_attachments','message_reactions','message_lus','message_lu'] loop
    if to_regclass('public.' || t) is not null then
      execute format('grant insert, update, delete on public.%I to anon, authenticated', t);
    end if;
  end loop;
end $$;
do $$ begin
  if exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'bellaia_messages') then
    alter publication supabase_realtime drop table public.bellaia_messages;
  end if;
end $$;
drop function if exists public.bconv_champs_figes();
drop function if exists public.bmsg_champs_figes();
drop function if exists public.bmbr_champs_figes();
drop function if exists public.est_admin_conversation(uuid);
drop function if exists public.est_createur_conversation(uuid);
drop function if exists public.uuid_ou_null(text);
