/**
 * Validation de la configuration d'authentification.
 *
 * Appelée depuis `instrumentation.ts`, donc UNE fois au démarrage du serveur et
 * avant toute requête. Ce point d'ancrage est délibéré :
 *
 * - pas dans une interpolation `${VAR:?}` de docker-compose : compose interprète
 *   le fichier entier à chaque commande, y compris pour un autre service et
 *   pendant un rollback ; une variable manquante y bloquerait jusqu'au retour
 *   arrière ;
 * - pas au premier import de `lib/auth.ts` : ce module n'est chargé qu'à la
 *   première requête touchant l'authentification. Le conteneur démarrerait
 *   « Ready », passerait son healthcheck sur `/`, et seules les pages
 *   authentifiées échoueraient — un déploiement vert pour un service cassé.
 */
export function assertAuthConfig(): void {
  if (process.env.NODE_ENV !== 'production') return;

  if (!process.env.AUTH_SECRET) {
    throw new Error(
      'AUTH_SECRET est absent. Sans secret propre, les cookies de session peuvent être ' +
        'forgés, y compris avec le rôle ADMIN. Générer avec : openssl rand -base64 64'
    );
  }

  if (!process.env.AUTH_URL?.startsWith('https://')) {
    throw new Error(
      `AUTH_URL doit être l'URL publique du site en https:// (valeur actuelle : ` +
        `${process.env.AUTH_URL || 'absente'}). En http://, le cookie de session est émis ` +
        'sans le flag Secure ni le préfixe __Host-, même derrière un nginx en TLS.'
    );
  }
}
