import subprocess, sys
D='/var/lib/postgresql/pgss'
U={'fondatrice':'f0','collab':'c0','assistante':'e0','sans_achat':'a0','ebook':'a1','audio':'a2','abonnee':'a3','expiree':'a4','resiliee':'a5','non_verifiee':'b1','mineure':'b2'}
uid=lambda k:'00000000-0000-0000-0000-0000000000'+U[k]
O1='10000000-0000-0000-0000-000000000001'; O2='10000000-0000-0000-0000-000000000002'
def run(user, sql):
    role='anon' if user is None else 'authenticated'
    claims='{}' if user is None else '{"sub":"%s"}'%uid(user)
    q=f"begin; set local role {role}; select set_config('request.jwt.claims','{claims}',true) \\g /dev/null\n{sql};\ncommit;"
    r=subprocess.run(['psql','-h',D,'-p','55432','-U','postgres','-d','t','-qtA','-c' if False else '-f','-'],input=q,capture_output=True,text=True)
    return (r.stdout.strip() or r.stderr.strip()).replace('\n',' | ')
E=lambda q: "select t_erreur($q$"+q+"$q$)"
N=lambda q: "select t_nb($q$"+q+"$q$)"
cat="select jsonb_array_length(ss_catalogue())"
fich=lambda c: N(f"select 1 from storage.objects where bucket_id='secret-stories-prive' and name='{c}'")
chap=f"select coalesce(ss_lire_chapitre('{O1}',1)->>'texte','(rien)')"
biblio="select ss_ma_bibliotheque()::text"
# Préparation commerciale : demandes clientes puis confirmations fondatrice
prep=[
 ('ebook', E(f"insert into ss_achats (offre_id, statut) values ('20000000-0000-0000-0000-000000000001','confirme')")),
 ('audio', E(f"insert into ss_achats (offre_id) values ('20000000-0000-0000-0000-000000000002')")),
 ('resiliee', E(f"insert into ss_achats (offre_id) values ('20000000-0000-0000-0000-000000000001')")),
 ('fondatrice', "update ss_achats set statut='confirme'"),
 ('fondatrice', f"insert into ss_abonnements (client_id, formule_id, statut, fin) values ('{uid('abonnee')}','30000000-0000-0000-0000-000000000001','actif', now()+interval '20 days'), ('{uid('resiliee')}','30000000-0000-0000-0000-000000000001','actif', now()+interval '20 days')"),
 ('fondatrice', f"insert into ss_abonnements (client_id, formule_id, statut, debut, fin) values ('{uid('expiree')}','30000000-0000-0000-0000-000000000001','actif', now()-interval '40 days', now()-interval '10 days')"),
]
for u,q in prep: print('préparation', u, '→', run(u,q))
print('statut forcé par la cliente → ', run('fondatrice', "select string_agg(statut||'/'||(confirme_par is not null)::text, ',') from ss_achats"))
T=[]
def t(lbl,u,q,att): T.append((lbl,u,q,att))
for p in [None,'sans_achat','ebook','audio','abonnee','expiree','fondatrice','mineure','non_verifiee']:
    n=p or 'visiteur'
    t(f'{n} : catalogue',p,cat, '1' if p not in (None,'mineure','non_verifiee') else ('denied' if p is None else '0'))
    t(f'{n} : chapitre intégral',p,chap, 'Texte' if p in ('ebook','abonnee','fondatrice') else ('denied' if p is None else '(rien)'))
    t(f'{n} : fichier livre.epub',p,fich('oeuvres/o1/livre.epub'), '1' if p in ('ebook','abonnee','fondatrice') else '0')
    t(f'{n} : fichier livre.mp3',p,fich('oeuvres/o1/livre.mp3'), '1' if p in ('audio','abonnee','fondatrice') else '0')
    t(f'{n} : extrait audio séparé',p,fich('extraits/o1-3min.mp3'), '1' if p not in (None,'mineure','non_verifiee') else '0')
    t(f'{n} : manuscrit privé (table)',p,N(f"select 1 from ss_chapitres where oeuvre_id='{O2}'"), '1' if p=='fondatrice' else '0' if p else '-1')
t('fichiers détenus — acheteuse ebook','ebook',f"select ss_mes_fichiers('{O1}')::text",'livre.epub')
t('fichiers détenus — l\'acheteuse ebook ne reçoit pas l\'audio','ebook',f"select (ss_mes_fichiers('{O1}')::text like '%livre.mp3%')::text",'false')
t('fichiers détenus — sans achat','sans_achat',f"select ss_mes_fichiers('{O1}')::text",'[]')
t('fichiers détenus — manuscrit privé','abonnee',f"select ss_mes_fichiers('{O2}')::text",'[]')
t('fichiers détenus — mineure','mineure',f"select ss_mes_fichiers('{O1}')::text",'[]')
t('fondatrice-résiliation : abonnement résilié', 'fondatrice', f"update ss_abonnements set statut='resilie' where client_id='{uid('resiliee')}'", '')
t('résiliée : ebook acheté toujours lisible','resiliee',chap,'Texte')
t('résiliée : audio (abonnement) retiré','resiliee',fich('oeuvres/o1/livre.mp3'),'0')
t('résiliée : bibliothèque','resiliee',biblio,'achat')
t('expirée : bibliothèque vide','expiree',biblio,'[]')
t('abonnée : origine des droits','abonnee',biblio,'abonnement')
t('collaboratrice autorisée : manuscrit privé','collab',N(f"select 1 from ss_chapitres where oeuvre_id='{O2}'"),'1')
t('collaboratrice : publier','collab',E(f"update ss_oeuvres set statut='publie' where id='{O2}'"),'REFUSÉ')
t('collaboratrice : voir les achats','collab',N("select 1 from ss_achats"),'0')
t('assistante (autre permission) : manuscrits','assistante',N("select 1 from ss_oeuvres"),'0')
t('cliente : lire la table des chapitres','ebook',N("select 1 from ss_chapitres"),'0')
t('acheteuse : passer son achat en remboursé/modifier','audio',"update ss_achats set formats=array['ebook','audio'] returning 1",'')
t('… formats réellement détenus','fondatrice',f"select formats::text from ss_achats where client_id='{uid('audio')}'",'{audio}')
t('cliente : achat au nom d\'une autre',"sans_achat",E(f"insert into ss_achats (client_id, offre_id) values ('{uid('ebook')}','20000000-0000-0000-0000-000000000001')"),'REFUSÉ')
t('cliente : offre en brouillon','sans_achat',E("insert into ss_achats (offre_id) values ('20000000-0000-0000-0000-000000000003')"),'REFUSÉ')
t('mineure : demande d\'achat','mineure',E("insert into ss_achats (offre_id) values ('20000000-0000-0000-0000-000000000001')"),'REFUSÉ')
t('cliente : s\'activer un abonnement','sans_achat',E("insert into ss_abonnements (formule_id, statut, fin) values ('30000000-0000-0000-0000-000000000001','actif', now()+interval '1 year')"),'ACCEPTÉ')
t('… statut réel de cette demande','fondatrice',f"select statut from ss_abonnements where client_id='{uid('sans_achat')}'",'en_attente')
t('… et droits obtenus','sans_achat',chap,'(rien)')
t('renouvellement auto non validé','fondatrice',E("update ss_abonnements set renouvellement_auto=true"),'REFUSÉ')
t('ebook : progression privée écrite','ebook',E(f"insert into ss_lecture (oeuvre_id, format, position) values ('{O1}','ebook','{{\"chapitre\":2}}')"),'ACCEPTÉ')
t('fondatrice : lire les habitudes de lecture','fondatrice',N("select 1 from ss_lecture"),'0')
t('autre cliente : lire cette progression','audio',N("select 1 from ss_lecture"),'0')
t('visiteur : extrait texte','',"select ss_extrait('00000000-0000-0000-0000-000000000000')",'denied')
t('mineure : extrait texte','mineure',"select coalesce(ss_extrait((select id from ss_extraits limit 1))::text,'(rien)')",'(rien)')
t('génération payante sans coût estimé','fondatrice',E("insert into ss_generations (type, statut) values ('audio','approuvee')"),'REFUSÉ')
t('génération payante, quota à 0','fondatrice',E("insert into ss_generations (type, statut, cout_estime_centimes) values ('audio','approuvee', 120)"),'REFUSÉ')
t('génération approuvée par collaboratrice','collab',E("insert into ss_generations (type, statut, cout_estime_centimes) values ('audio','approuvee', 120)"),'REFUSÉ')
t('voix réelle sans autorisation','fondatrice',E("insert into ss_generations (type, parametres) values ('audio','{\"voix_clonee\":\"x\"}')"),'REFUSÉ')
t('génération en attente (gratuite tant que non lancée)','collab',E("insert into ss_generations (type, cout_estime_centimes) values ('texte', 30)"),'ACCEPTÉ')
t('cliente : téléverser un fichier','ebook',E("insert into storage.objects (bucket_id, name) values ('secret-stories-prive','oeuvres/pirate.epub')"),'REFUSÉ')
t('collaboratrice : supprimer les fichiers','collab',"delete from storage.objects where bucket_id='secret-stories-prive'",'')
t('… fichiers encore présents','fondatrice',"select count(*) from storage.objects",'5')
t('fondatrice : historique de versions après réécriture','fondatrice',f"update ss_chapitres set texte='Nouveau texte' where oeuvre_id='{O1}' and ordre=2; select count(*)||' version(s) archivée(s), version actuelle '||(select version from ss_chapitres where oeuvre_id='{O1}' and ordre=2) from ss_chapitres_versions",'1 version')
t('extrait audio hors dossier extraits/','fondatrice',E(f"insert into ss_extraits (oeuvre_id, type, audio_chemin) values ('{O1}','audio','oeuvres/o1/livre.mp3')"),'REFUSÉ')
t('collaboratrice : ajouter une traduction','collab',E(f"insert into ss_traductions (oeuvre_id, langue, titre) values ('{O1}','en','Title')"),'ACCEPTÉ')
t('collaboratrice : lire les contrats de droits','collab',N("select 1 from ss_droits"),'0')
t('collaboratrice : créer un contrat de droits','collab',E(f"insert into ss_droits (oeuvre_id, nature, titulaire) values ('{O1}','auteur','X')"),'REFUSÉ')
t('fondatrice : enregistrer un contrat de droits','fondatrice',E(f"insert into ss_droits (oeuvre_id, nature, titulaire) values ('{O1}','auteur','Titulaire fictif')"),'ACCEPTÉ')
t('cliente abonnée : lire traductions / droits','abonnee',N("select 1 from ss_traductions union all select 1 from ss_droits"),'0')
t('traduction : code de langue invalide','fondatrice',E(f"insert into ss_traductions (oeuvre_id, langue) values ('{O1}','anglais')"),'REFUSÉ')
ok=0
for lbl,u,q,att in T:
    if lbl.startswith('visiteur : extrait'): u=None
    r=run(u,q); bon = (att in r) if att else True
    if att=='0' and r!='0': bon=False
    if att=='1' and r!='1': bon=False
    ok+=bon; print(('✅' if bon else '❌'), lbl, '→', r[:110])
print(f'\n{ok}/{len(T)} conformes')
