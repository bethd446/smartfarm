import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ResponsiveTableColumn<T> {
  /** Clé de la propriété dans l'objet data */
  key: keyof T | string
  /** Label de la colonne (header desktop + label card mobile) */
  label: string
  /** Colonne primaire (devient titre de card en mode mobile) */
  primary?: boolean
  /** Fonction de rendu custom (optionnel) */
  render?: (value: any, item: T) => React.ReactNode
  /** ClassName custom pour la colonne */
  className?: string
  /** Header className (desktop seulement) */
  headerClassName?: string
}

export interface ResponsiveTableProps<T> {
  /** Données à afficher */
  data: T[]
  /** Définition des colonnes */
  columns: ResponsiveTableColumn<T>[]
  /** Fonction pour extraire la clé unique de chaque ligne */
  getRowKey: (item: T) => string | number
  /** ClassName custom pour le conteneur */
  className?: string
  /** Message si vide */
  emptyMessage?: string
}

/**
 * ResponsiveTable — Server Component
 * Desktop (≥768px) : table HTML
 * Mobile (<768px) : cards verticales
 *
 * 100% CSS responsive, sans JS, sans hooks → utilisable depuis Server Components.
 * Pour click handlers, wrappe ResponsiveTable dans un Link ou utilise un wrapper Client.
 */
export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  getRowKey,
  className,
  emptyMessage = 'Aucune donnée à afficher',
}: ResponsiveTableProps<T>) {
  const primaryCol = columns.find((c) => c.primary) ?? columns[0]

  if (data.length === 0) {
    return (
      <div className={cn('p-8 text-center text-sm text-[var(--sf-muted)]', className)}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      {/* ===== DESKTOP : Table HTML (≥768px) ===== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b border-[var(--sf-line)]">
            <tr className="border-b border-[var(--sf-line)] transition-colors">
              {columns.map((col, idx) => (
                <th
                  key={`h-${idx}`}
                  className={cn(
                    'h-10 px-2 text-left align-middle text-[var(--sf-muted)] font-semibold',
                    col.headerClassName,
                  )}
                  style={{
                    fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {data.map((item) => (
              <tr
                key={getRowKey(item)}
                className="border-b border-[var(--sf-line)] transition-colors hover:bg-[var(--sf-surface-2)]/40"
              >
                {columns.map((col, idx) => {
                  const value = item[col.key as keyof T]
                  const rendered = col.render ? col.render(value, item) : value
                  return (
                    <td
                      key={`c-${idx}`}
                      className={cn('p-2 align-middle text-sm', col.className)}
                    >
                      {rendered ?? '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== MOBILE : Cards verticales (<768px) ===== */}
      <div className="md:hidden space-y-3">
        {data.map((item) => {
          const primaryValue = item[primaryCol.key as keyof T]
          const primaryRendered = primaryCol.render
            ? primaryCol.render(primaryValue, item)
            : primaryValue

          return (
            <div
              key={getRowKey(item)}
              className="rounded-md border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 space-y-2"
            >
              {/* Titre card = colonne primary */}
              <div
                className="font-bold text-base text-[var(--sf-ink)]"
                style={{
                  fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                }}
              >
                {primaryRendered ?? '—'}
              </div>

              {/* Autres colonnes en liste LABEL: VALUE */}
              <div className="space-y-1.5 text-sm">
                {columns
                  .filter((col) => col !== primaryCol)
                  .map((col, idx) => {
                    const value = item[col.key as keyof T]
                    const rendered = col.render ? col.render(value, item) : value
                    return (
                      <div key={`m-${idx}`} className="flex justify-between gap-2">
                        <span
                          className="text-[var(--sf-muted)] uppercase text-xs font-semibold tracking-wider"
                          style={{
                            fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)",
                          }}
                        >
                          {col.label}
                        </span>
                        <span className={cn('text-[var(--sf-ink)]', col.className)}>
                          {rendered ?? '—'}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
