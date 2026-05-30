'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ArrowUp, ArrowDown, Plus } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  creerEntreeStock,
  creerSortieStock,
  creerMatiere,
} from './_server-actions'

const todayIso = () => new Date().toISOString().slice(0, 10)

type Matiere = {
  id: string
  nom: string
  unite: string | null
  stock_actuel: number | null
  type?: string | null
}

type Fournisseur = {
  id: string
  nom: string
}

type Bande = {
  id: string
  nom?: string | null
  code?: string | null
}

// =====================================================================
// Style commun du titre Dialog (Big Shoulders uppercase)
// =====================================================================
const titleClassName =
  'font-[family-name:var(--sf-font-display)] tracking-wide text-2xl'

const errClassName = 'text-xs text-[var(--sf-danger,#7A2A1F)] mt-1'

// =====================================================================
// 1) DIALOG ENTRÉE STOCK
// =====================================================================

const schemaEntree = z.object({
  matiere_id: z.string().uuid('Choisir un article'),
  date_mvt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  quantite: z.coerce.number().positive('Quantité > 0'),
  cout_unitaire: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  fournisseur_id: z.string().optional().or(z.literal('')),
  reference: z.string().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
})
type EntreeFormIn = z.input<typeof schemaEntree>
type EntreeForm = z.output<typeof schemaEntree>

export function DialogEntreeStock({
  trigger,
  matieres,
  fournisseurs,
}: {
  trigger?: React.ReactNode
  matieres: Matiere[]
  fournisseurs: Fournisseur[]
}) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<EntreeFormIn, any, EntreeForm>({
    resolver: zodResolver(schemaEntree),
    defaultValues: {
      date_mvt: todayIso(),
      matiere_id: '',
      fournisseur_id: '',
    },
  })

  const matiereId = watch('matiere_id')
  const fournisseurId = watch('fournisseur_id')

  async function onSubmit(data: EntreeForm) {
    const res = await creerEntreeStock({
      matiere_id: data.matiere_id,
      date_mvt: data.date_mvt,
      quantite: Number(data.quantite),
      cout_unitaire:
        data.cout_unitaire === '' || data.cout_unitaire == null
          ? null
          : Number(data.cout_unitaire),
      fournisseur_id: data.fournisseur_id || null,
      reference: data.reference || null,
      observations: data.observations || null,
    })
    if (res.ok) {
      toast.success('Entrée stock enregistrée')
      reset({ date_mvt: todayIso(), matiere_id: '', fournisseur_id: '' })
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger ?? (
            <Button variant="outline" size="lg">
              <ArrowUp className="h-5 w-5 mr-2" aria-hidden="true" />
              Entrée
            </Button>
          )) as any
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className={titleClassName}>Entrée stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Article */}
          <div>
            <Label>Article</Label>
            <Select
              value={matiereId || ''}
              onValueChange={(v: string | null) =>
                setValue('matiere_id', v ?? '', { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un article" />
              </SelectTrigger>
              <SelectContent>
                {matieres.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nom} — stock actuel: {m.stock_actuel ?? 0}{' '}
                    {m.unite ?? ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.matiere_id && (
              <p className={errClassName}>{errors.matiere_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date_mvt">Date</Label>
              <Input id="date_mvt" type="date" {...register('date_mvt')} />
              {errors.date_mvt && (
                <p className={errClassName}>{errors.date_mvt.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="quantite">Quantité reçue</Label>
              <Input
                id="quantite"
                type="number"
                step="0.01"
                {...register('quantite')}
              />
              {errors.quantite && (
                <p className={errClassName}>{errors.quantite.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cout_unitaire">Coût unitaire (FCFA)</Label>
              <Input
                id="cout_unitaire"
                type="number"
                step="0.01"
                {...register('cout_unitaire')}
              />
            </div>
            <div>
              <Label>Fournisseur</Label>
              <Select
                value={fournisseurId || ''}
                onValueChange={(v: string | null) =>
                  setValue('fournisseur_id', v ?? '', { shouldValidate: false })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="reference">Référence bon de livraison</Label>
            <Input id="reference" {...register('reference')} />
          </div>

          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              rows={2}
              {...register('observations')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================================
// 2) DIALOG SORTIE STOCK
// =====================================================================

const schemaSortie = z.object({
  matiere_id: z.string().uuid('Choisir un article'),
  date_mvt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide'),
  quantite: z.coerce.number().positive('Quantité > 0'),
  bande_id: z.string().optional().or(z.literal('')),
  reference: z.string().optional().or(z.literal('')),
  observations: z.string().optional().or(z.literal('')),
})
type SortieFormIn = z.input<typeof schemaSortie>
type SortieForm = z.output<typeof schemaSortie>

export function DialogSortieStock({
  trigger,
  matieres,
  bandes = [],
}: {
  trigger?: React.ReactNode
  matieres: Matiere[]
  bandes?: Bande[]
}) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<SortieFormIn, any, SortieForm>({
    resolver: zodResolver(schemaSortie),
    defaultValues: {
      date_mvt: todayIso(),
      matiere_id: '',
      bande_id: '',
    },
  })

  const matiereId = watch('matiere_id')
  const bandeId = watch('bande_id')

  async function onSubmit(data: SortieForm) {
    const res = await creerSortieStock({
      matiere_id: data.matiere_id,
      date_mvt: data.date_mvt,
      quantite: Number(data.quantite),
      bande_id: data.bande_id || null,
      reference: data.reference || null,
      observations: data.observations || null,
    })
    if (res.ok) {
      toast.success('Sortie stock enregistrée')
      reset({ date_mvt: todayIso(), matiere_id: '', bande_id: '' })
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger ?? (
            <Button variant="outline" size="lg">
              <ArrowDown className="h-5 w-5 mr-2" aria-hidden="true" />
              Sortie
            </Button>
          )) as any
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className={titleClassName}>Sortie stock</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Article</Label>
            <Select
              value={matiereId || ''}
              onValueChange={(v: string | null) =>
                setValue('matiere_id', v ?? '', { shouldValidate: true })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choisir un article" />
              </SelectTrigger>
              <SelectContent>
                {matieres.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.nom} — stock actuel: {m.stock_actuel ?? 0}{' '}
                    {m.unite ?? ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.matiere_id && (
              <p className={errClassName}>{errors.matiere_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date_mvt">Date</Label>
              <Input id="date_mvt" type="date" {...register('date_mvt')} />
              {errors.date_mvt && (
                <p className={errClassName}>{errors.date_mvt.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="quantite">Quantité sortie</Label>
              <Input
                id="quantite"
                type="number"
                step="0.01"
                {...register('quantite')}
              />
              {errors.quantite && (
                <p className={errClassName}>{errors.quantite.message}</p>
              )}
            </div>
          </div>

          {bandes.length > 0 && (
            <div>
              <Label>Bande destinataire (optionnel)</Label>
              <Select
                value={bandeId || ''}
                onValueChange={(v: string | null) =>
                  setValue('bande_id', v ?? '', { shouldValidate: false })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {bandes.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nom || b.code || b.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="reference">Référence / motif court</Label>
            <Input id="reference" {...register('reference')} />
          </div>

          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              rows={2}
              {...register('observations')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// =====================================================================
// 3) DIALOG NOUVEAU MATÉRIEL
// =====================================================================

const TYPES_MATIERE = [
  { value: 'matiere_premiere', label: 'Matière première' },
  { value: 'aliment_fini', label: 'Aliment fini' },
  { value: 'vaccin', label: 'Vaccin' },
  { value: 'medicament', label: 'Médicament' },
  { value: 'desinfectant', label: 'Désinfectant' },
  { value: 'consommable', label: 'Consommable' },
  { value: 'autre', label: 'Autre' },
] as const

const schemaMatiere = z.object({
  nom: z.string().min(1, 'Nom requis'),
  type: z.enum([
    'matiere_premiere',
    'aliment_fini',
    'vaccin',
    'medicament',
    'desinfectant',
    'consommable',
    'autre',
  ]),
  unite: z.string().min(1, 'Unité requise'),
  seuil_alerte: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  cout_moyen_unite: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .optional(),
  stock_actuel: z.coerce.number().nonnegative().default(0),
  observations: z.string().optional().or(z.literal('')),
})
type MatiereFormIn = z.input<typeof schemaMatiere>
type MatiereForm = z.output<typeof schemaMatiere>

export function DialogNouvelleMatiere({
  trigger,
}: {
  trigger?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
  } = useForm<MatiereFormIn, any, MatiereForm>({
    resolver: zodResolver(schemaMatiere),
    defaultValues: {
      type: 'matiere_premiere',
      unite: 'kg',
      stock_actuel: 0,
    },
  })

  const type = watch('type')

  async function onSubmit(data: MatiereForm) {
    const res = await creerMatiere({
      nom: data.nom,
      type: data.type,
      unite: data.unite,
      seuil_alerte:
        data.seuil_alerte === '' || data.seuil_alerte == null
          ? null
          : Number(data.seuil_alerte),
      cout_moyen_unite:
        data.cout_moyen_unite === '' || data.cout_moyen_unite == null
          ? null
          : Number(data.cout_moyen_unite),
      stock_actuel: Number(data.stock_actuel ?? 0),
      observations: data.observations || null,
    })
    if (res.ok) {
      toast.success('Article créé')
      reset({ type: 'matiere_premiere', unite: 'kg', stock_actuel: 0 })
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          (trigger ?? (
            // FAB unique VERGER : création via bouton d'en-tête, visible sur tous viewports.
            <Button variant="accent" size="lg" className="inline-flex">
              <Plus className="h-5 w-5 mr-2" aria-hidden="true" />
              Nouveau matériel
            </Button>
          )) as any
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className={titleClassName}>Nouveau matériel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom de l’article</Label>
            <Input id="nom" {...register('nom')} placeholder="Ex. Maïs grain" />
            {errors.nom && <p className={errClassName}>{errors.nom.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v: string | null) =>
                  setValue('type', (v ?? 'matiere_premiere') as MatiereForm['type'], {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_MATIERE.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="unite">Unité</Label>
              <Input
                id="unite"
                {...register('unite')}
                placeholder="kg / dose / L / sac"
              />
              {errors.unite && (
                <p className={errClassName}>{errors.unite.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="stock_actuel">Stock initial</Label>
              <Input
                id="stock_actuel"
                type="number"
                step="0.01"
                {...register('stock_actuel')}
              />
            </div>
            <div>
              <Label htmlFor="seuil_alerte">Seuil alerte</Label>
              <Input
                id="seuil_alerte"
                type="number"
                step="0.01"
                {...register('seuil_alerte')}
              />
            </div>
            <div>
              <Label htmlFor="cout_moyen_unite">Coût moyen</Label>
              <Input
                id="cout_moyen_unite"
                type="number"
                step="0.01"
                {...register('cout_moyen_unite')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              rows={2}
              {...register('observations')}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
