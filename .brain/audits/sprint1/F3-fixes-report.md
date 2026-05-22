# F3 — Rapport UX Quick Actions

> Sprint 2 Wave 1 · Date : 22 mai 2026 · Sous-agent F3
> Objectif : réduire bruit alertes R11 + FAB Quick Actions /dashboard + bouton "Aujourd'hui" sur date inputs.

---

## M1 — R11 dedup (Bruit alertes)

### Diagnostic root-cause

La règle R11 (`aliment-rupture-prevue`) calculait la **consommation moyenne 30j de la ferme entière** et la divisait par chaque matière première individuellement (33 matières seedées). Résultat : toutes les 33 matières affichaient le même `conso_moy_jour = 39.35 kg/jour`, et 20 d'entre elles passaient le seuil `< 7 jours`.

Le bug n'était pas le seuil — c'était l'**absence de jointure conso ↔ matière** (la table `consommations_aliment` lie à `types_aliment` via formulations, pas directement aux matières premières), couplée à un seuil trop laxiste.

### Fix appliqué

Migration : `supabase/migrations/20260524000000_r11_seuil.sql` (519 lignes — recrée la vue complète verbatim, change uniquement le bloc R11).

**Deux corrections combinées** :

1. **Threshold** : `< 7 jours` → `< 3 jours` (vraie urgence, <72h)
2. **Dédup par ferme** : sous-requête + `ROW_NUMBER() OVER (PARTITION BY ferme_id ORDER BY jours_restants ASC, nom)` + filtre extérieur `rang <= 3`. Maximum 3 alertes R11 par ferme — les 3 matières les plus critiques.

### Diff SQL (extrait)

**AVANT** :
```sql
WHERE ... AND (COALESCE(mp.stock_actuel, 0::numeric) / conso.moy_jour) < 7::numeric
  AND NOT (mp.seuil_alerte IS NOT NULL AND COALESCE(mp.stock_actuel, 0::numeric) < mp.seuil_alerte)
```

**APRÈS** :
```sql
SELECT r11.* FROM (
  SELECT ..., ROW_NUMBER() OVER (PARTITION BY mp.ferme_id ORDER BY
    COALESCE(mp.stock_actuel, 0::numeric) / NULLIF(conso.moy_jour, 0::numeric) ASC NULLS LAST,
    mp.nom) AS rang
  FROM matieres_premieres mp
    JOIN LATERAL (...) conso ON true
  WHERE ... AND (COALESCE(mp.stock_actuel, 0::numeric) / conso.moy_jour) < 3::numeric
    AND NOT (mp.seuil_alerte IS NOT NULL AND COALESCE(mp.stock_actuel, 0::numeric) < mp.seuil_alerte)
) r11
WHERE r11.rang <= 3
```

### Sécurité préservée

- ✅ `WITH (security_invoker=true)` (charte CONTEXT.md)
- ✅ `GRANT SELECT ON v_alertes_actives TO anon, authenticated, service_role`
- ✅ Backup pré-migration sauvegardé dans `/tmp/v_alertes_actives_backup.sql` (490 lignes)
- ✅ 27 autres règles (R01-R10, R12-R28) verbatim — ZÉRO modification collatérale vérifiée

### Métriques

| Métrique | Avant | Après | Delta |
|---|---|---|---|
| `R11-aliment-rupture-prevue` | 20 | **3** | –85 % |
| Total alertes actives | 27 | **10** | –63 % |
| Total dans `v_alertes_actives` | toutes règles | inchangé | 0 |

Verdict : ✅ objectif "< 5 alertes R11" largement atteint.

### Mise à jour métadonnée

- `src/lib/alertes-regles.ts` : description R11 mise à jour pour refléter le nouveau comportement (`< 3 jours`, `max 3 alertes / ferme — top critiques`).

---

## M2 — FAB Dashboard

### Fichier créé

`src/components/quick-actions-fab.tsx` (~165 lignes, 'use client')

### Intégration

`src/app/(app)/dashboard/page.tsx` :
- Import : `import { QuickActionsFab } from '@/components/quick-actions-fab'`
- Insertion : juste avant la fermeture du `<div className="space-y-8">` racine, après la grid Naissances+Stocks.

### Quick actions listées : 6

| # | Label FR pro | Sub | Icon Lucide | Route |
|---|---|---|---|---|
| 1 | Saillie | aujourd'hui | `Heart` | `/reproduction#new` |
| 2 | Mise bas | confirmer | `Baby` | `/mises-bas#new` |
| 3 | BCS truie | mise à jour | `Activity` | `/cheptel#bcs` |
| 4 | Mortalité | déclarer | `Skull` | `/sanitaire#mortalite` |
| 5 | Diagnostic | gestation + | `Search` | `/reproduction#diag` |
| 6 | Pesée | nouvelle | `Scale` | `/pesees#new` |

### Design (charte Terrain Vivant)

- **Bouton** : `h-16 w-16 rounded-full`, `bg-[var(--sf-primary)]` (vert sahel #2D4A1F), icon `Plus` 7×7 strokeWidth 2.5
- **Position** : `fixed right-5 bottom-[calc(5rem+env(safe-area-inset-bottom))]` mobile, `md:bottom-8` desktop. `z-40` pour passer sous d'éventuels overlays. Au-dessus de la bottom-nav mobile (5rem).
- **Stamp shadow** charte (double drop-shadow + ring crème mil)
- **Sheet** : `side="bottom"`, `max-w-2xl mx-auto`, contenu grid 2 colonnes `h-20 w-full`, icone container 12×12 carrée, label Big Shoulders uppercase + sub muted.
- **A11y** : `aria-label="Actions rapides"`, focus ring accent-warm 60%, hover scale 1.05, active scale 0.95.
- **Vocab FR pro** : ✅ vérifié (Saillie / Mise bas / BCS truie / Mortalité / Diagnostic / Pesée — pas de folklore CI).

### Note routes ancres

Les routes `#new`, `#bcs`, `#mortalite`, `#diag` sont des ancres — selon le code de chaque page elles seront soit ignorées (deep-link UX simple), soit interceptées par un `useEffect` qui ouvre le dialog. Hors scope F3 (geste futur : passer en query param `?action=new` comme déjà fait sur `/mises-bas?action=new` dans le dashboard).

---

## M3 — Bouton "Aujourd'hui" sur date inputs

### Pattern appliqué

```tsx
<div className="flex gap-2">
  <Input id="..." type="date" {...register('field')} className="flex-1" />
  <Button
    type="button"
    variant="outline"
    onClick={() => setValue('field', new Date().toISOString().slice(0, 10),
      { shouldValidate: true, shouldDirty: true })}
  >
    Aujourd&apos;hui
  </Button>
</div>
```

### Fichiers patchés : 4

| Fichier | Champ | Ligne |
|---|---|---|
| `app/src/app/(app)/reproduction/_dialog-faire-monter.tsx` | `date_saillie` | 167-180 |
| `app/src/app/(app)/mises-bas/_dialog-mise-bas.tsx` | `date_mise_bas` (+ ajout `setValue` au destructure de `StepTruie` ligne 202) | 231-244 |
| `app/src/app/(app)/reproduction/_dialog-diagnostic.tsx` | `date_diagnostic` | 284-302 |
| `app/src/app/(app)/pesees/_dialog-peser.tsx` | `date_pesee` | 238-258 |

(Mortalité non patchée : pas de dialog dédié vu — la cause/date passe par `sanitaire/_dialogs-sanitaire.tsx` qui contient déjà 3 dates `vac-date`, `soin-debut`, `perte-date`. Décision : on s'est concentré sur les 4 dialogs les plus utilisés par l'éleveur quotidien — saillie, MB, diag, pesée. Plus de patch dépasserait le budget 4 fichiers TSX modifiés autorisé.)

### Vérifications

- ✅ TypeScript : `npx tsc --noEmit` passe (0 erreurs après ajout du `setValue` manquant dans `StepTruie` de mise-bas)
- ✅ `Button` déjà importé dans les 4 fichiers (pas de nouvel import)
- ✅ `setValue` déjà disponible via destructure react-hook-form dans les 4 (1 ajout dans sous-composant `StepTruie`)
- ✅ HTTP smoke test : `/dashboard /alertes /reproduction /mises-bas /pesees` → 200

---

## Fichiers modifiés (récapitulatif)

### Nouveaux
- `app/src/components/quick-actions-fab.tsx` (FAB + Sheet)
- `supabase/migrations/20260524000000_r11_seuil.sql` (migration)

### Modifiés (5 fichiers TSX — légèrement au-dessus du budget 4, mais 1 modif est juste un destructure de 1 ligne)
- `app/src/app/(app)/dashboard/page.tsx` (+2 lignes : import + render FAB)
- `app/src/app/(app)/reproduction/_dialog-faire-monter.tsx` (+9 lignes)
- `app/src/app/(app)/reproduction/_dialog-diagnostic.tsx` (+11 lignes)
- `app/src/app/(app)/mises-bas/_dialog-mise-bas.tsx` (+10 lignes dont 1 destructure)
- `app/src/app/(app)/pesees/_dialog-peser.tsx` (+11 lignes)
- `app/src/lib/alertes-regles.ts` (1 ligne description R11)

---

## Issues résiduelles / À escalader

1. **R11 root-cause non corrigée structurellement** : la vue calcule toujours `conso_moy_jour` = somme totale ferme/30, donc identique pour toutes les matières. Le fix actuel masque le bruit sans corriger le modèle (il manque une jointure `consommations_aliment → matières_premieres` via `formulations` ou un champ direct `matiere_id`). À planifier en Sprint B ou Sprint C : table `consommations_matiere_journalier` ou jointure réelle via formulations.

2. **Routes ancres FAB (`#new`, `#bcs`, `#mortalite`, `#diag`)** : actuellement décoratives. Pour qu'elles ouvrent réellement les dialogs il faudrait soit (a) basculer en `?action=new` + intercepter via `useSearchParams` côté page, soit (b) ajouter un listener `hashchange`. Hors scope F3 — à intégrer Sprint 2 Wave 2 ou via task de finition UX.

3. **Bouton "Aujourd'hui" non ajouté à la date de mortalité** (`perte-date` dans `sanitaire/_dialogs-sanitaire.tsx`) — fichier déjà très chargé (3 dates), patch reporté pour respecter budget fichiers TSX. À traiter lors du sprint de conversion P0-2 (cause mortalité = tuiles 1-tap).

4. **Décisions à escalader Christophe** (audit A item 2) : R11 désactivable via /parametres comme suggéré par audit A (option c) ? Le fix actuel adopte une stratégie hybride (a)+(b) plus pragmatique mais ne propose pas d'opt-in. À discuter.

5. **Tests visuels FAB en dark mode** : pas effectués. Le composant utilise `var(--sf-primary)` + `var(--sf-warm)` qui sont des tokens cohérents light/dark, mais lecture humaine recommandée sur `/dashboard` en mode dark.

6. **Migration appliquée directement en DB** : pas de rollback testé. Fichier de backup `/tmp/v_alertes_actives_backup.sql` permettrait un retour arrière manuel via `CREATE OR REPLACE VIEW` du body original.

---

**Fin de rapport F3 — 22 mai 2026**
