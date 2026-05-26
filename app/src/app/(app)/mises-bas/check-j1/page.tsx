import type { Metadata } from 'next'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/ui/empty-state'
import { Baby, ChevronLeft, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Check J+1 mises-bas',
}

// ─── Server Action : enregistrer un check post mise-bas ──────────────
async function enregistrerCheck(formData: FormData) {
  'use server'

  const mise_bas_id = String(formData.get('mise_bas_id') ?? '')
  const jour_post_mb = Number(formData.get('jour_post_mb') ?? 0)
  if (!mise_bas_id || Number.isNaN(jour_post_mb)) return

  const num = (k: string) => {
    const v = formData.get(k)
    if (v === null || v === '') return null
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  const bool = (k: string) => formData.get(k) === 'on'
  const txt = (k: string) => {
    const v = formData.get(k)
    return v ? String(v).trim() : null
  }

  const sb = await createClient()
  const payload: Record<string, unknown> = {
    mise_bas_id,
    jour_post_mb,
    date_check: new Date().toISOString().slice(0, 10),
    vivants_actuels: num('vivants_actuels'),
    ecrases_24h: num('ecrases_24h') ?? 0,
    morts_autres_24h: num('morts_autres_24h') ?? 0,
    bcs_truie: num('bcs_truie'),
    truie_lactation_ok: bool('truie_lactation_ok'),
    truie_appetit_ok: bool('truie_appetit_ok'),
    porcelets_actifs: bool('porcelets_actifs'),
    observations: txt('observations'),
  }

  await sb.from('checks_post_mb').insert(payload)
  revalidatePath('/mises-bas/check-j1')
  revalidatePath('/mises-bas')
  revalidatePath('/dashboard')
}

// ─── Helpers d'affichage ─────────────────────────────────────────────
function badgeVariantForPhase(
  phase: string
): 'danger' | 'warning' | 'secondary' | 'success' {
  if (phase === 'J0' || phase === 'J+1') return 'danger'
  if (phase === 'J+2-3') return 'warning'
  if (phase === 'J+4-7') return 'secondary'
  return 'success'
}

export default async function CheckJ1Page() {
  const sb = await createClient()

  const { data: aChecker } = await sb
    .from('v_checks_post_mb_attendus')
    .select('*')
    .order('jours_post_mb', { ascending: true })

  const items = (aChecker ?? []) as Array<{
    mise_bas_id: string
    truie_id: string
    truie_tag: string
    truie_nom: string | null
    ferme_id: string
    date_mise_bas: string
    nes_vivants: number | null
    jours_post_mb: number
    phase_check: string
    nb_checks: number
    dernier_jour_check: number | null
  }>

  // Priorité visuelle : critique d'abord
  const critique = items.filter((m) => m.phase_check === 'J0' || m.phase_check === 'J+1')
  const surveille = items.filter((m) => m.phase_check === 'J+2-3' || m.phase_check === 'J+4-7')

  return (
    <div className="space-y-6">
      {/* === Header === */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href="/mises-bas"
            className="inline-flex items-center gap-1 text-sm text-[var(--sf-muted)] hover:text-[var(--sf-ink)] mb-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Mises bas
          </Link>
          <h1
            className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)]"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            <ShieldCheck className="h-8 w-8 text-[var(--sf-primary)]" />
            Check post mise-bas
          </h1>
          <p className="text-sm text-[var(--sf-muted)] mt-1">
            Les 24 premières heures sont les plus critiques. Note la mortalité
            néonatale, les écrasés et l'état de la truie.
          </p>
        </div>
        <Badge variant="secondary" className="text-base">
          {items.length} à checker
        </Badge>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Baby}
          title="Aucune mise-bas récente"
          description="Aucune mise-bas dans les 7 derniers jours ne nécessite de check."
        />
      ) : (
        <>
          {critique.length > 0 && (
            <Section
              title="Critique — J+0 / J+1"
              description="Mortalité néonatale et écrasements concentrés dans les 24h."
            >
              {critique.map((mb) => (
                <CheckCard key={mb.mise_bas_id} mb={mb} />
              ))}
            </Section>
          )}

          {surveille.length > 0 && (
            <Section
              title="Surveillance — J+2 à J+7"
              description="Surveiller lactation, appétit truie, vivacité porcelets."
            >
              {surveille.map((mb) => (
                <CheckCard key={mb.mise_bas_id} mb={mb} />
              ))}
            </Section>
          )}
        </>
      )}
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-xl font-semibold text-[var(--sf-ink)]">{title}</h2>
        <p className="text-sm text-[var(--sf-muted)]">{description}</p>
      </header>
      <div className="grid gap-4">{children}</div>
    </section>
  )
}

function CheckCard({
  mb,
}: {
  mb: {
    mise_bas_id: string
    truie_tag: string
    truie_nom: string | null
    date_mise_bas: string
    nes_vivants: number | null
    jours_post_mb: number
    phase_check: string
    nb_checks: number
    dernier_jour_check: number | null
  }
}) {
  const truieLabel = mb.truie_nom
    ? `${mb.truie_nom} (${mb.truie_tag})`
    : mb.truie_tag
  const variant = badgeVariantForPhase(mb.phase_check)
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              Truie {truieLabel}
              <Badge variant={variant}>{mb.phase_check}</Badge>
            </CardTitle>
            <CardDescription>
              Mise bas du{' '}
              {new Date(mb.date_mise_bas).toLocaleDateString('fr-FR')} ·{' '}
              {mb.nes_vivants ?? 0} porcelet
              {(mb.nes_vivants ?? 0) > 1 ? 's' : ''} né
              {(mb.nes_vivants ?? 0) > 1 ? 's' : ''} vivant
              {(mb.nes_vivants ?? 0) > 1 ? 's' : ''} ·{' '}
              {mb.nb_checks === 0
                ? 'Aucun check'
                : `${mb.nb_checks} check${mb.nb_checks > 1 ? 's' : ''} déjà fait${
                    mb.nb_checks > 1 ? 's' : ''
                  }${mb.dernier_jour_check !== null ? ` (dernier J+${mb.dernier_jour_check})` : ''}`}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form action={enregistrerCheck} className="space-y-3">
          <input type="hidden" name="mise_bas_id" value={mb.mise_bas_id} />
          <input
            type="hidden"
            name="jour_post_mb"
            value={String(mb.jours_post_mb)}
          />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor={`vivants-${mb.mise_bas_id}`}>Vivants actuels</Label>
              <Input
                id={`vivants-${mb.mise_bas_id}`}
                type="number"
                name="vivants_actuels"
                defaultValue={mb.nes_vivants ?? 0}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor={`ecrases-${mb.mise_bas_id}`}>Écrasés 24h</Label>
              <Input
                id={`ecrases-${mb.mise_bas_id}`}
                type="number"
                name="ecrases_24h"
                defaultValue={0}
                min="0"
              />
            </div>
            <div>
              <Label htmlFor={`autres-${mb.mise_bas_id}`}>Autres morts</Label>
              <Input
                id={`autres-${mb.mise_bas_id}`}
                type="number"
                name="morts_autres_24h"
                defaultValue={0}
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="truie_lactation_ok"
                defaultChecked
                className="h-5 w-5"
              />
              <span className="text-sm">Truie produit du lait</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="truie_appetit_ok"
                defaultChecked
                className="h-5 w-5"
              />
              <span className="text-sm">Truie a de l'appétit</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                name="porcelets_actifs"
                defaultChecked
                className="h-5 w-5"
              />
              <span className="text-sm">Porcelets actifs / tètent</span>
            </label>
            <div>
              <Label htmlFor={`bcs-${mb.mise_bas_id}`}>BCS truie (1-5)</Label>
              <Input
                id={`bcs-${mb.mise_bas_id}`}
                type="number"
                step="0.5"
                min="1"
                max="5"
                name="bcs_truie"
                defaultValue="3"
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`obs-${mb.mise_bas_id}`}>Observations</Label>
            <Textarea
              id={`obs-${mb.mise_bas_id}`}
              name="observations"
              rows={2}
              placeholder="Anomalies, comportements, traitement administré…"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit">Enregistrer le check</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
