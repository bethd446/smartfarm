'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRightLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  LIBELLES_STADE,
  stadesAutorisesPour,
  type StadeAnimal,
} from '@/lib/stades-animaux'
import { changerStadeBatch } from './_server-actions'

export type AnimalLite = {
  id: string
  tag: string
  categorie: string
  stade: string
}

const MAX_BADGES_VISIBLE = 10

export function DialogChangerStadeBatch({
  open,
  onOpenChange,
  animaux,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  animaux: AnimalLite[]
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [nouveauStade, setNouveauStade] = useState<StadeAnimal | ''>('')
  const [motif, setMotif] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Intersection des stades autorisés pour toutes les catégories sélectionnées
  const intersection = useMemo<StadeAnimal[]>(() => {
    if (animaux.length === 0) return []
    let acc = new Set<StadeAnimal>(stadesAutorisesPour(animaux[0].categorie))
    for (let i = 1; i < animaux.length; i++) {
      const allowed = new Set(stadesAutorisesPour(animaux[i].categorie))
      acc = new Set([...acc].filter((s) => allowed.has(s)))
      if (acc.size === 0) break
    }
    // Retire tous les stades sources présents dans la sélection (transitions vers soi-même)
    const stadesSources = new Set(animaux.map((a) => a.stade))
    return [...acc].filter((s) => !stadesSources.has(s))
  }, [animaux])

  const isMixed = intersection.length === 0 && animaux.length > 0
  const visibleTags = animaux.slice(0, MAX_BADGES_VISIBLE)
  const overflowCount = Math.max(0, animaux.length - MAX_BADGES_VISIBLE)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!nouveauStade || isMixed) return
    setSubmitting(true)
    try {
      const res = await changerStadeBatch({
        ids: animaux.map((a) => a.id),
        nouveau_stade: nouveauStade,
        motif: motif.trim() || undefined,
      })
      if (res.ok) {
        toast.success(
          `${res.count} animal${res.count > 1 ? 'aux' : ''} → ${LIBELLES_STADE[nouveauStade as StadeAnimal] ?? nouveauStade}`,
        )
        setNouveauStade('')
        setMotif('')
        onOpenChange(false)
        onSuccess?.()
        router.refresh()
      } else {
        toast.error('Erreur', { description: res.error })
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle
            className="tracking-wide text-2xl"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            <ArrowRightLeft className="inline h-5 w-5 mr-2 -mt-1" />
            Changer le stade — {animaux.length} animal{animaux.length > 1 ? 'aux' : ''}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tags sélectionnés */}
          <div>
            <Label className="mb-2 block">Sélection</Label>
            <div className="flex flex-wrap gap-1.5">
              {visibleTags.map((a) => (
                <Badge key={a.id} variant="outline" className="font-mono">
                  {a.tag}
                </Badge>
              ))}
              {overflowCount > 0 && (
                <Badge variant="secondary">+{overflowCount} autres</Badge>
              )}
            </div>
          </div>

          {/* Si sélection mixte non transitionnable */}
          {isMixed && (
            <div
              className="rounded-md border px-3 py-2 text-sm"
              style={{
                background: 'var(--sf-warning-bg, #FEF3C7)',
                borderColor: 'var(--sf-warning-border, #D97706)',
                color: 'var(--sf-warning-ink, #7C2D12)',
              }}
            >
              Sélection mixte non transitionnable. Les catégories choisies n&apos;ont aucun stade
              cible commun. Choisissez des animaux de même catégorie.
            </div>
          )}

          {/* Select nouveau stade */}
          {!isMixed && (
            <div>
              <Label>Nouveau stade *</Label>
              <Select
                value={nouveauStade}
                onValueChange={(v) => setNouveauStade(v as StadeAnimal)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un stade" />
                </SelectTrigger>
                <SelectContent>
                  {intersection.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LIBELLES_STADE[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Motif */}
          {!isMixed && (
            <div>
              <Label htmlFor="motif-batch">Motif (optionnel)</Label>
              <Textarea
                id="motif-batch"
                rows={3}
                placeholder="Ex : passage en croissance suite à pesée hebdo, transfert bâtiment…"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                maxLength={500}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting || isMixed || !nouveauStade}>
              {submitting ? 'Enregistrement…' : `Appliquer à ${animaux.length}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
