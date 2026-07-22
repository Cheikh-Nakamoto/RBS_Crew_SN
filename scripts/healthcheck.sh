#!/bin/bash
# RBS Crew SN — Health Check Script
# Ce script vérifie que le service déployé est opérationnel

set -euo pipefail

echo "=== Vérification de santé ==="

# Récupérer les paramètres
# Jenkins passe le service en argument positionnel.
SERVICE="${1:-${SERVICE:-api-go}}"
# Vide par défaut : on s'appuie sur le healthcheck Docker du conteneur, qui sonde
# depuis l'INTÉRIEUR. Sonder http://localhost:4000 depuis l'hôte ne peut pas
# marcher — api-go ne publie aucun port (accès via le réseau Docker uniquement).
# Renseigner HEALTH_CHECK_URL force une sonde HTTP externe à la place.
HEALTH_CHECK_URL="${HEALTH_CHECK_URL:-}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
DELAY_SECONDS="${DELAY_SECONDS:-3}"

echo "Service: $SERVICE"
echo "Mode: ${HEALTH_CHECK_URL:-healthcheck Docker du conteneur}"
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

    if [ -n "$HEALTH_CHECK_URL" ]; then
        # Sonde HTTP externe explicitement demandée.
        if curl -s -f -o /dev/null "$HEALTH_CHECK_URL"; then
            echo "✓ Health check réussi - $SERVICE répond sur $HEALTH_CHECK_URL"
            exit 0
        fi
        echo "✗ Pas de réponse sur $HEALTH_CHECK_URL"
        sleep "$DELAY_SECONDS"
        continue
    fi

    CID="$(docker compose ps -q "$SERVICE" 2>/dev/null || true)"
    if [ -z "$CID" ]; then
        echo "Conteneur introuvable pour $SERVICE"
        sleep "$DELAY_SECONDS"
        continue
    fi

    STATE="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$CID" 2>/dev/null || echo unknown)"
    case "$STATE" in
        healthy)
            echo "✓ Health check réussi - $SERVICE est healthy"
            exit 0
            ;;
        none)
            # Pas de healthcheck déclaré : le conteneur tourne, c'est tout ce
            # qu'on peut affirmer sans inventer une sonde.
            echo "✓ $SERVICE est démarré (aucun healthcheck déclaré dans docker-compose)"
            exit 0
            ;;
        *)
            echo "✗ État: $STATE"
            sleep "$DELAY_SECONDS"
            ;;
    esac
done

echo "Échec du health check après $MAX_ATTEMPTS tentatives"
exit 1