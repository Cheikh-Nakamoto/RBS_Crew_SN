import { assertAuthConfig } from '@/lib/auth-config-guard';

/**
 * Exécuté une fois au démarrage du serveur, avant la première requête.
 *
 * Un secret de session manquant doit empêcher le service de démarrer, et non
 * produire un conteneur « Ready » dont seules les pages authentifiées échouent :
 * le healthcheck porte sur `/`, qui répondrait 200 et validerait un déploiement
 * pourtant cassé.
 */
export function register() {
  // `nodejs` uniquement : le runtime edge n'exécute pas le serveur applicatif et
  // n'a pas accès aux mêmes variables d'environnement.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    assertAuthConfig();
  }
}
