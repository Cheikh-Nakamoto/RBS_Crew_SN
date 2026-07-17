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
├── data/                # Données et migrations
├── infra/               # Infrastructure Docker
├── packages/            # Packages partagés
└── migration-scripts/   # Scripts de migration
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

1. Copier le fichier `.env.example` en `.env` et configurer les variables d'environnement.

2. Installer les dépendances:
```bash
npm install
```

3. Démarrer les services avec Docker:
```bash
docker-compose up -d
```

## Développement

Pour démarrer l'application en mode développement:

```bash
# Démarrer le backend Go
cd apps/api-go
go run main.go

# Démarrer le frontend Next.js
cd apps/web
npm run dev
```

## Production

Pour construire et démarrer l'application en mode production:

```bash
# Construire les images Docker
docker-compose build

# Démarrer les services
docker-compose up -d
```

## Tests

Les tests sont disponibles dans le répertoire `test/` et peuvent être exécutés avec:

```bash
go test ./...
```

## Documentation

- [Documentation de l'API](apps/api-go/docs/)
- [Documentation du refactoring](apps/web/docs/refactoring-phase-9-10-11.md)
- [Documentation des paiements](apps/api-go/docs/PAYMENTS.md)

## Licence

Ce projet est sous licence AGPL-3.0.