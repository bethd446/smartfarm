'use client'

import { useEffect, useState } from 'react'
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

import { enregistrerVisite } from './_actions'

const TYPES = [
  { v: 'visiteur', l: 'Visiteur' },
  { v: 'veterinaire', l: 'Vétérinaire' },
  { v: 'camion_aliment', l: 'Camion aliment' },
  { v: 'camion_animaux', l: 'Camion animaux' },
  { v: 'livraison', l: 'Livraison' },
  { v: 'technicien', l: 'Technicien' },
  { v: 'autre', l: 'Autre' },
] as const

const schema = z.object({
  date_visite: z.string().optional().or(z.literal('')),
  type_visite: z.string().min(1, 'Type requis'),
  nom_visiteur: z.string().optional().or(z.literal('')),
  societe: z.string().optional().or(z.literal('')),
  provenance_ferme_porcine: z.boolean().optional().default(false),
  delai_depuis_derniere_visite_jours: z
    .union([z.coerce.number().int().nonnegative(), z.literal('')])
    .optional(),
  douche_obligatoire_effectuee: z.boolean().optional().default(false),
  changement_tenue: z.boolean().optional().default(false),
  pediluve_utilise: z.boolean().optional().default(false),
  observations: z.string().optional().or(z.literal('')),
})
type FormValues = z.input<typeof schema>

const titleClass =
  'font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em] text-xl'

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-xs text-[var(--sf-danger-ink,#7A2A1F)] mt-1">{message}</p>
  )
}

export function DialogNouvelleVisite({ trigger }: { trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as never,
    defaultValues: {
      date_visite: '',
      type_visite: '',
      nom_visiteur: '',
      societe: '',
      provenance_ferme_porcine: false,
      delai_depuis_derniere_visite_jours: '',
      douche_obligatoire_effectuee: false,
      changement_tenue: false,
      pediluve_utilise: false,
      observations: '',
    },
  })

  const typeVisite = watch('type_visite')
  const provenance = watch('provenance_ferme_porcine')
  const douche = watch('douche_obligatoire_effectuee')
  const tenue = watch('changement_tenue')
  const pediluve = watch('pediluve_utilise')

  // Hydration-safe : la date courante est posée APRÈS montage (et à chaque
  // ouverture), jamais au render SSR, pour éviter un mismatch d'hydratation
  // sur le champ datetime-local (précision minute).
  useEffect(() => {
    if (!open) return
    setValue('date_visite', new Date().toISOString().slice(0, 16))
  }, [open, setValue])

  async function onSubmit(data: FormValues) {
    // Conversion datetime-local → ISO
    const dateIso = data.date_visite
      ? new Date(data.date_visite).toISOString()
      : ''
    const res = await enregistrerVisite({
      date_visite: dateIso,
      type_visite: data.type_visite,
      nom_visiteur: data.nom_visiteur || undefined,
      societe: data.societe || undefined,
      provenance_ferme_porcine: !!data.provenance_ferme_porcine,
      delai_depuis_derniere_visite_jours:
        data.delai_depuis_derniere_visite_jours === ''
          ? undefined
          : (data.delai_depuis_derniere_visite_jours as number),
      douche_obligatoire_effectuee: !!data.douche_obligatoire_effectuee,
      changement_tenue: !!data.changement_tenue,
      pediluve_utilise: !!data.pediluve_utilise,
      observations: data.observations || undefined,
    })
    if (res.ok) {
      toast.success('Visite enregistrée')
      reset()
      setOpen(false)
    } else {
      toast.error(res.error || 'Erreur')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger as never} />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className={titleClass}>Nouvelle visite</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vis-date">Date / heure</Label>
              <Input
                id="vis-date"
                type="datetime-local"
                {...register('date_visite')}
              />
            </div>
            <div>
              <Label htmlFor="vis-type">Type de visite</Label>
              <Select
                value={typeVisite || ''}
                onValueChange={(v) =>
                  setValue('type_visite', (v as string) ?? '', {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger id="vis-type" className="w-full">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.v} value={t.v}>
                      {t.l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={errors.type_visite?.message} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="vis-nom">Nom du visiteur</Label>
              <Input
                id="vis-nom"
                {...register('nom_visiteur')}
                placeholder="Ex. Dr. Kouassi"
              />
            </div>
            <div>
              <Label htmlFor="vis-soc">Société</Label>
              <Input
                id="vis-soc"
                {...register('societe')}
                placeholder="Ex. Cabinet Vétos Abidjan"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-[6px] border border-[var(--sf-line,rgba(0,0,0,0.18))] p-3">
            <Label className="block text-[12px] font-[family-name:var(--sf-font-display)] uppercase tracking-[0.08em]">
              Biosécurité
            </Label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!provenance}
                onChange={(e) =>
                  setValue('provenance_ferme_porcine', e.target.checked)
                }
                className="h-4 w-4 accent-[var(--sf-primary)]"
              />
              <span>Provenance d&apos;une autre ferme porcine</span>
            </label>
            {provenance ? (
              <div>
                <Label htmlFor="vis-delai">
                  Délai depuis dernière visite ferme porcine (jours)
                </Label>
                <Input
                  id="vis-delai"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  {...register('delai_depuis_derniere_visite_jours')}
                  placeholder="Ex. 7 (≥48h recommandé)"
                />
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!douche}
                onChange={(e) =>
                  setValue('douche_obligatoire_effectuee', e.target.checked)
                }
                className="h-4 w-4 accent-[var(--sf-primary)]"
              />
              <span>Douche effectuée</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!tenue}
                onChange={(e) =>
                  setValue('changement_tenue', e.target.checked)
                }
                className="h-4 w-4 accent-[var(--sf-primary)]"
              />
              <span>Changement de tenue</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!pediluve}
                onChange={(e) =>
                  setValue('pediluve_utilise', e.target.checked)
                }
                className="h-4 w-4 accent-[var(--sf-primary)]"
              />
              <span>Pédiluve utilisé</span>
            </label>
          </div>

          <div>
            <Label htmlFor="vis-obs">Observations</Label>
            <Textarea
              id="vis-obs"
              rows={2}
              {...register('observations')}
              placeholder="Notes, anomalies…"
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
              {isSubmitting ? 'Enregistrement…' : 'Enregistrer la visite'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
