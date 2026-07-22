#!/bin/bash
# RBS Crew SN — Rollback Script
# Ce script est appelé par Jenkins en cas d'échec de déploiement
# Il doit restaurer la version précédente du service

set -euo pipefail

echo "=== Début du rollback ==="

# Jenkins appelle ce script avec le service en ARGUMENT positionnel
# (./scripts/rollback.sh "$SERVICE") — l'ancienne version ne lisait que la
# variable d'environnement et retombait donc toujours sur api-go.
SERVICE="${1:-${SERVICE:-api-go}}"
IMAGE_BASE="ghcr.io/cheikh-nakamoto/rbs-crew-${SERVICE}"
echo "Service: $SERVICE"

# docker compose pointe sur :latest. Sans ce re-tag, « redémarrer » relance
# exactement l'image défaillante : le rollback était inopérant.
if docker image inspect "${IMAGE_BASE}:previous" >/dev/null 2>&1; then
    echo "Re-tag ${IMAGE_BASE}:previous → ${IMAGE_BASE}:latest"
    docker tag "${IMAGE_BASE}:previous" "${IMAGE_BASE}:latest"
else
    echo "Aucune image :previous disponible pour ${SERVICE} — rollback impossible."
    echo "Intervention manuelle requise."
    exit 1
fi

# Arrêter et supprimer le conteneur actuel
if docker compose ps | grep -q "${SERVICE}"; then
    echo "Arrêt du conteneur $SERVICE..."
    docker compose stop "$SERVICE" || true
    docker compose rm -f "$SERVICE" || true
else
    echo "Le conteneur $SERVICE n'est pas en cours d'exécution"
fi

# Redémarrer le service sur l'image qui vient d'être re-taguée
echo "Redémarrage avec l'image précédente..."
docker compose up -d "$SERVICE"

MAX_ATTEMPTS=5
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if docker compose ps "$SERVICE" | grep -q "Up"; then
        echo "Rollback réussi - $SERVICE est opérationnel"
        exit 0
    fi
    ATTEMPT=$((ATTEMPT + 1))
    sleep 5
done

echo "Échec du rollback - impossible de démarrer $SERVICE"
exit 1