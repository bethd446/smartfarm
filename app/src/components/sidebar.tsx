'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ContrastToggle } from '@/components/contrast-toggle'
import {
  LayoutDashboard, PiggyBank, Layers, Heart, Baby,
  Scale, Stethoscope, Wheat, Package, TrendingUp, Settings, Sprout, Building2, Zap,
} from 'lucide-react'

const nav = [
  { href: '/actions-rapides', label: 'Actions rapides',   icon: Zap,             group: 'Pilotage' },
  { href: '/dashboard',       label: 'Tableau de bord',   icon: LayoutDashboard, group: 'Pilotage' },
  { href: '/cheptel',         label: 'Cheptel',           icon: PiggyBank,       group: 'Élevage' },
  { href: '/batiments',       label: 'Bâtiments',         icon: Building2,       group: 'Élevage' },
  { href: '/bandes',          label: 'Bandes',            icon: Layers,          group: 'Élevage' },
  { href: '/reproduction',    label: 'Reproduction',      icon: Heart,           group: 'Production' },
  { href: '/mises-bas',       label: 'Mises-bas',         icon: Baby,            group: 'Production' },
  { href: '/pesees',          label: 'Pesées',            icon: Scale,           group: 'Production' },
  { href: '/sanitaire',       label: 'Sanitaire',         icon: Stethoscope,     group: 'Santé' },
  { href: '/alimentation',    label: 'Alimentation',      icon: Wheat,           group: 'Logistique' },
  { href: '/stock',           label: 'Stock & Intrants',  icon: Package,         group: 'Logistique' },
  { href: '/kpi',             label: 'KPI & Rapports',    icon: TrendingUp,      group: 'Analyses' },
  { href: '/parametres',      label: 'Paramètres',        icon: Settings,        group: 'Système' },
]

export function Sidebar() {
  const pathname = usePathname()
  const groups = Array.from(new Set(nav.map(n => n.group)))

  return (
    <aside className="w-64 bg-slate-900 text-slate-200 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow">
          <Sprout className="h-5 w-5 text-white" />
        </div>
        <div>
          <div className="font-bold text-base text-white">Smart Farm</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Yamoussoukro · 🇨🇮</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {groups.map(group => (
          <div key={group}>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 mb-1.5">{group}</div>
            <ul className="space-y-0.5">
              {nav.filter(n => n.group === group).map(item => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 h-12 rounded-md text-base transition-colors',
                        active
                          ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      )}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800 space-y-2">
        <ContrastToggle />
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold">CL</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-white truncate">Christophe Liegeois</div>
            <div className="text-[10px] text-slate-400">Admin</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
