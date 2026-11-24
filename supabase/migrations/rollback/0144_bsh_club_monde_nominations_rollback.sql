-- Retour arrière de 0144 (BSH Private Club, Secret World, nominations des hôtes).
-- ATTENTION : supprime les données créées depuis 0144 (sessions, votes, avatars, messages, coins, nominations).
-- Exporter ces tables avant exécution. Aucune table antérieure à 0144 n'est touchée.
do $$ begin
  if to_regclass('realtime.messages') is not null then
    execute 'drop policy if exists bsh_rt_lire on realtime.messages';
    execute 'drop policy if exists bsh_rt_ecrire on realtime.messages';
  end if;
end $$;
drop view if exists public.v_bsh_club_classement_saison;
drop table if exists public.bsh_monde_coins, public.bsh_monde_inventaire, public.bsh_monde_signalements, public.bsh_monde_messages,
  public.bsh_monde_conversation_membres, public.bsh_monde_conversations, public.bsh_monde_invitations, public.bsh_monde_blocages,
  public.bsh_monde_amities, public.bsh_monde_salle_acces, public.bsh_monde_salles, public.bsh_monde_avatars, public.bsh_monde_accessoires,
  public.bsh_club_distinctions, public.bsh_club_votes, public.bsh_club_reponses, public.bsh_club_participants, public.bsh_club_sessions,
  public.bsh_club_scenarios, public.bsh_club_salles, public.bsh_hotes_nominations_journal, public.bsh_hotes_nominations, public.bsh_club_charte cascade;
drop function if exists public.bsh_monde_purger(), public.bsh_inventaire_donner(uuid, text, text), public.bsh_coins_attribuer(uuid, int, text, text),
  public.bsh_coins_solde(uuid), public.bsh_messages_controle(), public.bsh_salle_acces_controle(), public.bsh_monde_salles_controle(),
  public.bsh_monde_peut_entrer(text), public.bsh_avatar_controle(), public.bsh_conv_membre(uuid, uuid), public.bsh_bloque(uuid, uuid),
  public.bsh_club_distinctions_controle(), public.bsh_club_depouiller(uuid), public.bsh_club_reponses_controle(), public.bsh_club_participants_controle(),
  public.bsh_club_sessions_controle(), public.bsh_club_salles_controle(), public.bsh_club_salle_de(uuid), public.bsh_club_participant(uuid, uuid),
  public.bsh_nominations_expirer(), public.bsh_hote_peut(text, text), public.bsh_nomination_repondre(uuid, boolean), public.bsh_nomination_journal(),
  public.bsh_nomination_controle(), public.bsh_adulte_autorise(), public.bsh_adulte_verifie(uuid), public.bsh_charte_version();
