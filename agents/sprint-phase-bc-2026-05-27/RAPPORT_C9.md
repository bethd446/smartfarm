# RAPPORT C9 — Adoption / égalisation portées maternité

Date : 2026-05-27
Branche : `feat/phase-vague-3`
Mode : caveman (Opus 4.7 Max)
Brief : `agents/sprint-phase-bc-2026-05-27/briefs/C9_adoption_portees.md`

## TL;DR
Module Adoption livré. `tsc --noEmit` = 0 erreur. Migration prête, non appliquée
(le user l'applique via PAT). Périmètre strictement respecté.

## Livrables

| # | Fichier | Lignes | Statut |
|---|---|---|---|
| 1 | `supabase/migrations/20260527200000_adoptions.sql` | 158 | NEW — migration NON appliquée |
| 2 | `app/src/app/(app)/mises-bas/_schemas.ts` | +52 | PATCH (`adoptionSchema`, `MOTIFS_ADOPTION`) |
| 3 | `app/src/app/(app)/mises-bas/_server-actions.ts` | +115 | PATCH (`creerAdoption`) |
| 4 | `app/src/app/(app)/mises-bas/_dialog-adoption.tsx` | 290 | NEW (Client Component) |
| 5 | `app/src/app/(app)/mises-bas/page.tsx` | +120 | PATCH (bouton header + bouton inline + section 30j) |

Hors périmètre : 0 fichier touché (vérifié — autres routes, cheptel/[id], composants UI globaux intacts).

## Découvertes schéma (vs brief)
- **Pas de `porcelets_individuels`** en BDD. Porcelets restent **collectifs** au niveau portée (`mises_bas.nes_vivants`) jusqu'au sevrage où ils sont individualisés en `animaux` (cf `creerSevrage` ligne 157-172).
- **Décision** : adoption travaille sur compteur `mises_bas.nes_vivants` (source -=N, destination +=N) — pas sur lignes individuelles. C'est le bon niveau métier : avant sevrage, IFIP ne suit pas les porcelets unitairement.
- Conséquence : pas besoin de colonnes `mb_origine_id` / `mb_actuelle_id`. Si traçabilité fine post-sevrage demandée plus tard, possible via colonne `animaux.adoption_id` (post-V3).
- **Bug pré-existant détecté** (hors C9) : `creerSevrage` ligne 169 fait `portee_id: d.mise_bas_id` alors que FK `animaux.portee_id → portees.id` (pas `mises_bas.id`). Probablement masqué en prod par RLS/soft-fail. Pas dans mon périmètre — à traiter en sprint dédié.

## Migration SQL — points clés
- ENUM `motif_adoption` (5 valeurs codifiées zootech)
- Table `adoptions` avec FK `mb_source_id`, `mb_destination_id` + CHECK `mb_source <> mb_destination`
- CHECK `motif=autre → motif_libre obligatoire (≤200 char)`
- CHECK `date_adoption <= current_date`
- 2 triggers :
  - **BEFORE INSERT** `tg_adoption_valide_coherence` : `SECURITY INVOKER`, vérifie même ferme + capacité source (RAISE EXCEPTION sinon)
  - **AFTER INSERT** `tg_adoption_ajuste_compteurs` : `SECURITY DEFINER`, UPDATE compteurs `nes_vivants` source/destination
- RLS 4 policies (SELECT/INSERT/UPDATE/DELETE) via `user_farms` (pattern identique à `mortalites`)
- GRANT SELECT/INSERT/UPDATE/DELETE TO authenticated + USAGE sequences (anti-leçon S2 GRANT manquants)
- Index `(ferme_id, date_adoption DESC)`, `(mb_source_id)`, `(mb_destination_id)`

## Server action `creerAdoption`
- Validation Zod (réutilise `adoptionSchema`)
- Auth check + `current_farm_id()` RPC
- Pré-vérif métier (UI plus parlante qu'erreur trigger SQL) :
  - source/destination existent
  - même ferme
  - `nb_porcelets <= source.nes_vivants`
- INSERT → trigger SQL fait le reste
- `revalidatePath` : `/mises-bas`, `/cheptel`, `/dashboard`

## Dialog `_dialog-adoption.tsx`
- Select source (filtre allaitement ≤35j, non sevrée, calculé page.tsx)
- Select destination (idem, exclut source)
- Input nb_porcelets (max auto = source.nes_vivants, cap 20)
- Select motif (5 enum FR labellisés)
- Si `motif=autre` → input motif_libre obligatoire (≤200 char)
- Date adoption (max today)
- Aperçu impact temps réel : "Source 12 → 8 / Destination 4 → 8"
- **Alerte surcharge tétines** (>12 std) en jaune, **NE BLOQUE PAS** (cf brief : override possible)
- Bouton dynamique : "Transférer N porcelet(s)"

## Intégration page `/mises-bas`
- **Bouton header "ADOPTION"** : icône `ArrowLeftRight`, disabled si <2 portées allaitantes (avec tooltip explicatif)
- **Bouton inline par card portée** : "Adopter depuis cette portée" (preset source), uniquement si portée allaitante ≤35j ET ≥2 allaitantes dispo
- **Section "ADOPTIONS RÉCENTES (30j)"** : table compacte (Date / Source / Destination / Porcelets / Motif), n'apparaît que si ≥1 adoption
- **Best-effort SQL** : query `adoptions` wrappée try/catch → si table absente (avant application migration), section masquée silencieusement (pas de 500)

## Anti-pièges du brief respectés
- Adapté à `animaux.portee_id` (note : pas de `porcelets_individuels`) — décision : compteur portée, plus pertinent métier
- Cross-ferme bloqué par trigger BEFORE (double sécurité RLS + check explicite)
- Vocabulaire strict "Adoption", jamais "Croisement"
- Surcharge tétines alerte mais ne bloque pas (override UX éleveur)

## Validation
- `cd /Users/13mac/smartfarm/app && npx tsc --noEmit -p tsconfig.json` → **0 erreur**
- Hors périmètre vérifié : aucun fichier autre que les 5 livrables modifié
- `bandes` table : non utilisée (brief warn graceful) — adoption ne dépend pas de bandes

## À faire côté user
1. Appliquer migration via PAT Supabase :
   ```
   POST https://api.supabase.com/v1/projects/tpzhxjzwlxwujboboyit/database/query
   body: { "query": "<contenu de 20260527200000_adoptions.sql>" }
   ```
2. Vérifier ENUM créé : `SELECT enumlabel FROM pg_enum JOIN pg_type t ON t.oid=enumtypid WHERE typname='motif_adoption';` → 5 lignes
3. Smoke test UI : sur démo (`demo@smartfarm.group`), créer une adoption test entre 2 portées allaitantes, vérifier compteurs `nes_vivants` ajustés
4. Build prod (`npm run build`) avant push (j'ai pas lancé build, pas dans périmètre brief)

## Pas dans périmètre — backlog
- Fix `creerSevrage` ligne 169 (FK portee_id incohérence)
- Vue `v_adoptions_par_truie` pour stats annuelles éleveur
- Export CSV adoptions (peut être ajouté au composant `ExportButton` plus tard)
- Traçabilité individuelle porcelets post-sevrage (colonne `animaux.adoption_id` si jour besoin métier)
