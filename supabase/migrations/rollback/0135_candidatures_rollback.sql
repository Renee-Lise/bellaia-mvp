-- Retour arrière de 0135. ATTENTION : supprime les candidatures déposées depuis l'application de 0135.
-- Exporter d'abord : select * from bellaia_candidatures / _historique / _documents (rapport privé).
drop function if exists public.candidatures_purger();
drop function if exists public.document_candidature_consulter(uuid);
drop function if exists public.candidature_proposer(uuid, jsonb);
drop table if exists public.bellaia_documents_consultations;
drop table if exists public.bellaia_candidatures_documents;
drop table if exists public.bellaia_candidatures_historique;
drop table if exists public.bellaia_candidatures;
drop function if exists public.candidature_journal();
drop function if exists public.candidature_controle();
drop function if exists public.candidature_depot();
drop function if exists public.candidatures_decision();
drop function if exists public.candidatures_gestion();
