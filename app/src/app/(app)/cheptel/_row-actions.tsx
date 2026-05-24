'use client'

import { useRouter } from 'next/navigation'
import { MoreHorizontal, Scale, Syringe, Stethoscope, Skull, Eye, ArrowRight } from 'lucide-react'
import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { transfererUnVersCroissance } from './_server-actions'

/**
 * Mini menu "Actions rapides" affiché en bout de ligne du cheptel.
 *
 * Chaque entrée navigue vers la page dédiée avec un query param
 *   ?action=new&animal_id=<id>
 * que le dialog correspondant (géré par F1) lit pour se pré-remplir.
 *
 * `stopPropagation` est crucial : la ligne <tr> est cliquable
 * (navigation vers la fiche animal), donc le menu ne doit pas déclencher
 * cette navigation.
 */
export function CheptelRowActions({
  animalId,
  animalTag,
  stade,
  poidsActuel,
}: {
  animalId: string
  animalTag: string
  stade?: string
  poidsActuel?: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const go = (path: string) => () => {
    router.push(path)
  }

  // Phase 4.A : afficher "Transférer en Croissance" si éligible
  const eligibleCroissance =
    stade &&
    ['demarrage_1', 'demarrage_2'].includes(stade) &&
    poidsActuel !== undefined &&
    poidsActuel >= 24

  const handleTransferCroissance = () => {
    startTransition(async () => {
      const res = await transfererUnVersCroissance(animalId)
      if (res.ok) {
        toast.success(`${animalTag} a été transféré vers le bâtiment Croissance`)
        router.refresh()
      } else {
        toast.error(`Erreur : ${res.error}`)
      }
    })
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="inline-flex"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-[var(--sf-line)] text-[var(--sf-muted)] hover:bg-[var(--sf-surface-2)]/40 hover:text-[var(--sf-ink)]"
          aria-label={`Actions rapides pour ${animalTag}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[200px]">
          <DropdownMenuItem onClick={go(`/cheptel/${animalId}`)}>
            <Eye className="h-4 w-4 mr-2" />
            Voir la fiche
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={go(`/pesees?action=new&animal_id=${animalId}`)}>
            <Scale className="h-4 w-4 mr-2" />
            Peser
          </DropdownMenuItem>
          <DropdownMenuItem onClick={go(`/sanitaire?action=vacciner&animal_id=${animalId}`)}>
            <Syringe className="h-4 w-4 mr-2" />
            Vacciner
          </DropdownMenuItem>
          <DropdownMenuItem onClick={go(`/sanitaire?action=soigner&animal_id=${animalId}`)}>
            <Stethoscope className="h-4 w-4 mr-2" />
            Soigner
          </DropdownMenuItem>
          {eligibleCroissance && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleTransferCroissance}
                disabled={isPending}
                className="text-[var(--sf-accent-ink,#A16207)]"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                {isPending ? 'Transfert...' : 'Transférer en Croissance'}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={go(`/cheptel/${animalId}?action=mort`)}
            className="text-[var(--sf-danger-ink,#b00020)]"
          >
            <Skull className="h-4 w-4 mr-2" />
            Marquer mort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/**
 * Ligne cliquable du tableau cheptel.
 * - clic n'importe où sur la ligne (sauf menu actions) → /cheptel/[id]
 * - clavier : Enter / Space activent la navigation
 * - le pointer cursor signale l'interactivité
 */
export function CheptelRow({
  animalId,
  className = '',
  children,
}: {
  animalId: string
  className?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const href = `/cheptel/${animalId}`

  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          router.push(href)
        }
      }}
      className={`cursor-pointer focus:outline-none focus-visible:bg-[var(--sf-surface-2)]/60 ${className}`}
    >
      {children}
    </tr>
  )
}
