-- Fonctions Supabase du schéma storage utilisées par les politiques (équivalents de test, comportement identique).
create schema if not exists storage;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
create or replace function storage.filename(name text) returns text language sql immutable as $$ select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)] $$;
grant usage on schema storage to anon, authenticated;
grant execute on function storage.foldername(text), storage.filename(text) to anon, authenticated;
