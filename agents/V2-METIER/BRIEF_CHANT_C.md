# Brief CHANT-C — Onboarding mise-bas + check J+1

## Périmètre
✅ Touche : 1 migration SQL + `src/app/(app)/mises-bas/_dialog-elle-a-fait.tsx` (refonte wizard) + `_server-actions.ts` + `_schemas.ts` + créer `src/app/(app)/mises-bas/check-j1/page.tsx`
❌ Pas : sidebar, autres modules

## Contexte
Lis CONTEXT.md + CLAUDE.md d'abord. Pas `npm run build`.

## Règles métier
Quand utilisateur déclare mise-bas → wizard guidé (pas formulaire monobloc) :
1. **Truie + horaire**
2. **Nés totaux** (puis vivants/mort-nés/momifiés)
3. **Poids portée** + BCS truie
4. **Assistance ?** durée + observations
5. **Récap + confirmation**

Puis **J+1** : check obligatoire mortalité néonatale + écrasés (les premières 24h sont les plus critiques).

## Mission

### 1. Migration SQL : événements de suivi
```sql
-- supabase/migrations/20260522030000_suivi_post_mb.sql
BEGIN;

CREATE TABLE IF NOT EXISTS checks_post_mb (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mise_bas_id uuid NOT NULL REFERENCES mises_bas(id) ON DELETE CASCADE,
  jour_post_mb integer NOT NULL CHECK (jour_post_mb >= 0),
  date_check date NOT NULL DEFAULT CURRENT_DATE,
  vivants_actuels integer,
  ecrases_24h integer DEFAULT 0,
  morts_autres_24h integer DEFAULT 0,
  bcs_truie numeric(2,1) CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5)),
  truie_lactation_ok boolean,        -- truie produit du lait
  truie_appetit_ok boolean,          -- truie mange
  porcelets_actifs boolean,          -- porcelets vifs, tètent
  observations text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_checks_post_mb_mb_jour ON checks_post_mb(mise_bas_id, jour_post_mb);
GRANT SELECT, INSERT, UPDATE ON checks_post_mb TO anon, authenticated;

-- Vue : mises-bas nécessitant un check J+1
CREATE OR REPLACE VIEW v_checks_post_mb_attendus
WITH (security_invoker=true) AS
SELECT
  mb.id AS mise_bas_id,
  mb.truie_id,
  a.tag AS truie_tag,
  a.ferme_id,
  mb.date_mise_bas,
  mb.nes_vivants,
  (CURRENT_DATE - mb.date_mise_bas) AS jours_post_mb,
  CASE
    WHEN (CURRENT_DATE - mb.date_mise_bas) = 0 THEN 'J0'
    WHEN (CURRENT_DATE - mb.date_mise_bas) = 1 THEN 'J+1'
    WHEN (CURRENT_DATE - mb.date_mise_bas) BETWEEN 2 AND 3 THEN 'J+2-3'
    WHEN (CURRENT_DATE - mb.date_mise_bas) BETWEEN 4 AND 7 THEN 'J+4-7'
    ELSE 'J>7'
  END AS phase_check,
  -- Quels checks déjà faits ?
  (SELECT COUNT(*) FROM checks_post_mb c WHERE c.mise_bas_id = mb.id AND c.deleted_at IS NULL) AS nb_checks
FROM mises_bas mb
JOIN animaux a ON a.id = mb.truie_id
WHERE mb.deleted_at IS NULL
  AND (CURRENT_DATE - mb.date_mise_bas) BETWEEN 0 AND 7;

GRANT SELECT ON v_checks_post_mb_attendus TO anon, authenticated;

COMMIT;
```

### 2. Wizard `_dialog-elle-a-fait.tsx` — refonte multi-étapes

Pattern de wizard simple sans bibliothèque, juste avec state local :

```tsx
'use client'
import { useState } from 'react'
// ... imports

const STEPS = ['Truie', 'Naissances', 'État portée', 'Truie post-MB', 'Récap']

export function DialogElleAFait({ saillies }: { saillies: SaillieOption[] }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    saillie_id: '', date_mise_bas: new Date().toISOString().slice(0, 10),
    nes_totaux: 0, nes_vivants: 0, nes_morts: 0, momifies: 0, ecrases: 0,
    poids_portee_kg: 0, duree_minutes: 0, assistance: false,
    bcs_truie: 3, observations: '',
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button>Nouvelle mise-bas</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Mise-bas — Étape {step+1}/{STEPS.length} : {STEPS[step]}</DialogTitle>
          {/* Progress bar */}
          <div className="flex gap-1 mt-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-[var(--sf-primary)]' : 'bg-muted'}`} />
            ))}
          </div>
        </DialogHeader>

        {step === 0 && <StepTruie form={form} setForm={setForm} saillies={saillies} />}
        {step === 1 && <StepNaissances form={form} setForm={setForm} />}
        {step === 2 && <StepEtatPortee form={form} setForm={setForm} />}
        {step === 3 && <StepTruiePostMb form={form} setForm={setForm} />}
        {step === 4 && <StepRecap form={form} />}

        <DialogFooter className="flex gap-2">
          {step > 0 && <Button variant="outline" onClick={() => setStep(s => s-1)}>Précédent</Button>}
          {step < STEPS.length - 1 && <Button onClick={() => setStep(s => s+1)} disabled={!canProceed(step, form)}>Suivant</Button>}
          {step === STEPS.length - 1 && (
            <form action={creerMiseBas}>
              <input type="hidden" name="data" value={JSON.stringify(form)} />
              <Button type="submit">Confirmer la mise-bas</Button>
            </form>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

Sous-composants StepX = juste des Fragments avec inputs ciblés. À toi de les écrire en gardant simple.

Validation étapes :
- Step 0 : `saillie_id` requis + `date_mise_bas` requise
- Step 1 : `nes_totaux >= nes_vivants + nes_morts + momifies` (avertir si ≠)
- Step 2 : poids portée optionnel mais recommandé
- Step 3 : BCS truie 1-5

Server action `creerMiseBas` adapte pour recevoir le JSON via FormData (parse).

### 3. Page `/mises-bas/check-j1/page.tsx`
Liste les mises-bas nécessitant un check J+1 ou ultérieur. Pour chaque ligne, formulaire simple :

```tsx
const { data: aChecker } = await sb
  .from('v_checks_post_mb_attendus')
  .select('*')
  .order('jours_post_mb')

// Affichage
{(aChecker ?? []).map((mb: any) => (
  <Card key={mb.mise_bas_id}>
    <CardHeader>
      <CardTitle>Truie {mb.truie_tag} — {mb.phase_check}</CardTitle>
      <CardDescription>Mise-bas {new Date(mb.date_mise_bas).toLocaleDateString('fr-FR')} · {mb.nes_vivants} porcelets nés vivants · {mb.nb_checks} check{mb.nb_checks > 1 ? 's' : ''} déjà fait{mb.nb_checks > 1 ? 's' : ''}</CardDescription>
    </CardHeader>
    <CardContent>
      <form action={enregistrerCheck} className="space-y-3">
        <input type="hidden" name="mise_bas_id" value={mb.mise_bas_id} />
        <input type="hidden" name="jour_post_mb" value={mb.jours_post_mb} />

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>Vivants actuels</Label>
            <Input type="number" name="vivants_actuels" defaultValue={mb.nes_vivants} min="0" />
          </div>
          <div>
            <Label>Écrasés 24h</Label>
            <Input type="number" name="ecrases_24h" defaultValue="0" min="0" />
          </div>
          <div>
            <Label>Autres morts</Label>
            <Input type="number" name="morts_autres_24h" defaultValue="0" min="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Label className="flex items-center gap-2">
            <Input type="checkbox" name="truie_lactation_ok" defaultChecked />
            <span>Truie produit du lait</span>
          </Label>
          <Label className="flex items-center gap-2">
            <Input type="checkbox" name="truie_appetit_ok" defaultChecked />
            <span>Truie a de l'appétit</span>
          </Label>
          <Label className="flex items-center gap-2">
            <Input type="checkbox" name="porcelets_actifs" defaultChecked />
            <span>Porcelets actifs / tètent</span>
          </Label>
          <div>
            <Label>BCS truie (1-5)</Label>
            <Input type="number" step="0.5" min="1" max="5" name="bcs_truie" defaultValue="3" />
          </div>
        </div>

        <div>
          <Label>Observations</Label>
          <Textarea name="observations" placeholder="Anomalies, comportements, traitement administré…" />
        </div>

        <Button type="submit">Enregistrer le check</Button>
      </form>
    </CardContent>
  </Card>
))}
```

Server action `enregistrerCheck` : INSERT dans `checks_post_mb` + `revalidatePath`.

### 4. Lien sidebar (NON — laisser à un sprint sidebar dédié)
Au lieu, ajoute un widget compact dans le dashboard et `/sanitaire/calendrier` montrant "X mises-bas à checker" avec lien `/mises-bas/check-j1`.

→ **En pratique**, ajoute simplement la route. La sidebar pourra être mise à jour plus tard.

## Vérif
```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT COUNT(*) FROM v_checks_post_mb_attendus;"
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/mises-bas/check-j1
```

## Livrable
1. Migration appliquée
2. Wizard mise-bas multi-étapes
3. Page `/mises-bas/check-j1` opérationnelle
4. Rapport `/root/projects/smartfarm/agents/V2-METIER/RAPPORT_CHANT_C.md` ≤ 70 lignes

## Anti-pièges
- Ne casse PAS le server action `creerMiseBas` existant — étends-le
- Wizard state local React simple, pas de bibliothèque externe
- `checks_post_mb` est NEW (jamais existé)
- Pas de modif sidebar — c'est out of scope
