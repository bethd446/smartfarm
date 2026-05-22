# C — Robustesse Data

> Audit Sprint 1 Lot C — Smart Farm | App multi-users (plusieurs éleveurs, même ferme).
> Risque ZÉRO perte données. Périmètre : 20 fichiers Server Actions `(app)/**/_(server-)?actions(.ts|-*.ts)`.

## Score global **3.5/10**

**Verdict** : code propre côté validation Zod, mais **architecture transactionnelle absente**. 2 P0 prouvés par test concurrent (race condition sur `saillies`, lost update sur `matieres_premieres.stock_actuel`). Le mode mono-utilisateur démo masque les bugs ; **dès le 2ᵉ user simultané, perte de données garantie**. À ne PAS mettre en prod multi-éleveurs en l'état.

---

## Server Actions auditées

| Fichier | Action(s) | Idempotent | Transaction | Revalidate | Risque | Reco P0/P1/P2 |
|---|---|---|---|---|---|---|
| `reproduction/_server-actions.ts` | `creerSaillie`, `creerDiagnostic` | ❌ | ❌ (INSERT + trigger SQL) | ✅ 3 paths | **Doublon saillie même jour** + diagnostic dupliqué | **P0** unique idx `(truie_id, date_saillie)` |
| `mises-bas/_server-actions.ts` | `creerMiseBas`, `creerSevrage` | ❌ | ❌ (SELECT-then-INSERT, 2 round-trips) | ✅ | 2 MB sur même saillie possibles ; race avec creerSaillie | **P0** unique idx `(saillie_id)` MB |
| `cheptel/_server-actions.ts` | `creerAnimal` | ❌ (pas d'UPSERT sur `tag`) | ❌ | ✅ | Tag dupliqué intra-ferme | **P1** unique idx `(ferme_id, tag) WHERE deleted_at IS NULL` |
| `cheptel/[id]/_actions.ts` | `saisirBcsRapide` | ❌ (chaque tap = 1 row) | ❌ | ✅ | Spam BCS par double-tap mobile | **P2** debounce client + dedup last 30s |
| `pesees/_server-actions.ts` | `creerPesee` | ❌ | ❌ | ✅ 1 seul path | Pesée dupliquée | **P2** unique idx `(animal_id\|bande_id, date_pesee)` |
| `bandes/[id]/_actions.ts` | `sexerBande`, `transitPhase` | ❌ | ❌ (**boucle for UPDATE 1-by-1**) | ✅ | **`sexerBande` non-atomique** : crash mid-loop laisse bande à moitié sexée. `transitPhase` UPDATE bandes après INSERT sans rollback. | **P0** wrap dans `rpc()` PG ou bulk update |
| `sanitaire/_server-actions.ts` | `creerVaccination`, `creerTraitement`, `creerMortalite` | ❌ | ❌ (**INSERT + UPDATE animaux en 2 étapes**) | ✅ | Mortalité enregistrée + statut animal pas mis à jour → animal "vivant" dans cheptel mais mort en mortalités. Le code remonte ok:false mais l'INSERT est déjà commité. | **P0** RPC PG transactionnel `enregistrer_mortalite()` |
| `sanitaire/biosecurite/_actions.ts` | `enregistrerVisite`, `noterAuditBiosecurite` | ❌ | ❌ | ✅ | Audit checklist : pas de UPSERT, chaque clic = row | **P1** UPSERT sur `(ferme_id, checklist_item_id, date_audit)` |
| `sanitaire/calendrier/_actions.ts` | `enregistrerVaccinDepuisCalendrier`, `marquerEvenementFait` | ❌ (**double-clic = 2 vaccins**) | ❌ | ✅ | `marquerEvenementFait` UPDATE sans check du statut courant → re-clic après réseau lent = double action côté trigger downstream | **P0** check `WHERE statut='prevu'` avant update + idempotency_key |
| `sanitaire/calendrier/_actions-porcelets.ts` | `marquerActePorceletFait` | ❌ | ❌ | ✅ | Double-tap mobile = 2 vaccinations porcelets enregistrées | **P0** idempotency key côté form |
| `sanitaire/ppa/_actions.ts` | `enregistrerObservationPPA` | ❌ | ❌ | ✅ | Observation OIE dupliquée si réseau lent | **P1** idempotency token |
| `sanitaire/mycotoxines/_actions.ts` | `enregistrerLotMatierePremiere` | ❌ (pas unique sur reference_lot) | ❌ | ✅ | Même lot saisi 2×, FIFO cassé | **P1** unique `(ferme_id, matiere_id, reference_lot)` |
| `sanitaire/eau/_actions.ts` | `enregistrerConsoEau` | ✅ partiel (gère `23505`) | ❌ | ✅ | OK — gère doublon proprement | **P2** étendre ce pattern aux autres |
| `sanitaire/protocoles/_actions.ts` | `creer/modifier/basculer/supprimer/reinitialiser` | ❌ | ❌ (DELETE puis re-seed via RPC) | ✅ | `reinitialiser` : si crash entre DELETE et seed → catalogue vide | **P0** wrap reset dans transaction SQL |
| `alimentation/matieres/_actions.ts` | 5 actions + `ajouterStockMatiere` | ❌ | ❌ (**SELECT-then-UPDATE stock**) | ✅ | **Lost update stock confirmé en test** | **P0** `UPDATE … SET stock_actuel = stock_actuel + $delta` (atomic) |
| `alimentation/formulation/_actions.ts` | `creerFormulation` | ❌ | ✅ **RPC PG `creer_formulation_complete`** | ✅ | OK — seul cas avec vraie transaction | **P2** étendre ce pattern partout |
| `alimentation/consommations/_actions.ts` | `creerConsommation`, `modifierConsommation`, `supprimerConsommation` | ❌ | ❌ | ✅ | Consommation dupliquée si double-submit | **P1** unique `(bande_id, type_aliment_id, date)` |
| `alimentation/plans/_actions.ts` | `creerPlan`, `modifierPlan`, `supprimerPlan` | ❌ | ❌ | ✅ | Plan recouvrant période existante = pas détecté | **P2** EXCLUDE constraint tsrange |
| `stock/_server-actions.ts` | `creerEntreeStock`, `creerSortieStock`, `creerMatiere` | ❌ | ❌ (**INSERT mvt + SELECT-then-UPDATE stock**) | ✅ | **P0 lost update prouvé en test** + INSERT mouvement OK mais UPDATE échoue → stock désynchro silencieuse | **P0** RPC PG `appliquer_mouvement_stock()` avec `FOR UPDATE` |
| `kpi/_actions-pdf.ts` | (PDF gen, read-only) | n/a | n/a | n/a | OK | — |

**Synthèse** : 0/20 actions sont vraiment transactionnelles côté JS. 1/20 utilise un RPC PG transactionnel (`creer_formulation_complete`). 19/20 sont des INSERT/UPDATE séquentiels chaînés via Supabase JS = autant de points de panne mid-action.

---

## Risques P0 (perte données possible)

### P0-1 — Race condition `saillies` : doublons sur même truie/jour ✅ REPRODUIT

**Scénario** : Christophe et l'ouvrier ouvrent tous deux la fiche T-001 sur mobile. Tous deux saisissent la saillie du jour. Réseau lent → les 2 forms partent en parallèle.

**Test** :
```bash
# 2 INSERT parallèles via xargs -P 2 sur même truie/date
echo "A
B" | xargs -P 2 -I {} bash /tmp/sail_parallel.sh {}
```
**Résultat** :
```
a2d0c105-…|TEST-AUDIT-CONCURRENT-B   INSERT 0 1
0122395b-…|TEST-AUDIT-CONCURRENT-A   INSERT 0 1
```
→ **2 saillies créées sur T-001 le 2030-01-15**. Aucune unique key. Trigger `saillie_planifier_diagnostics` se déclenche 2× → **2 diagnostics J+15/J+28 dupliqués**, KPI ISSF faussé, calendrier pollué.

**Impact** : KPI techniques (taux mise-bas, ISSF, productivité numérique) tous biaisés. Détection a posteriori = analyse manuelle dans `audit_logs`.

**Fix P0** :
```sql
CREATE UNIQUE INDEX idx_saillies_unique_actives 
ON saillies (truie_id, date_saillie) 
WHERE deleted_at IS NULL;
```
Côté action : catcher code `23505` et retourner message FR "Saillie déjà enregistrée pour cette truie aujourd'hui".

---

### P0-2 — Lost update `matieres_premieres.stock_actuel` ✅ REPRODUIT

**Scénario** : 2 sorties stock simultanées (Christophe distribue tourteau au porcherie A, ouvrier au porcherie B, même seconde).

**Test** : `python3 /tmp/stock_race.py`
```
BEFORE: 1800
[A] read old=1800.0
[B] read old=1800.0
[A] wrote new=1790.0
[B] wrote new=1790.0
AFTER: 1790.0
VERDICT: LOST UPDATE CONFIRMED
```
**10 kg de tourteau disparaissent du compteur** (mais les 2 mouvements_stock sont enregistrés). À l'échelle d'une ferme avec 5 utilisateurs, **dérive stock chronique**.

**Pire** : `creerSortieStock` insère le mouvement AVANT d'écrire le stock. Si l'UPDATE foire après le INSERT, mouvement orphelin → stock affiché ≠ Σ mouvements.

**Fix P0** :
```sql
-- RPC atomique
CREATE FUNCTION appliquer_sortie_stock(p_mat uuid, p_qte numeric, p_date date, p_bande uuid, p_ref text, p_obs text)
RETURNS json LANGUAGE plpgsql AS $$
DECLARE v_stock numeric;
BEGIN
  SELECT stock_actuel INTO v_stock FROM matieres_premieres WHERE id=p_mat FOR UPDATE;
  IF v_stock < p_qte THEN RAISE EXCEPTION 'stock_insuffisant'; END IF;
  INSERT INTO mouvements_stock(matiere_id,type,date_mvt,quantite,bande_id,reference,observations)
    VALUES(p_mat,'sortie',p_date,p_qte,p_bande,p_ref,p_obs);
  UPDATE matieres_premieres SET stock_actuel = stock_actuel - p_qte WHERE id=p_mat;
  RETURN json_build_object('ok',true);
END;$$;
```
Côté action : 1 seul `supabase.rpc('appliquer_sortie_stock', {...})`.

---

### P0-3 — `creerMortalite` : INSERT commité, UPDATE animal échoue → animal "zombie"

**Code incriminé** (sanitaire/_server-actions.ts:99-111) :
```ts
const { error } = await supabase.from('mortalites').insert(payload)
if (error) return { ok: false, error: error.message }
if (parsed.data.animal_id) {
  const { error: updErr } = await supabase.from('animaux').update({ statut: 'mort' }).eq('id', parsed.data.animal_id)
  if (updErr) return { ok: false, error: `Mortalité enregistrée mais statut animal non mis à jour : …` }
}
```
**Scénario** : INSERT mortalité OK → réseau coupe → UPDATE animal échoue. UI affiche erreur, **l'éleveur clique "Réessayer"** → nouveau INSERT mortalité → animal mort en double, statut toujours "vivant" affiché.

**Fix P0** : RPC `enregistrer_mortalite(payload)` qui fait les 2 dans une transaction PG. Si UPDATE échoue → ROLLBACK INSERT.

---

### P0-4 — `marquerEvenementFait` non-idempotent

**Code** :
```ts
await supabase.from('evenements_prevus')
  .update({ statut: 'realise', date_realisation: today })
  .eq('id', event_id)
```
**Pas de garde** sur statut courant. Si l'éleveur double-clique (mobile + réseau lent), 2ᵉ appel passe → cascade : triggers downstream peuvent ré-instancier evt aval. Pour vaccin depuis calendrier (`enregistrerVaccinDepuisCalendrier`) : **2ᵉ clic = 2ᵉ ligne `vaccinations`** = sur-vaccination tracée → conséquence sanitaire réelle.

**Fix P0** :
```ts
.update({ statut: 'realise', date_realisation: today })
.eq('id', event_id)
.eq('statut', 'prevu')   // GUARD : ne touche que si encore prévu
// Si 0 row updated → retourne déjà fait, pas d'erreur, idempotent ✓
```
+ `idempotency_token` (UUID client) dans `vaccinations`/`traitements` avec unique idx.

---

### P0-5 — `sexerBande` boucle non-atomique

**Code** (bandes/[id]/_actions.ts:33-53) :
```ts
await s.from('bandes').update({ sexee: true }).eq('id', bande_id)
const { data: animaux } = await s.from('bande_animaux').select(...).eq('bande_id', bande_id)
for (const ba of animaux) {
  await s.from('bande_animaux').update({ sous_groupe: sexe }).eq(...)
}
```
**Scénario** : 40 animaux, crash réseau au 20ᵉ. Bande marquée `sexee=true`, 20 lignes ont `sous_groupe`, 20 sont NULL. Pas de mécanisme de reprise. Re-lancer l'action ne corrige pas (premier UPDATE `sexee=true` est passé, donc UI affiche "déjà sexée").

**Fix P0** : RPC PG `sexer_bande(p_bande uuid)` qui fait tout en SQL en une seule passe :
```sql
UPDATE bande_animaux ba SET sous_groupe = a.sexe::text
FROM animaux a WHERE ba.animal_id=a.id AND ba.bande_id=p_bande AND ba.date_sortie IS NULL;
UPDATE bandes SET sexee=true WHERE id=p_bande;
```

---

### P0-6 — `reinitialiserProtocolesStandards` / `reinitialiserMatieresStandards` non-transactionnel

**Code** : appelle 2 RPC à la suite (matieres + concentres). Si la 1ʳᵉ réussit et la 2ᵉ échoue → catalogue partiel. Pas de reset propre possible.

**Fix P0** : 1 seul RPC `reinitialiser_catalogues(p_ferme)` qui wrappe les 2 seeds dans une transaction.

---

### P0-7 — `service_role` partout = RLS bypassé, multi-tenant cassé

**Constat** : Les 20 fichiers utilisent `SUPABASE_SERVICE_ROLE_KEY` (mode admin DB, RLS ignorée). 11 fichiers hardcodent `DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'`.

**Risque** : Le jour où on passe en multi-fermes (objectif business), TOUT INSERT créera des rows pour la ferme démo. Et `creerAnimal` peut écraser/lister des données d'autres fermes.

**Fix P0** : passer en client SSR avec session utilisateur :
```ts
import { createClient } from '@/lib/supabase/server'  // wrapper SSR
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// RLS prend le relais via current_farm_id()
```
La policy RLS sur `saillies` exige déjà `current_user_role() != 'viewer'` et `current_farm_id() = a.ferme_id` → tout est prêt, il suffit d'arrêter d'utiliser service_role.

---

### P0-8 — Aucune `updated_at` / `version` → optimistic concurrency impossible

**Constat** : seul `animaux` a un `updated_at`. Aucune table n'a de colonne `version`. Donc même si on voulait, on **ne peut pas** détecter "ta version est obsolète, recharge".

**Scénario** : Christophe édite la fiche T-001 (catégorie cochette → truie). Pendant qu'il édite, ouvrier change date_naissance. Christophe valide → écrase la date_naissance avec l'ancienne valeur du form.

**Fix P0** : Ajouter `updated_at timestamptz DEFAULT now()` + trigger `BEFORE UPDATE` sur les 11 tables critiques + version-check côté Server Action (`.eq('updated_at', form_updated_at)`).

---

### P0-9 — Triggers audit incomplets : 9/43 tables tracées

Tables avec `audit_*` trigger : animaux, bandes, departs, mises_bas, mortalites, mouvements_stock, saillies, sevrages, traitements (= 9).

**Manquent** : vaccinations, observations_bcs, consommations_aliment, consommations_eau, biosecurite_audits, ppa_observations, lots_matieres_premieres, matieres_premieres (UPDATE stock !), plans_alimentation, evenements_prevus (statut realise sans trace), pesees, formulations, ingredients_formulation, transits_phase…

**Risque** : impossibilité forensique en cas de litige (sur-vaccination, perte stock, fraude saisie eau).

**Fix P1** : généraliser `trigger_audit_log()` sur les 30+ tables manquantes.

---

### P0-10 — Pas de retry / pas d'idempotency key côté form

**Constat** : aucun form ne passe un UUID client (idempotency token). Si le user clique "Enregistrer" et le réseau timeout en attendant la réponse, il re-clique → 2 INSERT. Aucun moyen pour le serveur de détecter "déjà vu cet UUID".

**Fix P0** : ajouter colonne `client_request_id uuid UNIQUE` sur les 12 tables critiques + `crypto.randomUUID()` dans chaque form + Server Action qui SELECT puis INSERT si nouveau.

---

## Tests concrets exécutés

### Test 1 — Doublons saillie concurrents ✅ BUG CONFIRMÉ
```bash
$ cat /tmp/sail_parallel.sh
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c "
INSERT INTO saillies (ferme_id, truie_id, date_saillie, methode, observations)
VALUES ('00000000-0000-0000-0000-000000000001','33333333-0000-0000-0000-000000000001',
        '2030-01-15','naturelle','TEST-AUDIT-CONCURRENT-$1') RETURNING id, observations;"

$ echo "A
B" | xargs -P 2 -I {} bash /tmp/sail_parallel.sh {}
a2d0c105-cba2-43fe-9551-4c1322a7069e|TEST-AUDIT-CONCURRENT-B
INSERT 0 1
0122395b-fdeb-4073-9b7e-7e4eab27096e|TEST-AUDIT-CONCURRENT-A
INSERT 0 1
```
→ 2 rows insérées, **aucune contrainte unique ne s'oppose**.

### Test 2 — Lost update stock_actuel ✅ BUG CONFIRMÉ
```python
# /tmp/stock_race.py — 2 threads, pattern Server Action exact
BEFORE: 1800
[A] read old=1800.0
[B] read old=1800.0
[A] wrote new=1790.0
[B] wrote new=1790.0
AFTER: 1790.0
EXPECTED if no race: 1780 | LOST UPDATE if: 1790
VERDICT: LOST UPDATE CONFIRMED
```
→ 10 kg perdus du compteur. 2 lignes `mouvements_stock` insérées correctement mais stock désynchronisé.

### Test 3 — Audit schéma
```sql
SELECT table_name, has_soft_delete, has_updated_at, has_version FROM …
```
| Table | deleted_at | updated_at | version |
|---|---|---|---|
| animaux | ✅ | ✅ | ❌ |
| saillies / mises_bas / sevrages | ✅ | ❌ | ❌ |
| matieres_premieres | ✅ | ❌ | ❌ |
| consommations_aliment | ❌ | ❌ | ❌ |
| observations_bcs | ❌ | ❌ | ❌ |
| 7 autres tables critiques | ✅ | ❌ | ❌ |

→ Optimistic concurrency impossible (pas de version/updated_at sur 11/12 tables critiques).

### Test 4 — RPC PG transactionnels existants
```sql
SELECT proname FROM pg_proc WHERE proname IN (...)
```
→ 1 seule fonction transactionnelle écriture : `creer_formulation_complete`. Les `seed_*` ne sont pas idempotents (re-seed = doublons).

### Cleanup
```sql
DELETE FROM saillies WHERE observations LIKE 'TEST-AUDIT-%';  -- 2 rows
UPDATE matieres_premieres SET stock_actuel=1800 WHERE id='88888888-…002';  -- reset
```
✅ État restauré.

---

## Patterns à implémenter (priorisé)

### 1. Idempotency keys (P0, applicable globalement)
Migration :
```sql
ALTER TABLE saillies ADD COLUMN client_request_id uuid;
CREATE UNIQUE INDEX idx_saillies_request ON saillies(client_request_id) WHERE client_request_id IS NOT NULL;
-- idem pour: vaccinations, traitements, mortalites, mises_bas, sevrages,
-- mouvements_stock, consommations_aliment, biosecurite_audits, ppa_observations,
-- pesees, observations_bcs
```
Côté form :
```tsx
<input type="hidden" name="client_request_id" defaultValue={crypto.randomUUID()} />
```
Server Action : catch code `23505` sur ce champ → renvoyer succès silencieux (vrai idempotent).

### 2. Optimistic concurrency (P0, tables éditables)
```sql
ALTER TABLE animaux ADD COLUMN version int NOT NULL DEFAULT 1;
ALTER TABLE saillies ADD COLUMN version int NOT NULL DEFAULT 1;
-- + trigger BEFORE UPDATE: NEW.version = OLD.version + 1
```
Action UPDATE :
```ts
.update({ ..., version: form.version + 1 })
.eq('id', id).eq('version', form.version)
// si 0 rows → renvoyer "Conflit, recharger la fiche"
```

### 3. RPC transactionnels pour writes multi-table (P0)
Pattern à étendre à partir de `creer_formulation_complete` :
- `enregistrer_mortalite(payload jsonb)` — INSERT mortalité + UPDATE animal statut atomiquement
- `appliquer_mouvement_stock(payload jsonb)` — `FOR UPDATE` + INSERT + UPDATE stock atomique
- `sexer_bande(p_bande uuid)` — SQL en 2 UPDATE pas une boucle JS
- `marquer_evenement_realise(p_id uuid, p_token uuid)` — idempotent + guard `statut='prevu'`
- `reinitialiser_catalogues(p_ferme uuid)` — wrap les 2 seeds

### 4. Unique constraints métier (P0/P1)
```sql
CREATE UNIQUE INDEX ON saillies (truie_id, date_saillie) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON mises_bas (saillie_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON sevrages (mise_bas_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON animaux (ferme_id, tag) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX ON consommations_aliment (bande_id, type_aliment_id, date);
CREATE UNIQUE INDEX ON lots_matieres_premieres (ferme_id, matiere_premiere_id, reference_lot);
CREATE UNIQUE INDEX ON pesees (COALESCE(animal_id::text, bande_id::text), date_pesee, type);
```
Les Server Actions catchent `23505` et renvoient un message FR clair.

### 5. Soft delete systématique + restore (P1)
Ajouter `deleted_at` sur `consommations_aliment`, `observations_bcs`. Toute action `supprimerX` → `UPDATE SET deleted_at=now()` au lieu de `DELETE`. Vue de listing : `WHERE deleted_at IS NULL`.

### 6. Audit log généralisé (P1)
Étendre `trigger_audit_log()` à : vaccinations, observations_bcs, consommations_*, biosecurite_audits, ppa_observations, lots_matieres_premieres, matieres_premieres, plans_alimentation, evenements_prevus, pesees, formulations, ingredients_formulation, transits_phase. **Spécialement** sur UPDATE stock_actuel et UPDATE evenements_prevus.statut.

### 7. Abandon de `service_role` côté Server Actions (P0 business)
Remplacer `createClient(URL, SERVICE_ROLE)` par wrapper SSR avec session user. RLS prend le relais. Plus de `DEMO_FERME_ID` hardcodé. Multi-tenant réel.

### 8. Pattern recovery / retry côté UI (P1)
- Form submit → useTransition + retry exponentiel sur erreur réseau 3 fois max
- Si toujours échec → stockage local du payload dans IndexedDB + flag "à resynchroniser"
- Banner global "X actions en attente de sync"

### 9. Trigger DB pour stock auto (P1)
Plus simple que RPC : `AFTER INSERT ON mouvements_stock` qui ajuste `matieres_premieres.stock_actuel` directement. Élimine la double écriture côté JS. Atomique par construction.

---

## Decisions to escalate

1. **Go/No-Go prod multi-users**. En l'état actuel, **NO-GO**. Race conditions + lost updates **prouvés** sur 2 cas critiques (saillies, stock). Plan minimum avant prod :
   - P0-1 à P0-6 fixés (≈ 4 nouvelles migrations + 5 RPC PG)
   - Abandon `service_role` (P0-7) — mais demande wiring auth Supabase complet
   - Idempotency keys déployées sur 12 tables (P0-10)

2. **Choix architecture transactions** : 
   - **Option A** : RPC PG partout (recommandé — propre, transactionnel, performant)
   - **Option B** : Supabase Edge Functions avec `pg_transaction`
   - **Option C** : passage à un ORM Node avec gestion transaction (Drizzle/Kysely) — gros refactor
   → Recommandation : Option A, on a déjà le pattern qui marche (`creer_formulation_complete`).

3. **`updated_at` + `version`** : ajouter sur toutes les 12 tables critiques en un sprint dédié + invalider UI obsolète. Demande coordination front (formulaires doivent embarquer la version).

4. **Stratégie de tests** : il manque **toute** suite de tests concurrents. Recommander d'ajouter un dossier `tests/integration/race-conditions/` avec scripts pytest parallèles. Mes 2 tests bash/python (`/tmp/sail_parallel.sh`, `/tmp/stock_race.py`) peuvent servir de point de départ.

5. **Mode demo vs prod** : actuellement `SMARTFARM_DEMO_MODE` switch via env. La logique d'écriture en mode demo (service_role) ne devrait JAMAIS être réutilisable en prod. Séparer 2 fichiers d'action ou refuser ces actions si `SMARTFARM_DEMO_MODE=true` en prod. Critique pour ne pas mettre du code de démo en prod par inadvertance.

6. **Audit logs forensiques** : qui peut les consulter ? Combien de temps les garder ? RGPD applicable ? À cadrer avec Christophe.
