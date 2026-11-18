-- ═══════════════════════════════════════════════════════════
-- 0116_poles_missions_evolutifs.sql
-- STATUT: PRÉPARÉ — NON EXÉCUTÉ (à présenter à la fondatrice)
-- Objet (lot P1) : missions attribuables dans TOUS les univers, sans
-- liste figée dans une contrainte SQL.
--  • Réutilise le référentiel existant public.business_units (8 pôles :
--    BSH, ODYSSEE, EVENTS, FOOD, VILO, INVEST, STRUCTURE, GENERAL) et y
--    ajoute les univers manquants. De nouveaux pôles s'ajoutent ensuite
--    par une simple ligne (aucune migration).
--  • Vil'Dor Pâtisse est enregistrée comme pôle de type « partenaire »,
--    relié à son organisation indépendante (non détenue par Bella'Studio).
--  • Nouvelle colonne bellaia_missions.univers = référence (clé
--    étrangère) vers business_units.code. L'ancienne colonne « pole »
--    (contrainte à 4 valeurs) est CONSERVÉE et remplie automatiquement
--    pour compatibilité (FOOD / EVENTS / BSH, sinon STUDIO) : aucune
--    suppression de règle ni de donnée.
--  • L'existence d'un pôle n'accorde AUCUNE permission : les droits
--    restent ceux de bellaia_permissions / bellaia_roles / autorisations.
--  • Durée de mission (début / fin) ; une mission échue ne peut plus
--    être avancée par la personne assignée.
-- Aucune suppression : uniquement des ajouts (colonnes, lignes, index).
-- ═══════════════════════════════════════════════════════════

-- Garde-fou : la référence exige des codes uniques (échec sans effet
-- si des doublons existaient — à corriger alors avant de relancer).
create unique index if not exists business_units_code_unique on public.business_units (code);
alter table public.business_units add column if not exists type text not null default 'interne';
alter table public.business_units add column if not exists organisation_id uuid references public.bellaia_organisations(id);

insert into public.business_units (code, nom, description, icone, couleur, statut, ordre, type) values
  ('STUDIO',         'Bella''Studio',          'Structure mère et création',                     '🎨', '#6B1A2B', 'actif', 0,  'interne'),
  ('EDITIONS',       'Bella''Éditions',        'Livres, ebooks et audio',                        '📚', '#5b1a3f', 'actif', 9,  'interne'),
  ('MOTIPY',         'Mo Ti-Péyi',             'Jeunesse : albums, histoires, lexique créole',   '🌿', '#2f5d2a', 'actif', 10, 'interne'),
  ('TICODE',         'Ti-Code Guyane',         'Apprentissage ludique pour enfants',             '🧩', '#0f766e', 'en développement', 11, 'interne'),
  ('ODYSSEE_GUYANE', 'L''Odyssée Guyanaise',   'Univers éducatif guyanais',                      '🗺', '#3730a3', 'en développement', 12, 'interne'),
  ('DIAMONDB',       'Diamond B',              'Musique',                                        '💎', '#1b2a44', 'en développement', 13, 'interne')
on conflict (code) do nothing;

insert into public.business_units (code, nom, description, icone, couleur, statut, ordre, type, organisation_id)
select 'VILDOR', 'Vil''Dor Pâtisse', 'Entreprise partenaire indépendante (pâtisserie)', '✨', '#c9a96e', 'partenaire', 14, 'partenaire', o.id
from public.bellaia_organisations o where o.nom_commercial = 'Vil''Dor Pâtisse'
on conflict (code) do nothing;

-- Référence évolutive (aucune liste figée) ; l'ancienne colonne suit.
alter table public.bellaia_missions add column if not exists univers text references public.business_units(code) on update cascade;
update public.bellaia_missions set univers = pole where univers is null and pole is not null;
create or replace function public.mission_pole_compatible() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.univers is null then new.univers := coalesce(new.pole, 'GENERAL'); end if;
  new.pole := case when new.univers in ('FOOD','EVENTS','BSH','STUDIO') then new.univers when new.univers = 'VILDOR' then 'FOOD' else 'STUDIO' end;
  return new;
end $$;
do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'trg_mission_pole_compatible' and tgrelid = 'public.bellaia_missions'::regclass) then
    create trigger trg_mission_pole_compatible before insert or update of univers, pole on public.bellaia_missions for each row execute function public.mission_pole_compatible();
  end if;
end $$;

alter table public.bellaia_missions add column if not exists debut date;
alter table public.bellaia_missions add column if not exists fin date;

-- La personne assignée ne fait plus avancer une mission échue ou dont le
-- rôle / l'organisation ont été suspendus.
create or replace function public.mission_maj_assignee(p_id uuid, p_statut text, p_commentaire text)
returns void language plpgsql security definer set search_path = public as $$
declare m public.bellaia_missions;
begin
  if p_statut not in ('a_faire','en_cours','a_valider') then raise exception 'Statut non autorisé : seule la fondatrice valide une mission.'; end if;
  select * into m from public.bellaia_missions where id = p_id and assigne_a = auth.uid();
  if m.id is null then raise exception 'Mission introuvable'; end if;
  if m.statut in ('fait','annule') then raise exception 'Mission close'; end if;
  if m.fin is not null and m.fin < current_date then raise exception 'Mission échue : contactez la fondatrice'; end if;
  if m.organisation_id is not null and not public.membre_organisation(m.organisation_id) then raise exception 'Accès suspendu'; end if;
  update public.bellaia_missions set statut = p_statut, commentaire_equipe = left(coalesce(p_commentaire, commentaire_equipe), 2000), updated_at = now() where id = p_id;
  if m.statut is distinct from p_statut then
    insert into public.bellaia_missions_fil (mission_id, type, texte) values (p_id, 'statut', m.statut || ' → ' || p_statut);
  end if;
end $$;
