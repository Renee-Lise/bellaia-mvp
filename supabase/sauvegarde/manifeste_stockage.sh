#!/usr/bin/env bash
# Manifeste d'un dossier de stockage téléchargé : une ligne par compartiment
#   compartiment <TAB> nombre de fichiers <TAB> octets <TAB> empreinte
# L'empreinte = md5 de la liste triée « chemin|taille » (une ligne par fichier, sans saut final),
# calculée exactement comme la référence lue dans storage.objects (aucun contenu ne transite).
# Usage : bash manifeste_stockage.sh <dossier_stockage>   (un sous-dossier par compartiment)
set -euo pipefail
S="$1"
md5x() { if command -v md5sum >/dev/null; then md5sum | cut -d' ' -f1; else md5 -q; fi; }
for d in "$S"/*/; do
  b=$(basename "$d"); racine="$d"
  # Certaines versions de la CLI recréent le nom du compartiment dans la destination : on le neutralise.
  if [ -d "$d/$b" ] && [ -z "$(find "$d" -maxdepth 1 -type f)" ] && [ "$(find "$d" -mindepth 1 -maxdepth 1 | wc -l | tr -d ' ')" = 1 ]; then racine="$d/$b/"; fi
  liste=$(cd "$racine" && find . -type f | sed 's#^\./##' | LC_ALL=C sort | while IFS= read -r f; do printf '%s|%s\n' "$f" "$(wc -c < "$f" | tr -d ' ')"; done)
  n=$(printf '%s' "$liste" | grep -c . || true)
  octets=$(printf '%s\n' "$liste" | awk -F'|' 'NF>1{s+=$NF} END{printf "%d", s}')
  printf '%s\t%s\t%s\t%s\n' "$b" "$n" "$octets" "$(printf '%s' "$liste" | md5x)"
done
