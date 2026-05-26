import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PageTitle } from '@/components/ui/page-title'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { ExportButton } from '@/components/export-button'
import { Baby, Plus, Scissors } from 'lucide-react'
import { toneTauxPortee } from '@/lib/colors'
import { AnimalLabel } from '@/components/ui/animal-label'
import { TERRAIN } from '@/lib/terrain-labels'
import { DialogMiseBas } from './_dialog-mise-bas'
import { DialogSevrage } from './_dialog-sevrage'
import { MisesBasFab } from './_fab'

export const metadata: Metadata = {
  title: 'Mises bas & Sevrages',
}

/** Mapping ton sémantique → variante Badge atome carnet. */
const TONE_TO_VARIANT = {
  nominal: 'success',
  attendu: 'warning',
  urgence: 'danger',
  neutre: 'secondary',
} as const

export default async function MisesBasPage() {
  const sb = await createClient()

  // 1) Mises-bas — requête CŒUR sans dépendance à `sevrages` (table parfois bloquée
  //    par RLS/GRANT côté authenticated). Si la jointure plantait, on perdait
  //    TOUT le compteur "X portées" + l'historique. On scinde donc.
  const { data: mbBase, error: mbErr } = await sb
    .from('mises_bas')
    .select(`*, truie:truie_id(tag,nom)`)
    .order('date_mise_bas', { ascending: false })

  let mb: any[] = (mbBase ?? []) as any[]

  // 2) Sevrages : best-effort. Si la table est inaccessible, on continue
  //    sans sevrage plutôt que de casser toute la page.
  if (mb.length > 0) {
    const mbIds = mb.map((m) => m.id)
    const { data: sevData } = await sb
      .from('sevrages')
      .select('mb_id, date_sevrage, nb_sevres, poids_total_kg')
      .in('mb_id', mbIds)
    if (sevData && sevData.length > 0) {
      const sevByMb = new Map<string, any[]>()
      for (const s of sevData as any[]) {
        const arr = sevByMb.get(s.mb_id) ?? []
        arr.push(s)
        sevByMb.set(s.mb_id, arr)
      }
      mb = mb.map((m) => ({ ...m, sevrages: sevByMb.get(m.id) ?? [] }))
    } else {
      mb = mb.map((m) => ({ ...m, sevrages: [] }))
    }
  }

  if (mbErr) {
    // Erreur sur la requête principale : on log côté serveur, on n'expose RIEN à l'utilisateur.
    console.error('[mises-bas] erreur chargement mises_bas:', mbErr.message)
  }

  // 3) Saillies avec diagnostic POSITIF + sans mise-bas, pour le formulaire "Nouvelle mise bas"
  //    Même logique : on scinde pour ne pas dépendre de `diagnostics_gestation` (RLS instable).
  const { data: salliesBase } = await sb
    .from('saillies')
    .select(`id, date_saillie, truie:truie_id(tag,nom)`)
    .order('date_saillie', { ascending: false })

  let saillies: any[] = (salliesBase ?? []) as any[]

  if (saillies.length > 0) {
    const saillieIds = saillies.map((s) => s.id)
    const [{ data: diagData }, { data: mbForSaillie }] = await Promise.all([
      sb
        .from('diagnostics_gestation')
        .select('saillie_id, resultat')
        .in('saillie_id', saillieIds),
      sb.from('mises_bas').select('id, saillie_id').in('saillie_id', saillieIds),
    ])
    const diagBySaillie = new Map<string, any[]>()
    for (const d of (diagData ?? []) as any[]) {
      const arr = diagBySaillie.get(d.saillie_id) ?? []
      arr.push(d)
      diagBySaillie.set(d.saillie_id, arr)
    }
    const mbBySaillie = new Map<string, any[]>()
    for (const m of (mbForSaillie ?? []) as any[]) {
      const arr = mbBySaillie.get(m.saillie_id) ?? []
      arr.push(m)
      mbBySaillie.set(m.saillie_id, arr)
    }
    saillies = saillies.map((s) => ({
      ...s,
      diagnostics_gestation: diagBySaillie.get(s.id) ?? [],
      mises_bas: mbBySaillie.get(s.id) ?? [],
    }))
  }

  const saillesPourMb = ((saillies ?? []) as any[])
    .filter(
      (s) =>
        s.diagnostics_gestation?.some((d: any) => d.resultat === 'positif') &&
        (!s.mises_bas || s.mises_bas.length === 0)
    )
    .map((s) => ({
      id: s.id as string,
      truie_tag: (s.truie?.tag ?? '') as string,
      truie_nom: (s.truie?.nom ?? null) as string | null,
      date_saillie: s.date_saillie as string,
    }))

  // Mises-bas sans sevrage, pour le formulaire "Sevrage"
  const misesBasSansSevrage = ((mb ?? []) as any[])
    .filter((m) => !m.sevrages || m.sevrages.length === 0)
    .map((m) => ({
      id: m.id as string,
      truie_tag: (m.truie?.tag ?? '') as string,
      truie_nom: (m.truie?.nom ?? null) as string | null,
      date_mise_bas: m.date_mise_bas as string,
      nes_vivants: Number(m.nes_vivants ?? 0),
    }))

  // Bâtiments disponibles pour sevrage (type = démarrage ou fallback permissif)
  const { data: batiments } = await sb
    .from('batiments')
    .select('id, nom, type, capacite_max, occupation_actuelle')
    .in('type', ['demarrage', 'croissance', 'porcin'])
    .is('deleted_at', null)
    .order('nom')

  const batimentsDisponibles = (batiments ?? []).map((b) => ({
    id: b.id as string,
    nom: b.nom as string,
    type: b.type as string,
    capacite_max: Number(b.capacite_max ?? 0),
    occupation_actuelle: Number(b.occupation_actuelle ?? 0),
  }))

  return (
    <div className="space-y-6">
      {/* === Header de page : PageTitle unifié === */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <PageTitle
            eyebrow="ÉLEVAGE"
            icon={<Baby className="h-9 w-9 text-[var(--sf-primary)]" />}
            className="mb-1"
          >
            {TERRAIN.mise_bas.titre} &amp; {TERRAIN.sevrage.titre}
          </PageTitle>
          <p
            className="text-sm text-[var(--sf-muted)]"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            {mb?.length ?? 0} portées enregistrées
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportButton table="mises_bas" />
          <DialogSevrage
            mises_bas_sans_sevrage={misesBasSansSevrage}
            batiments_disponibles={batimentsDisponibles}
            trigger={
              <Button variant="outline" size="lg" className="h-12 text-base">
                <Scissors className="h-5 w-5 mr-2" />
                Sevrage
              </Button>
            }
          />
          <DialogMiseBas
            saillies={saillesPourMb}
            trigger={
              <Button size="lg" className="h-12 text-base">
                <Plus className="h-5 w-5 mr-2" />
                Nouvelle mise bas
              </Button>
            }
          />
        </div>
      </div>

      {/* === Historique des mises-bas : table compacte (V2-FIX FIX-B #1) === */}
      {(mb ?? []).length === 0 ? (
        <EmptyState
          icon={Baby}
          title="Aucune mise-bas enregistrée"
          description="Les mises-bas apparaîtront ici après saisie. Cliquez sur 'Nouvelle mise bas' pour démarrer."
        />
      ) : (
      <>
      <Card>
        <CardHeader>
          <CardTitle>Historique des mises-bas ({mb!.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Truie</th>
                  <th className="text-left p-3 font-medium">Date MB</th>
                  <th className="text-right p-3 font-medium">Total nés</th>
                  <th className="text-right p-3 font-medium">Vivants</th>
                  <th className="text-right p-3 font-medium">Mort-nés</th>
                  <th className="text-right p-3 font-medium">Momifiés</th>
                  <th className="text-right p-3 font-medium">Écrasés</th>
                  <th className="text-right p-3 font-medium">Sevrage</th>
                </tr>
              </thead>
              <tbody>
                {(mb ?? []).map((m: any) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="p-3">
                      {m.truie ? (
                        <AnimalLabel animal={m.truie} format="inline" />
                      ) : '—'}
                    </td>
                    <td className="p-3">{new Date(m.date_mise_bas).toLocaleDateString('fr-FR')}</td>
                    <td className="p-3 text-right tabular-nums">{m.nes_totaux}</td>
                    <td className="p-3 text-right font-medium tabular-nums">{m.nes_vivants}</td>
                    <td className="p-3 text-right text-red-700 tabular-nums">{m.nes_morts ?? 0}</td>
                    <td className="p-3 text-right text-red-700 tabular-nums">{m.momifies ?? 0}</td>
                    <td className="p-3 text-right text-red-700 tabular-nums">{m.ecrases ?? 0}</td>
                    <td className="p-3 text-right">
                      {m.sevrages?.[0] ? (
                        <Badge variant="success">{m.sevrages[0].nb_sevres} sevrés</Badge>
                      ) : (
                        <Badge variant="secondary">En cours</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* === Détails par portée : cards riches conservées en vue secondaire === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {(mb ?? []).map((m: any) => {
          const sev = m.sevrages?.[0]
          const ratio = m.nes_totaux > 0 ? m.nes_vivants / m.nes_totaux : 0
          const tone = toneTauxPortee(ratio)
          const tauxVariant = TONE_TO_VARIANT[tone]
          return (
            <Card key={m.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <CardTitle className="text-base">
                      {m.truie?.nom ?? m.truie?.tag}
                    </CardTitle>
                    <div className="text-xs text-[var(--sf-muted)] font-mono tabular-nums mt-1">
                      {m.truie?.tag} ·{' '}
                      {new Date(m.date_mise_bas).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                  <Badge variant={tauxVariant}>
                    {Math.round(ratio * 100)}% vivants
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                {/* === Totaux : 2 cards (Vivants / Totaux) === */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div
                    className="p-2 text-center border border-[var(--sf-line)]"
                    style={{ background: 'var(--sf-success-bg, #DCE9CB)' }}
                  >
                    <div className="text-xl font-bold text-[var(--sf-success-ink,#1F3414)] tabular-nums">
                      {m.nes_vivants}
                    </div>
                    <div
                      className="text-[10px] text-[var(--sf-success-ink,#1F3414)] opacity-80 uppercase tracking-[0.1em]"
                      style={{
                        fontFamily:
                          "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                      }}
                    >
                      Vivants
                    </div>
                  </div>
                  <div
                    className="p-2 text-center border border-[var(--sf-line)]"
                    style={{ background: 'var(--sf-surface-2, #F1ECE0)' }}
                  >
                    <div className="text-xl font-bold text-[var(--sf-ink)] tabular-nums">
                      {m.nes_totaux}
                    </div>
                    <div
                      className="text-[10px] text-[var(--sf-muted)] uppercase tracking-[0.1em]"
                      style={{
                        fontFamily:
                          "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                      }}
                    >
                      Totaux
                    </div>
                  </div>
                </div>

                {/* === Décomposition mortalité : Mort-nés / Momifiés / Écrasés === */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div
                    className="p-2 text-center border border-[var(--sf-line)]"
                    style={{ background: 'var(--sf-danger-bg, #F1D4CE)' }}
                  >
                    <div className="text-lg font-bold text-[var(--sf-danger-ink,#7A2A1F)] tabular-nums">
                      {m.nes_morts ?? 0}
                    </div>
                    <div
                      className="text-[10px] text-[var(--sf-danger-ink,#7A2A1F)] opacity-80 uppercase tracking-[0.1em]"
                      style={{
                        fontFamily:
                          "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                      }}
                    >
                      Mort-nés
                    </div>
                  </div>
                  <div
                    className="p-2 text-center border border-[var(--sf-line)]"
                    style={{ background: 'var(--sf-warning-bg, #F5E6C5)' }}
                  >
                    <div className="text-lg font-bold text-[var(--sf-warning-ink,#5C4416)] tabular-nums">
                      {m.momifies ?? 0}
                    </div>
                    <div
                      className="text-[10px] text-[var(--sf-warning-ink,#5C4416)] opacity-80 uppercase tracking-[0.1em]"
                      style={{
                        fontFamily:
                          "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                      }}
                    >
                      Momifiés
                    </div>
                  </div>
                  <div
                    className="p-2 text-center border border-[var(--sf-line)]"
                    style={{ background: 'var(--sf-danger-bg, #F1D4CE)' }}
                  >
                    <div className="text-lg font-bold text-[var(--sf-danger-ink,#7A2A1F)] tabular-nums">
                      {m.ecrases ?? 0}
                    </div>
                    <div
                      className="text-[10px] text-[var(--sf-danger-ink,#7A2A1F)] opacity-80 uppercase tracking-[0.1em]"
                      style={{
                        fontFamily:
                          "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                      }}
                    >
                      Écrasés
                    </div>
                  </div>
                </div>
                {m.bcs_truie != null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--sf-muted)]">BCS truie</span>
                    <span className="font-mono tabular-nums text-[var(--sf-ink)]">
                      {Number(m.bcs_truie).toFixed(1)} / 5
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--sf-muted)]">Poids portée</span>
                  <span className="font-mono tabular-nums text-[var(--sf-ink)]">
                    {m.poids_portee_kg ?? '—'} kg
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[var(--sf-muted)]">Durée</span>
                  <span className="font-mono tabular-nums text-[var(--sf-ink)]">
                    {m.duree_minutes ?? '—'} min
                  </span>
                </div>
                {sev && (
                  <div className="mt-2 pt-2 border-t border-[var(--sf-line)] text-xs">
                    <div className="font-semibold text-[var(--sf-success-ink,#1F3414)] mb-1">
                      ✓ Sevrage effectué le{' '}
                      {new Date(sev.date_sevrage).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--sf-muted)]">Sevrés</span>
                      <span className="font-mono font-bold tabular-nums text-[var(--sf-ink)]">
                        {sev.nb_sevres}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
      </>
      )}

      {/* === FAB mobile === */}
      <MisesBasFab saillies={saillesPourMb} />
    </div>
  )
}
