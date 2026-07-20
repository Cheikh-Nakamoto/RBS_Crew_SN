#!/bin/bash
# RBS Crew SN — Rollback Script
# Ce script est appelé par Jenkins en cas d'échec de déploiement
# Il doit restaurer la version précédente du service

set -euo pipefail

echo "=== Début du rollback ==="

# Récupérer le nom du service depuis les variables d'environnement
SERVICE="${SERVICE:-api-go}"
echo "Service: $SERVICE"

# Arrêter et supprimer le conteneur actuel
if docker compose ps | grep -q "${SERVICE}"; then
    echo "Arrêt du conteneur $SERVICE..."
    docker compose stop "$SERVICE" || true
    docker compose rm -f "$SERVICE" || true
else
    echo "Le conteneur $SERVICE n'est pas en cours d'exécution"
fi

# Redémarrer le service avec l'image :previous
if docker images | grep -q "ghcr.io/cheikh-nakamoto/rbs-crew-${SERVICE}"; then
    echo "Redémarrage avec l'image précédente..."
    docker compose up -d "$SERVICE"

    # Vérifier que le service est bien démarré
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
else
    echo "Aucune image précédente trouvée pour $SERVICE"
    exit 1
fi