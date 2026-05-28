# Brief L3 — B9 Zod garde-fous métier (3 modules)

## TOI
Dev senior TS/Zod. Tu durcis 3 schemas existants avec des contraintes métier strictes pour empêcher les saisies invalides (dates futures, poids hors plages, durées irréalistes).

## LIS D'ABORD (obligatoire)
1. `CLAUDE.md` (racine) — règles charte, vocab FR pro zootech, contexte CI (climat tropical, races CI)
2. `app/src/app/(app)/reproduction/_schemas.ts` — 35 lignes, peu de garde-fous (saillie + diagnostic)
3. `app/src/app/(app)/mises-bas/_schemas.ts` — 121 lignes (mise-bas + sevrage), déjà solide mais pas de plages métier
4. `app/src/app/(app)/mortalites/_schemas.ts` — 113 lignes, déjà avec date ≤ today + motif=autre→motif_libre requis (pattern à répliquer)

## Périmètre
✅ Touche STRICTEMENT 3 fichiers :
- `app/src/app/(app)/reproduction/_schemas.ts`
- `app/src/app/(app)/mises-bas/_schemas.ts`
- `app/src/app/(app)/mortalites/_schemas.ts`

❌ Touche pas :
- Aucun autre fichier — pas de modif `_server-actions.ts`, `_dialog-*.tsx`, `page.tsx`, etc.
- Aucune migration SQL
- Aucun helper externe
- PAS `cheptel/*`, PAS `sanitaire/*` (réservés autres lanes)

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push, pas restart serveur.

## Contexte

Les schemas Zod actuels acceptent des saisies métier-invalides :
- Date de saillie/mise-bas/sevrage dans le futur lointain (2030...)
- Date dans le passé lointain (avant 2020, avant lancement Smart Farm)
- Poids portée 1500 kg (irréaliste)
- Durée mise-bas 5000 minutes (83h ≠ physiologique)
- Nb nés totaux 50 (max physiologique ~25 chez la truie hyperprolifique)
- BCS 4.5 (échelle ne tolère pas 0.5 en pratique CI, charte §10 vocab)

Le but est de **bloquer la saisie aberrante côté Zod** avant que ça touche la BDD. Messages d'erreur **en français pro zootech** (vocab strict CLAUDE.md §10), explicites pour l'éleveur.

## Mission
Ajouter contraintes métier sur les 3 schemas, en suivant le pattern existant `mortalites` (superRefine multi-règles avec ctx.addIssue + path précis).

## Détails techniques

### Constantes communes (à ajouter en tête de chaque fichier)

```ts
// ─── Garde-fous métier ────────────────────────────────────────────────────
// Dates : pas avant 2020 (lancement secteur structuré CI), pas dans le futur
const DATE_MIN = '2020-01-01'
const todayISO = () => new Date().toISOString().slice(0, 10)
```

### Fix #1 — `reproduction/_schemas.ts` (saillieSchema + diagnosticSchema)

Ajout `superRefine` sur les 2 schemas. Règles :

**saillieSchema** :
- `date_saillie` : `>= DATE_MIN` et `<= today + 7 jours` (tolérance saillies programmées court terme)
- `rang_porte` déjà borné 1..20 — OK, mais ajouter message FR explicite

**diagnosticSchema** :
- `date_diagnostic` : `>= DATE_MIN` et `<= today` (jamais futur)

Exemple pattern à appliquer :

```ts
export const saillieSchema = z.object({
  // ... champs existants inchangés ...
}).superRefine((d, ctx) => {
  // Date saillie : pas avant 2020, pas plus de 7 jours dans le futur
  const today = todayISO()
  const maxFutur = new Date(); maxFutur.setDate(maxFutur.getDate() + 7)
  const maxFuturStr = maxFutur.toISOString().slice(0, 10)
  if (d.date_saillie < DATE_MIN) {
    ctx.addIssue({ code: 'custom', path: ['date_saillie'],
      message: `Date trop ancienne (avant ${DATE_MIN})` })
  }
  if (d.date_saillie > maxFuturStr) {
    ctx.addIssue({ code: 'custom', path: ['date_saillie'],
      message: 'Date trop dans le futur (max +7 jours pour saillie programmée)' })
  }
})
```

Idem `diagnosticSchema` avec `date_diagnostic <= today`.

### Fix #2 — `mises-bas/_schemas.ts` (miseBasSchema + sevrageSchema)

**miseBasSchema** — étendre le `.refine` existant en `.superRefine` (ou conserver `.refine` total + ajouter `.superRefine` après). Règles supplémentaires :
- `date_mise_bas` ∈ [DATE_MIN, today + 1] (tolérance saisie J+1 si mise-bas la veille au soir)
- `nes_totaux` ≤ 30 (record physiologique = ~25, on ouvre à 30 pour marge)
- `poids_portee_kg` ≤ 60 (record portée 20+ porcelets × 2.5 kg = 50 kg, marge 60)
- `duree_minutes` ∈ [15, 720] (15 min minimum réaliste, 12h max — au-delà = dystocie sévère)
- `bcs_truie` step 0.5 interdit : doit être un entier (cf vocab CI charte §10)

Lecture rapide LIRE D'ABORD ligne 36-46 : `bcs_truie` est déjà `.min(1).max(5)` mais accepte 2.5 → ajouter `.refine((v) => Number.isInteger(v), {...})` ou via superRefine.

Sevrage : 
- `date_sevrage` ∈ [DATE_MIN, today + 1]
- `poids_moyen_kg` ∈ [3, 15] (sevrage moyen 6-8 kg en CI, marge 3-15)

⚠️ Lire le schema sevrageSchema complet (ligne 50+ — tu n'as vu que le début) pour identifier les champs réels avant de pousser une règle hors-cible.

### Fix #3 — `mortalites/_schemas.ts`

Déjà solide (date ≤ today, motif=autre→motif_libre). Ajouts mineurs :
- `date_mortalite >= DATE_MIN` (bloquer dates antédiluviennes)
- `nb_animaux` max 1000 → déjà OK, mais ajouter message FR explicite si dépassé

⚠️ Schéma déjà bien structuré : NE PAS récrire. Juste ajouter 1-2 règles dans le `.superRefine` existant (ligne 62+).

### Format messages d'erreur

Tous les messages doivent être :
- En FR
- Concrets ("Poids portée trop élevé (max 60 kg)") pas vagues ("Valeur invalide")
- Suggestifs si possible ("Si dystocie >12h, contacter le vétérinaire")
- Vocab pro zootech strict (cf CLAUDE.md §10) : "truie", "porcelet", "mise bas" — JAMAIS "cochon", "porc", "petite cochonne", etc.

## VÉRIFICATIONS OBLIGATOIRES
1. `grep -c "DATE_MIN\|todayISO" app/src/app/\(app\)/reproduction/_schemas.ts app/src/app/\(app\)/mises-bas/_schemas.ts app/src/app/\(app\)/mortalites/_schemas.ts` → 3 fichiers, ≥ 2 mentions chacun
2. `grep -c "superRefine" app/src/app/\(app\)/reproduction/_schemas.ts` → ≥ 2 (saillie + diagnostic)
3. `grep -c "addIssue" app/src/app/\(app\)/reproduction/_schemas.ts app/src/app/\(app\)/mises-bas/_schemas.ts app/src/app/\(app\)/mortalites/_schemas.ts` → ≥ 15 total (plusieurs règles par schema)
4. `grep -i "cochon\|porc\b\|cochonne" app/src/app/\(app\)/{reproduction,mises-bas,mortalites}/_schemas.ts` → **0 occurrence** (vocab interdit)
5. `wc -l app/src/app/\(app\)/{reproduction,mises-bas,mortalites}/_schemas.ts` → croissance respective acceptable (+30 à +50 lignes max par fichier)

## LIVRABLE
1 fichier : `agents/sprint-vague-4-2026-05-28/rapports/RAPPORT_L3.md` (≤80 lignes)

Format télégraphique. Lister par schema : nb règles ajoutées + une ligne par règle (champ + contrainte + message FR court).

## INTERDITS
- ❌ Modifier `_server-actions.ts`, `_dialog-*.tsx`, `page.tsx`, ou tout fichier hors les 3 `_schemas.ts` ciblés
- ❌ Modifier `cheptel/*` ou `sanitaire/*` (réservés L1/L2)
- ❌ Ajouter dépendance npm (Zod déjà là)
- ❌ Casser une règle existante (les `.refine`/`.superRefine` actuels doivent rester fonctionnels)
- ❌ Vocab non-pro ("cochon", "petite cochonne", etc.) — voir vérif #4
- ❌ Rapport > 80 lignes

Go.
