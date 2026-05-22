# Brief V2-DARK-FIX2 — Fix bug racine `--sf-cream` non défini

## Périmètre
✅ Touche : 8 fichiers utilisant `var(--sf-cream, #FAF7F0)`
❌ Touche pas : autre

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` d'abord.

**Bug racine** : la variable CSS `--sf-cream` n'est définie ni dans `:root` ni dans `[data-theme="dark"]` dans `smartfarm-tokens.css`. Tous les usages `var(--sf-cream, #FAF7F0)` utilisent le **fallback crème** quel que soit le mode → fond reste crème en dark mode.

## Fix
Remplacer `var(--sf-cream, #FAF7F0)` par `var(--sf-surface-1)` partout (variable existante qui bascule auto : light=#FFFFFF, dark=#1b1812).

## Fichiers (liste exhaustive)

| Fichier | Ligne | Action |
|---|---|---|
| `src/components/app-shell.tsx` | 38 | `bg-[var(--sf-cream,#FAF7F0)]` → `bg-[var(--sf-surface-1)]` |
| `src/components/app-shell.tsx` | 63 | idem (le `<main>`) |
| `src/components/bottom-nav.tsx` | 61 | idem |
| `src/components/bottom-nav.tsx` | 141 | `ring-2 ring-[var(--sf-cream,#FAF7F0)]` → `ring-2 ring-[var(--sf-surface-0)]` (séparation badge contre fond app) |
| `src/components/ui/dropdown-menu.tsx` | 40, 126 | `bg-[var(--sf-cream,#FAF7F0)]` → `bg-[var(--sf-surface-1)]` |
| `src/components/ui/dialog.tsx` | 110 | idem |
| `src/components/ui/select.tsx` | 111 | idem |
| `src/components/ui/sheet.tsx` | 144 | idem |

Soit **9 remplacements dans 7 fichiers**.

Tu peux faire ça via sed pour aller vite :
```bash
cd /root/projects/smartfarm/app/src
grep -rln "bg-\[var(--sf-cream" . | xargs sed -i 's|bg-\[var(--sf-cream,#FAF7F0)\]|bg-[var(--sf-surface-1)]|g'
grep -rln "ring-\[var(--sf-cream" . | xargs sed -i 's|ring-\[var(--sf-cream,#FAF7F0)\]|ring-[var(--sf-surface-0)]|g'
```

⚠️ **Ne sed PAS** : `bg-[var(--sf-surface-1, var(--sf-surface-0, #FAF7F0))]` dans `button.tsx` et `card.tsx` — ces fallbacks-fallbacks sont OK (déjà utilise --sf-surface-*).

## Vérif
```bash
grep -rn "sf-cream" /root/projects/smartfarm/app/src/ 2>&1
# Attendu : 0 résultat
export PATH=/root/.hermes/node/bin:$PATH
cd /root/projects/smartfarm/app
npx tsc --noEmit 2>&1 | tail -5
# Attendu : exit 0
```

## Livrable
1. Patches appliqués
2. Vérif `grep sf-cream` → 0
3. Rapport `/root/projects/smartfarm/agents/V2-DARK/RAPPORT_DARK_FIX2.md` ≤ 40 lignes

## Anti-pièges
- Pas `npm run build` (orchestrateur)
- Garder `button.tsx` et `card.tsx` qui ont `--sf-surface-1, --sf-surface-0` en chaîne (OK)
- Si sed casse quelque chose, fallback patch ciblé
