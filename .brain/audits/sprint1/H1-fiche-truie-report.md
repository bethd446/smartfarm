# H1 — Fiche Reproducteur Truie

Sprint 2 Wave 2 · 24 mai 2026

## Migration appliquée

**Fichier** : `supabase/migrations/20260524100000_h1_fiche_truie.sql`

```text
BEGIN
ALTER TABLE                           -- animaux.photo_url TEXT
INSERT 0 1                            -- bucket animaux_photos (public=true)
CREATE POLICY (×4)                    -- storage.objects read/insert/update/delete
DROP VIEW / CREATE VIEW v_score_truie -- security_invoker = true
GRANT SELECT ON v_score_truie TO anon, authenticated, service_role
COMMIT
```

Contenu :
1. `ALTER TABLE animaux ADD COLUMN IF NOT EXISTS photo_url TEXT` — non destructif.
2. `INSERT INTO storage.buckets ('animaux_photos', public=true)` + 4 policies
   sur `storage.objects` (lecture publique anonyme, écriture pour `anon` +
   `authenticated` — pattern demo / wrapper service_role en SSR).
3. Vue `v_score_truie` (security_invoker=true) construite par-dessus
   `v_kpi_techniques_truie` (qui calcule déjà TMM hors écrasés cf. IFIP).

### Score composite IFIP (total 100)

| Poids | Sous-score   | Cible                | Source                                         |
|------:|:-------------|:---------------------|:------------------------------------------------|
| 30    | `sub_nv`        | NV / portée = 14    | `nes_vivants_moyen`                            |
| 20    | `sub_vitalite`  | vitalité = 13       | `nes_vivants - mort-nés` moyen                 |
| 25    | `sub_survie`    | survie 100 %        | `1 − tmm_pct/100` (TMM IFIP hors écrasés)      |
| 15    | `sub_issf`     | ISSF ≤ 8 j          | dégradé linéaire jusqu'à 30 j                  |
| 10    | `sub_longevite` | 8+ portées          | `nb_mises_bas` plafonné à 8                    |

Classement : `RANK() OVER (PARTITION BY ferme_id ORDER BY score DESC, nb_portees DESC)`
+ colonne `total_truies_ferme` (window count).

## Composants créés

| Fichier | Rôle |
|---|---|
| `src/components/animal-photo-upload.tsx` | Client component upload photo (preview optimiste, useTransition, validation taille + MIME, état error a11y `role=alert`). |
| `src/app/(app)/cheptel/[id]/genealogie/page.tsx` | Server page — arbre 3 générations (Sujet · Parents · 4 Grands-parents), cartes cliquables, placeholder "Inconnu" si parent_id null. |
| `src/app/(app)/cheptel/classement-truies/page.tsx` | Server page — classement complet ferme, médailles 🥇🥈🥉 top 3, bloc méthodologie de pondération, tableau avec photo miniature. |

## Server Actions ajoutées

`src/app/(app)/cheptel/[id]/_actions.ts`
- `saisirBcsRapide(formData)` — conservé.
- `uploadPhotoAnimal(formData)` — NOUVEAU. Valide taille ≤ 5 Mo + type `image/*`,
  upload `animaux_photos/<animal_id>/<timestamp>.<ext>`, UPDATE `animaux.photo_url`
  avec public URL, `revalidatePath('/cheptel/${animal_id}')`. Retourne
  `{ ok, error?, url? }`.

## Page `/cheptel/[id]` enrichie (NON réécrite)

Modifications additives uniquement :
- Import `AnimalPhotoUpload` + `uploadPhotoAnimal`.
- Bloc photo (h-40 w-40) injecté dans le header à gauche de l'identité.
- Badge classement `#X / N truies` (variant success, icône Trophy) cliquable →
  `/cheptel/classement-truies`.
- Bouton "Généalogie" dans la barre actions rapides (femelles uniquement).
- Nouvelle section "Score reproducteur (IFIP composite)" : score géant
  `XX.X / 100`, mention classement + 4 mini-cards (NV / Vitalité / Survie / Portées)
  avec sous-score `XX.X / Y pts`.

Toutes les sections existantes (KPI techniques v_kpi_techniques_truie, BCS,
historique portées décomposé, BCS 1-tap, QR) préservées intactes.

## Top truies (v_score_truie)

```
 classement |  tag  |  nom   | nb_portees | nes_vivants_moyen | vitalite | surv_hors_ecrases | score_global
------------+-------+--------+------------+-------------------+----------+-------------------+--------------
          1 | T-001 | Adjoa  |          1 |             12.00 |    11.00 |             0.923 |         67.0
          2 | T-002 | Akissi |          1 |             11.00 |    11.00 |             1.000 |         66.7
          3 | T-003 | Aya    |          0 |                   |          |                   |          0.0
```

Cheptel demo réduit (3 truies seed) → classement trivial mais cohérent.
T-003 sans portée tombe à 0 pts (longévité plafond non atteint, NV null, etc.).

## Routes nouvelles

- `/cheptel/[id]/genealogie` — arbre 3 générations responsive (12 col desktop, empilé mobile)
- `/cheptel/classement-truies` — classement IFIP + méthodologie + tableau complet

## Photo storage

- Bucket `animaux_photos` créé : `public=true`.
- 4 policies storage.objects pour `anon` + `authenticated`.
- Test (mock) : `uploadPhotoAnimal` valide
  - taille > 5 Mo → rejet (`"Photo trop volumineuse (max 5 Mo)"`)
  - MIME non image → rejet (`"Format non supporté (image uniquement)"`)
  - succès → UPDATE `animaux.photo_url` + revalidatePath.
- Path pattern : `animaux_photos/<animal_id>/<timestamp>.<ext>` (préserve historique
  car `upsert=false`).

## Typecheck

`npx tsc --noEmit` → 0 erreur (final).

## Issues bloquantes

Aucune. Routes nouvelles renvoient 404 sur le serveur standalone tant que
l'orchestrateur n'a pas exécuté `npm run build` (règle dure du sprint, build délégué).
Migration + vue + bucket sont actifs immédiatement côté DB.

## Fichiers livrés (6 ≤ max)

1. `supabase/migrations/20260524100000_h1_fiche_truie.sql` *(new)*
2. `app/src/app/(app)/cheptel/[id]/_actions.ts` *(enrichi · +uploadPhotoAnimal)*
3. `app/src/components/animal-photo-upload.tsx` *(new)*
4. `app/src/app/(app)/cheptel/[id]/genealogie/page.tsx` *(new)*
5. `app/src/app/(app)/cheptel/classement-truies/page.tsx` *(new)*
6. `app/src/app/(app)/cheptel/[id]/page.tsx` *(enrichi · photo + classement + score)*
