'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ContrastToggle } from '@/components/contrast-toggle'
import {
  LayoutDashboard, PiggyBank, Layers, Heart, Baby,
  Stethoscope, Wheat, Package, TrendingUp, Settings, Building2, Bell,
  Sparkles, AlertTriangle,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// V2-HARMONIE (HARM-A) — sidebar simplifiée 5 groupes / 11 menus
//   Pilotage (3) / Élevage (5) / Santé (2) / Logistique (2) / Système (2)
// Demande Christophe : moins de menus, app facile à comprendre.
// Retirés de la nav (toujours accessibles via URL) :
//   /actions-rapides, /pesees (→ fiche cheptel), /calendrier (doublon),
//   /sanitaire/{calendrier,biosecurite,mycotoxines,maladies,protocoles} (→ hub),
//   /conseiller (→ Assistant), /sanitaire/eau (supprimé, redirect vers /sanitaire)
// ---------------------------------------------------------------------------
const nav = [
  // Pilotage
  { href: '/dashboard',             label: 'Tableau de bord',       icon: LayoutDashboard, group: 'Pilotage' },
  { href: '/alertes',               label: 'Alertes',               icon: Bell,            group: 'Pilotage' },
  { href: '/kpi',                   label: 'Performances',          icon: TrendingUp,      group: 'Pilotage' },

  // Élevage
  { href: '/cheptel',               label: 'Cheptel',               icon: PiggyBank,       group: 'Élevage' },
  { href: '/bandes',                label: 'Bandes',                icon: Layers,          group: 'Élevage' },
  { href: '/batiments',             label: 'Bâtiments',             icon: Building2,       group: 'Élevage' },
  { href: '/reproduction',          label: 'Reproduction',          icon: Heart,           group: 'Élevage' },
  { href: '/mises-bas',             label: 'Mises bas',             icon: Baby,            group: 'Élevage' },

  // Santé
  { href: '/sanitaire',             label: 'Sanitaire',             icon: Stethoscope,     group: 'Santé' },
  { href: '/sanitaire/ppa',         label: 'PPA',                   icon: AlertTriangle,   group: 'Santé' },

  // Logistique
  { href: '/alimentation',          label: 'Alimentation',          icon: Wheat,           group: 'Logistique' },
  { href: '/stock',                 label: 'Stock',                 icon: Package,         group: 'Logistique' },

  // Système
  { href: '/assistant',             label: 'Assistant',             icon: Sparkles,        group: 'Système' },
  { href: '/parametres',            label: 'Paramètres',            icon: Settings,        group: 'Système' },
]

/**
 * Sidebar responsive :
 *  - Mobile <md  : entièrement masqué (bottom-nav + drawer prennent le relais).
 *  - Tablette md à <lg : largeur 72px, icônes seules, label en tooltip CSS au hover.
 *  - Desktop ≥lg : largeur 256px (w-64), full label + group headings + footer.
 */
export function Sidebar() {
  const pathname = usePathname()
  const groups = Array.from(new Set(nav.map(n => n.group)))

  return (
    <aside
      className={cn(
        // Hidden on mobile, flex from md
        'hidden md:flex',
        // Width : 72px tablette, 256px desktop
        'w-[72px] lg:w-64',
        'bg-[#1a1a1a] dark:bg-[#0d0c09] text-white/90 flex-col h-screen sticky top-0 shrink-0',
      )}
    >
      <div
        className={cn(
          'border-b border-slate-800 flex items-center',
          'p-3 justify-center lg:p-5 lg:justify-start lg:gap-3',
        )}
      >
        <div className="h-10 w-10 rounded-lg bg-[var(--sf-primary)] flex items-center justify-center shadow shrink-0 overflow-hidden">
          <img src="/logo-smartfarm.svg" alt="Smart Farm" className="h-9 w-9" />
        </div>
        <div className="hidden lg:block min-w-0">
          <div className="font-bold text-base text-white">Smart Farm</div>
          <div className="text-[10px] text-white/70 uppercase tracking-[0.15em] truncate">
            Élevage porcin · Côte d&apos;Ivoire
          </div>
          <div className="text-[10px] text-white/40 uppercase tracking-wider truncate mt-0.5">
            Yamoussoukro <span aria-hidden>🇨🇮</span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2 lg:p-3 space-y-1 lg:space-y-4">
        {groups.map(group => (
          <div key={group}>
            {/* Group label : hidden en tablette */}
            <div className="hidden lg:block text-[10px] uppercase tracking-wider text-white/50 px-2 mb-1.5">
              {group}
            </div>
            <ul className="space-y-0.5">
              {nav.filter(n => n.group === group).map(item => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <li key={item.href} className="relative group/item">
                    <Link
                      href={item.href}
                      aria-label={item.label}
                      title={item.label}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center rounded-md transition-colors',
                        // Tablette : carré centré 48px
                        'h-12 w-12 justify-center mx-auto',
                        // Desktop : ligne full width + gap + padding
                        'lg:w-full lg:justify-start lg:gap-3 lg:px-3 lg:mx-0',
                        'text-base',
                        active
                          ? 'bg-[var(--sf-primary)] text-white font-semibold shadow-sm'
                          : 'text-white/70 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="hidden lg:inline truncate">{item.label}</span>
                    </Link>

                    {/* Tooltip CSS pur, uniquement en tablette (md sans lg) */}
                    <span
                      role="tooltip"
                      className={cn(
                        'pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2',
                        'whitespace-nowrap rounded-md bg-[#2a2a2a] dark:bg-[#1f1f1f] px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
                        'opacity-0 group-hover/item:opacity-100 transition-opacity duration-100',
                        'z-50',
                        // Visible seulement en tablette
                        'hidden md:block lg:hidden',
                      )}
                    >
                      {item.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={cn(
        'border-t border-slate-800',
        'p-2 lg:p-3 space-y-2',
      )}>
        <ContrastToggle />
        <div className={cn(
          'flex items-center',
          'justify-center lg:gap-3 lg:px-2 lg:py-1.5 lg:justify-start',
        )}>
          <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shrink-0">CL</div>
          <div className="hidden lg:block flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">Christophe Liegeois</div>
            <div className="text-[10px] text-white/60">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
