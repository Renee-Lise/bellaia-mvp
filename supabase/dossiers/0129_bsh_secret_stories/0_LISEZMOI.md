# Dossier de migration 0129 — BSH Secret Stories

**Statut : PRÉPARÉE — NON APPLIQUÉE.** 20 tables `ss_*` (dont traductions et droits, ajoutées le 19/11). Rien ne doit être exécuté sur Supabase sans l'autorisation explicite de la fondatrice. La migration 0128 n'est ni modifiée ni réexécutée par ce dossier.

| Fichier | Rôle |
|---|---|
| `1_migration_0129.sql` | La migration (copie exacte de `supabase/migrations/0129_bsh_secret_stories.sql`, empreinte SHA-256 `d75e64f0f1c444ff…`) |
| `2_retour_arriere_0129.sql` | Retour arrière (copie exacte de `supabase/migrations/rollback/…`, empreinte `a4c9bdf2f2afcfa0…`) — **jamais collé en même temps que la migration** |
| `3_verifications_avant.sql` | Contrôles en lecture seule à exécuter avant |
| `4_verifications_apres.sql` | Contrôles en lecture seule à exécuter après |
| `5_rapport_tests.txt` | Rapport des 100 tests de profils (base locale jetable) |

## Prérequis — vérifiés sur Supabase le 19/11/2026 (lecture seule) : 10/10 OK
- fonctions `is_fondatrice()` et `a_permission(p, u)` ;
- colonnes `profiles.age_verifi` et `profiles.date_naissance` ;
- table `bellaia_permissions` ;
- `gen_random_uuid()` ;
- schéma `storage` ;
- aucune table `ss_*` ni bucket `secret-stories-prive` déjà présents ;
- aucune permission `secret_stories.studio` accordée.

Photographie de référence : 8 profils, 0 permission, 3 hôtes BSH, 4 commandes.

## Procédure (après GO uniquement)
1. Supabase › SQL Editor › nouvel onglet : coller **`3_verifications_avant.sql`** → toutes les lignes « OK ». Noter la photographie.
2. Nouvel onglet : coller **uniquement** `1_migration_0129.sql` → Run.
   - Si Supabase demande une confirmation (« opération destructive » ou autre), lisez le message.
   - La migration ne supprime rien. Confirmez seulement si le message concerne les `drop policy if exists` / `drop trigger if exists` de ce fichier ; sinon arrêtez et transmettez le message.
3. Nouvel onglet : coller **`4_verifications_apres.sql`** → 11 lignes « OK » (dont 20 tables), photographie **identique** à l'étape 1.
4. Prévenir Claude : les tests de profils seront refaits sur Supabase (comptes de test temporaires, supprimés ensuite ; aucune donnée réelle touchée).
5. En cas d'anomalie : coller `2_retour_arriere_0129.sql` **seul**, après décision de la fondatrice. Il supprime uniquement les tables `ss_*` et leurs fonctions ; les fichiers du bucket restent à vider à la main.

## Rapport de tests (base PostgreSQL 16 locale, jeu d'essai fictif)
- **100/100 conformes** (19/11, sur la copie de ce dossier) : les 94 tests initiaux + 6 tests traductions et droits (traductions : studio ; contrats de droits : fondatrice seule ; codes de langue contrôlés).
- 8 profils : visiteur, cliente sans achat, acheteuse ebook, acheteuse audio, abonnée active, abonnée expirée, fondatrice, mineure / âge non vérifié.
- Tentatives d'accès direct aux fichiers, API et ouvrages non achetés : refusées.
- Achats conservés après résiliation ; droits d'abonnement seuls retirés.
- Habitudes de lecture invisibles de la fondatrice ; quota IA à 0 ; publication réservée à la fondatrice.
- Migration rejouable sans perte ; retour arrière propre (aucune table ni fonction `ss_*` restante, profils intacts).
- Script `4_verifications_apres.sql` validé sur la base locale : 11/11 OK.
