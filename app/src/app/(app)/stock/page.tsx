import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ExportButton } from '@/components/export-button'
import { Package, Plus, AlertTriangle, ArrowDown, ArrowUp } from 'lucide-react'
import {
  DialogEntreeStock,
  DialogSortieStock,
  DialogNouvelleMatiere,
} from './_dialogs-stock'
import { StockFab } from './_fab'

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

      {/* === KPI Cards : Card patché (double-trait automatique) === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <div
              className="eyebrow text-[var(--sf-muted)]"
              style={{
                fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
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
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
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
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
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
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
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
                const alerte = s.seuil_alerte && s.stock_actuel < s.seuil_alerte
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
                      {alerte ? (
                        <Badge variant="danger">
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
                      {(s.stock_actuel * (s.cout_moyen_unite ?? 0)).toLocaleString('fr-FR')} FCFA
                    </td>
                  </tr>
                )
              })}
              {(!stocks || stocks.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[var(--sf-muted)]">
                    Aucun article en stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* === FAB mobile === */}
      <StockFab />
    </div>
  )
}
