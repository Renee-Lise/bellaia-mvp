-- Retour arrière de 0147. Les fonctions rattachées à un pôle sans organisation seraient des doublons pour
-- l'ancien index : elles sont REVOQUÉES (jamais supprimées) avant de rétablir l'index d'origine.
update public.bellaia_roles set statut = 'revoque' where role = 'fondatrice_pole';
do $$ begin
  -- Rétablit l'index de production seulement si aucun doublon (compte, fonction, organisation) n'existe.
  if not exists (select 1 from public.bellaia_roles group by user_id, role, coalesce(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid) having count(*) > 1) then
    create unique index if not exists bellaia_roles_unique on public.bellaia_roles (user_id, role, coalesce(organisation_id, '00000000-0000-0000-0000-000000000000'::uuid));
    drop index if exists public.bellaia_roles_unique_pole;
  else
    raise notice 'Fonctions par pôle présentes : index par pôle conservé (rien supprimé)';
  end if;
end $$;
alter table public.bellaia_roles drop constraint if exists bellaia_roles_role_check;
-- Contrainte de production rétablie ; laissée « not valid » si des fonctions « fondatrice_pole » (révoquées) existent encore.
alter table public.bellaia_roles add constraint bellaia_roles_role_check
  check (role = any (array['assistante','prestataire','fournisseur','hote','collaborateur','qualite','autre'])) not valid;
do $$ begin alter table public.bellaia_roles validate constraint bellaia_roles_role_check; exception when check_violation then raise notice 'Fonctions de pôle révoquées conservées : contrainte non validée'; end $$;
-- La colonne pole et sa clé étrangère sont conservées (données préservées) ; elles sont sans effet sur l'ancien code.
