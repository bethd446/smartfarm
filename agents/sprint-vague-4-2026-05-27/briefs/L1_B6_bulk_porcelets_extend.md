# Brief L1 — B6 Bulk porcelets étendre

## TOI
Dev senior React/Next + Supabase. Tu étends un système bulk déjà partiellement implémenté.

## LIS D'ABORD (obligatoire, dans cet ordre)
1. `CLAUDE.md` (racine) — règles projet, charte 13 règles brain §10
2. `app/src/app/(app)/cheptel/_porcelets-table-bulk.tsx` — sticky bar bulk existante (236 lignes)
3. `app/src/app/(app)/cheptel/_dialog-changer-stade-batch.tsx` — pattern dialog bulk à répliquer (195 lignes)
4. `app/src/app/(app)/cheptel/_server-actions.ts` lignes 313-427 — `changerStadeBatch()` pattern audit_log batch + idempotence
5. `app/src/app/(app)/cheptel/_server-actions.ts` lignes 49-310 — `deplacerAnimal()` + `transfererTousVersCroissance()` pour pattern mouvements/batiment
6. `app/src/app/(app)/mortalites/_server-actions.ts` — pattern enregistrement mortalité unitaire à transposer en bulk
7. `app/src/app/(app)/mortalites/_schemas.ts` — Zod existant pour mortalité

## Périmètre
✅ Touche :
- `app/src/app/(app)/cheptel/_porcelets-table-bulk.tsx` (ajouter 2 boutons + 2 nouveaux dialog states)
- `app/src/app/(app)/cheptel/_dialog-transfert-batch.tsx` (NOUVEAU)
- `app/src/app/(app)/cheptel/_dialog-mortalite-batch.tsx` (NOUVEAU)
- `app/src/app/(app)/cheptel/_server-actions.ts` (ajouter `transfererBatch()` + `enregistrerMortaliteBatch()`)

❌ Touche pas :
- `_dialog-changer-stade-batch.tsx` (existant, ne RIEN modifier)
- `mortalites/*` (route + dialog mortalité unitaire restent intacts)
- `page.tsx` de cheptel (le table bulk est déjà câblé)
- Tout autre fichier hors `cheptel/`
- Aucune migration SQL (tables `mouvements`, `mortalites`, `animaux`, `audit_log` déjà en place)

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push, pas restart serveur.

## Contexte
Sticky bar existante a 1 bouton "Changer le stade". Bulk pattern validé (sélection multi via checkbox, sticky bar `bottom-16 lg:bottom-0 z-50`, dialog modal sf-primary, audit_log batch avec `batch_id` UUID partagé, idempotence skip silencieux).

Tu ajoutes **2 actions bulk supplémentaires** dans la même sticky bar :
- 🚚 Transférer bâtiment (déplacer N porcelets vers un même bâtiment)
- ☠️ Marquer mortalité (enregistrer décès en masse, ex : épisode maladie)

## Mission
1. Étendre `_porcelets-table-bulk.tsx` sticky bar : ajouter 2 boutons + 2 state `dialogXxxOpen`
2. Créer `_dialog-transfert-batch.tsx` (template = `_dialog-changer-stade-batch.tsx` adapté)
3. Créer `_dialog-mortalite-batch.tsx` (template = même adapté + champs cause + date)
4. Créer 2 server actions dans `_server-actions.ts` avec pattern audit_log batch idempotent

## Détails techniques

### Fix #1 — `_porcelets-table-bulk.tsx` sticky bar étendue

Ajouter imports en tête :
```tsx
import { Truck, Skull } from 'lucide-react'
import { DialogTransfertBatch } from './_dialog-transfert-batch'
import { DialogMortaliteBatch } from './_dialog-mortalite-batch'
```

Ajouter 2 states sous `const [dialogOpen, setDialogOpen] = useState(false)` :
```tsx
const [dialogTransfertOpen, setDialogTransfertOpen] = useState(false)
const [dialogMortaliteOpen, setDialogMortaliteOpen] = useState(false)
```

Dans la sticky bar (ligne ~205, juste avant le bouton "Changer le stade") ajouter :
```tsx
<button type="button" onClick={() => setDialogTransfertOpen(true)} className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--sf-line)] text-sm font-semibold text-[var(--sf-ink)] hover:bg-[var(--sf-surface-2)]/40"><Truck className="h-4 w-4" /> Transférer</button>
<button type="button" onClick={() => setDialogMortaliteOpen(true)} className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-[var(--sf-danger-border,#D89C92)] text-sm font-semibold text-[var(--sf-danger-ink,#7A2A1F)] hover:bg-[var(--sf-danger-bg,#F1D4CE)]/40"><Skull className="h-4 w-4" /> Mortalité</button>
```

En fin de composant (juste avant le `</section>` ou après `<DialogChangerStadeBatch ... />`) :
```tsx
<DialogTransfertBatch open={dialogTransfertOpen} onOpenChange={setDialogTransfertOpen} animaux={selectedAnimaux} onSuccess={clearSelection} />
<DialogMortaliteBatch open={dialogMortaliteOpen} onOpenChange={setDialogMortaliteOpen} animaux={selectedAnimaux} onSuccess={clearSelection} />
```

### Fix #2 — `_dialog-transfert-batch.tsx` (NOUVEAU)

Calque sur `_dialog-changer-stade-batch.tsx`. Diffs :
- Title : `Transférer — {animaux.length} animal{...}` avec icône `<Truck>`
- Champs form : `batiment_dest_id` (select Bâtiment de la ferme), `date` (date, défaut today), `motif` (textarea optionnel)
- Récupération bâtiments via prop : ajouter `batiments: { id: string; nom: string; type: string }[]` (l'orchestrateur câblera côté page.tsx en suivi)
- Server action : `transfererBatch({ ids, batiment_dest_id, date, motif })`
- Sortie toast : `${count} animaux transférés vers ${nomBatiment}`
- Pas de logique d'intersection catégories (tous porcelets peuvent transférer partout, validation côté server action)

⚠️ Pour MVP, si la liste `batiments` est vide ou non passée, affiche un message d'erreur "Aucun bâtiment disponible — passez la prop `batiments`" et un bouton "Annuler" uniquement. NE PAS faire de fetch côté client. L'orchestrateur (Christophe) câblera la prop dans `page.tsx` en suivi.

### Fix #3 — `_dialog-mortalite-batch.tsx` (NOUVEAU)

Calque sur `_dialog-changer-stade-batch.tsx`. Diffs :
- Title : `Marquer mortalité — {animaux.length} animal{...}` avec icône `<Skull>`, tone danger
- Champs : `date_deces` (date today), `cause` (Select : `maladie` / `accident` / `predation` / `inconnu` / `autre`), `observations` (textarea optionnel)
- Server action : `enregistrerMortaliteBatch({ ids, date_deces, cause, observations })`
- Bouton submit en `bg-[var(--sf-danger-ink)] text-white` (action destructive)
- Confirmation modale interne : checkbox "Je confirme l'enregistrement de N décès (action irréversible)" obligatoire avant submit
- Toast succès : `${count} mortalités enregistrées`

### Fix #4 — Server actions `_server-actions.ts`

Ajouter en fin du fichier, après `changerStadeBatch` :

```ts
// === BULK TRANSFERT ===
const schemaTransfertBatch = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  batiment_dest_id: z.string().uuid(),
  date: z.string().min(1),
  motif: z.string().max(500).optional().or(z.literal('')),
})

export async function transfererBatch(input: {
  ids: string[]
  batiment_dest_id: string
  date: string
  motif?: string
}): Promise<{ ok: true; count: number; batch_id: string } | { ok: false; error: string }> {
  // Pattern identique changerStadeBatch :
  // 1. parse Zod
  // 2. SELECT animaux + filtre statut='actif' + deleted_at NULL + même ferme
  // 3. SELECT batiment_dest (vérifier existe + même ferme + pas deleted)
  // 4. Filter ceux déjà au batiment dest (skip silencieux idempotent)
  // 5. INSERT mouvements batch (1 ligne/animal, type='transfert', batch_id commun)
  // 6. UPDATE animaux SET batiment_id = batiment_dest_id
  // 7. INSERT audit_log batch (action='TRANSFERT_BATCH', batch_id, before/after)
  // 8. revalidatePath /cheptel + /batiments + /dashboard
}
```

### Fix #5 — Server action mortalité bulk

```ts
const schemaMortaliteBatch = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
  date_deces: z.string().min(1),
  cause: z.enum(['maladie', 'accident', 'predation', 'inconnu', 'autre']),
  observations: z.string().max(1000).optional().or(z.literal('')),
})

export async function enregistrerMortaliteBatch(input: {...}): Promise<...> {
  // 1. parse Zod
  // 2. SELECT animaux + ferme + statut='actif' + non deleted
  // 3. INSERT mortalites batch (1 ligne/animal, batch_id commun)
  // 4. UPDATE animaux SET statut='mort', deleted_at=NOW() (soft delete)
  // 5. INSERT audit_log batch (action='MORTALITE_BATCH', batch_id, before/after)
  // 6. revalidatePath /cheptel + /mortalites + /dashboard + /alertes
}
```

⚠️ Colonnes `mortalites` à vérifier en read seul via grep `_dialog-mortalite.tsx` + `_schemas.ts` route mortalites (ne pas inventer).

⚠️ Catégorie verrat doit être bloquée comme dans changerStadeBatch (return error si tag verrat dans la sélection).

## VÉRIFICATIONS OBLIGATOIRES (à reporter dans rapport)
1. `grep -c "DialogTransfertBatch\|DialogMortaliteBatch" app/src/app/\(app\)/cheptel/_porcelets-table-bulk.tsx` → attendu ≥ 2 (import + usage)
2. `grep -c "export async function transfererBatch\|export async function enregistrerMortaliteBatch" app/src/app/\(app\)/cheptel/_server-actions.ts` → attendu 2
3. `grep -c "batch_id" app/src/app/\(app\)/cheptel/_server-actions.ts` → attendu ≥ 5 (pattern audit batch_id sur 3 actions × ~2 mentions chacune)
4. `wc -l app/src/app/\(app\)/cheptel/_dialog-transfert-batch.tsx app/src/app/\(app\)/cheptel/_dialog-mortalite-batch.tsx` → chacun < 250 lignes

## LIVRABLE
1 fichier : `agents/sprint-vague-4-2026-05-27/rapports/RAPPORT_L1.md` (≤120 lignes)

Format :
```md
# RAPPORT L1 — B6 Bulk porcelets étendre

## Fait
- Fichier X modifié (+N -M lignes)
- Fichier Y créé (N lignes)
- ...

## Vérifs (sorties grep réelles)
- `grep -c "..." ...` → N

## Divergences brief
- ...

## TODO orchestrateur
- Câbler prop `batiments` côté `page.tsx` cheptel (passer la liste serveur → table bulk)
- `npx tsc --noEmit` à lancer
- Tester smoke desktop + mobile
```

## INTERDITS
- ❌ Modifier `_dialog-changer-stade-batch.tsx` ni `_porcelets-table-bulk.tsx` au-delà du sticky bar + 2 states
- ❌ Inventer colonnes table `mortalites` ou `mouvements` (lire migrations existantes si doute, ne pas chercher au-delà)
- ❌ Rapport > 120 lignes
- ❌ Faire la migration SQL ou build ou commit

Go.
