#!/bin/bash
# RBS Crew SN — Health Check Script
# Ce script vérifie que le service déployé est opérationnel

set -euo pipefail

echo "=== Vérification de santé ==="

# Récupérer les paramètres
SERVICE="${SERVICE:-api-go}"
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-http://localhost:4000/health}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
DELAY_SECONDS="${DELAY_SECONDS:-3}"

echo "Service: $SERVICE"
echo "URL de vérification: $HEALTH_CHECK_URL"
echo "Nombre maximal de tentatives: $MAX_ATTEMPTS"
echo "Délai entre les tentatives: $DELAY_SECONDS secondes"

ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    ATTEMPT=$((ATTEMPT + 1))
    echo "Tentative $ATTEMPT/$MAX_ATTEMPTS..."

    # Vérifier si le conteneur est en cours d'exécution
    if ! docker compose ps "$SERVICE" | grep -q "Up"; then
        echo "Le conteneur $SERVICE n'est pas en cours d'exécution"
        sleep "$DELAY_SECONDS"
        continue
    fi

    # Effectuer la requête HTTP
    if curl -s -f -o /dev/null "$HEALTH_CHECK_URL"; then
        echo "✓ Health check réussi - $SERVICE est opérationnel"
        exit 0
    else
        echo "✗ Health check échoué"
        sleep "$DELAY_SECONDS"
    fi
done

echo "Échec du health check après $MAX_ATTEMPTS tentatives"
exit 1