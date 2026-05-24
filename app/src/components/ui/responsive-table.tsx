'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

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
  /** Callback au clic sur une ligne (optionnel) */
  onRowClick?: (item: T) => void
  /** ClassName custom pour le conteneur */
  className?: string
  /** Message si vide */
  emptyMessage?: string
}

/**
 * ResponsiveTable — Table HTML sur desktop (≥768px), cards verticales sur mobile
 * 
 * Usage:
 * ```tsx
 * <ResponsiveTable
 *   data={items}
 *   columns={[
 *     { key: 'tag', label: 'TAG', primary: true },
 *     { key: 'nom', label: 'NOM' },
 *     { key: 'statut', label: 'STATUT', render: (v) => <Badge>{v}</Badge> },
 *   ]}
 *   getRowKey={(item) => item.id}
 *   onRowClick={(item) => router.push(`/cheptel/${item.id}`)}
 * />
 * ```
 */
export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  getRowKey,
  onRowClick,
  className,
  emptyMessage = 'Aucune donnée à afficher',
}: ResponsiveTableProps<T>) {
  // Déterminer colonne primaire (première par défaut)
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
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col, idx) => (
                <TableHead
                  key={`h-${idx}`}
                  className={cn(
                    'text-left text-[var(--sf-muted)]',
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
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow
                key={getRowKey(item)}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={cn(
                  onRowClick &&
                    'cursor-pointer hover:bg-[var(--sf-surface-2)]/40 transition-colors',
                )}
              >
                {columns.map((col, idx) => {
                  const value = item[col.key as keyof T]
                  const rendered = col.render ? col.render(value, item) : value
                  return (
                    <TableCell
                      key={`c-${idx}`}
                      className={cn('text-sm', col.className)}
                    >
                      {rendered ?? '—'}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
              onClick={onRowClick ? () => onRowClick(item) : undefined}
              className={cn(
                'rounded-md border border-[var(--sf-line)] bg-[var(--sf-surface)] p-4 space-y-2',
                onRowClick && 'cursor-pointer hover:bg-[var(--sf-surface-2)]/40 transition-colors',
              )}
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
