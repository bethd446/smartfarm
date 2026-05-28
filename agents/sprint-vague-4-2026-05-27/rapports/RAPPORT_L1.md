# RAPPORT L1 — B6 Bulk porcelets étendre

## Fait
- `app/src/app/(app)/cheptel/_porcelets-table-bulk.tsx` modifié (+41 lignes : 2 imports `Truck`/`Skull` + 2 imports dialogs + type `BatimentLite` + prop optionnelle `batiments`, 2 states `dialogTransfertOpen` / `dialogMortaliteOpen`, 2 boutons sticky bar avant "Changer le stade", 2 `<DialogXxxBatch>` montés en fin de section). 236 → 277 lignes.
- `app/src/app/(app)/cheptel/_dialog-transfert-batch.tsx` créé (195 lignes) : pattern `_dialog-changer-stade-batch.tsx`, champs Select bâtiment + Input date (max=today) + Textarea motif, branchement `transfererBatch()`, garde-fou MVP affiché si `batiments` vide (message + bouton Annuler uniquement, pas de fetch client).
- `app/src/app/(app)/cheptel/_dialog-mortalite-batch.tsx` créé (227 lignes) : Title danger + icône Skull, Input date_deces (max=today), Select motif (12 valeurs `MOTIFS_MORTALITE` du projet), Input conditionnel `motif_libre` si motif='autre', Textarea observations, checkbox confirmation obligatoire, bouton submit `bg-[--sf-danger-ink]`.
- `app/src/app/(app)/cheptel/_server-actions.ts` modifié (+345 lignes) : ajout `transfererBatch()` + `enregistrerMortaliteBatch()` avec schémas Zod, vérif bâtiment cross-ferme, filtres charte §10 r.9 (`statut='actif'` + `deleted_at NULL`), skip idempotent, blocage verrats, INSERT mouvements/mortalites batch, UPDATE animaux (transfert seul — mortalité gérée par trigger BDD `tg_mortalite_marque_animal_mort`), INSERT audit_log avec `batch_id` UUID + marker `action_type` dans `after_data`, revalidatePath multi-routes. 427 → 772 lignes.

## Vérifs (sorties grep réelles)
- `grep -c "DialogTransfertBatch\|DialogMortaliteBatch" app/src/app/(app)/cheptel/_porcelets-table-bulk.tsx` → **4** (attendu ≥ 2 ; import + usage × 2)
- `grep -c "export async function transfererBatch\|export async function enregistrerMortaliteBatch" app/src/app/(app)/cheptel/_server-actions.ts` → **2** (attendu 2)
- `grep -c "batch_id" app/src/app/(app)/cheptel/_server-actions.ts` → **19** (attendu ≥ 5 ; 7 pour changerStadeBatch, 6 pour transfererBatch, 6 pour enregistrerMortaliteBatch)
- `wc -l _dialog-transfert-batch.tsx _dialog-mortalite-batch.tsx` → **195 / 227** (attendu < 250)

## Divergences brief
- **Mortalité — vocabulaire colonnes** : le brief évoque `cause: enum(['maladie','accident','predation','inconnu','autre'])` et `date_deces`. La table `public.mortalites` (migration `20260527180000_mortalites.sql`) utilise `motif` (enum `motif_mortalite` à **12 valeurs** : asphyxie, ecrasement, hypothermie, diarrhee, malformation, ppa_suspect, pneumonie, septicemie, cannibalisme, predateur, indetermine, autre) + `date_mortalite`. J'ai utilisé le schéma BDD réel (`MOTIFS_MORTALITE` réexporté depuis `mortalites/_schemas.ts`) pour ne pas casser la CHECK constraint `chk_mortalite_motif_libre`. La signature publique reste `enregistrerMortaliteBatch({ ids, date_deces, motif, motif_libre?, observations? })` — `date_deces` mappé en `date_mortalite` côté INSERT.
- **Mortalité — pas de UPDATE animaux** : le trigger SQL `tg_mortalite_marque_animal_mort` (AFTER INSERT mortalites) bascule déjà `animaux.statut='mort' + deleted_at=now() + cause_sortie + date_sortie + destination='MORT'` quand `animal_id NOT NULL`. J'ai donc retiré l'étape 4 du brief (UPDATE animaux) pour éviter une double bascule et casser l'idempotence.
- **Enum `action_audit` ne contient PAS `TRANSFERT_BATCH` ni `MORTALITE_BATCH`** : migration `20260525215015_action_audit_stade_change.sql` n'a ajouté que `STADE_CHANGE` + `STADE_CHANGE_BATCH`. Brief interdit toute migration SQL. J'ai donc tracé en `action='UPDATE'` (valeur enum existante) + marker `action_type='TRANSFERT_BATCH'`/`'MORTALITE_BATCH'` + `batch_id` dans `after_data` JSONB. Trade-off : queries audit historique devront filtrer sur `after_data->>'action_type'` au lieu de `action`.
- **Table `mouvements` ne contient PAS de colonne `batch_id`** : le `batch_id` n'est porté que dans `audit_log.before_data/after_data` (jsonb). Recoupement transfert ↔ audit possible via `animal_id + date_mouvement`.

## TODO orchestrateur
- Câbler prop `batiments` côté `app/src/app/(app)/cheptel/page.tsx` : SELECT `batiments` (`id, nom, type`) filtré ferme + `deleted_at IS NULL` puis passer à `<PorceletsTableBulk batiments={...} />`. Sans ça, le bouton Transférer affiche le message d'erreur MVP.
- Lancer `npx tsc --noEmit` (interdit ici).
- (Optionnel) Migration future `ALTER TYPE action_audit ADD VALUE 'TRANSFERT_BATCH', 'MORTALITE_BATCH'` puis remplacer `action: 'UPDATE'` par les vraies valeurs dans les 2 nouvelles server actions.
- Smoke desktop + mobile sur compte demo : sélection multi porcelets → Transférer (vers bâtiment de la ferme demo) → vérifier mouvement créé + batiment_id mis à jour ; Mortalité (motif='diarrhee', confirmation cochée) → vérifier 1 ligne `mortalites` / animal + trigger bascule statut.
- Vérifier que la sticky bar à 3 boutons reste lisible mobile (h-10 px-4 + `flex-wrap` déjà en place).
