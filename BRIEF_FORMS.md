# Smart Farm — Brief Formulaires Métier (lecture obligatoire sous-agents)

## CONTEXTE
Application Smart Farm Next.js 16 App Router. Path: `/root/projects/smartfarm/app/`.
Stack : React 19 + Tailwind v4 + shadcn/ui + Supabase local + DS Terrain Vivant.

## OBJECTIF
Rendre les boutons d'action métier fonctionnels. Pour chaque action :
1. Dialog shadcn (composant déjà installé : `@/components/ui/dialog`)
2. Formulaire React Hook Form + Zod (déjà installés)
3. Server Action Next.js qui appelle Supabase
4. `revalidatePath` après succès
5. Toast sonner pour feedback utilisateur

## STACK FORMULAIRE STANDARD

### Imports communs
```tsx
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
```

### Pattern Server Action
Créer un fichier `_actions.ts` (côté serveur) dans chaque dossier de page :
```tsx
'use server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const sb = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // bypass RLS en brouillon
  { auth: { persistSession: false } }
)

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

export async function creerXXX(data: XXXSchema) {
  const supabase = sb()
  const { error } = await supabase.from('table').insert({
    ferme_id: DEMO_FERME_ID,
    ...data,
  })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/chemin-de-la-page')
  return { ok: true }
}
```

### Pattern Formulaire client
Créer `_dialog-xxx.tsx` (client) :
```tsx
'use client'
// imports...

const schema = z.object({
  champ: z.string().min(1, 'Champ requis'),
  // ...
})
type FormData = z.infer<typeof schema>

export function DialogNouvelXXX({ trigger, options }: { trigger: React.ReactNode, options?: any[] }) {
  const [open, setOpen] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data: FormData) {
    const res = await creerXXX(data)
    if (res.ok) {
      toast.success('XXX enregistré')
      reset()
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--sf-font-display)] uppercase tracking-wide">
            Titre formulaire terrain
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="champ">Label terrain</Label>
            <Input id="champ" {...register('champ')} />
            {errors.champ && <p className="text-xs text-[var(--sf-danger)] mt-1">{errors.champ.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### Pattern intégration dans la page
Page actuelle (Server Component) :
```tsx
import { DialogNouvelAnimal } from './_dialog-nouvel-animal'

export default async function Page() {
  const supabase = await createClient()
  const { data: races } = await supabase.from('races').select('*')
  // ...
  return (
    <div>
      {/* ... */}
      <DialogNouvelAnimal
        trigger={<Button>Nouvel animal</Button>}
        races={races ?? []}
      />
    </div>
  )
}
```

## SCHÉMA DES TABLES (lecture obligatoire avant code)

### animaux
- id (uuid pk), ferme_id (uuid required), case_id (uuid nullable)
- tag (text required), nom (text nullable)
- sexe (M|F required), categorie (verrat|truie|cochette|porcelet|sevrage|engraissement)
- race_id (uuid nullable), date_naissance (date nullable), date_entree (date default today)
- mere_id, pere_id (uuid self-ref nullable)
- poids_naissance_kg (numeric nullable)
- statut (actif|vendu|abattu|mort|reforme — default actif)
- observations (text nullable)
- UNIQUE (ferme_id, tag)

### saillies
- id, ferme_id (required), bande_id (nullable)
- truie_id (uuid required, animal F), verrat_id (uuid nullable, animal M)
- date_saillie (date required)
- methode (naturelle|IA|IA_double — default naturelle)
- rang_porte (int nullable)
- observations (text nullable)
- TRIGGER: crée auto diagnostics_gestation J+15 et J+28 dans evenements_prevus

### diagnostics_gestation
- id, saillie_id (uuid required), date_diagnostic (date required)
- resultat (en_attente|positif|negatif|retour_chaleur)
- methode (text nullable), observations (text nullable)
- TRIGGER: si positif → crée évts transfert_maternite J+107, mise_bas_prevue J+114, sevrage_prevu

### mises_bas
- id, saillie_id (required), truie_id (required), bande_id (nullable)
- date_mise_bas (date required)
- nes_totaux, nes_vivants, nes_morts, momifies (int — required pour totaux/vivants)
- poids_portee_kg (numeric nullable)
- duree_minutes (int nullable), assistance (bool default false)
- observations (text nullable)
- CHECK: nes_vivants ≤ nes_totaux ET nes_vivants + nes_morts + momifies = nes_totaux
- CHECK: date_mise_bas ≥ date_saillie + 100 jours (via trigger)
- TRIGGER: marque mise_bas_prevue comme realise, crée évt tarissement J+21, recalcule sevrage_prevu

### sevrages
- id, mise_bas_id (required), truie_id (required), bande_id (nullable)
- date_sevrage (date required), nb_sevres (int required)
- poids_total_kg (numeric nullable), age_jours (int nullable)
- observations (text nullable)
- CHECK: date_sevrage > date_mise_bas (via trigger)

### pesees
- id, animal_id (nullable), bande_id (nullable) [au moins un des 2]
- date_pesee (date required), poids_kg (numeric required > 0 et < 500)
- nb_animaux (int default 1)
- type (individuelle|bande_moyenne|bande_totale)
- observations (text nullable)

### vaccinations
- id, protocole_id (nullable), animal_id (nullable), bande_id (nullable)
- date_vaccination (date required), produit (text), lot (text), dose_ml (numeric)
- veterinaire (text), observations (text)

### traitements
- id, animal_id (nullable), bande_id (nullable)
- date_debut (date required), date_fin (date nullable)
- motif (text required), produit (text), posologie (text), voie (text)
- veterinaire (text), cout (numeric), observations (text)

### mortalites
- id, animal_id (nullable), bande_id (nullable), ferme_id (required)
- date_mort (date required), cause (text), diagnostic (text)
- autopsie (bool default false), observations (text)

### mouvements_stock
- id, matiere_id (uuid required), type (entree|sortie|perte|inventaire|transfert)
- date_mvt (date default today), quantite (numeric required ≠ 0)
- cout_unitaire (numeric), cout_total (numeric)
- fournisseur_id (nullable), bande_id (nullable)
- reference (text), observations (text)
- ⚠️ Le trigger NE met PAS à jour matieres_premieres.stock_actuel automatiquement → faire UPDATE manuel après INSERT dans le Server Action

## CONVENTIONS

### Vocabulaire terrain dans les formulaires
Utiliser le lexique de `@/lib/terrain-labels` (TERRAIN, TYPE_LABELS, PRIORITE_LABEL). Exemples :
- Titre Dialog "Faire monter" pas "Nouvelle saillie"
- Label "La truie" pas "Truie"
- Label "Le mâle" pas "Verrat"
- Label "Comment" pas "Méthode"
- Bouton "Enregistrer" ou "Confirmer", pas "Submit"

### Validation Zod
- Dates : `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide')` ou Date.parse check
- Nombres : `z.coerce.number().positive('Doit être positif')`
- UUID : `z.string().uuid()`
- Optionnels : `.optional().or(z.literal(''))`

### Style des Dialog
- DialogTitle en Big Shoulders uppercase tracking-wide
- Label : utiliser le composant `<Label>` (déjà DNA eyebrow)
- Inputs : underline-only (composant déjà patché)
- Boutons : variant default (tampon vert) pour primary, outline pour annuler

### Constantes utiles
- DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'
- DEMO_USER_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

## TEST APRÈS CODE
1. Build : `cd /root/projects/smartfarm/app && npm run build` doit passer
2. Copier static : `cp -r .next/static .next/standalone/projects/smartfarm/app/.next/static`
3. Vérifier en console : créer une saillie test depuis l'UI, vérifier qu'elle apparaît dans la liste après rechargement

## DEPLOY
Après le code OK, le parent (Hermes) s'occupera de rebuild + restart standalone. Vous, vous validez juste le build TypeScript et que les fichiers sont propres.

## RAPPORT FINAL DEMANDÉ
Pour chaque formulaire :
- Fichiers créés (Server Action + Dialog)
- Schéma Zod
- Validation TypeScript OK
- Pages où le bouton trigger est branché
