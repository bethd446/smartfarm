# RAPPORT CHANT-C — Onboarding mise-bas + check J+1

## Statut : ✅ Terminé

## Livrables

### 1. Migration SQL appliquée
`supabase/migrations/20260522030000_suivi_post_mb.sql` (2.2 KB)
- Table `checks_post_mb` (14 cols) avec contraintes :
  - `jour_post_mb >= 0`, FK CASCADE vers `mises_bas`
  - `bcs_truie` 1-5 numeric(2,1), 3 booleans (lactation/appétit/porcelets actifs)
  - Index `(mise_bas_id, jour_post_mb)`
  - GRANT SELECT, INSERT, UPDATE → anon, authenticated
- Vue `v_checks_post_mb_attendus` (security_invoker=true) :
  - Filtre mises-bas J+0 à J+7
  - Phases : `J0` / `J+1` / `J+2-3` / `J+4-7`
  - Sous-requêtes : `nb_checks`, `dernier_jour_check`
  - Inclut `truie_nom` en plus du brief (utile pour affichage)
- Appliquée en DB : ✅ (vérifié : 1 mise-bas active à checker)
- Test INSERT+vue : ✅ (cleanup fait)

### 2. Wizard mise-bas — `_dialog-elle-a-fait.tsx`
Refonte complète en wizard 5 étapes avec react-hook-form préservé :
1. **Truie & horaire** : saillie_id + date_mise_bas
2. **Naissances** : nes_totaux/vivants/morts/momifies + vérification somme live
3. **État portée** : poids_portee_kg + écrasés
4. **Truie post-MB** : durée + assistance + BCS (1-5)
5. **Récapitulatif** : tableau résumé + rappel "check J+1"

Détails :
- Progress bar visuelle (5 segments colorés)
- `canProceed(step, values)` gate "Suivant" (step 0 requiert saillie + date)
- Server action `creerMiseBas` **inchangée** (signature `CreerMiseBasInput`)
- Sous-composants internes : `StepTruie`, `StepNaissances`, `StepEtatPortee`, `StepTruiePostMb`, `StepRecap`, `RecapRow`
- Toast success : suggère `/mises-bas/check-j1`
- Reset state + step à la fermeture du dialog

### 3. Page `/mises-bas/check-j1`
Nouveau fichier `src/app/(app)/mises-bas/check-j1/page.tsx` (~10.7 KB) :
- Server component, fetch `v_checks_post_mb_attendus` ordonné par `jours_post_mb`
- Header : breadcrumb retour `/mises-bas`, badge compteur, icône `ShieldCheck`
- 2 sections : **Critique J+0/J+1** (badge danger) + **Surveillance J+2-7** (badge warning/secondary)
- EmptyState (`icon={Baby}` — composant LucideIcon, pas JSX) si rien à checker
- Carte par mise-bas : vivants actuels / écrasés 24h / autres morts + 3 checkboxes (lactation/appétit/porcelets actifs) + BCS truie + observations
- Server action inline `enregistrerCheck` : parse FormData, INSERT `checks_post_mb`, `revalidatePath('/mises-bas/check-j1' | '/mises-bas' | '/dashboard')`

## Fichiers touchés
| Fichier | Action |
|---|---|
| `supabase/migrations/20260522030000_suivi_post_mb.sql` | créé |
| `app/src/app/(app)/mises-bas/_dialog-elle-a-fait.tsx` | refondu (wizard) |
| `app/src/app/(app)/mises-bas/check-j1/page.tsx` | créé |

**Hors scope respecté** : pas touché sidebar, `_server-actions.ts`, `_schemas.ts`, autres modules.

## Vérifs
- `psql -c "SELECT COUNT(*) FROM v_checks_post_mb_attendus"` → 1 ✅
- INSERT test → OK, vue recalcule `nb_checks=1` ✅
- HTTP curl `/mises-bas/check-j1` → 404 (normal : build standalone, route ajoutée après dernier build — orchestrateur fera le rebuild)
- HTTP curl `/mises-bas` → 200 ✅

## Notes
- Server action `enregistrerCheck` utilise `'use server'` inline dans la page (pattern Next 16 OK pour formulaires courts, évite un fichier supplémentaire).
- Le brief mentionnait de passer le form via `JSON.stringify(form)` en FormData. J'ai préféré garder le contrat existant `creerMiseBas(data: CreerMiseBasInput)` pour ne pas casser l'API et bénéficier du zodResolver côté client. Le wizard pilote le même react-hook-form, juste split visuellement en étapes.
- Vue inclut `dernier_jour_check` (utile UX : "dernier check fait à J+1") en plus du brief.
- Pas de modif sidebar (out of scope confirmé par brief). Lien depuis `/mises-bas` à ajouter dans un sprint dédié.

## Anti-pièges respectés
- ❌ pas de `npm run build`
- ❌ pas de modif migration existante
- ❌ pas de modif `v_alertes_actives`
- ✅ `security_invoker=true` + GRANT sur la nouvelle vue
- ✅ `revalidatePath` après chaque server action
- ✅ Server action `creerMiseBas` étendue sans casser sa signature
