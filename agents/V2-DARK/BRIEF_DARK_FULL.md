# Brief V2-DARK-FULL — Dark mode complet auto-activé

## Périmètre
✅ Touche : 9 fichiers avec `bg-white` hardcodé (liste ci-dessous)
✅ Touche : `src/components/contrast-toggle.tsx` (label/icône optionnel)
❌ Touche pas : DB, migrations, sidebar/drawer déjà fixés, layout.tsx (déjà OK)
❌ Pas `npm run build` (orchestrateur)

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` d'abord.

**Architecture dark mode déjà en place** :
- `prefers-color-scheme: dark` activé automatiquement (rien à faire côté JS)
- Variables CSS bascules : `--sf-surface-{0,1,2,3}`, `--sf-ink`, `--sf-muted`, `--sf-border-subtle`, `--sf-line`, `--sf-paper` (light: crème, dark: noir)
- Bug : 16 usages de `bg-white` Tailwind restent **blancs** en dark mode

## Mission
Remplacer `bg-white` par les variables DS sémantiques dans 9 fichiers. Suivre la table de mapping.

## Table de mapping

| Pattern Tailwind | À remplacer par |
|---|---|
| `bg-white` (background carte/dialog/input) | `bg-[var(--sf-surface-1)]` |
| `bg-white` (background app-shell/page) | `bg-[var(--sf-surface-0)]` |
| `hover:bg-white/5` (overlay sur fond foncé sidebar) | **GARDER** (overlay translucide intentionnel sur fond sombre fixe) |
| `text-white/70`, `text-white/90`, `text-white` (sidebar/drawer items) | **GARDER** (fond sidebar = `bg-[#1a1a1a] dark:bg-[#0d0c09]` fixe sombre) |

## Fichiers à patcher

### 1. `src/components/ui/select.tsx:81`
```diff
-bg-white whitespace-nowrap transition-colors
+bg-[var(--sf-surface-1)] whitespace-nowrap transition-colors
```

### 2. `src/app/(app)/alimentation/matieres/page.tsx` (lignes 103, 116)
```diff
-className="h-9 w-full rounded-md border border-[var(--sf-border,#E5DDD0)] bg-white pl-8 pr-3
+className="h-9 w-full rounded-md border border-[var(--sf-border,#E5DDD0)] bg-[var(--sf-surface-1)] pl-8 pr-3
```
Même pattern ligne 116 (`<select>`).

### 3. `src/app/(app)/alimentation/concentres/page.tsx` (lignes 265, 286)
Idem mapping : `bg-white` → `bg-[var(--sf-surface-1)]`

### 4. `src/app/(app)/sanitaire/page.tsx` (lignes 97, 114, 131)
3 cards : `bg-white p-5 hover:shadow-md` → `bg-[var(--sf-surface-1)] p-5 hover:shadow-md`

### 5. `src/app/(app)/assistant/_components/suggestions.tsx:72`
```diff
-'border-[var(--sf-border,#E5E0D8)] bg-white hover:bg-[var(--sf-paper,#FBF9F4)]'
+'border-[var(--sf-border,#E5E0D8)] bg-[var(--sf-surface-1)] hover:bg-[var(--sf-surface-2)]'
```

### 6. `src/app/(app)/assistant/_components/chatbot.tsx` (lignes 250, 317, 329)
- Header chat (250) : `bg-white` → `bg-[var(--sf-surface-1)]`
- Footer chat (317) : idem
- Textarea (329) : idem

### 7. `src/app/(app)/assistant/_components/message-bubble.tsx`
Vérifie si bulle IA utilise `bg-white` ou `bg-card`. Si `bg-white` → `bg-[var(--sf-surface-1)]`. Si `bg-card` → laisser (déjà variable shadcn).

### 8. `src/components/mobile-drawer.tsx:97` et `:122` — **NE PAS TOUCHER**
Ces `hover:bg-white/5` et `text-white/70` sont des overlays/textes intentionnels sur fond sombre fixe. Ne touche pas.

### 9. `src/components/sidebar.tsx:116` — **NE PAS TOUCHER**
Idem `text-white/70 hover:bg-white/5` = intentionnel.

## Vérif

Après patches :
```bash
cd /root/projects/smartfarm/app
# Restera seulement les usages overlay intentionnels sidebar/drawer
grep -rn "bg-white\b" src/ | grep -v "hover:bg-white\b" | grep -v "ring-white\b"
```
Attendu : **0 résultat** (tous les `bg-white` "fond" remplacés).

```bash
export PATH=/root/.hermes/node/bin:$PATH
npx tsc --noEmit 2>&1 | tail -5
```
Attendu : exit 0, aucune erreur.

## Livrables
1. 9 fichiers patches (variables DS au lieu de `bg-white`)
2. TSC clean
3. Rapport `/root/projects/smartfarm/agents/V2-DARK/RAPPORT_DARK_FULL.md` ≤ 80 lignes télégraphiques :
   - Liste fichiers patches + nb remplacements
   - Confirmation grep `bg-white` retourne 0 résultat (hors overlay)
   - TSC OK

## Anti-pièges
- Ne touche **PAS** `text-white`, `hover:bg-white/5`, `bg-white/5`, etc. = overlays intentionnels
- `bg-card`, `bg-popover`, `bg-background` (Tailwind shadcn vars) ne sont **PAS** des bugs — laisser
- Si un fichier a `bg-white text-black` côte à côte (pas vu jusqu'ici mais possible) → utiliser `bg-[var(--sf-surface-1)] text-[var(--sf-ink)]`
- Pas de regex de masse via sed — patch ciblé par ligne (les contextes diffèrent)
