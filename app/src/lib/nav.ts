import {
  LayoutDashboard, PiggyBank, Heart, Baby,
  Stethoscope, Wheat, Package, TrendingUp, Settings, Building2, Bell,
  MessageCircle, Calendar, Zap, Skull,
  type LucideIcon,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// V2-HARMONIE (HARM-A) — source unique de la navigation principale.
// Consommée par sidebar.tsx (desktop) ET mobile-drawer.tsx (mobile) : toute
// entrée ajoutée ici apparaît dans les deux nav sans risque de désynchro.
// 4 groupes — Aujourd'hui / Élevage / Sanitaire & alim / Outils.
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
  { href: '/assistant',       label: 'Assistant',       icon: MessageCircle,        group: 'Outils' },
  { href: '/parametres',      label: 'Paramètres',      icon: Settings,        group: 'Outils' },
]

export const NAV_GROUPS = Array.from(new Set(NAV_ITEMS.map(n => n.group)))

// ---------------------------------------------------------------------------
// Types identité user/ferme injectés depuis le layout serveur.
// ---------------------------------------------------------------------------
export interface SidebarUser {
  prenom: string | null
  nom: string | null
  role: string | null
  numero_client: string | null
  email: string | null
}

export interface SidebarFerme {
  nom: string
  localisation: string | null
}

export function getInitiales(u: SidebarUser | null): string {
  if (!u) return '?'
  const p = (u.prenom ?? '').trim()
  const n = (u.nom ?? '').trim()
  if (p && n) return (p[0] + n[0]).toUpperCase()
  if (p) return p[0].toUpperCase()
  if (n) return n[0].toUpperCase()
  if (u.email) return u.email[0].toUpperCase()
  return '?'
}

export function getNomComplet(u: SidebarUser | null): string {
  if (!u) return 'Utilisateur'
  const p = (u.prenom ?? '').trim()
  const n = (u.nom ?? '').trim()
  if (p && n) return `${p} ${n}`
  if (p) return p
  if (n) return n
  if (u.email) return u.email
  return 'Utilisateur'
}

export function getRoleLabel(u: SidebarUser | null): string {
  if (!u?.role) return '—'
  const r = u.role.toLowerCase()
  if (r === 'admin') return 'Administrateur'
  if (r === 'superadmin') return 'Super admin'
  if (r === 'viewer') return 'Lecteur'
  if (r === 'editor') return 'Éditeur'
  return r.charAt(0).toUpperCase() + r.slice(1)
}

/**
 * Branding ligne 2 : "SF-XXXXXX · Localisation".
 * Si pas de code → fallback localisation seule. Si pas de loc → code seul.
 */
export function getBrandSubline(user: SidebarUser | null, ferme: SidebarFerme | null): string {
  const code = user?.numero_client?.trim() || ''
  const loc = ferme?.localisation?.trim() || ''
  if (code && loc) return `${code} · ${loc}`
  if (code) return code
  if (loc) return loc
  return 'Élevage porcin · CI'
}
