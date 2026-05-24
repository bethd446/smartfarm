'use client'

import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type CroissanceDataPoint = {
  age_jours: number
  poids_kg: number
  stade: string
  gmq_g_j: number | null
}

type Bande = {
  id: string
  nom: string
  code: string
}

type CroissanceChartProps = {
  referentiel: CroissanceDataPoint[]
  reel: CroissanceDataPoint[]
  bandes: Bande[]
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'var(--sf-muted)',
}

export function CroissanceChart({ referentiel, reel, bandes }: CroissanceChartProps) {
  const [selectedBande, setSelectedBande] = useState<string>('toutes')
  const [selectedRef, setSelectedRef] = useState<string>('lavalier-ci')

  // Fusionner les deux courbes en un seul dataset pour recharts
  // Chaque point a age_jours + poids_ref + poids_reel
  const agesUniques = Array.from(
    new Set([...referentiel.map((r) => r.age_jours), ...reel.map((r) => r.age_jours)])
  ).sort((a, b) => a - b)

  const chartData = agesUniques.map((age) => {
    const refPoint = referentiel.find((r) => r.age_jours === age)
    const reelPoint = reel.find((r) => r.age_jours === age)

    return {
      age_jours: age,
      ref: refPoint ? refPoint.poids_kg : null,
      reel: reelPoint ? reelPoint.poids_kg : null,
    }
  })

  // Tooltip custom FR
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null

    const data = payload[0].payload
    return (
      <div
        className="rounded border border-[var(--sf-line)] bg-[var(--sf-surface-1)] p-3 shadow-md"
        style={{ fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)" }}
      >
        <div className="font-bold text-sm mb-1" style={{ color: 'var(--sf-ink)' }}>
          Jour {data.age_jours}
        </div>
        {data.ref !== null && (
          <div className="text-xs" style={{ color: 'var(--sf-primary)' }}>
            Référentiel : {data.ref.toFixed(1)} kg
          </div>
        )}
        {data.reel !== null && (
          <div className="text-xs" style={{ color: 'var(--sf-accent)' }}>
            Réel ferme : {data.reel.toFixed(1)} kg
          </div>
        )}
      </div>
    )
  }

  const emptyState = reel.length === 0

  return (
    <div className="space-y-4">
      {/* Sélecteurs */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Sélecteur bande */}
        <div className="flex-1">
          <label htmlFor="bande-select" className="block mb-2 text-xs" style={eyebrowStyle}>
            BANDE
          </label>
          <Select value={selectedBande} onValueChange={setSelectedBande}>
            <SelectTrigger id="bande-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes les bandes</SelectItem>
              {bandes.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.nom} ({b.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sélecteur référentiel */}
        <div className="flex-1">
          <label htmlFor="ref-select" className="block mb-2 text-xs" style={eyebrowStyle}>
            RÉFÉRENTIEL
          </label>
          <Select value={selectedRef} onValueChange={setSelectedRef}>
            <SelectTrigger id="ref-select" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="lavalier-ci">Lavalier-Toulze CI</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart */}
      {emptyState ? (
        <div
          className="flex items-center justify-center bg-[var(--sf-surface-1)] rounded border border-[var(--sf-line)] text-center text-sm text-[var(--sf-muted)] p-8"
          style={{ height: '400px' }}
        >
          <div>
            <p className="font-semibold mb-2">Aucune pesée enregistrée</p>
            <p className="text-xs">
              Ajoutez des pesées depuis <strong>Cheptel → Animaux</strong> pour visualiser la courbe de
              croissance réelle.
            </p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--sf-line)" />
            <XAxis
              dataKey="age_jours"
              label={{ value: 'Âge (jours)', position: 'insideBottom', offset: -5 }}
              tick={{ fontSize: 12, fill: 'var(--sf-muted)' }}
              stroke="var(--sf-line)"
            />
            <YAxis
              label={{ value: 'Poids (kg)', angle: -90, position: 'insideLeft' }}
              tick={{ fontSize: 12, fill: 'var(--sf-muted)' }}
              stroke="var(--sf-line)"
              domain={[0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{
                fontFamily: "var(--sf-font-body, 'Instrument Sans', sans-serif)",
                fontSize: '12px',
              }}
            />
            <Line
              type="monotone"
              dataKey="ref"
              stroke="var(--sf-primary, #2d4a1f)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Référentiel Lavalier-Toulze"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="reel"
              stroke="var(--sf-accent, #a16207)"
              strokeWidth={3}
              dot={{ r: 4, fill: 'var(--sf-accent)' }}
              name="Réel ferme"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
