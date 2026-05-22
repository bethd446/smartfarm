# Brief SA-A — 4 règles métier critiques + densité bâtiment

## Périmètre
✅ Touche : 1 migration SQL + `src/lib/alertes-regles.ts`
❌ Pas : UI pages, autres modules. Pas `npm run build`.

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md`.

État : v_alertes_actives a R01-R22. À ajouter R23, R24, R25, R26.

## Règles métier P0 (référentiels)

### R23 — Vermifuge truie J-14 pré-MB (INRAE)
**Cible** : truie gestante (diag positif + date saillie + 100j) sans traitement vermifuge dans les 14j avant date prévue MB.
**Gravité** : élevée
**Critère DB** : truie avec saillie + diag positif, MB attendue (saillie + 114j) dans 0-14j, aucune ligne `traitements` produit ILIKE '%vermi%|ivermectin%|doramectin%' sur cette truie dans les 30 derniers jours.

### R24 — Fer porcelet J3 non administré
**Cible** : mise-bas avec date_mise_bas = CURRENT_DATE - 3 (ou plus) ET aucun `traitements` produit ILIKE '%fer%|iron%|dextran%' ni `vaccinations` sur cette bande.
**Gravité** : critique (anémie tropicale)

### R25 — BCS truie au sevrage < 2.5 (IFIP)
**Cible** : sevrages avec `bcs_truie < 2.5` (déjà colonne, donnée existe).
**Gravité** : moyenne. Truie maigre = ISS long = perte productivité.

### R26 — Surdensité bâtiment (FAO/CIRAD)
**Cible** : bâtiment dont effectif > capacité × 0.95 (95%).
**Gravité** : moyenne. Stress, biosécurité dégradée.

## Migration SQL

Fichier : `supabase/migrations/20260522050000_sprint_a_alertes_critiques.sql`

```sql
BEGIN;

-- Vue effectif batiment (utilisée par R26 + page /batiments)
CREATE OR REPLACE VIEW v_densite_batiment
WITH (security_invoker=true) AS
SELECT
  b.id AS batiment_id,
  b.nom,
  b.type,
  b.ferme_id,
  b.capacite,
  COUNT(a.id) FILTER (WHERE a.statut='actif' AND a.deleted_at IS NULL) AS effectif_actuel,
  CASE
    WHEN b.capacite IS NULL OR b.capacite = 0 THEN NULL
    ELSE ROUND(COUNT(a.id) FILTER (WHERE a.statut='actif' AND a.deleted_at IS NULL)::numeric / b.capacite * 100, 1)
  END AS taux_occupation_pct
FROM batiments b
LEFT JOIN cases c ON c.batiment_id = b.id AND c.deleted_at IS NULL
LEFT JOIN animaux a ON a.case_id = c.id
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.nom, b.type, b.ferme_id, b.capacite;

GRANT SELECT ON v_densite_batiment TO anon, authenticated;

-- Recréer v_alertes_actives en préservant R01-R22 + ajouter R23/R24/R25/R26
-- Lis pg_get_viewdef('v_alertes_actives') AVANT, copie-colle les 22 branches existantes, ajoute 4 UNION ALL.
```

Pour les 4 nouvelles branches :

```sql
-- R23 vermifuge truie pré-MB
UNION ALL
SELECT 'R23-vermifuge-truie-pre-mb'::text AS regle_id,
       'truie'::text AS cible_type,
       a.id::text AS cible_id,
       a.tag AS cible_label,
       'élevée'::text AS gravite,
       'Truie ' || a.tag || ' : vermifuge J-14 pré-MB requis (MB prévue ' || (s.date_saillie + 114) || ')' AS titre,
       'Vermifuge truie (Ivermectine/Doramectine) recommandé 14 jours avant MB. Référentiel INRAE.'::text AS description,
       '/cheptel/' || a.id::text AS lien_suggere,
       now() AS detecte_le,
       a.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.statut='actif' AND a.deleted_at IS NULL
JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat = 'positif'
LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND mb.id IS NULL
  AND (s.date_saillie + 114) BETWEEN CURRENT_DATE AND CURRENT_DATE + 14
  AND NOT EXISTS (
    SELECT 1 FROM traitements t
    WHERE t.animal_id = a.id
      AND (t.produit ILIKE '%vermi%' OR t.produit ILIKE '%ivermectin%' OR t.produit ILIKE '%doramectin%')
      AND t.date_traitement >= CURRENT_DATE - 30
      AND t.deleted_at IS NULL
  )

-- R24 Fer porcelet J3 non administré
UNION ALL
SELECT 'R24-fer-porcelet-j3'::text AS regle_id,
       'mise_bas'::text AS cible_type,
       mb.id::text AS cible_id,
       a.tag AS cible_label,
       'critique'::text AS gravite,
       'Porcelets de ' || a.tag || ' (' || (CURRENT_DATE - mb.date_mise_bas) || 'j) : injection Fer dextran non saisie' AS titre,
       'Anémie porcelet en zone tropicale = mortalité élevée. Référentiel INRAE/CIRAD.'::text AS description,
       '/sanitaire/calendrier'::text AS lien_suggere,
       now() AS detecte_le,
       a.ferme_id
FROM mises_bas mb
JOIN animaux a ON a.id = mb.truie_id
WHERE mb.deleted_at IS NULL
  AND (CURRENT_DATE - mb.date_mise_bas) BETWEEN 3 AND 7
  AND NOT EXISTS (
    SELECT 1 FROM traitements t
    WHERE (t.bande_id = mb.bande_id OR t.animal_id = mb.truie_id)
      AND (t.produit ILIKE '%fer%' OR t.produit ILIKE '%iron%' OR t.produit ILIKE '%dextran%')
      AND t.date_traitement >= mb.date_mise_bas
      AND t.deleted_at IS NULL
  )

-- R25 BCS truie au sevrage < 2.5
UNION ALL
SELECT 'R25-bcs-sevrage-bas'::text AS regle_id,
       'truie'::text AS cible_type,
       a.id::text AS cible_id,
       a.tag AS cible_label,
       'moyenne'::text AS gravite,
       'Truie ' || a.tag || ' sortie sevrage avec BCS ' || sv.bcs_truie || '/5 (cible >= 2.5)' AS titre,
       'BCS bas au sevrage = ISS long, risque infertilité. Surveiller alimentation flushing pré-saillie. Référentiel IFIP.'::text AS description,
       '/cheptel/' || a.id::text AS lien_suggere,
       now() AS detecte_le,
       a.ferme_id
FROM sevrages sv
JOIN animaux a ON a.id = sv.truie_id AND a.statut='actif' AND a.deleted_at IS NULL
WHERE sv.deleted_at IS NULL
  AND sv.bcs_truie IS NOT NULL
  AND sv.bcs_truie < 2.5
  AND sv.date_sevrage >= CURRENT_DATE - 30
  AND NOT EXISTS (
    SELECT 1 FROM saillies s2
    WHERE s2.truie_id = a.id
      AND s2.date_saillie > sv.date_sevrage
      AND s2.deleted_at IS NULL
  )

-- R26 Surdensité bâtiment
UNION ALL
SELECT 'R26-surdensite-batiment'::text AS regle_id,
       'batiment'::text AS cible_type,
       v.batiment_id::text AS cible_id,
       v.nom AS cible_label,
       'moyenne'::text AS gravite,
       'Bâtiment ' || v.nom || ' (' || v.type || ') : surdensité ' || v.effectif_actuel || ' / ' || v.capacite || ' (' || v.taux_occupation_pct || '%)' AS titre,
       'Effectif > 95% capacité. Stress, biosécurité dégradée. Référentiel FAO/CIRAD.'::text AS description,
       '/batiments/' || v.batiment_id::text AS lien_suggere,
       now() AS detecte_le,
       v.ferme_id
FROM v_densite_batiment v
WHERE v.taux_occupation_pct IS NOT NULL
  AND v.taux_occupation_pct >= 95
```

Procédure :
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c \
  "SELECT pg_get_viewdef('v_alertes_actives'::regclass, true);" > /tmp/v_alertes_before.sql
# Inspecte les 22 branches R01-R22 et reconstruis identiquement + 4 nouvelles
```

## Mapping UI dans `alertes-regles.ts`

Ajouter 4 entrées :
```ts
'R23-vermifuge-truie-pre-mb': {
  nom: 'Vermifuge truie pré-MB',
  description: 'Vermifuge requis 14 jours avant mise-bas — référentiel INRAE.',
  gravite_default: 'élevée',
  categorie: 'sanitaire',
},
'R24-fer-porcelet-j3': {
  nom: 'Fer porcelet J3 non administré',
  description: 'Injection Fer dextran obligatoire J1-J3 — anémie tropicale critique.',
  gravite_default: 'critique',
  categorie: 'sanitaire',
},
'R25-bcs-sevrage-bas': {
  nom: 'BCS truie bas au sevrage',
  description: 'Truie sortie sevrage BCS<2.5 — risque ISS long, infertilité.',
  gravite_default: 'moyenne',
  categorie: 'reproduction',
},
'R26-surdensite-batiment': {
  nom: 'Bâtiment en surdensité',
  description: 'Effectif > 95% capacité — stress, biosécurité dégradée.',
  gravite_default: 'moyenne',
  categorie: 'pertes',
},
```

## Vérif
```sql
SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id ORDER BY regle_id;
-- attendu : R01-R26 (26 règles, certaines avec 0 lignes selon données démo)
```

```bash
grep -c "^  'R" /root/projects/smartfarm/app/src/lib/alertes-regles.ts
# = 26
```

## Livrable
1. Migration `20260522050000_sprint_a_alertes_critiques.sql` appliquée
2. `alertes-regles.ts` enrichi (22 → 26)
3. Rapport `/root/projects/smartfarm/agents/V2-SPRINT-A/RAPPORT_SA_A.md` ≤ 60 lignes

## Anti-pièges
- Vue `traitements` schéma : vérifie colonnes (`animal_id`, `bande_id`, `produit`, `date_traitement`, `deleted_at`)
- `\d traitements` avant d'écrire les WHERE
- Si colonne `date_traitement` n'existe pas, cherche `date_acte` ou `date_administration`
- Conserve `security_invoker=true` + GRANT
- Pas de touche aux 22 règles existantes
