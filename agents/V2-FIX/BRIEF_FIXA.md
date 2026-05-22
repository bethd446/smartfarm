# Brief FIX-A — Corrections P0 métier critiques

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : 4 fix P0 métier identifiés par l'audit V2 Round 2

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `supabase/migrations/` — UNE migration `20260521230000_fix_metier_audit2.sql`
2. `app/src/lib/alertes-regles.ts` (mapping UI alertes)
3. Pas d'autre fichier front. Pas de page modifiée.

---

## FIX #1 — Mycoplasma calendrier porcelets J14/J28 (au lieu de J7/J21)

### Bug actuel
- Table `protocoles_vaccinaux` (source de vérité) : **primo J14, rappel J28**
- Vue `v_calendrier_sanitaire_porcelets` (UI) : H1 J7, H2 J21 ← **DANGER MÉDICAL** : 7j d'immunité maternelle = vaccination inefficace voire bloquante.

### Fix
Recréer la vue `v_calendrier_sanitaire_porcelets` avec **J14 et J28** au lieu de J7/J21 :

```sql
CREATE OR REPLACE VIEW v_calendrier_sanitaire_porcelets
WITH (security_invoker=true) AS
WITH actes_planifies AS (
  SELECT
    mb.id AS mise_bas_id,
    mb.bande_id,
    mb.truie_id,
    a.tag AS truie_tag,
    a.ferme_id,
    mb.date_mise_bas,
    mb.nes_vivants,
    acte.libelle,
    acte.type_acte,
    acte.jour_offset,
    (mb.date_mise_bas + acte.jour_offset)::date AS date_prevue,
    acte.gravite
  FROM mises_bas mb
  JOIN animaux a ON a.id = mb.truie_id
  CROSS JOIN LATERAL (
    VALUES
      ('Injection Fer dextran 200 mg'::text,         'traitement'::text, 1,  'élevée'::text),
      ('Castration / coupe queue (optionnel)'::text, 'traitement'::text, 5,  'moyenne'::text),
      ('Vaccination Mycoplasma primo (J14)'::text,   'vaccination'::text,14, 'élevée'::text),
      ('Vaccination Mycoplasma rappel (J28)'::text,  'vaccination'::text,28, 'élevée'::text),
      ('Pesée + sevrage'::text,                      'traitement'::text, 28, 'moyenne'::text)
  ) acte(libelle, type_acte, jour_offset, gravite)
  WHERE mb.deleted_at IS NULL
)
SELECT (mise_bas_id::text || ':' || libelle) AS acte_id,
       mise_bas_id, bande_id, truie_id, truie_tag, ferme_id,
       date_mise_bas, nes_vivants,
       libelle AS acte, type_acte, jour_offset, date_prevue, gravite,
       CASE
         WHEN date_prevue < CURRENT_DATE THEN 'retard'
         WHEN date_prevue = CURRENT_DATE THEN 'aujourd_hui'
         WHEN date_prevue <= CURRENT_DATE + 7 THEN 'semaine'
         WHEN date_prevue <= CURRENT_DATE + 30 THEN 'mois'
         ELSE 'lointain'
       END AS statut_temporel
FROM actes_planifies
WHERE date_prevue >= CURRENT_DATE - INTERVAL '14 days'
  AND date_prevue <= CURRENT_DATE + INTERVAL '60 days';

GRANT SELECT ON v_calendrier_sanitaire_porcelets TO anon, authenticated;
```

Note : on aligne aussi castration à **J5** (pas J3 — IFIP recommande J3-J7, prendre milieu).

---

## FIX #2 — TMM exclure les écrasés (norme GTTT/IFIP)

### Bug actuel
Vue `v_kpi_techniques_truie` calcule :
```
tmm_pct = (sum_nes_morts + sum_momifies + sum_ecrases) / sum_totaux * 100
```
**Norme IFIP/GTTT** :
- **TMM (Taux Mortinatalité)** = `(nes_morts + momifies) / nes_totaux` — pertes pré/per-natales uniquement
- **Pertes en lactation** = `ecrases + autres morts post-naissance` — déjà calculé séparément

### Fix
Récupérer la déf de `v_kpi_techniques_truie` puis modifier UNIQUEMENT la branche TMM :

```sql
-- Dans le SELECT principal, modifier :
CASE
  WHEN mbs.sum_totaux > 0
  THEN ((mbs.sum_nes_morts + mbs.sum_momifies)::numeric / mbs.sum_totaux * 100)::numeric(5,2)
END AS tmm_pct,
```

(Retirer `+ mbs.sum_ecrases` du numérateur)

Conserver tout le reste de la vue **identique au bit près**.

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c \
  "SELECT pg_get_viewdef('v_kpi_techniques_truie'::regclass, true);" > /tmp/v_kpi_def.sql
```

---

## FIX #3 — Labels Lys/Met "totaux" → "SID" (Standardized Ileal Digestible)

### Bug actuel
La table `matieres_premieres` a des colonnes `lysine_pct`, `methionine_pct` seedées avec des **valeurs SID NRC 2012** (digestibles iléales standardisées), mais les UI affichent ces colonnes comme "Lys totale" / "Met totale".

### Fix possible (2 options — choisis la PLUS SAFE)

**Option A (légère, recommandée)** : ne renomme PAS les colonnes DB (gros chantier).
Au lieu, créer dans la migration UN COMMENT clair sur les colonnes :
```sql
COMMENT ON COLUMN matieres_premieres.lysine_pct IS 'Lysine SID (Standardized Ileal Digestible) en % — référentiel NRC 2012';
COMMENT ON COLUMN matieres_premieres.methionine_pct IS 'Méthionine SID en % — référentiel NRC 2012';
```

Puis chercher dans le code front toutes les occurrences de libellé "Lysine totale" / "Méthionine totale" et les remplacer par "Lysine SID (%)" / "Méthionine SID (%)" :

```bash
grep -rn -i "lysine\s*total\|lys\s*total\|méthionine\s*total\|met\s*total" app/src/
```

Modifier ces fichiers (probablement 2-3 max) pour libeller "SID".

⚠️ Tu peux modifier UNIQUEMENT les chaînes texte qui affichent ces labels. Ne renomme PAS les noms de variables JS/TS.

---

## FIX #4 — Mapping UI alertes R13-R18 manquant

### Bug actuel
Le fichier `app/src/lib/alertes-regles.ts` contient les règles **R01-R12** mais **PAS** R13-R18. Conséquence : les alertes R13/R14/R15/R16/R17/R18 affichées s'affichent sans titre/catégorie/icône cohérente, le filtre par catégorie les range dans "AUTRES".

### Fix
Ajouter aux `REGLES_ALERTES` :

```ts
'R13-truie-anorexie': {
  nom: 'Truie en anorexie',
  description:
    'Consommation aliment chutée de plus de 50 % vs moyenne 7 jours.',
  gravite_default: 'critique',
  categorie: 'sanitaire',
},
'R14-cochette-trop-vieille': {
  nom: 'Cochette non saillie >250 j',
  description:
    'Cochette âgée de plus de 250 jours sans saillie enregistrée — risque d\'infertilité.',
  gravite_default: 'moyenne',
  categorie: 'reproduction',
},
'R15-lot-mortalite-anormale': {
  nom: 'Mortalité anormale du lot',
  description:
    'Lot avec plus de 5 % de mortalité sur les 7 derniers jours.',
  gravite_default: 'critique',
  categorie: 'pertes',
},
'R16-mise-bas-tardive': {
  nom: 'Mise-bas tardive',
  description:
    'Saillie positive avec mise-bas attendue depuis plus de 117 jours sans saisie.',
  gravite_default: 'critique',
  categorie: 'reproduction',
},
'R17-eau-chute-importante': {
  nom: 'Eau — chute importante de consommation',
  description:
    'Consommation eau du jour en baisse de plus de 20 % vs moyenne 7 jours.',
  gravite_default: 'critique',
  categorie: 'sanitaire',
},
'R18-lot-non-analyse': {
  nom: 'Lot maïs/arachide/soja non analysé',
  description:
    'Lot de matière première sensible reçu depuis plus de 7 jours sans analyse mycotoxines.',
  gravite_default: 'moyenne',
  categorie: 'sanitaire',
},
```

⚠️ Avant d'ajouter, vérifie si le type `CategorieAlerte` couvre tous les usages : `'reproduction' | 'sanitaire' | 'nutrition' | 'pertes' | 'stock'`. C'est OK.

---

## PROCÉDURE

1. Lire `v_kpi_techniques_truie` complet via `pg_get_viewdef`
2. Lire `v_calendrier_sanitaire_porcelets` (déjà fourni ci-dessus)
3. Écrire la migration en transaction unique (BEGIN/COMMIT)
4. Appliquer
5. Vérifier :
   ```sql
   SELECT acte, COUNT(*) FROM v_calendrier_sanitaire_porcelets GROUP BY acte;
   SELECT truie_id, tmm_pct FROM v_kpi_techniques_truie WHERE tmm_pct IS NOT NULL;
   ```
6. Modifier `alertes-regles.ts` (ajouter 6 entrées)
7. Grep + remplace libellés Lys/Met
8. ⚠️ NE LANCE PAS `npm run build` — l'orchestrateur le fera

---

## LIVRABLES

1. Migration appliquée
2. `alertes-regles.ts` enrichi (12 → 18 règles)
3. 1-3 fichiers nutrition rebadgés "SID"
4. Rapport `/root/projects/smartfarm/agents/V2-FIX/RAPPORT_FIXA.md`

## ANTI-PIÈGES
- Ne casse aucune colonne, contrainte ou trigger
- Conserve `security_invoker=true` + `GRANT … TO anon, authenticated` sur toutes les vues recréées
- Pour TMM, ne touche qu'à la branche numérateur — pas au reste
- Ne touche pas aux Server Actions ni aux pages (FIX-B s'en charge)
