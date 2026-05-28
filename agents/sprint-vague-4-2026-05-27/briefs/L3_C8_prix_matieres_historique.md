# Brief L3 — C8 Prix matières CI historique + admin

## TOI
Dev senior React/Next/Supabase. Tu crées une route admin pour tracer l'historique des prix matières premières CI dans le temps.

## LIS D'ABORD (obligatoire, dans cet ordre)
1. `CLAUDE.md` (racine) — règles 13 brain §10, charte unités XOF, RLS multi-tenant
2. `app/src/app/(app)/alimentation/matieres/page.tsx` — pattern page admin (filtres, KPI, table, dialog) à répliquer (439 lignes)
3. `app/src/app/(app)/alimentation/matieres/_dialog-matiere.tsx` — pattern dialog création/édition (408 lignes)
4. `app/src/app/(app)/alimentation/matieres/_actions.ts` — pattern server action avec revalidatePath
5. `app/src/app/(app)/alimentation/matieres/_schemas.ts` — pattern Zod

## Périmètre
✅ Touche (création complète, route NOUVELLE) :
- `app/src/app/(app)/alimentation/matieres-prix/page.tsx` (NOUVEAU)
- `app/src/app/(app)/alimentation/matieres-prix/_dialog-prix.tsx` (NOUVEAU)
- `app/src/app/(app)/alimentation/matieres-prix/_actions.ts` (NOUVEAU)
- `app/src/app/(app)/alimentation/matieres-prix/_schemas.ts` (NOUVEAU)
- `supabase/migrations/20260528100000_prix_matieres_historique.sql` (NOUVEAU — TU L'ÉCRIS, l'orchestrateur l'appliquera)

❌ Touche pas :
- `alimentation/matieres/*` (route existante intacte)
- `alimentation/page.tsx` (l'orchestrateur câblera un lien vers la nouvelle route en suivi)
- Sidebar/nav (idem, orchestrateur)
- Tout autre fichier hors `alimentation/matieres-prix/` (sauf migration SQL)

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push, pas restart serveur, **pas appliquer la migration SQL** (l'orchestrateur le fait via curl + PAT).

## Contexte

Actuellement `matieres_premieres` a une colonne `prix_indicatif_xof_kg` (number unique, sans historique). En contexte CI, les prix matières varient fortement selon saison/disponibilité (ex: maïs +30% en saison sèche). Le système doit tracer ces variations pour :
- Réajuster `prix_indicatif_xof_kg` quand un nouveau prix est saisi
- Permettre des graphes de variation (futur, hors scope)
- Audit traçabilité comptable

Pattern multi-tenant : RLS `current_farm_id()` + `user_farms`. Toutes les tables ont `ferme_id uuid NOT NULL` + policies.

## Mission
1. Créer migration `20260528100000_prix_matieres_historique.sql` (table + RLS + GRANT + trigger update `matieres_premieres.prix_indicatif_xof_kg`)
2. Créer route `/alimentation/matieres-prix/` server-side render avec :
   - KPI : nb total relevés, nb dernier mois, prix moyen pondéré toutes matières
   - Filtre matière (select) + filtre date (from/to)
   - Table : matière, date relevé, prix XOF/kg, source, observations, action delete
   - Bouton "+ Nouveau prix" → dialog modal
3. Server actions : `ajouterPrixMatiere()`, `supprimerPrixMatiere()`

## Détails techniques

### Migration SQL — `20260528100000_prix_matieres_historique.sql`

```sql
-- Migration : prix_matieres_historique
-- Trace historique prix matières premières CI dans le temps.
-- Pattern : INSERT prix → trigger UPDATE matieres_premieres.prix_indicatif_xof_kg

BEGIN;

CREATE TABLE IF NOT EXISTS public.prix_matieres_historique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES public.fermes(id) ON DELETE CASCADE,
  matiere_id uuid NOT NULL REFERENCES public.matieres_premieres(id) ON DELETE CASCADE,
  date_releve date NOT NULL,
  prix_xof_kg numeric(10, 2) NOT NULL CHECK (prix_xof_kg > 0),
  source text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS prix_matieres_historique_matiere_idx
  ON public.prix_matieres_historique (matiere_id, date_releve DESC);
CREATE INDEX IF NOT EXISTS prix_matieres_historique_ferme_idx
  ON public.prix_matieres_historique (ferme_id, date_releve DESC);

ALTER TABLE public.prix_matieres_historique ENABLE ROW LEVEL SECURITY;

CREATE POLICY prix_matieres_historique_select
  ON public.prix_matieres_historique
  FOR SELECT
  TO authenticated
  USING (ferme_id = public.current_farm_id());

CREATE POLICY prix_matieres_historique_insert
  ON public.prix_matieres_historique
  FOR INSERT
  TO authenticated
  WITH CHECK (ferme_id = public.current_farm_id());

CREATE POLICY prix_matieres_historique_delete
  ON public.prix_matieres_historique
  FOR DELETE
  TO authenticated
  USING (ferme_id = public.current_farm_id());

GRANT SELECT, INSERT, DELETE ON public.prix_matieres_historique TO authenticated;

-- Trigger : à chaque nouveau relevé, MAJ matieres_premieres.prix_indicatif_xof_kg
-- avec le dernier prix en date (idempotent).
CREATE OR REPLACE FUNCTION public.fn_sync_prix_matiere()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.matieres_premieres
     SET prix_indicatif_xof_kg = NEW.prix_xof_kg
   WHERE id = NEW.matiere_id
     AND ferme_id = NEW.ferme_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_prix_matiere ON public.prix_matieres_historique;
CREATE TRIGGER trg_sync_prix_matiere
  AFTER INSERT ON public.prix_matieres_historique
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_prix_matiere();

COMMIT;
```

⚠️ La fonction `current_farm_id()` existe déjà projet (charte §10 règle 4). NE PAS la recréer.
⚠️ Vérifier que `matieres_premieres` a bien la colonne `ferme_id` (présumé oui, sinon adapter). Si vraiment doute, GREP existant : `grep "ferme_id" supabase/migrations/*matieres*.sql`.

### Route — `app/src/app/(app)/alimentation/matieres-prix/page.tsx`

Pattern serveur (server component async). Calque sur `matieres/page.tsx`. Diffs :
- Titre : "Historique prix matières"
- Sous-titre : "Traçabilité des relevés de prix CI dans le temps"
- KPI : 3 cards
  - Card 1 (success bg) : nb total relevés
  - Card 2 (warning bg) : nb dans les 30 derniers jours
  - Card 3 (bg neutre) : prix moyen XOF/kg dernier mois (pondéré sur nb relevés)
- Filtres : `matiere_id` (select toutes matières), `from`/`to` (input date)
- Table : Matière | Date relevé | Prix XOF/kg | Source | Observations | Actions (Supprimer)
- Bouton "+ Nouveau prix" → DialogPrix
- Empty state : "Aucun relevé. Commencez par ajouter votre premier prix."

Le `searchParams` lit `m` (matiere_id), `from`, `to`.

### Dialog — `_dialog-prix.tsx`

`'use client'`. Calque sur `_dialog-matiere.tsx` (mode `create` uniquement, pas d'édition pour MVP).

Champs Zod :
- `matiere_id`: uuid required
- `date_releve`: date YYYY-MM-DD required, ≤ today
- `prix_xof_kg`: number > 0, max 100000
- `source`: string optionnel (max 200)
- `observations`: string optionnel (max 1000)

Reçoit en prop `matieres: { id: string; nom: string }[]` (server-side fetch côté page.tsx + passe en prop).

Bouton submit → `ajouterPrixMatiere()`. Sur succès toast + close + `router.refresh()`.

### Server actions — `_actions.ts`

```ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { prixSchema, type PrixInput } from './_schemas'

export async function ajouterPrixMatiere(
  data: PrixInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = prixSchema.safeParse(data)
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Validation' }
  const d = parsed.data
  const supabase = await createClient()
  const fermeId = await getFermeId()
  const { error } = await supabase.from('prix_matieres_historique').insert({
    ferme_id: fermeId,
    matiere_id: d.matiere_id,
    date_releve: d.date_releve,
    prix_xof_kg: d.prix_xof_kg,
    source: d.source || null,
    observations: d.observations || null,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres-prix')
  revalidatePath('/alimentation/matieres') // car trigger met à jour prix_indicatif
  return { ok: true }
}

export async function supprimerPrixMatiere(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { error } = await supabase.from('prix_matieres_historique').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/alimentation/matieres-prix')
  return { ok: true }
}
```

### Schemas — `_schemas.ts`

```ts
import { z } from 'zod'

const today = () => new Date().toISOString().slice(0, 10)

export const prixSchema = z.object({
  matiere_id: z.string().uuid('Matière requise'),
  date_releve: z
    .string()
    .min(1, 'Date requise')
    .refine((v) => v <= today(), 'Date dans le futur interdite'),
  prix_xof_kg: z.coerce.number().positive('Prix > 0').max(100000, 'Prix trop élevé'),
  source: z.string().max(200).optional().or(z.literal('')),
  observations: z.string().max(1000).optional().or(z.literal('')),
})

export type PrixInput = z.input<typeof prixSchema>
```

## VÉRIFICATIONS OBLIGATOIRES (à reporter dans rapport)
1. `ls app/src/app/\(app\)/alimentation/matieres-prix/` → 4 fichiers (page.tsx, _dialog-prix.tsx, _actions.ts, _schemas.ts)
2. `ls supabase/migrations/20260528100000_*.sql` → présent
3. `grep -c "current_farm_id\|ENABLE ROW LEVEL SECURITY\|GRANT" supabase/migrations/20260528100000_*.sql` → ≥ 5
4. `grep "trg_sync_prix_matiere" supabase/migrations/20260528100000_*.sql` → présent
5. `wc -l app/src/app/\(app\)/alimentation/matieres-prix/*` → page.tsx < 400, dialog < 250, actions < 80, schemas < 30

## LIVRABLE
1 fichier : `agents/sprint-vague-4-2026-05-27/rapports/RAPPORT_L3.md` (≤120 lignes)

Format :
```md
# RAPPORT L3 — C8 Prix matières historique

## Fait
- Migration `…sql` écrite (non appliquée)
- 4 fichiers route créés

## Vérifs (sorties grep/ls réelles)
- `ls …` → 4 fichiers
- `grep -c …` → N

## Divergences brief
- Si colonne `matieres_premieres.ferme_id` absente → noté

## TODO orchestrateur
- Appliquer migration via curl Mgmt API (cf handoff §3.2)
- `npx tsc --noEmit`
- Câbler lien depuis `/alimentation/page.tsx` vers `/alimentation/matieres-prix`
- Tester smoke desktop : ajouter prix, vérifier qu'il met à jour `matieres_premieres.prix_indicatif_xof_kg`
```

## INTERDITS
- ❌ Appliquer la migration SQL (jamais en sub-agent — orchestrateur le fait)
- ❌ Modifier `matieres/*` ou `alimentation/page.tsx` ou sidebar
- ❌ Créer une route admin globale (multi-tenant via RLS, scope ferme automatique)
- ❌ Inventer la fonction `current_farm_id()` (existe déjà)
- ❌ Rapport > 120 lignes

Go.
