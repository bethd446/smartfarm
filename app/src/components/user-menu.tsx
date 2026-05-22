'use client'

import * as React from 'react'
import { LogOut, User as UserIcon } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { deconnexionAction } from '@/app/(auth)/_actions'

/**
 * Smart Farm — UserMenu (R8 Auth)
 * -------------------------------------------------------------------------
 * Bloc utilisateur en bas de sidebar.
 *   - Initiales sur avatar rond
 *   - Nom + numéro client SF-XXXXXX (cf. trigger SQL)
 *   - Dropdown "Déconnexion" (Server Action via <form>)
 *
 * Si `numero_client` est null (mode démo), on retombe sur l'ancien design
 * (Christophe Liegeois / Admin) — pas de régression visuelle.
 */
export interface UserMenuProps {
  nom_complet: string
  numero_client: string | null
  role: string
  /** Si true → bypass affichage déconnexion (mode démo, pas d'auth). */
  demoMode?: boolean
}

function initiales(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function UserMenu({ nom_complet, numero_client, role, demoMode }: UserMenuProps) {
  const ini = initiales(nom_complet || 'Utilisateur')

  // En mode démo : pas de déconnexion possible (= pas d'auth) → bloc statique
  if (demoMode) {
    return (
      <div
        className={cn(
          'flex items-center',
          'justify-center lg:gap-3 lg:px-2 lg:py-1.5 lg:justify-start',
        )}
      >
        <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {ini}
        </div>
        <div className="hidden lg:block flex-1 min-w-0">
          <div className="text-xs font-medium text-white truncate">{nom_complet}</div>
          <div className="text-[10px] text-white/60 capitalize">{role}</div>
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'flex items-center w-full rounded-md transition-colors',
          'justify-center lg:gap-3 lg:px-2 lg:py-1.5 lg:justify-start',
          'hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30',
        )}
        aria-label="Menu utilisateur"
      >
        <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {ini}
        </div>
        <div className="hidden lg:block flex-1 min-w-0 text-left">
          <div className="text-xs font-medium text-white truncate">{nom_complet}</div>
          <div className="text-[10px] text-white/60 font-mono tabular-nums truncate">
            {numero_client ?? role}
          </div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="start"
        className="w-56 bg-[#1a1a1a] text-white/90 border-slate-700"
      >
        <DropdownMenuLabel className="text-white">
          <div className="text-sm font-medium truncate">{nom_complet}</div>
          {numero_client && (
            <div className="text-[10px] text-white/60 font-mono tabular-nums mt-0.5">
              {numero_client}
            </div>
          )}
          <div className="text-[10px] text-white/50 capitalize mt-0.5">{role}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-slate-700" />

        <DropdownMenuItem asChild className="text-white/80 focus:bg-white/10 focus:text-white">
          <a href="/parametres" className="flex items-center gap-2 cursor-pointer">
            <UserIcon className="h-4 w-4" />
            <span>Mon profil</span>
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="bg-slate-700" />

        <form action={deconnexionAction}>
          <button
            type="submit"
            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
