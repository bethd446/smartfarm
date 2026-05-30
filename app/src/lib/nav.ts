import {
  LayoutDashboard, PiggyBank, Heart, Baby,
  Stethoscope, Wheat, Package, TrendingUp, Settings, Building2, Bell,
  Sparkles, Calendar, Zap, Skull,
  type LucideIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// V2-HARMONIE (HARM-A) — source UNIQUE de la navigation sidebar/drawer.
//   4 groupes — Aujourd'hui / Élevage / Sanitaire & alim / Outils
// sidebar.tsx (desktop) ET mobile-drawer.tsx (mobile) importent ce tableau :
// toute désynchro est structurellement impossible.
// ---------------------------------------------------------------------------
export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  group: string
}

export const NAV_ITEMS: NavItem[] = [
  // Aujourd'hui
  { href: '/dashboard',       label: 'Tableau de bord', icon: LayoutDashboard, group: "Aujourd'hui" },
  { href: '/alertes',         label: 'Alertes',         icon: Bell,            group: "Aujourd'hui" },
  { href: '/calendrier',      label: 'Calendrier',      icon: Calendar,        group: "Aujourd'hui" },
  { href: '/actions-rapides', label: 'Actions rapides', icon: Zap,             group: "Aujourd'hui" },
  { href: '/kpi',             label: 'Mes résultats',   icon: TrendingUp,      group: "Aujourd'hui" },

  // Élevage
  { href: '/cheptel',         label: 'Cheptel',         icon: PiggyBank,       group: 'Élevage' },
  { href: '/batiments',       label: 'Bâtiments',       icon: Building2,       group: 'Élevage' },
  { href: '/reproduction',    label: 'Reproduction',    icon: Heart,           group: 'Élevage' },
  { href: '/mises-bas',       label: 'Mises bas',       icon: Baby,            group: 'Élevage' },
  { href: '/mortalites',      label: 'Mortalités',      icon: Skull,           group: 'Élevage' },

  // Sanitaire & alim
  { href: '/sanitaire',       label: 'Sanitaire',       icon: Stethoscope,     group: 'Sanitaire & alim' },
  { href: '/alimentation',    label: 'Alimentation',    icon: Wheat,           group: 'Sanitaire & alim' },
  { href: '/stock',           label: 'Stock',           icon: Package,         group: 'Sanitaire & alim' },

  // Outils
  { href: '/assistant',       label: 'Assistant',       icon: Sparkles,        group: 'Outils' },
  { href: '/parametres',      label: 'Paramètres',      icon: Settings,        group: 'Outils' },
]

export const NAV_GROUPS: string[] = Array.from(new Set(NAV_ITEMS.map(n => n.group)))

/**
 * Branding ligne 2 : "SF-XXXXXX · Localisation".
 * Si pas de code → fallback localisation seule. Si pas de loc → code seul.
 * Factorisé ici car sidebar et drawer en avaient une copie identique.
 */
export function getBrandSubline(
  numeroClient: string | null | undefined,
  localisation: string | null | undefined,
): string {
  const code = numeroClient?.trim() || ''
  const loc = localisation?.trim() || ''
  if (code && loc) return `${code} · ${loc}`
  if (code) return code
  if (loc) return loc
  return 'Élevage porcin · CI'
}
