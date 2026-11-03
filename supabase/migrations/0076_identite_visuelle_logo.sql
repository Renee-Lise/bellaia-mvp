-- ═══════════════════════════════════════════════════════════
-- 0076_identite_visuelle_logo.sql
-- STATUT: VALIDÉ — exécuté et vérifié le 2026-11-03
-- Auteur : Claude Code · Date de rédaction : 2026-11-02
-- Objet : "Je dois pouvoir remplacer ultérieurement le logo depuis
--   mon espace fondatrice, sans modifier le code" (mission logo
--   officiel Bellaïa, section 6). Audité avant d'écrire une ligne de
--   SQL : aucun bucket de stockage ni table de réglages d'identité
--   visuelle n'existait (seul "messaging-attachments" existe côté
--   storage, pour les pièces jointes de messagerie — bucket privé,
--   sans rapport). Création d'un bucket dédié public (le logo doit
--   être lisible sans authentification : écran de connexion,
--   favicon, Open Graph) et d'une table d'historique des versions.
--
--   Modèle retenu : chaque import crée une nouvelle ligne
--   (actif=false tant qu'elle n'est pas confirmée). "Confirmer"
--   bascule cette ligne à actif=true et désactive l'ancienne.
--   "Restaurer" une version passée fait la même bascule sur une
--   ligne historique. Rien n'est jamais supprimé automatiquement —
--   l'historique complet reste disponible, cohérent avec "conserver
--   l'ancienne version / restaurer un logo précédent".
--
--   Sécurité : écriture (upload storage + lignes de la table)
--   réservée à is_fondatrice() — jamais à est_staff_bellaia(), pour
--   respecter "réserver cette fonction au compte fondatrice
--   autorisé, ne pas permettre aux autres utilisateurs de modifier
--   l'identité visuelle globale" (l'assistante a accès à l'espace
--   fondatrice mais pas à ce module-ci). Lecture : publique sur la
--   ligne active uniquement (nécessaire pour que l'écran de
--   connexion, non authentifié, affiche le bon logo) ; la fondatrice
--   voit tout l'historique via sa policy ALL (les policies RLS se
--   combinent en OR — déjà vérifié cette session, migration 0074).
--
-- Impact : 1 bucket storage créé (idempotent), 4 policies sur
--   storage.objects scopées à ce bucket uniquement (aucune autre
--   politique de stockage touchée), 1 table créée, 2 policies.
-- ═══════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public)
values ('bellaia-branding', 'bellaia-branding', true)
on conflict (id) do nothing;

drop policy if exists bellaia_branding_lecture_publique on storage.objects;
create policy bellaia_branding_lecture_publique on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'bellaia-branding');

drop policy if exists bellaia_branding_fondatrice_insert on storage.objects;
create policy bellaia_branding_fondatrice_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bellaia-branding' and public.is_fondatrice());

drop policy if exists bellaia_branding_fondatrice_update on storage.objects;
create policy bellaia_branding_fondatrice_update on storage.objects
  for update to authenticated
  using (bucket_id = 'bellaia-branding' and public.is_fondatrice())
  with check (bucket_id = 'bellaia-branding' and public.is_fondatrice());

drop policy if exists bellaia_branding_fondatrice_delete on storage.objects;
create policy bellaia_branding_fondatrice_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'bellaia-branding' and public.is_fondatrice());

create table if not exists public.bellaia_identite_visuelle (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'logo_principal',
  storage_path text not null,
  url text not null,
  actif boolean not null default false,
  created_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.bellaia_identite_visuelle enable row level security;

drop policy if exists bellaia_identite_lecture_active on public.bellaia_identite_visuelle;
create policy bellaia_identite_lecture_active on public.bellaia_identite_visuelle
  for select to anon, authenticated
  using (actif = true);

drop policy if exists bellaia_identite_fondatrice on public.bellaia_identite_visuelle;
create policy bellaia_identite_fondatrice on public.bellaia_identite_visuelle
  for all to authenticated
  using (public.is_fondatrice())
  with check (public.is_fondatrice());

-- ═══════════════════════════════════════════════════════════
-- Vérification après exécution :
--
--   select id, public from storage.buckets where id = 'bellaia-branding';
--   → attendu : 1 ligne, public = true.
--
--   select policyname, cmd from pg_policies
--   where schemaname='storage' and tablename='objects'
--     and policyname like 'bellaia_branding_%'
--   order by policyname;
--   → attendu : 4 lignes.
--
--   select to_regclass('public.bellaia_identite_visuelle');
--   → attendu : non nul.
--
--   select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='bellaia_identite_visuelle'
--   order by policyname;
--   → attendu : 2 lignes (bellaia_identite_fondatrice ALL,
--     bellaia_identite_lecture_active SELECT).
-- ═══════════════════════════════════════════════════════════
