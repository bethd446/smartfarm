# Brief POLISH-A — Métier porcin critique restant

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : 4 fix métier P1 restants identifiés par l'audit V2 Round 2

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `supabase/migrations/` — UNE migration `20260522000000_polish_a_metier.sql`
2. `app/src/lib/alertes-regles.ts` (ajout entrée R19 si nécessaire)
3. `app/src/lib/nutrition-engine.ts` (ratios AA idéaux)
4. Pas d'autre fichier front (sauf si une page consomme directement les KPI ratios — préviens en rapport sans modifier)

---

## FIX #1 — Splitter R01 : "vide" vs "gestante post-terme"

### Bug actuel (audit V2 Round 2)
T-003 (saillie 25/01/2026, aucune MB encore saisie, jour 116) est libellée *"Truie T-003 vide depuis 116 jours"*. Elle n'est PAS vide — elle est probablement **gestante en post-terme** (114 j de gestation porcine standard + 2 j de retard).

Le moteur a déjà la règle **R04-gestante-en-retard** mais elle ne se déclenche QUE si un diagnostic gestation positif a été enregistré. T-003 n'a pas de diagnostic positif officiel donc R04 ne match pas.

### Fix
Modifier la branche R01 dans `v_alertes_actives` pour **exclure** les truies dont la dernière saillie est entre 110 et 130 jours (zone de mise-bas attendue) :

Récupérer la déf actuelle :
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c \
  "SELECT pg_get_viewdef('v_alertes_actives'::regclass, true);" > /tmp/v_alertes_def.sql
```

Dans la branche R01, ajouter la condition d'exclusion :
```sql
-- Condition WHERE existante de R01 (issue de FIX-A)
WHERE (dsa.derniere_saillie IS NULL OR (CURRENT_DATE - dsa.derniere_saillie) > 45)
  AND (dmb.derniere_mb IS NULL OR (CURRENT_DATE - dmb.derniere_mb) > 35)
  AND (ds.dernier_sevrage IS NULL OR (CURRENT_DATE - ds.dernier_sevrage) > 14)
  AND (dsa.derniere_saillie IS NOT NULL OR dmb.derniere_mb IS NOT NULL OR ds.dernier_sevrage IS NOT NULL
       OR COALESCE(t.date_entree, t.date_naissance) IS NOT NULL
          AND (CURRENT_DATE - COALESCE(t.date_entree, t.date_naissance)) > 240)
  -- AJOUT : exclure les saillies récentes en zone gestation potentielle (J110-J130)
  AND NOT (dsa.derniere_saillie IS NOT NULL
           AND (CURRENT_DATE - dsa.derniere_saillie) BETWEEN 110 AND 130)
```

Et **ajouter une nouvelle branche R19** :
```sql
UNION ALL
SELECT 'R19-mise-bas-attendue-sans-diag'::text AS regle_id,
       'truie'::text AS cible_type,
       t.id::text AS cible_id,
       t.tag AS cible_label,
       'élevée'::text AS gravite,
       ('Truie ' || t.tag || ' : mise-bas attendue depuis ' || (CURRENT_DATE - dsa.derniere_saillie - 114) || ' jour(s) — saillie le ' || dsa.derniere_saillie || ' sans diagnostic ni MB enregistrée') AS titre,
       'Vérifier l''état de la truie : peut-être en mise-bas imminente, mise-bas non saisie, ou avortement non déclaré. Faire un examen + diagnostic.'::text AS description,
       ('/cheptel/' || t.id::text) AS lien_suggere,
       now() AS detecte_le,
       t.ferme_id
FROM truies_actives t
JOIN truie_derniere_saillie dsa ON dsa.truie_id = t.id
LEFT JOIN truie_derniere_mb dmb ON dmb.truie_id = t.id
LEFT JOIN diagnostics_gestation d ON d.saillie_id IN (
  SELECT id FROM saillies s WHERE s.truie_id = t.id AND s.date_saillie = dsa.derniere_saillie
)
WHERE (CURRENT_DATE - dsa.derniere_saillie) BETWEEN 110 AND 130
  AND (dmb.derniere_mb IS NULL OR dmb.derniere_mb < dsa.derniere_saillie)
  AND d.id IS NULL
```

(Si tu trouves que la jointure diagnostics_gestation est trop complexe vu la vue, simplifie : pas de filtre sur diagnostic, juste sur saillie+absence MB.)

Ajouter aussi dans `alertes-regles.ts` :
```ts
'R19-mise-bas-attendue-sans-diag': {
  nom: 'Mise-bas attendue sans diagnostic',
  description:
    'Truie en zone de mise-bas (jour 110-130 post-saillie) sans diagnostic gestation ni MB saisie.',
  gravite_default: 'élevée',
  categorie: 'reproduction',
},
```

---

## FIX #2 — Ratios AA idéaux + Tryptophane + Thréonine

### Bug actuel
L'audit a noté manque ratios AA idéaux (Thr/Lys, Trp/Lys, Lys/EM) dans le calculateur de formulation. NRC 2012 standards :
- Thréonine / Lysine SID : 65-67% (truie gestation), 62-65% (croissance)
- Tryptophane / Lysine SID : 18-22%
- Méthionine + Cystéine / Lysine SID : 55-60%
- Lysine / EM (g/Mcal) : 2.8-3.5 selon stade

### Fix DB
Ajouter colonnes :
```sql
ALTER TABLE matieres_premieres ADD COLUMN IF NOT EXISTS threonine_pct numeric(6,3);
ALTER TABLE matieres_premieres ADD COLUMN IF NOT EXISTS tryptophane_pct numeric(6,3);
ALTER TABLE matieres_premieres ADD COLUMN IF NOT EXISTS cystine_pct numeric(6,3);
COMMENT ON COLUMN matieres_premieres.threonine_pct IS 'Thréonine SID en % — référentiel NRC 2012';
COMMENT ON COLUMN matieres_premieres.tryptophane_pct IS 'Tryptophane SID en % — référentiel NRC 2012';
COMMENT ON COLUMN matieres_premieres.cystine_pct IS 'Cystine SID en %';
```

Seed (mets à jour les valeurs sur Maïs et Tourteau soja qui sont les principales) :
```sql
UPDATE matieres_premieres SET
  threonine_pct = 0.27,
  tryptophane_pct = 0.07,
  cystine_pct = 0.21
WHERE nom ILIKE '%maïs%' AND deleted_at IS NULL;

UPDATE matieres_premieres SET
  threonine_pct = 1.74,
  tryptophane_pct = 0.62,
  cystine_pct = 0.66
WHERE nom ILIKE 'Tourteau de soja 48%';

UPDATE matieres_premieres SET
  threonine_pct = 1.36,
  tryptophane_pct = 0.46,
  cystine_pct = 0.62
WHERE nom ILIKE 'Tourteau de soja 44%';
```

Pour les autres matières (arachide, coton, etc.) : laisse NULL (compléter plus tard).

### Fix nutrition-engine
Dans `app/src/lib/nutrition-engine.ts`, ajouter les fonctions de calcul ratio :

```ts
// Ajouter aux ratios calculés
export function calculerRatiosAA(formulation: FormulationCalculee) {
  const lys = formulation.lysine_pct ?? 0
  const ratios = {
    thr_sur_lys_pct: formulation.threonine_pct && lys > 0
      ? (formulation.threonine_pct / lys) * 100 : null,
    trp_sur_lys_pct: formulation.tryptophane_pct && lys > 0
      ? (formulation.tryptophane_pct / lys) * 100 : null,
    met_cys_sur_lys_pct: (formulation.methionine_pct && formulation.cystine_pct && lys > 0)
      ? ((formulation.methionine_pct + formulation.cystine_pct) / lys) * 100 : null,
    lys_sur_em_g_par_mcal: lys && formulation.em_porc_kcal_kg
      ? (lys * 10) / (formulation.em_porc_kcal_kg / 1000) : null,
  }
  return ratios
}

// Cibles NRC 2012 par stade
export const CIBLES_RATIOS_AA = {
  croissance: { thr_sur_lys: [62, 65], trp_sur_lys: [18, 22], met_cys_sur_lys: [55, 60], lys_sur_em: [3.0, 3.5] },
  finition:   { thr_sur_lys: [65, 67], trp_sur_lys: [18, 22], met_cys_sur_lys: [55, 60], lys_sur_em: [2.8, 3.2] },
  gestation:  { thr_sur_lys: [65, 67], trp_sur_lys: [19, 22], met_cys_sur_lys: [55, 60], lys_sur_em: [2.8, 3.0] },
  lactation:  { thr_sur_lys: [62, 65], trp_sur_lys: [18, 20], met_cys_sur_lys: [55, 58], lys_sur_em: [3.2, 3.5] },
}
```

Ajoute des types adéquats (lis le code existant pour comprendre les types `FormulationCalculee`).

**NE TOUCHE PAS** aux pages — juste la lib. La page calculateur consommera ces helpers dans un futur sprint si Christophe le demande.

---

## FIX #3 — Cibles BCS par stade

### Ajouter à `alertes-regles.ts` ou créer un nouveau fichier `app/src/lib/repro-cibles.ts`

```ts
/**
 * Cibles biologiques BCS truie par stade physiologique (référence INRAE/IFIP)
 */
export const CIBLES_BCS = {
  saillie:        { min: 3.0, ideal: 3.5, max: 4.0 },
  mi_gestation:   { min: 3.5, ideal: 3.5, max: 4.0 },
  fin_gestation:  { min: 3.5, ideal: 4.0, max: 4.5 },
  mise_bas:       { min: 3.5, ideal: 4.0, max: 4.5 },
  sevrage:        { min: 2.5, ideal: 3.0, max: 3.5 }, // perte normale de 0.5 à 1 point
} as const

export function bcsAlerte(stade: keyof typeof CIBLES_BCS, bcs: number): 'ok' | 'maigre' | 'grasse' {
  const cible = CIBLES_BCS[stade]
  if (bcs < cible.min) return 'maigre'
  if (bcs > cible.max) return 'grasse'
  return 'ok'
}
```

Ne modifie pas les pages — juste expose la lib. (Future PR consommera ça.)

---

## FIX #4 — Heat stress tropical CI : ajustement EM et eau

### Contexte
Côte d'Ivoire saison chaude (T > 27°C ambiant) : truies réduisent leur ingéré de 10-15%, besoins eau augmentent de 30-50%.

### Ajouter à `nutrition-engine.ts`

```ts
/**
 * Ajustement nutritionnel saison chaude tropicale (NRC 2012 + IFIP recommandations zones tropicales).
 * Multiplicateur à appliquer sur les besoins de base si T° ambiante > 27°C.
 */
export const AJUSTEMENT_HEAT_STRESS = {
  // Si température ambiante > 27°C
  ingestion_aliment_truie_lactation: 0.85,  // -15% d'ingéré
  ingestion_aliment_truie_gestation: 0.92,  // -8%
  besoin_eau_truie_lactation: 1.50,          // +50%
  besoin_eau_truie_gestation: 1.30,          // +30%
  // Compensation : densifier l'EM + densifier Lys pour maintenir apports
  densite_em_recommandee_kcal_kg: 3200,      // (vs 3000 standard) en chaud
  densite_lys_sid_recommandee_pct: 1.10,     // (vs 0.95 standard)
}

/**
 * Recommandations format clé-message pour saison chaude.
 */
export const RECOMMANDATIONS_HEAT_STRESS = [
  'Distribuer 2/3 de la ration tôt le matin (4h-7h) et 1/3 le soir (18h-20h)',
  'Vérifier débit abreuvoir : ≥ 4 L/min pour truies en lactation',
  'Densifier ration : EM ≥ 3200 kcal/kg, Lys SID ≥ 1.1%',
  'Surveiller T° truies en lactation : alerte si T°>39.5°C, urgence si >40°C',
  'Brumisateurs + ventilateurs en maternité dès T°>30°C',
]
```

---

## PROCÉDURE

1. Lire la déf complète de `v_alertes_actives` AVANT recréation
2. Écrire la migration (FIX #1 R01 + R19, FIX #2 colonnes AA + seeds, FIX #3 — pas de DB)
3. Appliquer migration
4. Modifier `alertes-regles.ts` (ajout R19)
5. Modifier `nutrition-engine.ts` (ajout fonctions calculerRatiosAA + CIBLES_RATIOS_AA + AJUSTEMENT_HEAT_STRESS)
6. Créer `repro-cibles.ts` (CIBLES_BCS + helper)
7. Vérif TS :
   ```bash
   export PATH=/root/.hermes/node/bin:$PATH && cd /root/projects/smartfarm/app && npx tsc --noEmit 2>&1 | tail -10
   ```
8. Vérif SQL : `SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id`
9. ⚠️ NE LANCE PAS `npm run build`

---

## LIVRABLES

1. Migration appliquée
2. `alertes-regles.ts` enrichi (18 → 19 règles)
3. `nutrition-engine.ts` enrichi (ratios AA + heat stress)
4. `repro-cibles.ts` créé (cibles BCS)
5. Rapport `/root/projects/smartfarm/agents/V2-POLISH/RAPPORT_POLISH_A.md`

## ANTI-PIÈGES
- `v_alertes_actives` est partagée — recopie TOUTES les autres branches identiques (sauf R01) + ajoute R19
- `security_invoker=true` + `GRANT SELECT … TO anon, authenticated`
- Ne touche pas aux pages métier — juste les libs et la DB
