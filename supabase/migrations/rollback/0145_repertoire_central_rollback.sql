-- Retour arrière de 0145. ATTENTION : supprime les fiches du répertoire créées depuis 0145 (exporter avant).
drop function if exists public.repertoire_contacts();
drop table if exists public.bellaia_repertoire cascade;
drop table if exists public.bellaia_repertoire_categories cascade;
drop function if exists public.bellaia_repertoire_journal(), public.bellaia_repertoire_controle();
drop index if exists public.bellaia_roles_unique_fonction;
-- Version antérieure du journal des droits (sans l'auteur)
create or replace function public.journaliser_droits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.bellaia_journal (action, cible, details)
  values (tg_table_name || '.' || lower(tg_op), coalesce(new.user_id, old.user_id)::text,
          jsonb_build_object('avant', to_jsonb(old), 'apres', to_jsonb(new)));
  return coalesce(new, old);
end $$;
