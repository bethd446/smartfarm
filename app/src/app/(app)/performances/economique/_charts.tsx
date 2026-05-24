'use client'

import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

type CoutParBande = {
  bande_nom: string
  cout_total_xof: number
}

type RepartitionCout = {
  categorie: string
  montant_xof: number
  pct: number
}

type ChartsProps = {
  coutParBande: CoutParBande[]
  repartitionCouts: RepartitionCout[]
}

// Palette Terrain Vivant
const COLORS = {
  primary: 'var(--sf-primary)', // #2D4A1F
  accent: 'var(--sf-accent)', // #A16207
  terre: 'var(--sf-terre)', // #9A3412
  muted: 'var(--sf-muted)',
}

const PIE_COLORS = ['#2D4A1F', '#A16207', '#9A3412', '#78716C']

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--sf-muted)',
}

// Format XOF
function fmtXOF(n: number): string {
  return new Intl.NumberFormat('fr-CI', { 
    style: 'currency', 
    currency: 'XOF', 
    maximumFractionDigits: 0 
  }).format(n)
}

export function EconomiqueCharts({ coutParBande, repartitionCouts }: ChartsProps) {
  return (
    <>
      {/* ===== BAR CHART : Coût aliment par bande ===== */}
      <div className="border border-[var(--sf-line)] rounded-lg p-6 bg-[var(--sf-surface)]">
        <h2
          className="text-xl uppercase tracking-wide text-[var(--sf-ink)] mb-4"
          style={eyebrowStyle}
        >
          Coût aliment par bande (XOF)
        </h2>
        
        {coutParBande.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={coutParBande}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-line)" />
              <XAxis 
                dataKey="bande_nom" 
                tick={{ fill: 'var(--sf-ink)', fontSize: 12 }}
                style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
              />
              <YAxis 
                tick={{ fill: 'var(--sf-muted)', fontSize: 11 }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
              />
              <Tooltip 
                formatter={(value: any) => [fmtXOF(value as number), 'Coût']}
                contentStyle={{ 
                  backgroundColor: 'var(--sf-surface)', 
                  border: '1px solid var(--sf-line)',
                  borderRadius: '6px',
                  fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
                }}
              />
              <Bar dataKey="cout_total_xof" fill={COLORS.primary} name="Coût total XOF" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-80 flex items-center justify-center text-[var(--sf-muted)] text-sm">
            Aucune donnée disponible
          </div>
        )}
      </div>

      {/* ===== PIE CHART : Répartition coûts ===== */}
      <div className="border border-[var(--sf-line)] rounded-lg p-6 bg-[var(--sf-surface)]">
        <h2
          className="text-xl uppercase tracking-wide text-[var(--sf-ink)] mb-2"
          style={eyebrowStyle}
        >
          Répartition des coûts de production
        </h2>
        
        {repartitionCouts.some(r => r.montant_xof === 0) && (
          <div className="text-xs text-[var(--sf-accent)] mb-3 italic">
            ⚠ Estimation basée sur des moyennes sectorielles CI — à affiner avec vos données réelles
          </div>
        )}

        {repartitionCouts.length > 0 ? (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={repartitionCouts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) => `${entry.pct?.toFixed(0) ?? 0}%`}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="montant_xof"
                >
                  {repartitionCouts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [fmtXOF(value as number), 'Coût']}
                  contentStyle={{ 
                    backgroundColor: 'var(--sf-surface)', 
                    border: '1px solid var(--sf-line)',
                    borderRadius: '6px',
                    fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Légende custom */}
            <div className="flex flex-col gap-2">
              {repartitionCouts.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                  />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-[var(--sf-ink)]">
                      {item.categorie}
                    </span>
                    <span className="text-xs text-[var(--sf-muted)] tabular-nums">
                      {fmtXOF(item.montant_xof)} ({item.pct.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="h-80 flex items-center justify-center text-[var(--sf-muted)] text-sm">
            Aucune donnée disponible
          </div>
        )}
      </div>
    </>
  )
}
