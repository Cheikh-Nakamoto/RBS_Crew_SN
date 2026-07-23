<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Responsive — conventions mobile-first

- **Mobile-first** : les classes de base ciblent le mobile, on escalade vers le haut avec `sm:`/`md:`/`lg:`/`xl:`. On n'utilise **pas** de variants `max-*` (sauf les opt-outs perf déjà présents dans `globals.css`).
- **Breakpoints** : ceux par défaut de Tailwind 4 (sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536). Aucun breakpoint custom — pas de `tailwind.config.*`, le thème est en CSS-first dans `app/globals.css` (`@theme`).
- **Cibles tactiles** : tout élément interactif fait au moins `min-h-[44px] min-w-[44px]`.
- **Pas de grille multi-colonnes non préfixée** : `grid-cols-2`/`grid-cols-3` doivent toujours partir de `grid-cols-1` puis escalader (ex. `grid-cols-1 sm:grid-cols-2`).
- **Idiome fluide-puis-cap** : `w-[95%] sm:max-w-[Npx]` pour les cartes/conteneurs.
- **Détection JS** : utiliser `useIsMobile()` (`@/hooks/use-mobile`) ou `useMediaQuery('(...)')` (`@/hooks/use-media-query`) — jamais de `window.matchMedia` inline. Ces hooks sont SSR-safe (snapshot serveur = `false`).
- **Hauteur viewport** : préférer `dvh` à `vh` pour tenir compte de la barre d'URL mobile (ex. dialogs `max-h-[calc(100dvh-2rem)]`).
<!-- END:nextjs-agent-rules -->
