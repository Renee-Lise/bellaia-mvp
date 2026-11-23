-- Retour arrière de 0140 : supprime les trois tables créées (et leurs données). À n'exécuter qu'après export.
drop table if exists public.pre_comptabilite;
drop table if exists public.webhook_logs;
drop table if exists public.notifications;
