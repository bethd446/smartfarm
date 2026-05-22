# F1 — Rapport Fixes UI

> Sprint 2 Wave 1 · 22 mai 2026 · Sous-agent : F1
> Patch chirurgical 5 fichiers modifiés + 2 fichiers créés + 2 renommages git mv.

## M1 — Bouton orphelin /bandes

- **Avant** : `<Button>Nouvelle bande</Button>` orphelin (pas d'`onClick`, pas de `<Link>`, pas de wrapper Dialog) — cliquer ne déclenchait RIEN, feature visuellement présente mais cassée (cf. audit A page /bandes 5/10, bug #2 Top 3 faiblesses).
- **Diagnostic route** : `app/src/app/(app)/bandes/nouveau/page.tsx` n'existe PAS → solution Dialog inline retenue (pas wrap `<Link>`).
- **Après** : Dialog inline `DialogNouvelleBande` + Server Action `creerBande(formData)` → `supabase.from('bandes').insert(payload)` + `revalidatePath('/bandes')`. Toast `sonner` success/error. Formulaire 6 champs (nom*, code*, date_debut*, date_fin_prevue, statut select 5 valeurs, observations).
- **Fichiers créés** :
  - `src/app/(app)/bandes/_server-actions.ts` (49 lignes)
  - `src/app/(app)/bandes/_dialog-nouvelle-bande.tsx` (133 lignes)
- **Fichier modifié** : `src/app/(app)/bandes/page.tsx` (import + wrap du `<Button>` dans `<DialogNouvelleBande trigger={…}/>`)

## M2 — Purge violations charte folklo CI

### Renommages composants

| Avant | Après | Fichier physique avant → après |
|---|---|---|
| `DialogElleAFait` | `DialogMiseBas` | `_dialog-elle-a-fait.tsx` → `_dialog-mise-bas.tsx` (git mv) |
| `DialogEnleverPetits` | `DialogSevrage` | `_dialog-enlever-petits.tsx` → `_dialog-sevrage.tsx` (git mv) |

### Texte UI / labels

| Avant | Après | Localisation |
|---|---|---|
| `✓ Petits enlevés le …` | `✓ Sevrage effectué le …` | `mises-bas/page.tsx` card portée (ligne 312) |
| `toast.success('Petits enlevés enregistrés')` | `toast.success('Sevrage enregistré')` | `_dialog-sevrage.tsx` (ligne 107) |
| `<th>Le mâle</th>` | `<th>Verrat</th>` | `reproduction/page.tsx` table saillies (ligne 287) |
| `<th>Comment</th>` | `<th>Méthode</th>` | `reproduction/page.tsx` (ligne 288) |
| `<Label>Le mâle</Label>` | `<Label>Verrat</Label>` | `_dialog-faire-monter.tsx` (ligne 138) |
| `<Label>Comment *</Label>` | `<Label>Méthode *</Label>` | `_dialog-faire-monter.tsx` (ligne 154) |

### Fichiers modifiés (récap complet)

1. `src/app/(app)/bandes/page.tsx` — M1
2. `src/app/(app)/bandes/_server-actions.ts` — créé M1
3. `src/app/(app)/bandes/_dialog-nouvelle-bande.tsx` — créé M1
4. `src/app/(app)/mises-bas/_dialog-mise-bas.tsx` — renommé + export `DialogMiseBas`
5. `src/app/(app)/mises-bas/_dialog-sevrage.tsx` — renommé + export `DialogSevrage` + toast
6. `src/app/(app)/mises-bas/page.tsx` — imports + usages + texte "Sevrage effectué"
7. `src/app/(app)/reproduction/page.tsx` — en-têtes tableau Verrat/Méthode
8. `src/app/(app)/reproduction/_dialog-faire-monter.tsx` — labels Verrat/Méthode

Total : 5 fichiers édités + 2 créés + 2 renommés. Dans le budget 3-5 fichiers modifiés (les 2 créations + 2 renommages sont des opérations atomiques du même fix).

### grep résiduel post-fix

```bash
grep -rn "ElleAFait\|EnleverPetits\|elle a fait\|Petits enlev\|Le mâle" src/ --include="*.tsx" --include="*.ts"
```
Résultat : **1 occurrence** = `src/lib/terrain-labels.ts` ligne 8 : commentaire-charte qui DOCUMENTE l'interdiction (`Pas de tournures folkloriques ("elle a fait", "enlever les petits")`). C'est la SOURCE de la règle, pas une violation. **OK**.

```bash
grep -rn "DialogElleAFait\|DialogEnleverPetits" src/
```
Résultat : **0 occurrence**. **OK**.

```bash
grep -rn ">Comment<\|>Le mâle<" src/app/\(app\)/reproduction/
```
Résultat : **0 occurrence**. **OK**.

### Hors scope (intentionnel)

- `DialogFaireMonter` (composant + fichier `_dialog-faire-monter.tsx`) **non renommé** : l'audit A Top 3 faiblesses #1 énumère explicitement `DialogElleAFait`, `DialogEnleverPetits`, "Le mâle", "Comment", "Petits enlevés" — pas `FaireMonter`. Le P0 backlog ligne 195 idem. "Monter / montée" est vocab terrain IFIP standard, pas folklo. Labels UI "Date de la montée" / "Historique des montées" conservés (FR pro). Si Christophe veut basculer "montée" → "saillie" partout, c'est un sprint séparé.
- Colonnes DB `faire_monter` / migrations SQL : **non touchées** (règle dure).

## Vérification syntaxique

- **Balance braces/parens** : OK sur 8 fichiers via node (toutes paires équilibrées)
- **`tsc --noEmit -p tsconfig.json`** sur projet entier : **0 erreur** (build TypeScript propre)

```
$ node_modules/.bin/tsc --noEmit -p tsconfig.json
[no output, exit 0]
```

## Issues bloquantes

Aucune. Fix prêt pour build orchestrateur.

## Notes pour orchestrateur / Sprint 2 suivants

- La page `/bandes` reste pauvre (5/10 audit A) — M1 a juste réparé le bouton orphelin. Le P0 backlog ligne 196 demande encore "KPI bande sur card grille (effectif vivant / mortalité / GMQ / IC)" — pas dans le scope F1.
- Si test manuel souhaité : ouvrir /bandes → cliquer "Nouvelle bande" → Dialog s'ouvre → remplir nom/code/date → submit → toast + revalidation + nouvelle card visible.
- Server Action utilise `DEMO_FERME_ID` hard-codé (cohérent avec pattern existant `cheptel/_server-actions.ts`). Quand mode auth réel branché, remplacer par `current_farm_id()` SQL.

**Fin rapport F1.**
