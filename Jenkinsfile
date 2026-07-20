// ============================================================================
// RBS Crew SN — Pipeline de déploiement Jenkins (générique, paramétré)
// ============================================================================
//
// Utilisé pour tous les services applicatifs :
//   api-go, nextjs-web
//
// Déclenché par :
//   - le job "poll-ghcr" (auto, cron 5min via Jenkinsfile.poll)
//   - manuellement via "Build with Parameters"
//
// Concurrence :
//   - disableConcurrentBuilds() sérialise les runs de ce job → jamais deux
//     'docker compose up' en même temps sur le même compose file.
//
// Exécution :
//   - Tout tourne dans le WORKSPACE Jenkins (checkout scm).
//   - Le .env (secrets) est injecté via le credential 'rbs-crew-env' (Secret file).
//   - COMPOSE_PROJECT_NAME est fixé à 'rbs-crew'.
// ============================================================================

pipeline {
    agent { label 'build-test' }

    parameters {
        choice(
            name: 'SERVICE',
            choices: ['api-go', 'nextjs-web'],
            description: 'Service applicatif à déployer'
        )
        string(
            name: 'IMAGE_TAG',
            defaultValue: 'main',
            description: 'Tag GHCR à déployer (ex: "main", ou SHA du commit). Sera re-tagué en :latest localement.'
        )
        booleanParam(
            name: 'SKIP_HEALTHCHECK',
            defaultValue: false,
            description: 'Ne pas exécuter le health check (debug uniquement)'
        )
    }

    environment {
        COMPOSE_FILE         = 'docker-compose.yml'
        COMPOSE_PROJECT_NAME = 'rbs-crew'
        GHCR_REGISTRY        = 'ghcr.io'
        GHCR_OWNER           = 'cheikh-nakamoto' // À adapter selon le nom exact du propriétaire (organisation ou utilisateur)
        IMAGE_PREFIX         = 'rbs-crew'
        // Chemin du .env (secrets) fourni par le credential Jenkins "Secret file".
        // On NE l'écrit PAS dans le workspace : on le passe à compose via --env-file.
        ENV_FILE             = credentials('rbs-crew-env') // Assurez-vous d'avoir ce credential dans Jenkins
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '30', daysToKeepStr: '30'))
        timeout(time: 15, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Init & validate') {
            steps {
                script {
                    def validServices = ['api-go', 'nextjs-web']
                    if (!(params.SERVICE in validServices)) {
                        error "Service invalide : '${params.SERVICE}'. Attendu : ${validServices.join(', ')}"
                    }

                    currentBuild.displayName = "#${env.BUILD_NUMBER} — ${params.SERVICE}:${params.IMAGE_TAG}"
                    currentBuild.description = "Deploy ${params.SERVICE} @ ${params.IMAGE_TAG}"
                }
                echo "==> Déploiement '${params.SERVICE}' avec tag '${params.IMAGE_TAG}'"
            }
        }

        stage('Checkout infra') {
            steps { checkout scm }
        }

        stage('GHCR login') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'ghcr-token',
                    usernameVariable: 'GHCR_USER',
                    passwordVariable: 'GHCR_PASS'
                )]) {
                    sh '''#!/bin/bash
set -euo pipefail
echo "$GHCR_PASS" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
'''
                }
            }
        }

        stage('Pull image') {
            steps {
                sh """#!/bin/bash
set -euo pipefail
IMAGE_FULL='${env.GHCR_REGISTRY}/${env.GHCR_OWNER}/${env.IMAGE_PREFIX}-${params.SERVICE}:${params.IMAGE_TAG}'
echo "==> Pull \$IMAGE_FULL"
docker pull "\$IMAGE_FULL"
"""
            }
        }

        stage('Tag :previous (for rollback)') {
            steps {
                sh """#!/bin/bash
set -eu
IMAGE_BASE='${env.GHCR_REGISTRY}/${env.GHCR_OWNER}/${env.IMAGE_PREFIX}-${params.SERVICE}'

# Si une image :latest existe localement, la tagguer en :previous
if docker image inspect "\${IMAGE_BASE}:latest" >/dev/null 2>&1; then
    echo "==> Snapshot: \${IMAGE_BASE}:latest → \${IMAGE_BASE}:previous"
    docker tag "\${IMAGE_BASE}:latest" "\${IMAGE_BASE}:previous"
else
    echo "==> Pas d'image :latest existante → premier déploiement, pas de :previous"
fi
"""
            }
        }

        stage('Re-tag → :latest') {
            steps {
                sh """#!/bin/bash
set -eu
IMAGE_BASE='${env.GHCR_REGISTRY}/${env.GHCR_OWNER}/${env.IMAGE_PREFIX}-${params.SERVICE}'
TAG='${params.IMAGE_TAG}'

if [ "\$TAG" != "latest" ]; then
    echo "==> Re-tag \${IMAGE_BASE}:\${TAG} → \${IMAGE_BASE}:latest"
    docker tag "\${IMAGE_BASE}:\${TAG}" "\${IMAGE_BASE}:latest"
fi
"""
            }
        }

        stage('Deploy') {
            steps {
                sh """#!/bin/bash
set -euo pipefail
echo "==> Deploy ${params.SERVICE} (+ dépendances dans l'ordre) via docker compose up -d --wait"
docker compose -f '${env.COMPOSE_FILE}' --env-file "\$ENV_FILE" up -d --wait '${params.SERVICE}'
"""
            }
            post {
                failure {
                    sh '''#!/bin/bash
echo "=== 100 DERNIERS LOGS DU CONTENEUR "''' + params.SERVICE + '''" ==="
docker compose -f "''' + env.COMPOSE_FILE + '''" logs --tail=100 "''' + params.SERVICE + '''" || true
echo "=========================================================="
'''
                }
            }
        }

//         stage('Health check') {
//             when { expression { !params.SKIP_HEALTHCHECK } }
//             steps {
//                 sh """#!/bin/bash
// set -euo pipefail
// # Assurez-vous que le script healthcheck.sh existe bien dans RBS_Crew_SN/scripts/
// if [ -f "./scripts/healthcheck.sh" ]; then
//     ./scripts/healthcheck.sh '${params.SERVICE}'
// else
//     echo "Pas de script healthcheck.sh trouvé, skip manuel."
// fi
// """
//             }
//         }

        stage('Cleanup dangling') {
            steps {
                sh '''#!/bin/bash
set -eu
docker image prune -f --filter "until=24h" || true
'''
            }
        }
    }

    post {
        success {
            echo "✓ Déploiement OK : ${params.SERVICE}:${params.IMAGE_TAG}"
        }
        failure {
            echo "✗ Déploiement KO : ${params.SERVICE}:${params.IMAGE_TAG} — rollback…"
            node('build-test') {
                sh """#!/bin/bash
set -eu
cd "\${WORKSPACE}"

echo "=== LOGS DU CONTENEUR EN ÉCHEC (${params.SERVICE}) ==="
docker compose -f '${env.COMPOSE_FILE}' --env-file "\$ENV_FILE" logs '${params.SERVICE}' || true
echo "=================================="

if [ -f "./scripts/rollback.sh" ]; then
    ./scripts/rollback.sh '${params.SERVICE}' || echo "Rollback also failed — investigation manuelle requise"
else
    echo "Pas de script rollback.sh trouvé."
fi
"""
            }
        }
        always {
            node('build-test') {
                sh '''#!/bin/bash
docker logout ghcr.io || true
'''
            }
        }
    }
}
