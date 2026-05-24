'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Dot,
} from 'recharts'

/**
 * Phase 4.D — Client Component pour le graphique d'évolution du poids
 * 
 * Utilise recharts pour afficher une courbe poids vs date, avec points colorés par contexte.
 */

type PeseeDot = {
  date_pesee: string
  poids_kg: number
  contexte: string
}

type CourbePoidsClientProps = {
  data: PeseeDot[]
}

// Couleurs par contexte
const CONTEXTE_COLORS: Record<string, string> = {
  sevrage: 'var(--sf-accent, #A16207)',
  'contrôle': 'var(--sf-primary, #2D4A1F)',
  transition: 'var(--sf-primary, #2D4A1F)',
  croissance: 'var(--sf-primary, #2D4A1F)',
  finition: 'var(--sf-terre, #9A3412)',
  'pré_abattage': 'var(--sf-danger-ink, #7A2A1F)',
}

function getContexteColor(contexte: string): string {
  const c = contexte.toLowerCase().replace('_', ' ')
  return CONTEXTE_COLORS[c] ?? 'var(--sf-primary, #2D4A1F)'
}

export function CourbePoidsClient({ data }: CourbePoidsClientProps) {
  // Formater les dates pour l'affichage sur l'axe X (format court)
  const chartData = data.map((p) => ({
    date: new Date(p.date_pesee).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    }),
    dateFull: new Date(p.date_pesee).toLocaleDateString('fr-FR'),
    poids_kg: p.poids_kg,
    contexte: p.contexte,
  }))

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0].payload
    return (
      <div
        className="rounded border border-[var(--sf-line)] bg-[var(--sf-surface-1)] p-3 shadow-md"
        style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
      >
        <div className="font-bold text-sm mb-1" style={{ color: 'var(--sf-ink)' }}>
          {data.dateFull}
        </div>
        <div className="text-xs" style={{ color: 'var(--sf-primary)' }}>
          Poids : {data.poids_kg.toFixed(1)} kg
        </div>
        <div className="text-xs text-[var(--sf-muted)] capitalize mt-1">
          {data.contexte}
        </div>
      </div>
    )
  }

  // Custom Dot avec couleur selon contexte
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props
    const color = getContexteColor(payload.contexte)
    return (
      <Dot cx={cx} cy={cy} r={5} fill={color} stroke={color} strokeWidth={2} />
    )
  }

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-line)" />
        <XAxis
          dataKey="date"
          label={{
            value: 'Date de pesée',
            position: 'insideBottom',
            offset: -10,
            style: {
              fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
              fontSize: 12,
              fill: 'var(--sf-muted)',
            },
          }}
          tick={{
            fontSize: 11,
            fill: 'var(--sf-muted)',
            fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
          }}
          stroke="var(--sf-line)"
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis
          label={{
            value: 'Poids (kg)',
            angle: -90,
            position: 'insideLeft',
            style: {
              fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
              fontSize: 12,
              fill: 'var(--sf-muted)',
            },
          }}
          tick={{
            fontSize: 12,
            fill: 'var(--sf-muted)',
            fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
          }}
          stroke="var(--sf-line)"
          domain={[0, 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="poids_kg"
          stroke="var(--sf-primary, #2D4A1F)"
          strokeWidth={3}
          dot={<CustomDot />}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
