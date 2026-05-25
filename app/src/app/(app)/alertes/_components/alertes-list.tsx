'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { ListFilter, LayoutList, Group, Filter, BellOff, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlerteCard } from './alerte-card'
import type { Alerte } from '@/lib/alertes-engine'
import {
  REGLES_ALERTES,
  LABEL_CATEGORIE,
  ORDRE_GRAVITE,
  type CategorieAlerte,
} from '@/lib/alertes-regles'

/**
 * Smart Farm — Liste alertes avec filtres (Client Component)
 *
 * Filtres :
 *   - gravité : tous / critique / élevée / moyenne / info
 *   - catégorie : reproduction / sanitaire / nutrition / pertes / stock
 *   - regroupement : par catégorie ou par règle
 *
 * Source de vérité : `@/lib/alertes-regles`. Aucun mapping local ne doit
 * exister ici sous peine de divergence (cf. bug "Stock" affiché dans
 * "Autres" avant le fix P0-2).
 */

type Gravite = Alerte['gravite']
type GraviteFilter = 'tous' | Gravite
type CategorieFilter = 'tous' | CategorieAlerte
type Groupement = 'categorie' | 'regle'

/**
 * Clé de groupement pour les alertes dont la règle n'a pas (encore) de
 * mapping dans `REGLES_ALERTES`. On utilise `'autres'` (au pluriel) — le
 * label affiché est `'Autres'` via fallback dans `groupLabel`.
 *
 * NB : tant que FIX-A n'a pas mergé les entrées R13-R18 dans
 * `alertes-regles.ts`, ces règles tombent ici. C'est volontaire :
 * dégradation propre, jamais d'écran cassé.
 */
const CATEGORIE_FALLBACK = 'autres' as const

/**
 * Ordre canonique d'affichage des sections quand on groupe par catégorie.
 * Sanitaire en haut (priorité métier ferme), `autres` en queue pour ne
 * jamais reléguer une vraie catégorie sous le fourre-tout.
 */
const ORDRE_CATEGORIES: readonly string[] = [
  'sanitaire',
  'reproduction',
  'pertes',
  'stock',
  'nutrition',
  'observations',
  CATEGORIE_FALLBACK,
] as const

function getCategorie(regle_id: string): CategorieAlerte | typeof CATEGORIE_FALLBACK {
  const meta = REGLES_ALERTES?.[regle_id]
  if (meta) {
    return meta.categorie
  }
  // FIX 2026-05-23 BUG-3 : mapping des `type` exposés par la view
  // `v_alertes_actives` (qui ne correspondent pas aux clés Rxx-…) vers
  // les catégories fonctionnelles. Sans ça tout tombait sous "Autres".
  const t = (regle_id ?? '').toLowerCase()
  // Reproduction
  if (
    t.startsWith('retour_chaleurs') ||
    t.startsWith('chaleurs') ||
    t.startsWith('diag_gestation') ||
    t.startsWith('saillie') ||
    t.startsWith('mise_bas') ||
    t.startsWith('surveillance_mb') ||
    t.startsWith('preparation_maternite') ||
    t.startsWith('transfert_maternite') ||
    t.startsWith('sevrage') ||
    t.startsWith('colostrum')
  ) {
    return 'reproduction'
  }
  // Sanitaire
  if (
    t.startsWith('soins_porcelets') ||
    t.startsWith('vaccination') ||
    t.startsWith('traitement') ||
    t.startsWith('vermifuge') ||
    t.startsWith('fer_porcelet')
  ) {
    return 'sanitaire'
  }
  // Stock / nutrition
  if (t.startsWith('stock')) return 'stock'
  if (t.startsWith('aliment') || t.startsWith('eau')) return 'nutrition'
  if (t.startsWith('transition')) return 'reproduction'
  // Observations manuelles (F2)
  if (t === 'observation_manuelle' || t.startsWith('observation')) {
    return 'observations'
  }
  return CATEGORIE_FALLBACK
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  PROD-B — Snooze 24h alertes (localStorage only, pas de DB)                */
/* ────────────────────────────────────────────────────────────────────────── */

const SNOOZE_KEY = 'sf-snoozed-alertes'

function alerteKey(a: Alerte): string {
  return `${a.regle_id}::${a.cible_type}::${a.cible_id}`
}

function readSnoozeMap(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(SNOOZE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, number>) : {}
  } catch {
    return {}
  }
}

function writeSnoozeMap(map: Record<string, number>) {
  if (typeof window === 'undefined') return
  try {
    // Nettoyage : on jette les entrées expirées
    const now = Date.now()
    const cleaned: Record<string, number> = {}
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === 'number' && v > now) cleaned[k] = v
    }
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(cleaned))
  } catch {
    /* quota / private mode → on ignore */
  }
}

function snoozeAlerte(a: Alerte, hours = 24) {
  const map = readSnoozeMap()
  map[alerteKey(a)] = Date.now() + hours * 3_600_000
  writeSnoozeMap(map)
}

function unsnoozeAlerte(a: Alerte) {
  const map = readSnoozeMap()
  delete map[alerteKey(a)]
  writeSnoozeMap(map)
}

export function AlertesList({ alertes }: { alertes: Alerte[] }) {
  const [gravite, setGravite] = useState<GraviteFilter>('tous')
  const [categorie, setCategorie] = useState<CategorieFilter>('tous')
  const [groupement, setGroupement] = useState<Groupement>('categorie')

  // PROD-B : snooze localStorage (refresh tick + show-snoozed toggle)
  const [snoozeTick, setSnoozeTick] = useState(0)
  const [showSnoozed, setShowSnoozed] = useState(false)

  // Pagination client-side : 10 alertes par page
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Initial mount : on déclenche un re-render pour lire le localStorage côté client
  useEffect(() => {
    setSnoozeTick((t) => t + 1)
  }, [])

  const snoozeMap = useMemo(() => {
    // Re-lue à chaque tick (snooze/unsnooze)
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    snoozeTick
    return readSnoozeMap()
  }, [snoozeTick])

  function isAlerteSnoozed(a: Alerte): boolean {
    const ts = snoozeMap[alerteKey(a)]
    return typeof ts === 'number' && ts > Date.now()
  }

  function handleSnooze(a: Alerte) {
    snoozeAlerte(a, 24)
    setSnoozeTick((t) => t + 1)
    toast.success('Alerte masquée 24 h', {
      description: a.titre,
      action: {
        label: 'Annuler',
        onClick: () => {
          unsnoozeAlerte(a)
          setSnoozeTick((t) => t + 1)
        },
      },
    })
  }

  function handleUnsnooze(a: Alerte) {
    unsnoozeAlerte(a)
    setSnoozeTick((t) => t + 1)
    toast.success('Alerte réactivée', { description: a.titre })
  }

  const apresSnooze = useMemo(() => {
    if (showSnoozed) return alertes
    return alertes.filter((a) => !isAlerteSnoozed(a))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertes, snoozeMap, showSnoozed])

  const nbSnoozed = useMemo(
    () => alertes.filter((a) => isAlerteSnoozed(a)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alertes, snoozeMap],
  )

  const filtrees = useMemo(() => {
    return apresSnooze.filter((a) => {
      if (gravite !== 'tous' && a.gravite !== gravite) return false
      if (categorie !== 'tous' && getCategorie(a.regle_id) !== categorie) return false
      return true
    })
  }, [apresSnooze, gravite, categorie])

  const triees = useMemo(() => {
    return [...filtrees].sort(
      (a, b) => ORDRE_GRAVITE[a.gravite] - ORDRE_GRAVITE[b.gravite],
    )
  }, [filtrees])

  // Reset pagination quand les filtres changent
  useEffect(() => {
    setCurrentPage(1)
  }, [gravite, categorie, showSnoozed])

  // Pagination : calcul des groupes paginés
  const totalPages = Math.ceil(triees.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const endIdx = startIdx + itemsPerPage
  const alertesPaginees = triees.slice(startIdx, endIdx)

  const groupes = useMemo(() => {
    const map = new Map<string, Alerte[]>()
    for (const a of alertesPaginees) {
      const key =
        groupement === 'categorie'
          ? (getCategorie(a.regle_id) as string)
          : a.regle_id
      const arr = map.get(key) ?? []
      arr.push(a)
      map.set(key, arr)
    }
    const entries = Array.from(map.entries())

    // En mode catégorie, on applique l'ordre canonique
    // (sanitaire → reproduction → pertes → stock → nutrition → autres).
    // Les clés inconnues (ne devrait pas arriver) sont rangées juste avant
    // `autres` pour rester visibles.
    if (groupement === 'categorie') {
      const rank = (key: string) => {
        const i = ORDRE_CATEGORIES.indexOf(key)
        return i === -1 ? ORDRE_CATEGORIES.length - 1 : i
      }
      entries.sort(([a], [b]) => rank(a) - rank(b))
    }
    return entries
  }, [alertesPaginees, groupement])

  const groupLabel = (key: string) => {
    if (groupement === 'categorie') {
      // `LABEL_CATEGORIE` ne couvre que les 5 catégories typées —
      // pour `'autres'` (et toute clé inconnue) on retombe sur 'Autres'.
      return LABEL_CATEGORIE[key as CategorieAlerte] ?? 'Autres'
    }
    return REGLES_ALERTES?.[key]?.nom ?? key
  }

  return (
    <div className="space-y-4">
      {/* Barre de filtres - sticky en haut */}
      <Card 
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 40,
          background: 'var(--sf-surface-1, #fff)',
        }}
      >
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1.5 text-[var(--sf-muted,#5C5346)]">
              <ListFilter className="h-4 w-4" />
              <span className="eyebrow text-[11px]">Filtres</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="eyebrow text-[10px] text-[var(--sf-muted,#5C5346)]">
                Gravité
              </label>
              <Select
                value={gravite}
                onValueChange={(v) => setGravite(v as GraviteFilter)}
              >
                <SelectTrigger className="h-10 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                  <SelectItem value="élevée">Élevée</SelectItem>
                  <SelectItem value="moyenne">Moyenne</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="eyebrow text-[10px] text-[var(--sf-muted,#5C5346)]">
                Catégorie
              </label>
              <Select
                value={categorie}
                onValueChange={(v) => setCategorie(v as CategorieFilter)}
              >
                <SelectTrigger className="h-10 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes</SelectItem>
                  <SelectItem value="reproduction">Reproduction</SelectItem>
                  <SelectItem value="sanitaire">Sanitaire</SelectItem>
                  <SelectItem value="nutrition">Nutrition</SelectItem>
                  <SelectItem value="pertes">Pertes</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="observations">Observations</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-1">
              <Button
                variant={groupement === 'categorie' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGroupement('categorie')}
              >
                <Group className="h-4 w-4 mr-1" />
                Par catégorie
              </Button>
              <Button
                variant={groupement === 'regle' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setGroupement('regle')}
              >
                <LayoutList className="h-4 w-4 mr-1" />
                Par règle
              </Button>
            </div>
          </div>

          <div className="mt-3 text-xs text-[var(--sf-muted,#5C5346)] flex flex-wrap items-center gap-3">
            <span>
              <span className="font-semibold text-[var(--sf-ink,#1a1a1a)]">
                {triees.length}
              </span>{' '}
              alerte{triees.length > 1 ? 's' : ''} affichée
              {triees.length > 1 ? 's' : ''} sur {alertes.length}
            </span>
            {nbSnoozed > 0 ? (
              <Button
                variant={showSnoozed ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowSnoozed((v) => !v)}
              >
                {showSnoozed ? (
                  <EyeOff className="h-4 w-4 mr-1" />
                ) : (
                  <Eye className="h-4 w-4 mr-1" />
                )}
                {showSnoozed
                  ? `Masquer les snoozed (${nbSnoozed})`
                  : `Afficher snoozed (${nbSnoozed})`}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Pagination controls - au-dessus de la liste */}
      {triees.length > itemsPerPage && (
        <div className="flex items-center justify-between px-2 py-3 bg-[var(--sf-surface-2,#F5F1ED)] rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="text-sm text-[var(--sf-muted,#5C5346)]">
            Page <span className="font-semibold text-[var(--sf-ink,#1a1a1a)]">{currentPage}</span> / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Liste */}
      {triees.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Filter}
              tone="good"
              title="Aucune alerte ne correspond à ce filtre"
              description="Essaye d'élargir la gravité ou la catégorie pour voir plus de résultats."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupes.map(([key, items]) => (
            <section key={key} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--sf-ink,#1a1a1a)]">
                  {groupLabel(key)}
                </h2>
                <span className="text-xs text-[var(--sf-muted,#5C5346)] tabular-nums">
                  ({items.length})
                </span>
              </div>
              <div className="space-y-2">
                {items.map((a) => {
                  const snoozed = isAlerteSnoozed(a)
                  return (
                    <div
                      key={`${a.regle_id}-${a.cible_type}-${a.cible_id}`}
                      className={
                        snoozed
                          ? 'relative opacity-60'
                          : 'relative'
                      }
                    >
                      <AlerteCard alerte={a} />
                      <div className="absolute top-2 right-2 z-10">
                        {snoozed ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-[var(--sf-surface-1,#fff)]"
                            onClick={() => handleUnsnooze(a)}
                            title="Réactiver"
                            aria-label={`Réactiver l'alerte ${a.cible_label}`}
                          >
                            <Eye className="h-4 w-4 mr-1" aria-hidden="true" />
                            Réactiver
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="bg-[var(--sf-surface-1,#fff)]"
                            onClick={() => handleSnooze(a)}
                            title="Masquer pendant 24 heures"
                            aria-label={`Masquer l'alerte ${a.cible_label} pendant 24 heures`}
                          >
                            <BellOff className="h-4 w-4 mr-1" aria-hidden="true" />
                            Snooze 24 h
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Pagination controls - en bas de la liste */}
      {triees.length > itemsPerPage && (
        <div className="flex items-center justify-between px-2 py-3 bg-[var(--sf-surface-2,#F5F1ED)] rounded-lg">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Précédent
          </Button>
          <span className="text-sm text-[var(--sf-muted,#5C5346)]">
            Page <span className="font-semibold text-[var(--sf-ink,#1a1a1a)]">{currentPage}</span> / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}
    </div>
  )
}
