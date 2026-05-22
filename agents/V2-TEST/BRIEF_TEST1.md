# Brief TEST-1 — Protocole vaccinal cochettes pré-saillie

## Périmètre
✅ Touche : 1 migration SQL
❌ Touche pas : front, autres tables, vues
❌ Pas `npm run build`. Pas restart serveur. Pas modif migrations existantes.

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` d'abord. DB standard. Stack standard.

État actuel `protocoles_vaccinaux` (catégorie `cochette`) :
- 1 seul : "Parvovirose + Leptospirose (cochettes)" J70 + rappel J21 → **incomplet**

## Mission
Compléter le protocole vaccinal cochette selon référentiel IFIP/INRAE :
1. Compléter "Parvo + Lepto cochettes" → ajouter 2ᵉ rappel à J165 (5.5 mois, avant 1ère saillie)
2. Ajouter "Rouget cochettes pré-saillie" — J150 (5 mois) + rappel annuel
3. Ajouter "Érysipèle cochettes pré-saillie" — J165 (5.5 mois) + rappel J21
4. Ajouter "Vermifuge cochettes pré-saillie" — J165 (parasiticide large spectre)

## Détails

```sql
BEGIN;

-- 1. Modifier Parvo/Lepto cochettes existant : rappel J21 + J165 (avant 1ère saillie)
UPDATE protocoles_vaccinaux
SET rappels_jours = ARRAY[21, 165],
    description = 'Primo J70, rappel J91 (J21 après primo), rappel pré-saillie J165 (5.5 mois). Référentiel IFIP — protège la portée via colostrum.'
WHERE nom = 'Parvovirose + Leptospirose (cochettes)';

-- 2. Rouget cochettes pré-saillie
INSERT INTO protocoles_vaccinaux (ferme_id, nom, categorie_cible, age_jours, rappels_jours, produit, voie, dose_ml, obligatoire, description)
SELECT id, 'Rouget cochettes pré-saillie', 'cochette', 150, ARRAY[365],
       'Vaccin érysipélothrix rhusiopathiae',
       'IM (encolure)', 2.0, true,
       'Vaccination Rouget cochettes 5 mois (J150). Rappel annuel ensuite. Indispensable en zone tropicale CI (humidité, contact sol).'
FROM fermes WHERE deleted_at IS NULL;

-- 3. Érysipèle cochettes pré-saillie (vaccin distinct selon souche locale)
INSERT INTO protocoles_vaccinaux (ferme_id, nom, categorie_cible, age_jours, rappels_jours, produit, voie, dose_ml, obligatoire, description)
SELECT id, 'Érysipèle + Parvo combiné cochette pré-saillie', 'cochette', 165, ARRAY[21],
       'Vaccin combiné (ex: Eryseng Parvo)',
       'IM (encolure)', 2.0, true,
       'Vaccination Érysipèle + Parvovirose 5.5 mois (J165) + rappel J186. Sécurise la 1ère saillie et la 1ère portée.'
FROM fermes WHERE deleted_at IS NULL;

-- 4. Vermifuge pré-saillie
INSERT INTO protocoles_vaccinaux (ferme_id, nom, categorie_cible, age_jours, rappels_jours, produit, voie, dose_ml, obligatoire, description)
SELECT id, 'Vermifuge cochettes pré-saillie', 'cochette', 165, ARRAY[]::integer[],
       'Ivermectine ou Doramectine',
       'SC', 0.3, true,
       'Vermifuge large spectre 5.5 mois (J165, 14j avant saillie). Élimine endo/ectoparasites avant gestation. INRAE recommandation.'
FROM fermes WHERE deleted_at IS NULL;

COMMIT;
```

Fichier : `supabase/migrations/20260522010000_cochettes_pre_saillie.sql`

Appliquer :
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres \
  -f /root/projects/smartfarm/supabase/migrations/20260522010000_cochettes_pre_saillie.sql
```

## Vérif
```sql
SELECT nom, age_jours, rappels_jours, obligatoire
FROM protocoles_vaccinaux
WHERE categorie_cible='cochette'
ORDER BY age_jours;
```
Attendu : 4 lignes (au lieu de 1 actuellement).

## Livrables
1. Migration appliquée
2. Vérif SQL retourne 4 lignes cochette
3. Rapport `/root/projects/smartfarm/agents/V2-TEST/RAPPORT_TEST1.md` ≤ 80 lignes télégraphiques

## Anti-pièges
- `rappels_jours` est `integer[]` NOT NULL `DEFAULT '{}'` → utiliser `ARRAY[…]::integer[]` ou `ARRAY[21, 165]`
- INSERT depuis `fermes` : il n'y a qu'1 ferme démo, donc 1 row par INSERT
- Pas modifier d'autres lignes protocoles_vaccinaux (porcelet, sevrage, etc.)
