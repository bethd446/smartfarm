# BRIEF D2-B — Fix hiérarchie sémantique + aria-label (caveman ≤80L)

## TOI
Dev senior. Tu fais 2 P0 hiérarchie + a11y. Pas npm build (orchestrateur).

## LIS
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `/tmp/sf-r4/RAPPORT.md` (tu attaques P0-1 + P0-4)

## SCOPE (2 P0)

### P0-1 — Hiérarchie sémantique (h2/h3 manquants sur 5/6 pages)
Pages : `src/app/(app)/{cheptel,reproduction,kpi,sanitaire}/page.tsx`
Repérer les `<div>` qui FONT FONCTION de titre de section (souvent `text-lg` ou `font-bold` + label genre "Truies actives", "Prochain événement").
Remplacer par `<h2 className="font-[family-name:var(--sf-font-display)] text-xl uppercase tracking-wide text-[var(--sf-ink)] mt-6 mb-3">…</h2>` OU h3 si sous-section.

Méthode :
1. `grep -n "text-lg.*font-\|font-bold.*text-lg\|className=\".*text-base.*font-bold\"" src/app/\(app\)/{cheptel,reproduction,kpi,sanitaire}/page.tsx`
2. Identifier 3-5 vrais titres de section par page (PAS metadata, PAS labels)
3. Patcher en h2 ou h3 selon profondeur

Cible : chaque page sortir ≥2 h2 ET/OU ≥3 h3 dans le HTML servi final.

### P0-4 — aria-label sur boutons icon-only
Cibles principales (selon audit) : `src/app/(app)/alertes/`, `src/app/(app)/kpi/`, `src/app/(app)/reproduction/`
Pattern à chercher : `<button … >` ou `<Button …>` qui contient SEULEMENT un `<Icon />` sans texte (Ellipsis, MoreHorizontal, TrendingUp, Sparkles).

Méthode :
1. `grep -rn "size=\"icon\"\\|aria-label" src/app/\(app\)/{alertes,kpi,reproduction}/ | head -30`
2. Pour chaque button icon SANS aria-label : ajouter `aria-label="Actions <contexte>"` ou label métier explicite.
3. Cible terrain : ≥80% boutons icon avec aria-label après fix.

## INTERDICTIONS
- ❌ npm/build/restart
- ❌ modifier composants UI partagés (D2-A s'en charge)
- ❌ modifier globals.css (D2-A)
- ❌ vision_analyze
- ❌ inventer textes aria — utiliser contexte métier réel

## SORTIE
1 rapport `/tmp/d2-b/RAPPORT.md` ≤ 2 KB :
- Fichiers modifiés
- Nombre h2/h3 ajoutés par page
- Nombre aria-label ajoutés
- Tests rapides : `curl :3000/cheptel | grep -oc '<h2\\|<h3'`

Go.
