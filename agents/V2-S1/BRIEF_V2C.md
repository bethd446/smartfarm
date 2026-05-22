# Brief V2-C — Alertes métier manquantes (4 règles critiques)

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : Ajouter 4 nouvelles règles d'alertes métier pré-identifiées par l'expert porcin

---

## PÉRIMÈTRE EXCLUSIF

Tu touches UNIQUEMENT :
1. `supabase/migrations/` — créer une migration `2026XXXXXXXXXX_alertes_metier_v2.sql` qui :
   - ajoute des colonnes nécessaires aux tables si besoin (`animaux.temperature_jc`, `animaux.consommation_aliment_jc`, etc.) **avec valeurs par défaut nulles** pour ne pas casser l'existant
   - étend la vue `v_alertes_actives` avec 4 nouvelles règles (R11 à R14)
2. Tu ne crées **PAS** de page front. L'UI existante consomme déjà `v_alertes_actives` et affichera automatiquement les nouvelles règles.

Tu ne touches PAS : nutrition, sanitaire (autre chantier), cheptel, chatbot.

---

## CONTEXTE

- DB : Supabase local Docker, port `54322`, user/pass/db `postgres`
- Connexion : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`
- Vue actuelle : `v_alertes_actives` génère R01 à R10 (truie vide, retour chaleur, mise-bas imminente, lot à sevrer, mortalité, stock critique, etc.)
- Pour voir la définition complète :
  ```bash
  PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c \
    "SELECT pg_get_viewdef('v_alertes_actives'::regclass, true);" > /tmp/v_alertes_def.sql
  ```

⚠️ **Coordination** : l'agent V2-A modifie aussi `v_alertes_actives` (fix R01). Il termine **avant** toi. Tu lis la version finale après son passage, puis tu rajoutes tes 4 branches `UNION ALL`.

---

## 4 RÈGLES À AJOUTER

### R11 — Truie anorexique (consommation aliment chutée)

**Détection** : truie en lactation ou gestante dont `consommation_aliment` enregistrée hier ou aujourd'hui via table `consommations_aliment` est **< 50% de la moyenne 7 derniers jours**.

**Implémentation** :
```sql
'R11-truie-anorexie'::text AS regle_id,
'truie'::text AS cible_type,
...
FROM (
  SELECT c.animal_id,
         AVG(c.quantite_kg) FILTER (WHERE c.date_consommation BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE - 1) AS moyenne_7j,
         MAX(c.quantite_kg) FILTER (WHERE c.date_consommation = CURRENT_DATE) AS quantite_today
  FROM consommations_aliment c WHERE c.deleted_at IS NULL GROUP BY c.animal_id
) tx
JOIN animaux a ON a.id = tx.animal_id AND a.categorie='truie' AND a.statut='actif'
WHERE tx.moyenne_7j > 0 AND COALESCE(tx.quantite_today,0) < tx.moyenne_7j * 0.5
```

**Vérifie d'abord** que `consommations_aliment` a une colonne `animal_id` (pas `animal_id` ou `truie_id`). Si la table est par-lot (`lot_id`) plutôt que par-animal, **adapte** : alerte au niveau bande/case, pas truie.

### R12 — Cochette non saillie >250 jours

**Détection** : animal `categorie='cochette'` actif depuis >250 jours (basé sur `date_naissance`) **et** aucune saillie enregistrée.

```sql
'R12-cochette-trop-vieille'::text AS regle_id,
...
FROM animaux a
LEFT JOIN saillies s ON s.truie_id = a.id AND s.deleted_at IS NULL
WHERE a.categorie='cochette' AND a.statut='actif' AND a.deleted_at IS NULL
  AND a.date_naissance IS NOT NULL
  AND (CURRENT_DATE - a.date_naissance) > 250
GROUP BY a.id, a.tag, a.ferme_id, a.date_naissance
HAVING COUNT(s.id) = 0
```

### R13 — Mortalité anormale dans un lot (>5% / 7 jours)

**Détection** : pour chaque bande active, compter le nombre de morts sur les 7 derniers jours via `mortalites`. Si `morts_7j / effectif_initial_bande > 5%`, déclencher l'alerte.

```sql
'R13-mortalite-anormale'::text AS regle_id,
'bande'::text AS cible_type,
...
FROM bandes b
LEFT JOIN bande_animaux ba ON ba.bande_id = b.id
LEFT JOIN mortalites m ON m.animal_id = ba.animal_id
  AND m.date_mortalite BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE
  AND m.deleted_at IS NULL
WHERE b.date_fin IS NULL OR b.date_fin >= CURRENT_DATE
GROUP BY b.id, b.code, b.ferme_id
HAVING COUNT(DISTINCT ba.animal_id) > 0
   AND COUNT(DISTINCT m.id)::numeric / NULLIF(COUNT(DISTINCT ba.animal_id), 0) > 0.05
```

> Si la table `bande_animaux` n'existe pas avec ces colonnes, **vérifie** (`\d bande_animaux`) et adapte. Idem pour le champ `date_fin` de `bandes` (peut être `date_fin_prevue` ou `date_fin_reelle`).

### R14 — Mise-bas tardive (>117 jours depuis saillie sans MB enregistrée)

**Détection** : saillie positive (diagnostic gestation positif), date_saillie + 117 jours < CURRENT_DATE, aucune mise-bas correspondante.

```sql
'R14-mise-bas-tardive'::text AS regle_id,
'truie'::text AS cible_type,
...
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.statut='actif'
JOIN diagnostics_gestation d ON d.saillie_id = s.id AND d.resultat='positif'
LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND CURRENT_DATE > (s.date_saillie + 117)
  AND mb.id IS NULL
```

---

## PROCÉDURE

### 1. Lire la vue actuelle
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c \
  "SELECT pg_get_viewdef('v_alertes_actives'::regclass, true);" > /tmp/v_alertes_def.sql
cat /tmp/v_alertes_def.sql | head -100
```

### 2. Vérifier les colonnes des tables impactées
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\d consommations_aliment"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\d mortalites"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\d bande_animaux"
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "\d bandes"
```
**Adapte tes branches SQL aux vrais noms de colonnes**. N'invente rien.

### 3. Écrire la migration
Fichier : `/root/projects/smartfarm/supabase/migrations/2026XXXXXXXXXX_alertes_metier_v2.sql`
- Commence par `BEGIN;`
- Recrée la vue `CREATE OR REPLACE VIEW v_alertes_actives WITH (security_invoker=true) AS …`
- Inclut **toutes** les anciennes règles R01-R10 + tes 4 nouvelles via UNION ALL
- Termine par `GRANT SELECT ON v_alertes_actives TO anon, authenticated;` et `COMMIT;`

### 4. Appliquer
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f /root/projects/smartfarm/supabase/migrations/2026XXXXXXXXXX_alertes_metier_v2.sql
```

### 5. Vérifier
```sql
SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id ORDER BY regle_id;
```
**Attendu** : R11/R12/R13/R14 visibles avec >= 0 lignes (0 si pas de données déclenchantes, OK).

### 6. Tester côté front (sans toucher au code)
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/alertes
```
Attendu : **200** (le code existant pioche tous les `regle_id` dans la vue).

---

## LIVRABLES

1. Migration créée + appliquée
2. Vérif `\dv v_alertes_actives` → vue toujours présente avec les 10+4 = 14 règles
3. Rapport markdown `/root/projects/smartfarm/agents/V2-S1/RAPPORT_V2C.md` avec :
   - Liste des 4 règles avec exemple de titre généré
   - Sortie de `SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id`
   - Code HTTP de `/alertes`
   - Si une règle ne déclenche jamais (R11-R14 = 0 lignes), une **note expliquant pourquoi** (table vide, données démo insuffisantes, etc.)

## ANTI-PIÈGES
- Tu **dois** lire `pg_get_viewdef` avant de réécrire — ne perds aucune ancienne règle
- Conserve `security_invoker=true` + `GRANT … TO anon`
- N'invente pas de colonne SQL — vérifie avec `\d` avant
- Si une table essentielle (`bande_animaux` etc.) a une structure différente de ce que je décris, **adapte** la branche concernée, ou marque la règle comme "TODO seed plus tard" et passe à la suivante (mais TENTE d'abord)
- V2-A finit en premier — coordonne-toi : si tu vois sa migration `fix_v2s1_p0_bugs.sql` dans le dossier, prends la définition v_alertes_actives **POST-V2A**
