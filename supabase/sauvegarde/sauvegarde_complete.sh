#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# Sauvegarde COMPLÈTE de la production Bellaïa — gratuite, à lancer par la fondatrice sur son ordinateur.
# Contenu : rôles, structure, données (public…), comptes (auth), fichiers de tous les compartiments de stockage,
# manifeste des fichiers, empreintes SHA-256 de chaque fichier de la sauvegarde.
# Prérequis : Supabase CLI (https://supabase.com/docs/guides/cli) ; le mot de passe de la base est saisi ici
# et n'est JAMAIS transmis à Claude ni écrit dans un fichier.
# Lecture seule pour la production : aucune écriture, aucune migration.
# Usage : bash sauvegarde_complete.sh [dossier_de_destination]
# ═══════════════════════════════════════════════════════════════════════════════
set -euo pipefail
PROJET=juewoennvtumkgbrbhme
ICI="$(cd "$(dirname "$0")" && pwd)"
D="${1:-.}/bellaia_sauvegarde_$(date +%Y-%m-%d_%H%M)"
COMPARTIMENTS="bellaia-branding bsh-documents bsh-visuels equipe-prive events-medias food-recettes-media histoires-medias stocks-images"
command -v supabase >/dev/null || { echo "Supabase CLI absente. Installation : https://supabase.com/docs/guides/cli"; exit 1; }
mkdir -p "$D/stockage"; umask 077
echo "1/6 Liaison au projet (mot de passe de la base demandé par la CLI, ou lu dans SUPABASE_DB_PASSWORD en exécution automatique)"
if [ -n "${SUPABASE_DB_PASSWORD:-}" ]; then supabase link --project-ref "$PROJET" -p "$SUPABASE_DB_PASSWORD"; else supabase link --project-ref "$PROJET"; fi
echo "2/6 Rôles";      supabase db dump --role-only -f "$D/roles.sql"
echo "3/6 Structure";  supabase db dump -f "$D/structure.sql"
echo "4/6 Données";    supabase db dump --data-only -f "$D/donnees.sql"
echo "5/6 Comptes (fichier TRÈS sensible : mots de passe chiffrés, e-mails)"
supabase db dump --data-only --schema auth -f "$D/auth_donnees.sql"
echo "6/6 Fichiers du stockage"
for b in $COMPARTIMENTS; do
  mkdir -p "$D/stockage/$b"
  supabase storage cp -r "ss:///$b" "$D/stockage/$b" --experimental || echo "  ⚠ $b : téléchargement incomplet ou compartiment vide — à vérifier"
done
echo "Manifeste et empreintes"
bash "$ICI/manifeste_stockage.sh" "$D/stockage" > "$D/manifeste_stockage.tsv"
compte_auth=$(awk '/^COPY "?auth"?\."?users"? /{c=1;next} c&&/^\\\.$/{c=0} c{n++} /^INSERT INTO "?auth"?\."?users"?/{n++} END{print n+0}' "$D/auth_donnees.sql")
printf 'auth.users\t%s\n' "$compte_auth" > "$D/manifeste_comptes.tsv"
( cd "$D" && find . -type f ! -name empreintes.sha256 | LC_ALL=C sort | while IFS= read -r f; do if command -v sha256sum >/dev/null; then sha256sum "$f"; else shasum -a 256 "$f"; fi; done > empreintes.sha256 )
echo; cat "$D/manifeste_stockage.tsv"; cat "$D/manifeste_comptes.tsv"
cat <<FIN

Sauvegarde terminée : $D
• À DÉPOSER dans le Drive privé pour le contrôle de restauration (Claude) :
    roles.sql, structure.sql, donnees.sql, manifeste_stockage.tsv, manifeste_comptes.tsv, empreintes.sha256
• À GARDER hors ligne (disque chiffré) et NE PAS transmettre : auth_donnees.sql, dossier stockage/
• Archive chiffrée conseillée :
    tar -czf "$D.tar.gz" "$D" && openssl enc -aes-256-cbc -pbkdf2 -salt -in "$D.tar.gz" -out "$D.tar.gz.enc" && rm "$D.tar.gz"
FIN
