# RAPPORT B10 — Module Mortalités avec motifs codifiés

**Statut** : LIVRÉ (NON appliqué en BDD — user via PAT).
**Mode** : caveman, 2-step confirmation OK.

## FAIT — 6 fichiers (1 SQL, 4 TSX/TS, 1 ligne nav)

### 1. Migration SQL — `supabase/migrations/20260527180000_mortalites.sql` (~145 lignes)
- **Enum** `motif_mortalite` : 12 valeurs codifiées V2 brief §3.3 (asphyxie, ecrasement, hypothermie, diarrhee, malformation, ppa_suspect, pneumonie, septicemie, cannibalisme, predateur, indetermine, autre). `DO $$ ... EXCEPTION duplicate_object` idempotent.
- **Table** `public.mortalites` (12 colonnes) :
  - `id uuid PK`, `ferme_id uuid NOT NULL FK fermes ON DELETE CASCADE`
  - `animal_id uuid NULL FK animaux ON DELETE SET NULL`
  - `bande_id uuid NULL FK bandes ON DELETE SET NULL` *(table bandes confirmée présente dans `20260523130000_phase_a_compat_legacy.sql` ligne 60)*
  - `nb_animaux int DEFAULT 1 CHECK (>0 AND <=1000)`
  - `motif motif_mortalite NOT NULL`, `motif_libre text`
  - `date_mortalite date DEFAULT current_date`, `observations text`
  - `declarer_user_id uuid FK auth.users ON DELETE SET NULL`, `created_at timestamptz`
- **3 CHECK contraintes** : (a) cible exclusive `(animal NOT NULL ∧ bande NULL ∧ nb=1) ∨ (animal NULL ∧ bande NOT NULL)`, (b) `motif='autre' → motif_libre IS NOT NULL ∧ length ≤200`, (c) `date ≤ current_date`.
- **4 index** : `(ferme_id, date_mortalite DESC)`, partiels `(animal_id)` et `(bande_id)`, `(motif)`.
- **RLS** : 4 policies (SELECT/INSERT/UPDATE/DELETE) via `ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid())` — pattern cohérent avec `formules_composants` 2026-05-24.
- **GRANTS** : SELECT/INSERT/UPDATE/DELETE TO authenticated + USAGE sequences.
- **Trigger** `tg_mortalite_marque_animal_mort` AFTER INSERT : si `animal_id IS NOT NULL` → UPDATE animaux SET statut='mort', deleted_at=now(), cause_sortie=motif, date_sortie=date_mortalite, destination='MORT'. Idempotent (`WHERE statut <> 'mort'`). SECURITY DEFINER + search_path. Évite double saisie.

### 2. Zod schemas — `app/(app)/mortalites/_schemas.ts` (~115 lignes)
- Exports : `MOTIFS_MORTALITE` (const tuple), `MotifMortalite` (type), `MOTIF_LABELS` (Record FR pretty), `CIBLE_VALUES`, `mortaliteSchema`, `DeclarerMortaliteInput/Parsed`.
- Zod **v4** syntaxe : `z.enum(values, { message: '...' })` (pas `errorMap`). `superRefine` pour règles métier (cible exclusive, motif_libre si autre, date ≤ today). `addIssue({ code: 'custom', path, message })` direct string (pas `ZodIssueCode.custom` deprecated).
- `nb_animaux` : `z.coerce.number().int().min(1).max(1000)`.

### 3. Server action — `_server-actions.ts` (~85 lignes)
- `declarerMortalite(input)` → `{ ok, id } | { ok: false, error }`.
- Étapes : safeParse Zod → `auth.getUser()` → resolve `ferme_id` via `user_farms` (limit 1 + ordre `created_at ASC` cohérent avec `current_farm_id()`) → INSERT mortalites avec payload normalisé (animal_id/bande_id selon cible, motif_libre trim si autre, observations nullable).
- `revalidatePath` : `/mortalites`, `/cheptel`, `/dashboard`, `/alertes`.
- Pas de gestion idempotency_key (action déclarative manuelle, pas batch).

### 4. Dialog confirmation 2-step — `_dialog-mortalite.tsx` (~370 lignes)
- **Step 1** : `Dialog` formulaire (radio cible animal/bande, select animaux ou bande+nb, dropdown motif 12 enum, motif_libre conditionnel, DatePicker max=today, textarea observations, bouton "Déclarer mortalité" rouge danger).
- **Step 2** : `AlertDialog` (Radix) avec récap (cible / motif / date / nb) + bouton confirm "Oui, déclarer" rouge.
- Bouton "Lot/bande" **désactivé** si `bandesAvailable=false` (graceful si table vide ou inaccessible).
- `useForm<DeclarerMortaliteInput>` + `zodResolver(...) as never` (pattern existant `_dialog-visite.tsx`).
- Toast `sonner` succès/erreur, `reset()` post-success.

### 5. Page liste — `page.tsx` (~360 lignes, Server Component)
- **KPI header** (3 cards) : Total YTD (Σ nb_animaux), Mois courant, Top 3 motifs YTD (barre progress %).
- **Filtres** form GET : `?motif=<enum>&mois=YYYY-MM` (whitelist validation).
- **Tableau** 5 cols : Date · Cible (animal nom+tag OU bande code+nom, badge "Individuel"/"Masse") · Motif (Badge danger + motif_libre si autre) · Nb · Observations.
- **Pagination** 50/page via `?page=N`.
- **Empty state** ton "good" : "Aucune mortalité enregistrée — bonne nouvelle".
- **Bandes graceful** : try/catch sur `from('bandes')` → si erreur ou tableau vide → `bandesAvailable=false` → bouton Lot/bande disabled au lieu de crash.
- Animaux filtre `statut='actif' ∧ deleted_at IS NULL` (règle brain #9).
- `?action=new` → ouvre dialog auto (pattern cohérent mises-bas).

### 6. Sidebar nav — `components/sidebar.tsx` (1 ligne ajoutée + 1 import)
- Import : `Skull` ajouté à la liste lucide-react existante (avant `Zap`).
- Ligne ajoutée APRÈS `/mises-bas` dans groupe `Élevage` (note : casse "Élevage" pas "ÉLEVAGE" — observé dans le fichier).
- `{ href: '/mortalites', label: 'Mortalités', icon: Skull, group: 'Élevage' }`.
- **Aucune autre modif** sur sidebar.tsx (les 13 autres entrées Hermes S6 intactes).

## VÉRIFS

### tsc --noEmit
**NON exécuté** : permission Bash refusée par sandbox sur `npx tsc` / appel direct binaire / Monitor. Aucun fallback disponible.

**Audit manuel statique** réalisé :
- Zod v4 syntaxe `z.enum(values, { message })` confirmée vs autres fichiers (`alertes/_server-actions.ts`).
- `zodResolver(...) as never` pattern conforme `_dialog-visite.tsx`.
- `Skull` icon présent dans `lucide-react.d.ts` (vérifié).
- Badge variant `danger` confirmé (`badge.tsx` ligne 42).
- EmptyState `tone="good"` confirmé (`empty-state.tsx` ligne 13).
- DialogTrigger `render={trigger as any}` pattern conforme `_dialog-mise-bas.tsx`.
- Jointure Supabase relationnelle `animal:animal_id(...)` cohérente avec `pesees/page.tsx`, `mises-bas/page.tsx`.
- `categorie` colonne `animaux` confirmée (`genesis.sql` ligne 344).
- `setValue('nb_animaux', 1)` typage OK (z.coerce.number accepte number).

**Risque résiduel** : possible warning TS sur cast Zod superRefine output, mitigé par `as never` resolver. À valider au prochain `npx tsc` user.

### Smoke prod / build
NON exécutés (mode caveman, hors périmètre brief).

## NOTES

### Cohérence DB
- Migration vise schéma local (`fermes`, `animaux`, `bandes` via migrations 23-05). **MCP Supabase pointe sur une instance live qui ne contient AUCUNE de ces tables** (uniquement schéma legacy `farms`, `batches`, `porcelets_individuels`, etc.). **Avant `apply_migration` PAT**, valider : (a) migration `genesis` appliquée ; (b) migration `phase_a_compat_legacy` appliquée ; sinon FK animaux/bandes/fermes pétera.
- Compte test `demo@smartfarm.group` (ferme isolée).

### Bandes graceful
Brief : "Si table bandes existe → utilise FK. Si absente → cible Animal only avec note rapport."
**Implémenté en 2 niveaux** :
1. SQL : FK `bandes(id)` créée — partira en erreur si table inexistante.
2. UI : graceful try/catch → bouton "Lot/bande" disabled + tooltip "Conduite en bandes non configurée".

### Anti-pièges respectés
- Vocabulaire strict "Mortalité" (jamais "Décès"/"Mort").
- 2-step confirmation : Dialog → AlertDialog avec récap.
- Pas d'export PDF MIRAH (hors scope).
- Pas de toast bruyant si bandes absente (juste désactivation discrète).

## LIVRABLES (chemins absolus)
1. `/Users/13mac/smartfarm/supabase/migrations/20260527180000_mortalites.sql`
2. `/Users/13mac/smartfarm/app/src/app/(app)/mortalites/_schemas.ts`
3. `/Users/13mac/smartfarm/app/src/app/(app)/mortalites/_server-actions.ts`
4. `/Users/13mac/smartfarm/app/src/app/(app)/mortalites/_dialog-mortalite.tsx`
5. `/Users/13mac/smartfarm/app/src/app/(app)/mortalites/page.tsx`
6. `/Users/13mac/smartfarm/app/src/components/sidebar.tsx` (diff minimal : 1 import + 1 ligne nav)

## ACTIONS USER
1. `npx tsc --noEmit -p app/tsconfig.json` (Bash sandbox m'a refusé).
2. `npm run build` (optionnel pré-commit).
3. **APPLIQUER MIGRATION** : `supabase migration push` OU via Management API PAT — **ne PAS l'avoir fait fait partie du brief**.
4. Smoke `/mortalites` route — vérifier KPI s'affichent à 0 et empty state "bonne nouvelle".
5. Test déclaration individuelle avec compte `demo@smartfarm.group` → vérifier que l'animal bascule `statut=mort` côté `/cheptel`.
