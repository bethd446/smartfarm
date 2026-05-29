import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/export-button'
import {
  Package,
  Plus,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  Coins,
  Truck,
} from 'lucide-react'
import {
  DialogEntreeStock,
  DialogSortieStock,
  DialogNouvelleMatiere,
} from './_dialogs-stock'
import { StockFab } from './_fab'
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

  // D3-L3 : KPI grille 3 cards → bandeau registre dense (Pattern A)
  // 1. Articles en stock — total inventaire
  // 2. Valeur stock — somme stock_actuel × cout_moyen_unite (FCFA)
  // 3. Fournisseurs — total fournisseurs actifs
  const articlesEnAlerte = (stocks ?? []).filter((s: any) => isAlerte(s)).length
  const stockCritique = articlesEnAlerte > 0
  const kpiCells = [
    {
      icon: stockCritique ? AlertTriangle : Boxes,
      tone: stockCritique
        ? 'var(--sf-danger-ink, #7A2A1F)'
        : 'var(--sf-ink, #1a1a1a)',
      period: stockCritique ? 'alerte' : 'inventaire',
      label: 'Articles',
      value: (stocks?.length ?? 0).toString(),
      sub: stockCritique
        ? `${articlesEnAlerte} sous seuil critique`
        : 'matières · vaccins · consommables',
      critical: stockCritique,
    },
    {
      icon: Coins,
      tone: 'var(--sf-ink, #1a1a1a)',
      period: 'valorisé',
      label: 'Valeur stock',
      value: totalValeur.toLocaleString('fr-FR'),
      sub: 'FCFA — coût moyen pondéré',
      critical: false,
    },
    {
      icon: Truck,
      tone: 'var(--sf-ink, #1a1a1a)',
      period: 'partenaires',
      label: 'Fournisseurs',
      value: (fournisseurs?.length ?? 0).toString(),
      sub: 'référencés sur la ferme',
      critical: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* === Header de page (eyebrow LOGISTIQUE + titre Big Shoulders) === */}
      <div className="flex items-center justify-between">
        <div>
          <div
            className="text-[11px] uppercase tracking-[0.16em] text-[var(--sf-muted)] mb-1"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            Logistique
          </div>
          <h1
            className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)]"
            style={{
              fontFamily:
                "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            }}
          >
            <Package className="h-8 w-8 text-[var(--sf-accent)]" />
            Stock matériel
          </h1>
          <p
            className="text-sm text-[var(--sf-muted)] mt-1"
            style={{
              fontFamily:
                "var(--sf-font-body, 'Instrument Sans', sans-serif)",
            }}
          >
            Matières premières · Vaccins · Médicaments · Consommables
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <ExportButton table="matieres_premieres" />
          <DialogEntreeStock
            trigger={
              <Button variant="outline" size="lg">
                <ArrowUp className="h-5 w-5 mr-2" />
                Entrée
              </Button>
            }
            matieres={(stocks ?? []) as any}
            fournisseurs={(fournisseurs ?? []) as any}
          />
          <DialogSortieStock
            trigger={
              <Button variant="outline" size="lg">
                <ArrowDown className="h-5 w-5 mr-2" />
                Sortie
              </Button>
            }
            matieres={(stocks ?? []) as any}
          />
          <DialogNouvelleMatiere
            trigger={
              // Audit mobile 2026-05-25 — masqué <lg (FAB suffit en mobile, dédoublonner CTA).
              <Button variant="accent" size="lg" className="hidden lg:inline-flex">
                <Plus className="h-5 w-5 mr-2" />
                Nouveau matériel
              </Button>
            }
          />
        </div>
      </div>

      {/* === KPI bandeau registre dense (Pattern A) === */}
      <section
        aria-label="Indicateurs stock"
        className="border-t-2 border-b border-[var(--sf-line)]"
        style={{ borderTopColor: 'var(--sf-primary)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3">
          {kpiCells.map((c, i) => {
            const Icon = c.icon
            return (
              <div
                key={c.label}
                className={[
                  'min-h-[44px] px-3 py-3 sm:px-4',
                  'border-[var(--sf-line)]',
                  'sm:border-l',
                  i === 0 ? 'sm:border-l-0' : '',
                  i > 0 ? 'border-t sm:border-t-0' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                {...(c.critical
                  ? { role: 'alert', 'aria-live': 'polite' as const }
                  : {})}
              >
                <div className="flex items-center justify-between gap-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: c.tone }} />
                  <span
                    className="text-[10px] uppercase tracking-[0.16em] shrink-0"
                    style={{
                      color: c.critical ? c.tone : 'var(--sf-subtle, #8A7F6D)',
                      fontFamily:
                        "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                    }}
                  >
                    {c.period}
                  </span>
                </div>
                <div
                  className="mt-1.5 text-2xl font-bold tabular-nums leading-tight"
                  style={{ color: c.tone }}
                >
                  {c.value}
                </div>
                <div
                  className="mt-1 text-[11px] uppercase tracking-[0.12em] leading-tight"
                  style={{
                    color: 'var(--sf-muted, #5C5346)',
                    fontFamily:
                      "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  }}
                >
                  {c.label}
                </div>
                <div
                  className="mt-0.5 text-[11px] tabular-nums leading-tight line-clamp-1"
                  style={{ color: 'var(--sf-subtle, #8A7F6D)' }}
                >
                  {c.sub}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* === Tableau inventaire — Pattern C : table dense, hairlines === */}
      <section>
        <h3
          className="eyebrow text-[var(--sf-muted)] mb-2"
          style={{
            fontFamily:
              "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          Inventaire détaillé
        </h3>
        {(!stocks || stocks.length === 0) ? (
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
        ) : (
          <div
            className="overflow-x-auto -mx-4 sm:mx-0 border-t-2"
            style={{ borderTopColor: 'var(--sf-primary,#2D4A1F)' }}
          >
            <table className="w-full min-w-[800px] text-sm">
              <thead
                className="border-b border-[var(--sf-line)] text-left text-[var(--sf-muted)]"
                style={{
                  fontFamily:
                    "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
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
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
                      {...(alerte
                        ? { role: 'alert', 'aria-live': 'polite' as const }
                        : {})}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span aria-hidden>{typeIcons[s.type] ?? '📦'}</span>
                          <span className="font-medium text-[var(--sf-ink)]">
                            {s.nom}
                          </span>
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
                        {alerte ? (
                          <Badge variant="danger" className="!normal-case">
                            {s.stock_actuel} {s.unite}
                          </Badge>
                        ) : (
                          <span className="font-mono font-bold tabular-nums text-[var(--sf-ink)]">
                            {s.stock_actuel} {s.unite}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-muted)]">
                        {s.seuil_alerte ?? '—'} {s.unite}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">
                        {s.cout_moyen_unite?.toLocaleString('fr-FR') ?? '—'} FCFA
                      </td>
                      <td className="py-3 px-4 font-mono font-bold tabular-nums text-[var(--sf-ink)]">
                        {(
                          s.stock_actuel * (s.cout_moyen_unite ?? 0)
                        ).toLocaleString('fr-FR')}{' '}
                        FCFA
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* === FAB mobile === */}
      <StockFab
        matieres={(stocks ?? []) as any}
        fournisseurs={(fournisseurs ?? []) as any}
      />
    </div>
  )
}
