'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
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
import { creerAlerteManuelle } from '../_server-actions'

type AnimalChoix = { id: string; tag: string; categorie: string | null }
type BatimentChoix = { id: string; nom: string; type?: string | null }

type Severity = 'info' | 'warning' | 'alert' | 'critical'
type CibleType = 'aucune' | 'animal' | 'batiment'

const LIBELLE_SEVERITE: Record<Severity, string> = {
  info: 'Info',
  warning: 'Moyenne',
  alert: 'Élevée',
  critical: 'Critique',
}

/**
 * F2 — Dialog "Nouvelle alerte" (observation manuelle).
 * Insert dans alertes_loge avec type='observation_manuelle'.
 */
export function DialogAlerteManuelle({
  animaux,
  batiments,
}: {
  animaux: AnimalChoix[]
  batiments: BatimentChoix[]
}) {
  const today = new Date().toISOString().slice(0, 10)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [titre, setTitre] = useState('')
  const [message, setMessage] = useState('')
  const [severity, setSeverity] = useState<Severity>('warning')
  const [cibleType, setCibleType] = useState<CibleType>('aucune')
  const [cibleId, setCibleId] = useState<string>('')
  const [dateEvt, setDateEvt] = useState<string>(today)

  function reset() {
    setTitre('')
    setMessage('')
    setSeverity('warning')
    setCibleType('aucune')
    setCibleId('')
    setDateEvt(today)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titre.trim()) {
      toast.error('Titre requis')
      return
    }
    if ((cibleType === 'animal' || cibleType === 'batiment') && !cibleId) {
      toast.error(
        cibleType === 'animal'
          ? 'Sélectionne un animal'
          : 'Sélectionne un bâtiment',
      )
      return
    }
    setSubmitting(true)
    const res = await creerAlerteManuelle({
      titre: titre.trim(),
      message: message.trim() || undefined,
      severity,
      cible_type: cibleType,
      cible_id: cibleId || undefined,
      date_evenement: dateEvt,
    })
    setSubmitting(false)
    if (res.ok) {
      toast.success('Alerte créée', {
        description: `${LIBELLE_SEVERITE[severity]} · ${titre.trim()}`,
      })
      reset()
      setOpen(false)
    } else {
      toast.error('Erreur', { description: res.error })
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          // FAB unique VERGER : création via bouton d'en-tête, visible sur tous viewports.
          <Button className="inline-flex">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle alerte
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle
            className="tracking-wide text-2xl"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Nouvelle observation
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="titre">Titre *</Label>
            <Input
              id="titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Toux observée case M2, Truie qui mange peu…"
              maxLength={160}
              required
            />
          </div>

          <div>
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Détail, mesures prises, contexte…"
              maxLength={2000}
            />
          </div>

          <div>
            <Label>Sévérité *</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['info', 'warning', 'alert', 'critical'] as Severity[]).map(
                (s) => (
                  <Button
                    key={s}
                    type="button"
                    size="sm"
                    variant={severity === s ? 'default' : 'outline'}
                    onClick={() => setSeverity(s)}
                  >
                    {LIBELLE_SEVERITE[s]}
                  </Button>
                ),
              )}
            </div>
          </div>

          <div>
            <Label>Cible</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { v: 'aucune', l: 'Aucune' },
                  { v: 'animal', l: 'Animal' },
                  { v: 'batiment', l: 'Bâtiment' },
                ] as { v: CibleType; l: string }[]
              ).map((opt) => (
                <Button
                  key={opt.v}
                  type="button"
                  size="sm"
                  variant={cibleType === opt.v ? 'default' : 'outline'}
                  onClick={() => {
                    setCibleType(opt.v)
                    setCibleId('')
                  }}
                >
                  {opt.l}
                </Button>
              ))}
            </div>

            {cibleType === 'animal' ? (
              <div className="mt-2">
                <Select
                  value={cibleId || ''}
                  onValueChange={(v) => setCibleId(v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un animal">
                      {(value) => {
                        if (!value) return 'Choisir un animal'
                        const a = animaux.find((x) => x.id === value)
                        return a ? `${a.tag}${a.categorie ? ` · ${a.categorie}` : ''}` : value
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {animaux.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[var(--sf-muted)]">
                        Aucun animal disponible.
                      </div>
                    ) : (
                      animaux.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.tag}
                          {a.categorie ? ` · ${a.categorie}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            {cibleType === 'batiment' ? (
              <div className="mt-2">
                <Select
                  value={cibleId || ''}
                  onValueChange={(v) => setCibleId(v ?? '')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un bâtiment">
                      {(value) => {
                        if (!value) return 'Choisir un bâtiment'
                        const b = batiments.find((x) => x.id === value)
                        return b ? b.nom : value
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {batiments.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-[var(--sf-muted)]">
                        Aucun bâtiment disponible.
                      </div>
                    ) : (
                      batiments.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nom}
                          {b.type ? ` · ${b.type}` : ''}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div>
            <Label htmlFor="date_evenement">Date *</Label>
            <Input
              id="date_evenement"
              type="date"
              value={dateEvt}
              onChange={(e) => setDateEvt(e.target.value)}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
