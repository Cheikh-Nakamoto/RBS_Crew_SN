# api-go

Go backend for RBS Crew SN.

## Schéma de base de données

**Source de vérité unique : [`sql/schema.sql`](./sql/schema.sql).** Il n'y a plus
de migrations incrémentales ni de goose. Ce fichier ne contient que des
`CREATE TYPE` / `CREATE TABLE` / `CREATE INDEX` — **jamais d'`ALTER TABLE`**.

Il est consommé à deux endroits :

- **Postgres**, à la création de la base : `docker-compose.yml` le monte en
  `docker-entrypoint-initdb.d/02-schema.sql` (le fichier source est monté
  directement, pas copié, pour qu'il ne puisse pas diverger).
- **sqlc**, pour générer `internal/db/queries/` (`sqlc.yaml`).

### Faire évoluer le schéma

```bash
# 1. Éditer apps/api-go/sql/schema.sql (modifier les CREATE TABLE, pas d'ALTER)
make db-sqlc        # 2. Régénérer internal/db/queries/
make db-reset       # 3. Recréer la base depuis zéro  ⚠️ détruit les données
make migrate-import # 4. (optionnel) Réinjecter les données WordPress
cd apps/api-go && go build ./... && go vet ./... && go test ./...
```

`make db-push` applique le schéma sur une base **existante** sans rien dropper —
utile uniquement sur une base vide créée hors docker-compose.

### ⚠️ Modèle « base jetable »

Toute évolution du schéma **détruit l'intégralité des données** : commandes,
paiements, comptes clients et remboursements compris. Ce modèle n'est tenable
que tant que la base ne contient que des données de démo réimportables depuis
`migration-scripts/`.

**Signal de bascule obligatoire** — réintroduire des migrations incrémentales
*avant* la prochaine évolution de schéma dès que l'une de ces conditions est
vraie :

- un premier paiement réel a été encaissé (ligne `"Payment"` en `status = 'PAID'`) ;
- un compte utilisateur réel non réimportable existe ;
- le service est ouvert au public / une mise en production est annoncée.

La bascule devra s'accompagner d'une vérification en CI (diff de `pg_dump` entre
les deux voies). La divergence constatée en juillet 2026 entre les migrations
goose et `sql/schema.sql` — FK `Order_shippingMethodId_fkey`, index
`Order_trackingNumber_idx`, valeur d'enum `NABOO` et colonnes
`customerFirstName/LastName/Phone` absentes du code généré — a prouvé que la
seule discipline ne suffit pas.
