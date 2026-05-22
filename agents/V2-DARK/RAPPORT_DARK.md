# Rapport V2-DARK — Fix contraste drawer/sidebar dark mode

## Statut : ✅ DONE

## Cause confirmée
`--sf-ink` = couleur **texte** (s'inverse light→dark : #1a1a1a → #F6F1E5).
Utilisée comme fond → en dark mode : fond beige + texte blanc = invisible.
Vérifié dans `src/styles/smartfarm-tokens.css` (lignes ~64 et ~224).

## Patchs appliqués (3 remplacements, 2 fichiers)

### `src/components/sidebar.tsx`
Ligne 69 (fond aside) :
```diff
- 'bg-[var(--sf-ink,#1a1a1a)] text-white/90 flex-col h-screen sticky top-0 shrink-0',
+ 'bg-[#1a1a1a] dark:bg-[#0d0c09] text-white/90 flex-col h-screen sticky top-0 shrink-0',
```

Ligne 128 (tooltip flottant tablette) :
```diff
- 'whitespace-nowrap rounded-md bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
+ 'whitespace-nowrap rounded-md bg-[#2a2a2a] dark:bg-[#1f1f1f] px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
```

### `src/components/mobile-drawer.tsx`
Ligne 80 (fond drawer) :
```diff
- 'bg-[var(--sf-ink,#1a1a1a)] text-white/90 shadow-2xl outline-none',
+ 'bg-[#1a1a1a] dark:bg-[#0d0c09] text-white/90 shadow-2xl outline-none',
```

## Patch 3 (headers groupes) : non requis
Déjà `text-white/50` dans les deux fichiers (sidebar:93, drawer:107).
Lisibilité OK sur fond `#1a1a1a` / `#0d0c09`. Pas touché.

## Vérifications
- `grep "bg-\[var(--sf-ink"` sur `/src` → **0 résultat** (plus aucun fond inversé).
- Les autres usages de `--sf-ink` (text-, border-) restent intacts → comportement texte correct préservé.
- `npx tsc --noEmit` → **exit 0**, aucune erreur.
- Items actifs (vert `--sf-primary`) inchangés.

## Résultat attendu
- Light mode : drawer/sidebar fond `#1a1a1a` (noir profond) + texte blanc → contraste OK.
- Dark mode : drawer/sidebar fond `#0d0c09` (encore plus foncé) + texte blanc → contraste OK.
- Cohérent avec apps mobiles modernes (Notion/Linear : navigation toujours sombre).

## Fichiers modifiés
1. `app/src/components/sidebar.tsx` (2 lignes)
2. `app/src/components/mobile-drawer.tsx` (1 ligne)

## Non fait (conforme brief)
- ❌ Pas de `npm run build` (orchestrateur).
- ❌ Pas touché aux autres usages `--sf-ink`.
- ❌ Pas touché aux items actifs.
