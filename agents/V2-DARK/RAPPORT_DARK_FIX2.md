# Rapport V2-DARK-FIX2 — Fix bug racine `--sf-cream`

## Statut
✅ Terminé — 9 remplacements / 7 fichiers, tsc clean.

## Méthode
Sed groupé tel que brief :
```bash
cd /root/projects/smartfarm/app/src
grep -rln "bg-\[var(--sf-cream" . | xargs sed -i 's|bg-\[var(--sf-cream,#FAF7F0)\]|bg-[var(--sf-surface-1)]|g'
grep -rln "ring-\[var(--sf-cream" . | xargs sed -i 's|ring-\[var(--sf-cream,#FAF7F0)\]|ring-[var(--sf-surface-0)]|g'
```

## Fichiers modifiés (7)
| Fichier | Lignes | Remplacement |
|---|---|---|
| `src/components/app-shell.tsx` | 38, 63 | `bg-[var(--sf-surface-1)]` |
| `src/components/bottom-nav.tsx` | 61 | `bg-[var(--sf-surface-1)]` |
| `src/components/bottom-nav.tsx` | 141 | `ring-[var(--sf-surface-0)]` |
| `src/components/ui/dropdown-menu.tsx` | 40, 126 | `bg-[var(--sf-surface-1)]` |
| `src/components/ui/dialog.tsx` | 110 | `bg-[var(--sf-surface-1)]` |
| `src/components/ui/select.tsx` | 111 | `bg-[var(--sf-surface-1)]` |
| `src/components/ui/sheet.tsx` | 144 | `bg-[var(--sf-surface-1)]` |

Total : 9 remplacements (8 `bg-`, 1 `ring-`).

## Vérifs
- `grep -rn "sf-cream" /root/projects/smartfarm/app/src/` → **0 résultat** ✅
- `npx tsc --noEmit` → **exit 0** ✅
- `button.tsx` / `card.tsx` (chaîne `--sf-surface-1, --sf-surface-0, #FAF7F0`) → intacts ✅

## Effet attendu
Wrapper `<main>` + bottom-nav + topbar + menus/dialogs/sheets basculent maintenant sur `--sf-surface-1` (light=#FFFFFF, dark=#1b1812). Fin du fond crème illisible en dark mode.

## Pas fait
- `npm run build` (orchestrateur, fin de vague).
