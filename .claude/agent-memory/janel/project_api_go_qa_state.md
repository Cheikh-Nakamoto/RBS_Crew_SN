---
name: Etat QA backend api-go
description: Résultat de la review QA complète du backend Go apps/api-go — problèmes critiques identifiés, couverture de tests nulle
type: project
---

Review QA réalisée le 2026-04-04 sur `apps/api-go`.

**Couverture de tests : 0 fichier _test.go dans tout le projet.**

Problèmes critiques identifiés :
- `service/auth.go:246` — VerifyEmail réutilise le champ resetToken (bug sécurité, signalé à Karim + Fatou)
- `service/auth.go:167` — Logout sans vérification que userID est non-vide
- `handler/orders_quotes.go:73-88` — validate.Struct absent sur UpdateStatus, statut arbitraire accepté
- `middleware/ratelimit.go:40` — X-Real-IP non validé, rate limit bypassable par spoofing
- `service/payments.go:181` — webhook payment_intent.payment_failed cherche par intent.ID alors que la DB stocke un session ID Stripe (cs_xxx vs pi_xxx)

**Why:** Projet sans aucun test automatisé, review QA initiale demandée par Janel.
**How to apply:** Prioriser l'écriture des tests auth et orders. Tous les bugs ci-dessus sont à soumettre à Karim (backend) et Fatou (security) selon les cas.
