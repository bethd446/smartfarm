import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/export-button'
import { Package, AlertTriangle } from 'lucide-react'
import {
  DialogEntreeStock,
  DialogSortieStock,
  DialogNouvelleMatiere,
} from './_dialogs-stock'
import { isAlerte } from '@/lib/stock-helpers'
import { EmptyOnboarding } from '@/components/ui/empty-onboarding'

export default async function StockPage() {
  const sb = await createClient()
  const [{ data: stocks }, { data: fournisseurs }] = await Promise.all([
    sb.from('matieres_premieres').select('*').order('nom'),
    sb.from('fournisseurs').select('*').order('nom'),
  ])

  // NB : emoji conservés en exception DS pour ce contexte "stock matériel"
  // (le brief permet cette dérogation au vocabulaire icônes Lucide).
  const typeIcons: any = {
    matiere_premiere: '🌾',
    aliment_fini: '🥄',
    vaccin: '💉',
    medicament: '💊',
    desinfectant: '🧴',
    consommable: '📦',
  }

  const totalValeur = (stocks ?? []).reduce(
    (acc, s: any) => acc + (s.stock_actuel * (s.cout_moyen_unite ?? 0)),
    0,
  )

  // Présentation only : articles sous le seuil (règle isAlerte inchangée) pour la bannière critique.
  const enAlerte = (stocks ?? []).filter((s: any) => isAlerte(s))

  return (
    <div className="space-y-6">
      {/* === Header de page === */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            <Package className="h-8 w-8 text-[var(--sf-accent)]" />
            Stock matériel
          </h1>
          <p
            className="text-sm text-[var(--sf-muted)] mt-1"
            style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
          >
            Matières premières · Vaccins · Médicaments · Consommables
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton table="matieres_premieres" />
          <DialogEntreeStock
            matieres={(stocks ?? []) as any}
            fournisseurs={(fournisseurs ?? []) as any}
          />
          <DialogSortieStock matieres={(stocks ?? []) as any} />
          <DialogNouvelleMatiere />
        </div>
      </div>

      {/* === Bannière alerte critique (gabarit Verger .urg.crit) — présentation only === */}
      {enAlerte.length > 0 && (
        <div
          className="flex items-center gap-3.5 rounded-[13px] border px-3.5 py-3"
          style={{
            background: 'var(--sf-danger-bg, #F7E4E1)',
            borderColor: 'rgba(181,72,59,.35)',
          }}
        >
          <span
            className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px]"
            style={{ background: 'var(--sf-danger, #B5483B)', color: '#fff' }}
          >
            <AlertTriangle className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <b
              className="block text-sm font-semibold leading-tight"
              style={{ color: 'var(--sf-danger-ink, #933329)' }}
            >
              {enAlerte.length} article{enAlerte.length > 1 ? 's' : ''} sous le seuil d&apos;alerte
            </b>
            <small className="text-xs" style={{ color: 'var(--sf-muted)' }}>
              Rupture imminente —{' '}
              {enAlerte
                .slice(0, 3)
                .map((s: any) => s.nom)
                .join(' · ')}
              {enAlerte.length > 3 ? ` · +${enAlerte.length - 3}` : ''}
            </small>
          </div>
        </div>
      )}

      {/* === KPI Cards : Card patché (double-trait automatique) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <div
              className="eyebrow text-[var(--sf-muted)]"
              style={{
                fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                fontSize: '11px',
              }}
            >
              Articles en stock
            </div>
            <div className="text-3xl font-bold mt-1 tabular-nums text-[var(--sf-ink)]">
              {stocks?.length ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div
              className="eyebrow text-[var(--sf-muted)]"
              style={{
                fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                fontSize: '11px',
              }}
            >
              Valeur stock
            </div>
            <div className="text-3xl font-bold mt-1 tabular-nums text-[var(--sf-ink)]">
              {totalValeur.toLocaleString('fr-FR')}{' '}
              <span className="text-sm text-[var(--sf-muted)] font-normal">FCFA</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div
              className="eyebrow text-[var(--sf-muted)]"
              style={{
                fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                fontSize: '11px',
              }}
            >
              Fournisseurs
            </div>
            <div className="text-3xl font-bold mt-1 tabular-nums text-[var(--sf-ink)]">
              {fournisseurs?.length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === Tableau inventaire : pattern carnet (eyebrow + wrapper double-trait) === */}
      <div>
        <div
          className="eyebrow text-[var(--sf-muted)] mb-2"
          style={{
            fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            fontSize: '11px',
          }}
        >
          Inventaire
        </div>
        <div
          className="overflow-x-auto"
          style={{
            borderTop: 'var(--sf-rule-top, 4px solid var(--sf-primary, #2D4A1F))',
            borderBottom: 'var(--sf-rule-bottom, 1px solid var(--sf-border, rgba(0,0,0,0.18)))',
            borderLeft: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
            borderRight: 'var(--sf-rule-side, 1px solid var(--sf-line, rgba(0,0,0,0.12)))',
            background: 'var(--sf-surface-1, #FFFFFF)',
          }}
        >
          <table className="w-full text-sm">
            <thead
              className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
              style={{
                fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                fontSize: '11px',
              }}
            >
              <tr>
                <th className="py-3 px-4 font-semibold">Article</th>
                <th className="py-3 px-4 font-semibold">Type</th>
                <th className="py-3 px-4 font-semibold">Stock</th>
                <th className="py-3 px-4 font-semibold">Seuil alerte</th>
                <th className="py-3 px-4 font-semibold">Coût unitaire</th>
                <th className="py-3 px-4 font-semibold">Valeur</th>
              </tr>
            </thead>
            <tbody>
              {(stocks ?? []).map((s: any) => {
                const alerte = isAlerte(s)
                // Niveau de couverture (présentation only) : bad = sous seuil, warn = proche du seuil, ok = sain.
                const seuil = s.seuil_alerte
                const niveau =
                  alerte
                    ? 'bad'
                    : seuil != null && s.stock_actuel != null && s.stock_actuel < seuil * 1.5
                      ? 'warn'
                      : 'ok'
                const couvBg =
                  niveau === 'bad'
                    ? 'var(--sf-danger-bg, #F7E4E1)'
                    : niveau === 'warn'
                      ? 'var(--sf-warning-bg, #FBEEDF)'
                      : 'var(--sf-success-bg, #EDF2E6)'
                const couvInk =
                  niveau === 'bad'
                    ? 'var(--sf-danger-ink, #933329)'
                    : niveau === 'warn'
                      ? 'var(--sf-warning-ink, #B36E33)'
                      : 'var(--sf-success-ink, #4F7239)'
                return (
                  <tr
                    key={s.id}
                    className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span aria-hidden>{typeIcons[s.type] ?? '📦'}</span>
                        <span className="font-medium text-[var(--sf-ink)]">{s.nom}</span>
                        {alerte && (
                          <AlertTriangle className="h-3.5 w-3.5 text-[var(--sf-danger-ink,#7A2A1F)]" />
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="outline" className="capitalize">
                        {s.type.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-bold tabular-nums"
                        style={{ background: couvBg, color: couvInk }}
                      >
                        <span
                          aria-hidden
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: couvInk }}
                        />
                        {s.stock_actuel} {s.unite}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-muted)]">
                      {s.seuil_alerte ?? '—'} {s.unite}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">
                      {s.cout_moyen_unite?.toLocaleString('fr-FR') ?? '—'} FCFA
                    </td>
                    <td className="py-3 px-4 font-mono font-bold tabular-nums text-[var(--sf-ink)]">
                      {(s.stock_actuel * (s.cout_moyen_unite ?? 0)).toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                )
              })}
              {(!stocks || stocks.length === 0) && (
                <tr>
                  <td colSpan={6} className="p-6">
                    <EmptyOnboarding
                      icon={<Package className="h-12 w-12" />}
                      eyebrow="MODULE STOCK"
                      title="Ton inventaire est vide"
                      description="Enregistre ta première matière première (maïs, tourteau soja…) pour suivre ton stock en temps réel et recevoir des alertes en cas de rupture."
                      cta={{ label: 'Ajouter un article', href: '/stock?action=new' }}
                      ctaSecondary={{
                        label: 'Voir le référentiel CI',
                        href: '/alimentation/matieres',
                      }}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
