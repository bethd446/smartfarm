'use client'

import { useState, useTransition } from 'react'
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
import { Plus } from 'lucide-react'
import { creerBande } from './_server-actions'

const SELECT_CLASS =
  'w-full h-12 min-h-12 px-0 py-2 text-base bg-transparent border-0 border-b-2 ' +
  'border-[var(--sf-ink,#1a1a1a)] focus:border-b-[var(--sf-primary,#2D4A1F)] ' +
  'focus:outline-none focus-visible:outline-none rounded-none ' +
  'text-[var(--sf-ink,#1a1a1a)]'

export function DialogNouvelleBande({ 
  trigger, 
  open: controlledOpen, 
  onOpenChange: controlledOnOpenChange 
}: { 
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen ?? internalOpen
  const setOpen = controlledOnOpenChange ?? setInternalOpen
  const [isPending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)

  // Trigger interne par défaut uniquement en mode non contrôlé (page Server).
  // En mode contrôlé (FAB client open/onOpenChange), aucun trigger rendu.
  const isControlled = controlledOpen !== undefined
  const resolvedTrigger =
    trigger ??
    (isControlled ? null : (
      <Button size="lg" className="h-12 text-base bg-[var(--sf-accent-warm,#A16207)] hover:opacity-90">
        <Plus className="h-5 w-5 mr-2" />Nouvelle bande
      </Button>
    ))

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await creerBande(formData)
      if (res.ok) {
        toast.success('Bande créée')
        setOpen(false)
      } else {
        toast.error('Erreur', { description: res.error })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {resolvedTrigger && <DialogTrigger render={resolvedTrigger as any} />}
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="uppercase tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Nouvelle bande
          </DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nom">Nom *</Label>
            <Input
              id="nom"
              name="nom"
              required
              placeholder="Ex : Bande 2026-A"
            />
          </div>

          <div>
            <Label htmlFor="code">Code *</Label>
            <Input
              id="code"
              name="code"
              required
              placeholder="Ex : B26A"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="date_debut">Date début *</Label>
              <Input
                id="date_debut"
                name="date_debut"
                type="date"
                required
                defaultValue={today}
              />
            </div>
            <div>
              <Label htmlFor="date_fin_prevue">Fin prévue</Label>
              <Input
                id="date_fin_prevue"
                name="date_fin_prevue"
                type="date"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="statut">Statut *</Label>
            <select
              id="statut"
              name="statut"
              defaultValue="preparation"
              className={SELECT_CLASS}
            >
              <option value="preparation">Préparation</option>
              <option value="active">Active</option>
              <option value="sevree">Sevrée</option>
              <option value="engraissement">Engraissement</option>
              <option value="finie">Finie</option>
            </select>
          </div>

          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea id="observations" name="observations" rows={2} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Enregistrement…' : 'Créer la bande'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
