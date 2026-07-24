# Déploiement du backend (api-go) sur Railway

**Principe : Railway ne compile rien.** Le service a pour source une image Docker
déjà construite et publiée sur GHCR par GitHub Actions
(`.github/workflows/ci.yml`, job `build-and-push-docker`). Railway se contente de
`docker pull` puis de lancer le conteneur.

Image de référence :

```
ghcr.io/cheikh-nakamoto/rbs-crew-api-go:main          # suit la branche main
ghcr.io/cheikh-nakamoto/rbs-crew-api-go:sha-<commit>  # immuable, pour épingler / rollback
```

Le package GHCR est **public** : aucun identifiant de registre n'est nécessaire
côté Railway (un registre privé imposerait le plan Pro + un PAT classic GitHub).

> ⚠️ `railway.json` / `railway.toml` ne sont **pas** lus par un service dont la
> source est une image : ces fichiers ne servent qu'aux services construits
> depuis un dépôt. Toute la configuration ci-dessous se fait donc dans les
> réglages du service (dashboard ou CLI), pas dans le dépôt.

---

## 1. Créer le service à partir de l'image

Dashboard → projet → **New** → **Empty Service**, puis dans
**Settings → Source → Docker Image** coller :

```
ghcr.io/cheikh-nakamoto/rbs-crew-api-go:main
```

Aucun builder n'apparaît une fois la source « image » choisie : c'est ce qui
garantit qu'aucun build n'est déclenché sur Railway.

En CLI (`npm i -g @railway/cli` puis `railway login && railway link`) :

```bash
railway add --image ghcr.io/cheikh-nakamoto/rbs-crew-api-go:main --service api-go
# vérifier les options disponibles selon la version : railway add --help
```

## 2. Base de données et cache

```bash
railway add --database postgres
railway add --database redis
```

Puis, dans les variables du service `api-go`, référencer les services voisins
plutôt que de recopier les URLs (elles changent à chaque reprovisionnement) :

```
DATABASE_URL = ${{Postgres.DATABASE_URL}}
REDIS_URL    = ${{Redis.REDIS_URL}}
```

Ces références résolvent vers le réseau privé Railway (pas de sortie Internet,
pas de facturation egress).

## 3. Variables d'environnement

Obligatoires — l'API **refuse de démarrer** sans elles
(`apps/api-go/internal/config/config.go`) :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `JWT_SECRET` | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | `openssl rand -base64 64` (différent du précédent) |

Réseau — voir §4 :

| Variable | Valeur |
|---|---|
| `PORT` | `4000` |
| `API_PORT` | `4000` |

Fonctionnelles :

| Variable | Valeur |
|---|---|
| `APP_ENV` | `production` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `APP_URL` | URL publique du front (liens des e-mails) |
| `CORS_ORIGIN` | origines du front, séparées par des virgules |
| `NABOO_API_KEY`, `NABOO_WEBHOOK_SECRET`, `NABOO_BASE_URL` | sans elles, `/payments/create-checkout` répond 400 |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | sans elles, aucun e-mail ne part (vérification d'adresse, reset mot de passe) |
| `GOOGLE_CLIENT_ID` | vérification de l'`id_token` « Continuer avec Google » |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | stockage média Cloudflare R2 |

Les valeurs de référence sont dans `.env.example` et dans le bloc `api-go` de
`docker-compose.yml`.

## 4. Port

Railway injecte `PORT` et route le trafic HTTP vers ce port. L'API écoute sur
`":" + API_PORT` (donc sur toutes les interfaces, `0.0.0.0` — ce que Railway
exige), avec `4000` par défaut. On fixe donc explicitement `PORT=4000` **et**
`API_PORT=4000`, puis dans **Settings → Networking → Public Networking** on
génère un domaine avec **target port = 4000**.

Un port cible qui ne correspond pas au port d'écoute est la cause n°1 du
« Application failed to respond » (502) sur Railway.

## 5. Healthcheck

**Settings → Deploy → Healthcheck Path** : `/health` (vérifie la connexion DB).
Railway ne bascule le trafic sur le nouveau déploiement qu'une fois ce endpoint
en 200 — un conteneur qui démarre sans base reste donc sur l'ancienne version.

## 6. Initialiser le schéma (une seule fois)

L'image ne joue **aucune** migration au démarrage : sur Docker Compose, le
schéma est appliqué par `initdb`, ce que la base managée Railway ne fait pas —
elle arrive vide.

Prérequis : `psql`, `jq`, et la CLI Railway liée au projet :

```bash
npm i -g @railway/cli     # ou : npx @railway/cli <commande>
railway login
railway link              # choisir projet + environnement
railway whoami            # vérification
```

Puis, depuis la racine du dépôt :

```bash
make railway-db-init      # extensions + schema.sql (base VIDE uniquement)
```

La cible résout elle-même `DATABASE_PUBLIC_URL` via
`railway variable list --service Postgres --json` : rien à recopier à la main, et
l'URL reste juste après un reprovisionnement de la base. Si le service Postgres
porte un autre nom :

```bash
make railway-db-init RAILWAY_DB_SERVICE=postgres-prod
```

Cibles associées (`Makefile`) :

| Cible | Rôle |
|---|---|
| `make railway-db-url` | affiche l'URL publique résolue (⚠️ contient le mot de passe) |
| `make railway-db-init` | `01-extensions.sql` + `make db-push` — **base vide uniquement** |
| `make railway-db-patch` | rejoue `apps/api-go/sql/patches/*.sql` (idempotent) sur une base déjà initialisée |
| `make railway-psql` | `railway connect Postgres` — shell psql interactif |
| `make railway-migrate-import` | importe `data/raw/*.json` (voir §7) |
| `make railway-seed-admin` | crée / met à jour le compte admin (voir §7) |

Sur une base déjà initialisée, tout changement de schéma passe par
`make railway-db-patch`, jamais par `db-push` ni `db-reset` (qui détruit tout).

Équivalent manuel, si l'on préfère ne pas passer par `make` :

```bash
railway connect Postgres          # shell psql, puis \i infra/postgres/init/01-extensions.sql
# ou en pointant psql soi-même :
export DATABASE_URL="$(make railway-db-url)"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f infra/postgres/init/01-extensions.sql
make db-push
```

> `DATABASE_URL` (celle injectée dans les services Railway) pointe vers
> `postgres.railway.internal` : elle n'est résolvable que **depuis** un
> conteneur Railway. Depuis le poste de dev, c'est toujours
> `DATABASE_PUBLIC_URL` (proxy TCP `*.proxy.rlwy.net`) qu'il faut utiliser.

## 7. Peupler la base : contenu + compte admin

Ordre à respecter — `railway-db-init` (§6) d'abord, la base doit exister.

```bash
# 1. Images → Cloudflare R2 (nécessite les R2_* dans .env)
make migrate-upload

# 2. Contenu WordPress → base Railway
make railway-migrate-import

# 3. Compte administrateur
ADMIN_PASSWORD='…' make railway-seed-admin
```

> ⚠️ **`make migrate-upload` n'est pas optionnel avant l'import.**
> `import-db.ts` n'écrit que les images ayant un `cloudUrl` (URL R2) dans le
> JSON ; les autres sont ignorées **silencieusement**. Or dans l'état actuel de
> `data/raw/` : artistes 223/223, projets 13/13 → OK, mais **produits 0/12** —
> importer maintenant crée 8 produits sans aucune image. `migrate-upload` est
> incrémental (il saute les images déjà présentes sur R2), donc le relancer ne
> coûte que les 12 manquantes.

Les deux cibles sont réexécutables : l'import fait des upserts (`wcId` / `slug`
comme clés), et `seed-admin` met à jour le mot de passe du compte existant.

`railway-seed-admin` ne démarre pas le conteneur postgres local, contrairement à
`make seed-admin`. Variables reconnues : `ADMIN_PASSWORD` (requis),
`ADMIN_EMAIL` (défaut `admin@rbscrew.sn`), `ADMIN_FIRST_NAME`, `ADMIN_LAST_NAME`.

> `import-db.ts` reconstruit sa connexion depuis les composants de l'URL
> (`host`, `port`, `user`, …) et ignore donc les paramètres de query type
> `sslmode` : le proxy public Railway accepte le TCP simple, mais garder ce
> point en tête si la base est un jour placée derrière un Postgres exigeant TLS.

## 8. Redéploiement automatique à chaque push

Deux mécanismes, au choix :

- **Côté Railway** : le tag `:main` n'étant pas versionné, Railway détecte le
  nouveau digest et propose une mise à jour (activable en automatique via
  *Settings → Updates*).
- **Côté CI (recommandé, déterministe)** : le job `build-and-push-docker`
  contient une étape `Redeploy Railway (api-go)` qui lance
  `railway redeploy --service api-go --from-source --yes`. `--from-source` est
  obligatoire ici : un `redeploy` nu relance le déploiement existant, donc le
  même digest. L'étape est ignorée tant que le secret n'existe pas. Pour
  l'activer :
  - secret de dépôt `RAILWAY_TOKEN` = **project token**
    (Railway → projet → Settings → Tokens) ;
  - variable de dépôt `RAILWAY_SERVICE` si le service ne s'appelle pas `api-go`.

## 9. Rollback

Pointer la source du service sur un tag immuable, sans rebuild :

```
ghcr.io/cheikh-nakamoto/rbs-crew-api-go:sha-<commit-connu-bon>
```

puis redéployer. Les tags `sha-*` sont poussés par la CI depuis ce commit ; pour
les commits antérieurs, seul `:main` existe et l'ancien digest se retrouve dans
l'historique des déploiements Railway.
