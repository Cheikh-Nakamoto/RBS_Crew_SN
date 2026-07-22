# RBS Crew SN

RBS Crew SN est une plateforme e-commerce pour la vente de produits locaux au Sénégal.

## Description

Ce projet est une application full-stack développée avec:
- **Backend**: Go (Chi router)
- **Frontend**: Next.js 16
- **Base de données**: PostgreSQL
- **Infrastructure**: Docker

## Structure du projet

```
RBS_Crew_SN/
├── apps/
│   ├── api-go/          # Backend Go avec Chi router
│   └── web/             # Frontend Next.js 16
├── data/                # Jeux de données exportés de WordPress
├── infra/               # Infrastructure Docker (init Postgres, config nginx)
├── packages/            # Packages partagés
└── migration-scripts/   # Scripts de migration WordPress → PostgreSQL
```

## Fonctionnalités

### Sprint 1 (Complété le 12 juillet 2026)
- Gestion des remboursements
- Gestion des expéditions
- Interface d'administration

### Sprint 2 (En cours)
- Gestion des stocks
- Gestion des factures
- Gestion des utilisateurs admin

## Configuration

1. Copier le fichier `.env.example` en `.env` et renseigner les variables.
   Sans elles, certaines fonctionnalités sont silencieusement désactivées :
   - `NABOO_API_KEY` / `NABOO_WEBHOOK_SECRET` — sans quoi le paiement répond 400 ;
   - `SMTP_*` — sans quoi aucun e-mail ne part (vérification d'adresse,
     mot de passe oublié, invitation artiste, remboursement) ;
   - `JWT_SECRET` / `JWT_REFRESH_SECRET` — obligatoires, l'API refuse de démarrer sans.

2. Installer les dépendances :
```bash
make install
```

3. Démarrer l'infrastructure :
```bash
docker compose up -d postgres redis
```

La base est créée **automatiquement** au premier démarrage à partir de
`apps/api-go/sql/schema.sql`, son unique source de vérité. Il n'y a pas de
migrations : voir [apps/api-go/README.md](apps/api-go/README.md) avant toute
évolution du schéma — la recréation détruit toutes les données.

## Développement

Toutes les commandes courantes passent par le Makefile (`make help` les liste) :

```bash
make dev        # postgres + redis, puis API Go et Next.js en parallèle
make dev-api    # API Go seule  (apps/api-go, ./cmd/api)
make dev-web    # Next.js seul

make health     # état de l'API et du front
make logs-api   # logs du conteneur api-go
```

Après toute modification de `internal/sql/*.sql` **ou** de `sql/schema.sql` :

```bash
make db-sqlc    # régénère internal/db/queries/
make db-reset   # ⚠️ recrée la base — DÉTRUIT toutes les données
```

## Production

```bash
make up         # docker compose up -d --build
make down
```

Le déploiement réel se fait via Jenkins, qui récupère les images publiées sur
GHCR par `.github/workflows/ci.yml`. Les variables `NEXT_PUBLIC_*` sont figées
**au build de l'image** : les modifier au runtime est sans effet.

Nginx (`infra/nginx/`) n'est pas orchestré par docker-compose ; il proxifie les
webhooks de paiement directement vers l'API et le reste vers Next.js.

## Tests

```bash
make test       # Go (-race -cover) + web
make lint       # golangci-lint + eslint
```

Les tests Go vivent à côté du code (`internal/**/*_test.go`). Ceux de
`internal/service` démarrent un PostgreSQL éphémère via testcontainers et y
appliquent `sql/schema.sql` — Docker doit donc être disponible, sinon ils sont
ignorés (`-short` les saute explicitement).

## Documentation

- [Documentation de l'API](apps/api-go/docs/)
- [Documentation du refactoring](apps/web/docs/refactoring-phase-9-10-11.md)
- [Documentation des paiements](apps/api-go/docs/PAYMENTS.md)

