# Rapport POLISH-C — Conformité + Biosécurité + ISS alerte

**Producteur :** Sonnet 4.5 (contexte vierge)
**Date :** Thursday 21 May 2026
**Brief :** `agents/V2-POLISH/BRIEF_POLISH_C.md`
**Statut :** ✅ Exécuté intégralement

---

## Résumé exécutif

Les 4 fix de conformité / sécurité ont été appliqués, vérifiés et chacun
passe son test SQL (et `tsc --noEmit` ne remonte aucune erreur sur les
fichiers touchés).

| # | Fix | DB | Front |
|---|-----|----|--------|
| 1 | Mycotoxines OTA + FUM + nouveau `conforme` | ✅ | (page front non touchée — P2 polish future) |
| 2 | Checklist biosécurité persistante | ✅ table + vue | ✅ page interactive ✓/✗ |
| 3 | Alerte R20 ISS > 10 j | ✅ branche v_alertes | ✅ mapping `alertes-regles.ts` |
| 4 | Voie IM = "encolure (musculature massétère)" | ✅ UPDATE | ✅ aucune occurrence dans `app/src` |

---

## FIX #1 — Mycotoxines OTA + Fumonisines

### Migrations DB
Migration `20260522000100_polish_c_conformite.sql` :

- `ALTER TABLE lots_matieres_premieres ADD COLUMN analyse_ochratoxine_a_ppb numeric(8,2)` (commentaire seuil ≤ 50 ppb)
- `ALTER TABLE lots_matieres_premieres ADD COLUMN analyse_fumonisine_ppb numeric(10,2)` (commentaire seuil ≤ 5000 ppb)
- `DROP COLUMN conforme` puis recréation `GENERATED ALWAYS AS (… 5 toxines …) STORED` — pas de data perdue (colonne calculée).

### Vérif

```
column_name                | data_type | is_generated
---------------------------+-----------+--------------
analyse_ochratoxine_a_ppb  | numeric   | NEVER
analyse_fumonisine_ppb     | numeric   | NEVER
conforme                   | boolean   | ALWAYS
```

Expression GENERATED actuelle :

```
((analyse_aflatoxine_b1_ppb IS NULL OR analyse_aflatoxine_b1_ppb <= 20)
 AND (analyse_zearalenone_ppb IS NULL OR analyse_zearalenone_ppb <= 250)
 AND (analyse_don_ppb IS NULL OR analyse_don_ppb <= 900)
 AND (analyse_ochratoxine_a_ppb IS NULL OR analyse_ochratoxine_a_ppb <= 50)
 AND (analyse_fumonisine_ppb IS NULL OR analyse_fumonisine_ppb <= 5000))
```

### Front
**Page `/sanitaire/mycotoxines` non modifiée** (conformément au brief —
P2 polish). Elle affiche actuellement Afla B1 / ZEA / DON. Les deux
nouvelles colonnes `analyse_ochratoxine_a_ppb` et
`analyse_fumonisine_ppb` sont disponibles en base et prêtes à être
ajoutées dans une future PR (formulaire de saisie + colonnes table).

### Bonus
Le texte de R18 (`v_alertes_actives` — lot non analysé) a été mis à jour
pour mentionner toutes les toxines à analyser :
« Faire analyser aflatoxine B1, zéaralénone, DON, ochratoxine A,
fumonisines — risque sanitaire élevé en zone tropicale humide. »

---

## FIX #2 — Biosécurité : checklist persistante

### DB

Nouvelle table `biosecurite_audits` :

```
id                uuid PK uuid_generate_v4()
ferme_id          uuid NOT NULL REFERENCES fermes(id)
checklist_item_id uuid NOT NULL REFERENCES biosecurite_checklist(id)
statut            text NOT NULL CHECK (statut IN
                    ('conforme','non_conforme','non_evalue'))
date_audit        date NOT NULL DEFAULT CURRENT_DATE
observations      text
audite_par        uuid REFERENCES utilisateurs(id)
created_at        timestamptz DEFAULT now()
deleted_at        timestamptz
```

- Index : `(ferme_id, checklist_item_id, date_audit DESC)` + filtre `deleted_at IS NULL`.
- GRANT SELECT/INSERT/UPDATE sur `anon, authenticated`.

Vue `v_biosecurite_etat_actuel` (`security_invoker=true`) :
`SELECT DISTINCT ON (ferme_id, checklist_item_id) … ORDER BY ferme_id,
checklist_item_id, date_audit DESC, created_at DESC` — renvoie pour
chaque (ferme, item) le dernier audit enregistré, avec
catégorie/item/obligatoire/ordre joints depuis `biosecurite_checklist`.

### Front

`app/src/app/(app)/sanitaire/biosecurite/_actions.ts` :
- Ajout d'un Server Action `noterAuditBiosecurite(formData: FormData): Promise<void>`
- Validation `statut ∈ {'conforme','non_conforme','non_evalue'}`
- Récupère ferme courante (`fermes` table → fallback `DEMO_FERME_ID`)
- `INSERT INTO biosecurite_audits` + `revalidatePath('/sanitaire/biosecurite')`

`app/src/app/(app)/sanitaire/biosecurite/page.tsx` :
- Charge `biosecurite_checklist` + `v_biosecurite_etat_actuel` en parallèle.
- Fait la jointure côté code (Map par `checklist_item_id`) ; items
  jamais audités → `statut = 'non_evalue'`.
- Affiche, pour chaque point :
  - Badge coloré (`success` ✓ OK / `danger` ✗ Non conforme / `secondary` Non évalué)
  - Libellé + date du dernier audit s'il existe
  - Badge « Obligatoire » si `obligatoire = true`
  - 2 formulaires `<form action={noterAuditBiosecurite}>` avec
    `<input type="hidden">` + bouton `✓` / `✗` (variant ghost, sm).
- `aria-label` + `title` sur chaque bouton pour l'accessibilité.
- Suppression de l'import `AlertTriangle` désormais non utilisé.

### Vérif fonctionnelle

Test INSERT manuel :

```
INSERT 0 1
-- v_biosecurite_etat_actuel renvoie bien la ligne :
checklist_item_id                    | statut   | date_audit
-------------------------------------+----------+-----------
e94ca2f1-…                           | conforme | 2026-05-21
```

Test data ensuite supprimée. `biosecurite_audits` reste à 0 ligne.

---

## FIX #3 — Alerte R20 ISS trop long (>10 j)

### DB

`v_alertes_actives` réécrite intégralement (post-POLISH-A inclus) avec
une 20ᵉ branche UNION ALL `R20-iss-trop-long` :

```sql
SELECT 'R20-iss-trop-long', 'truie', sv.truie_id::text, a.tag,
       'moyenne',
       'Truie ' || a.tag || ' : ISS = ' || (CURRENT_DATE - sv.date_sevrage)
       || ' jours depuis le sevrage sans nouvelle saillie',
       'Intervalle sevrage-saillie > 10 j (cible 5-7 j). Vérifier détection
        chaleur, état corporel BCS, alimentation flushing.',
       '/cheptel/' || sv.truie_id::text, now(), a.ferme_id
FROM sevrages sv
  JOIN animaux a ON a.id = sv.truie_id AND a.statut='actif' AND a.deleted_at IS NULL
  LEFT JOIN saillies s ON s.truie_id = sv.truie_id
                       AND s.date_saillie > sv.date_sevrage
                       AND s.deleted_at IS NULL
WHERE sv.deleted_at IS NULL
  AND s.id IS NULL                              -- aucune saillie postérieure
  AND (CURRENT_DATE - sv.date_sevrage) > 10
  AND sv.date_sevrage = (
        SELECT max(sv2.date_sevrage) FROM sevrages sv2
        WHERE sv2.truie_id = sv.truie_id AND sv2.deleted_at IS NULL)
```

Le commentaire de vue indique désormais « 20 règles d'alertes métier
Smart Farm (POLISH-A : R19, POLISH-C : R20). »

### UI

`app/src/lib/alertes-regles.ts` :
- Commentaire d'en-tête `R01 → R19` → `R01 → R20`.
- 20ᵉ entrée ajoutée à la fin du catalogue, sans toucher aux 19
  précédentes :

```ts
'R20-iss-trop-long': {
  nom: 'ISS trop long (>10j)',
  description:
    'Intervalle sevrage→saillie supérieur à 10 jours (cible biologique 5-7 j) — détection chaleur ou BCS à vérifier.',
  gravite_default: 'moyenne',
  categorie: 'reproduction',
},
```

### Vérif

Plan d'exécution `EXPLAIN` sur `v_alertes_actives WHERE regle_id =
'R20-iss-trop-long'` renvoie bien un `Append` couvrant la nouvelle
branche.

Sur la DB démo actuelle (0 sevrage en base) la règle renvoie 0 ligne —
attendu. La requête n'a pas d'erreur.

`SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id`
toujours renvoie les règles actives : R10 (3), R17 (1), R18 (1). Les
autres n'ont pas de data déclenchante (cheptel démo limité).

---

## FIX #4 — Voie IM = "encolure (musculature massétère)"

### Recherche initiale

```
grep -rn "entre les côtes\|inter-cost\|intercostal" app/src/  → 0 hit
grep -rn "entre les côtes\|inter-cost\|intercostal" supabase/ → 1 hit
```

→ 1 seule occurrence trouvée : `supabase/migrations/20260520180001_protocoles_seed.sql`
ligne 43 (description du protocole Fer dextran).

### Fix DB

Dans la migration POLISH-C :

```sql
UPDATE protocoles_vaccinaux SET voie = 'IM (encolure)' WHERE voie = 'IM';
-- → UPDATE 8

UPDATE protocoles_vaccinaux
SET description = replace(description,
      'Injection unique J1-J3 entre les côtes.',
      'Injection unique J1-J3 en encolure (musculature massétère).')
WHERE description ILIKE '%entre les côtes%';
-- → UPDATE 1
```

Note : la table `protocoles_vaccinaux` n'a **pas** de colonne
`deleted_at` (vérifié dans `information_schema.columns`) — la clause
`AND deleted_at IS NULL` du brief a donc été retirée.

### Fix source (cohérence future install)

`supabase/migrations/20260520180001_protocoles_seed.sql` ligne 43
mise à jour :
- avant : `'… Injection unique J1-J3 entre les côtes.'`
- après : `'… Injection unique J1-J3 en encolure (musculature massétère).'`

Ainsi un futur reset DB partira d'un seed propre.

### Vérif

```
voie          | count
--------------+------
IM (encolure) |     8
Orale         |     1
SC            |     2
Topique       |     1

description for Fer dextran:
 [STANDARD] Prévention de l'anémie ferriprive du porcelet.
 Injection unique J1-J3 en encolure (musculature massétère).
```

Plus aucune occurrence de « entre les côtes » dans `app/src/` ni dans
les seeds. Les seules occurrences résiduelles sont dans la migration
POLISH-C elle-même (commentaires + cible de `replace()`) — légitime.

---

## Fichiers créés / modifiés

| Fichier | Action |
|---------|--------|
| `supabase/migrations/20260522000100_polish_c_conformite.sql` | **créé** (29 KB) |
| `supabase/migrations/20260520180001_protocoles_seed.sql` | modifié (1 ligne — seed Fer dextran) |
| `app/src/lib/alertes-regles.ts` | modifié (+ R20, en-tête R01→R20) |
| `app/src/app/(app)/sanitaire/biosecurite/_actions.ts` | modifié (+ `noterAuditBiosecurite` + types) |
| `app/src/app/(app)/sanitaire/biosecurite/page.tsx` | modifié (checklist interactive ✓/✗) |

---

## Vérifications finales (`PROCÉDURE` §5)

```
SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id ORDER BY regle_id;
→ R10-stock-critique(3), R17-eau-chute-importante(1), R18-lot-non-analyse(1)
  (la définition contient bien les 20 règles ; seules 3 ont des cibles dans la DB démo)

SELECT COUNT(*) FROM biosecurite_audits;
→ 0  (table créée, vide)

SELECT voie, COUNT(*) FROM protocoles_vaccinaux GROUP BY voie;
→ "IM (encolure)" (8), Orale (1), SC (2), Topique (1)
```

`npx tsc --noEmit -p tsconfig.json` → **0 erreur** (sortie vide).
`npm run build` **NON lancé** conformément au brief.

---

## Anti-pièges respectés

- ✅ Lecture de `pg_get_viewdef('v_alertes_actives')` POST-POLISH-A
  avant réécriture (R19 préservée).
- ✅ R20 ajouté dans `alertes-regles.ts` sans toucher R01-R19.
- ✅ `DROP/ADD COLUMN conforme` exécuté sur colonne GENERATED — testé,
  pas de data perdue.
- ✅ Table `biosecurite_checklist` **non supprimée** — la nouvelle
  table `biosecurite_audits` s'y joint via FK.
- ✅ Périmètre exclusif respecté : aucun fichier hors brief touché
  (nutrition-engine, sidebar, dashboard, autres pages métier
  intouchés).

---

## Suivi à prévoir (out-of-scope)

1. **Page front mycotoxines** (`/sanitaire/mycotoxines`) à enrichir
   pour saisie/affichage OTA + FUM (P2, future PR).
2. **Multi-tenant biosécurité** : `noterAuditBiosecurite` utilise
   actuellement `fermes LIMIT 1` ou `DEMO_FERME_ID`. À remplacer par
   `ferme_id` issu de la session utilisateur quand l'auth multi-fermes
   sera branchée.
3. **Soft-delete `biosecurite_audits`** : colonne `deleted_at` créée
   mais aucune action UI ne l'utilise encore — prête pour usage futur.
