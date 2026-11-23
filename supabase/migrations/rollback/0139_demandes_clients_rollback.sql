-- Retour arrière de 0139. ATTENTION : supprime les demandes déposées (les exporter avant : rapport privé).
drop table if exists public.bellaia_demandes;
drop function if exists public.demande_notifier();
drop function if exists public.demande_controle();
