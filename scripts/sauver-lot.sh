#!/bin/bash
# SAUVEGARDE AUTOMATIQUE DES LOTS D'ENRICHISSEMENT
#
# Une session interrompue emporte tout ce qui n'est pas sur disque ET committé. On a déjà perdu
# 131 fiches comme ça. Ce script tourne en boucle : il transforme les réponses brutes des agents
# en fiches validées, puis les committe. Rien n'est poussé — le push reste une décision de Jayen.
set -u
cd "$(dirname "$0")/.." || exit 1
TRAVAIL="data/_travail-enrichissement"

while true; do
  # 1. les réponses d'agents deviennent des fiches validées (l'opération est idempotente)
  if compgen -G "$TRAVAIL/out/*.json" > /dev/null; then
    node scripts/enrichir-avis.mjs --source avis-bruts-ulta --finaliser "$TRAVAIL" > /tmp/ss-finalise.log 2>&1
  fi

  # 2. on committe s'il y a du nouveau, en nommant le lot par son avancement
  git add -A data/avis-enrichis data/avis-bruts-ulta 2>/dev/null
  if ! git diff --cached --quiet; then
    N=$(ls data/avis-enrichis/*.json 2>/dev/null | wc -l | tr -d ' ')
    NOUV=$(git diff --cached --numstat -- data/avis-enrichis | wc -l | tr -d ' ')
    git commit -q -m "data(avis): lot enrichi — $N fiches au total (+$NOUV)

Sauvegarde automatique d'un lot d'analyse d'avis. Committé au fil de l'eau : une
session interrompue emporte tout ce qui n'est pas sur disque et versionné.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
    echo "$(date +%H:%M:%S) — commit : $N fiches (+$NOUV)"
  fi
  sleep 300
done
