# Phases 9, 10, 11 — Normalisation & finitions

Ce document détaille les trois dernières phases du refactoring frontend RBS Crew SN, ce qui a été fait, ce qui reste à faire, et comment le faire proprement.

---

## Phase 9 — Normaliser les largeurs des pages détail

### Ce qui a été fait

Uniformisation des `max-w` sur les pages détail admin :

| Fichier | Avant | Après |
|---------|-------|-------|
| `presse/_components/presse-create-form.tsx` | `max-w-lg` | `max-w-3xl` |
| `presse/[id]/_components/presse-edit-form.tsx` | `max-w-lg` | `max-w-3xl` |
| `utilisateurs/[id]/page.tsx` | `max-w-2xl` | `max-w-3xl` |
| `devis/[id]/page.tsx` | `max-w-2xl` | `max-w-3xl` |

### Pourquoi `max-w-3xl`

- `max-w-lg` (512px) : trop étroit, les formulaires sont compressés
- `max-w-2xl` (672px) : acceptable mais incohérent
- `max-w-3xl` (768px) : standard pour les formulaires admin, offre un bon équilibre entre lisibilité et espace

### Vérification

```bash
# Vérifier qu'aucun max-w-lg ou max-w-2xl ne persiste dans les pages détail
grep -rn "max-w-lg\|max-w-2xl" /home/zone01/RBS_Crew_SN/apps/web/app/\(admin\)/admin/*/\[id\]/
```

### Amélioration future possible

Créer un composant wrapper `AdminDetailLayout` qui impose `max-w-3xl` automatiquement :

```tsx
// components/admin/layout/admin-detail-layout.tsx
export function AdminDetailLayout({ children }: { children: React.ReactNode }) {
  return <div className="max-w-3xl space-y-6">{children}</div>;
}
```

Puis dans chaque page détail :
```tsx
<AdminDetailLayout>
  {/* contenu */}
</AdminDetailLayout>
```

Avantage : si on veut changer la largeur plus tard, un seul fichier à modifier.

---

## Phase 10 — Utiliser `formatXOF()` et `formatDate()` partout

### État actuel

Le fichier `lib/format.ts` existe avec :
- `formatXOF(amount: number)` → formatage monétaire F CFA
- `formatDate(date: string | Date)` → formatage de date en français
- `truncate(text: string, length: number)` → troncature

Mais les pages admin utilisent du formatting inline à 19 endroits.

### Pourquoi cette phase est risquée

Les deux formats ne sont **pas identiques** au formatting inline actuel :

#### `formatXOF` vs `.toLocaleString('fr-SN')`

```
// Actuel (inline) :
row.original.total.toLocaleString('fr-SN') + ' FCFA'
// → "1 500 000 FCFA"

// formatXOF (lib/format.ts) :
formatXOF(row.original.total)
// → utilise Intl.NumberFormat('fr-SN', { style: 'currency', currency: 'XOF' })
// → "1 500 000 F CFA"  (espace insécable, format monétaire standard)
```

#### `formatDate` vs `.toLocaleDateString('fr-FR', {...})`

```
// Actuel (inline) :
new Date(createdAt).toLocaleDateString('fr-FR')
// → "06/06/2026"

new Date(createdAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })
// → "6 juin 2026"

// formatDate (lib/format.ts) :
formatDate(createdAt)
// → selon l'implémentation dans lib/format.ts
```

### Comment faire la migration proprement

**Étape 1** : Vérifier ce que `formatXOF` et `formatDate` produisent exactement :

```bash
# Lire les fonctions
cat /home/zone01/RBS_Crew_SN/apps/web/lib/format.ts
```

**Étape 2** : Pour chaque occurrence de formatting inline, décider si la fonction partagée produit un résultat acceptable. Sinon, adapter la fonction partagée.

**Étape 3** : Remplacer fichier par fichier. Les 19 fichiers concernés sont dans :

```bash
grep -rn "toLocaleString\|toLocaleDateString" \
  /home/zone01/RBS_Crew_SN/apps/web/app/\(admin\) \
  --include="*.tsx" | grep -v node_modules
```

**Étape 4** : Pattern de remplacement pour le format monétaire :

```tsx
// AVANT
import { formatXOF } from '@/lib/format';
// ↓ utiliser dans le JSX ↓
{formatXOF(row.original.total)}
```

**Étape 5** : Pattern de remplacement pour les dates :

```tsx
// AVANT
import { formatDate } from '@/lib/format';
// ↓ utiliser dans le JSX ↓
{formatDate(row.original.createdAt)}
```

### Approche recommandée

Faire un fichier à la fois, vérifier visuellement. Commencer par les fichiers qui n'ont que des dates (moins risqué), puis les fichiers avec de la monnaie.

### Fichiers prioritaires (impact visuel le plus faible)

1. `utilisateurs/columns.tsx` — 1 date
2. `presse/columns.tsx` — 1 date
3. `commandes/columns.tsx` — 1 date + 1 monétaire
4. `devis/columns.tsx` — 1 date
5. `utilisateurs/[id]/page.tsx` — 1 date
6. `devis/[id]/page.tsx` — 1 date
7. `commandes/[id]/page.tsx` — 1 date + 8 monétaires (attention !)

---

## Phase 11 — Composant `AdminPageHeader` sur la page Activité

### Pourquoi cette phase a été skippée

La page `admin/activite/page.tsx` a un header avec un **compteur** à droite :

```tsx
<div className="text-right">
  <p className="text-2xl font-mono font-bold text-white">{result.meta.total}</p>
  <p className="text-xs text-white/40 mt-0.5">entrées au total</p>
</div>
```

Le composant `AdminPageHeader` existant (`components/admin/admin-page-header.tsx`) ne supporte pas ce pattern.

### Ce qu'il faudrait faire

**Option A** : Étendre `AdminPageHeader` avec une prop `stats` optionnelle

```tsx
// components/admin/admin-page-header.tsx
interface AdminPageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  stats?: { value: string | number; label: string };  // ← ajouter
  action?: { label: string; href?: string; onClick?: () => void };
}
```

Puis dans le JSX du composant, ajouter le bloc stats à droite quand la prop est fournie.

**Option B** : Garder le header de la page Activité tel quel

Le header de la page Activité est suffisamment différent (icône Activity, compteur animé) pour justifier un traitement spécial. Le forcer dans `AdminPageHeader` complexifierait le composant pour un seul cas d'usage.

**Recommandation** : Si d'autres pages ont besoin du même pattern (titre + compteur), faire l'Option A. Sinon, Option B.

---

## Résumé des bonnes pratiques à retenir

1. **Toujours vérifier le build après chaque modification** : `npm run build`
2. **Ne pas faire de `sed` ou script Python sur les fichiers** : préférer l'édition directe avec l'outil `Write`/`Edit` pour éviter les régressions silencieuses
3. **Tester visuellement** les changements de formatting
4. **Un fichier à la fois** : plus lent mais plus sûr
5. **Quand un composant partagé ne couvre pas un cas d'usage** : ne pas le forcer, créer une variante ou garder le cas spécial
