'use client'

import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import {
  toneIssf,
  toneProductivite,
  toneTmm,
  toneNesVivants,
  toneColors,
  type KpiTone,
} from '@/components/kpi/kpi-tech-card'

export type KpiTechTruieRow = {
  truie_id: string
  tag: string
  nom: string | null
  nb_mises_bas: number
  nb_sevrages: number
  nb_cycles_issf: number
  nes_vivants_moyen: number | null
  sevres_moyen: number | null
  issf_jours: number | null
  tmm_pct: number | null
  productivite_numerique: number | null
}

type SortKey =
  | 'tag'
  | 'nb_mises_bas'
  | 'nes_vivants_moyen'
  | 'sevres_moyen'
  | 'issf_jours'
  | 'tmm_pct'
  | 'productivite_numerique'

type SortDir = 'asc' | 'desc'

/** Convertit en number ou retourne null pour NULL DB. */
function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'string' ? Number(v) : v
  return Number.isFinite(n) ? n : null
}

/** Cellule colorée selon le ton. */
function ToneCell({
  tone,
  value,
  unit = '',
  digits = 1,
}: {
  tone: KpiTone
  value: number | string | null | undefined
  unit?: string
  digits?: number
}) {
  const n = num(value)
  const { fg } = toneColors(tone)
  if (n === null) {
    return <span className="text-[var(--sf-muted)] italic">—</span>
  }
  return (
    <span className="font-mono font-bold tabular-nums" style={{ color: fg }}>
      {n.toFixed(digits)}
      {unit ? <span className="text-[var(--sf-muted)] font-normal"> {unit}</span> : null}
    </span>
  )
}

export function KpiTechRanking({ rows }: { rows: KpiTechTruieRow[] }) {
  // Tri par défaut : productivité numérique desc (meilleures truies en haut),
  // les NULL relégués à la fin.
  const [sortKey, setSortKey] = useState<SortKey>('productivite_numerique')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const sorted = useMemo(() => {
    const arr = [...rows]
    arr.sort((a, b) => {
      const va = sortKey === 'tag' ? a.tag : num((a as any)[sortKey])
      const vb = sortKey === 'tag' ? b.tag : num((b as any)[sortKey])
      // NULL toujours à la fin, quel que soit asc/desc
      if (va === null && vb === null) return 0
      if (va === null) return 1
      if (vb === null) return -1
      if (sortKey === 'tag') {
        return sortDir === 'asc'
          ? (va as string).localeCompare(vb as string)
          : (vb as string).localeCompare(va as string)
      }
      return sortDir === 'asc'
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number)
    })
    return arr
  }, [rows, sortKey, sortDir])

  function toggle(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // par défaut : tag asc, tout le reste desc (meilleur en haut)
      setSortDir(key === 'tag' ? 'asc' : 'desc')
    }
  }

  const headStyle: React.CSSProperties = {
    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  }

  function Th({ k, children }: { k: SortKey; children: React.ReactNode }) {
    const active = sortKey === k
    return (
      <th
        scope="col"
        className="py-3 px-4 font-semibold select-none cursor-pointer hover:text-[var(--sf-ink)]"
      >
        <button
          type="button"
          onClick={() => toggle(k)}
          className="inline-flex items-center gap-1"
        >
          {children}
          {active ? (
            sortDir === 'asc' ? (
              <ChevronUp className="h-3 w-3" aria-hidden />
            ) : (
              <ChevronDown className="h-3 w-3" aria-hidden />
            )
          ) : (
            <span className="inline-block w-3" aria-hidden />
          )}
        </button>
      </th>
    )
  }

  return (
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
          style={headStyle}
        >
          <tr>
            <Th k="tag">Truie</Th>
            <Th k="nb_mises_bas">Portées</Th>
            <Th k="nes_vivants_moyen">Nés vivants / portée</Th>
            <Th k="sevres_moyen">Sevrés / portée</Th>
            <Th k="issf_jours">ISSF (j)</Th>
            <Th k="tmm_pct">TMM (%)</Th>
            <Th k="productivite_numerique">Productivité num.</Th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => {
            const insufficient = t.nb_mises_bas === 0 && t.nb_sevrages === 0
            return (
              <tr
                key={t.truie_id}
                className="border-b border-[var(--sf-line)] hover:bg-[var(--sf-surface-2)]/40"
              >
                <td className="py-3 px-4 font-mono font-bold tabular-nums text-[var(--sf-ink)]">
                  {t.tag}
                  {t.nom ? (
                    <span className="ml-2 font-normal text-[var(--sf-muted)]">
                      {t.nom}
                    </span>
                  ) : null}
                </td>
                {insufficient ? (
                  <td
                    colSpan={6}
                    className="py-3 px-4 italic text-[var(--sf-muted)]"
                  >
                    Pas assez de cycles
                  </td>
                ) : (
                  <>
                    <td className="py-3 px-4 tabular-nums text-[var(--sf-ink)]">
                      {t.nb_mises_bas}
                    </td>
                    <td className="py-3 px-4">
                      <ToneCell
                        tone={toneNesVivants(t.nes_vivants_moyen)}
                        value={t.nes_vivants_moyen}
                        digits={1}
                      />
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-[var(--sf-ink)]">
                      {num(t.sevres_moyen) !== null
                        ? num(t.sevres_moyen)!.toFixed(1)
                        : <span className="text-[var(--sf-muted)] italic">—</span>}
                    </td>
                    <td className="py-3 px-4">
                      <ToneCell tone={toneIssf(t.issf_jours)} value={t.issf_jours} digits={1} />
                    </td>
                    <td className="py-3 px-4">
                      <ToneCell tone={toneTmm(t.tmm_pct)} value={t.tmm_pct} unit="%" digits={1} />
                    </td>
                    <td className="py-3 px-4">
                      <ToneCell
                        tone={toneProductivite(t.productivite_numerique)}
                        value={t.productivite_numerique}
                        digits={1}
                      />
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
