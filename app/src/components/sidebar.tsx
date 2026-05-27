'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { deconnexionAction } from '@/app/(auth)/_actions'
import { GlobalSearch } from '@/components/global-search'
import {
  LayoutDashboard, PiggyBank, Heart, Baby,
  Stethoscope, Wheat, Package, TrendingUp, Settings, Building2, Bell,
  Sparkles, AlertTriangle, LogOut, Calendar, Zap,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// V2-HARMONIE (HARM-A) — sidebar 5 groupes / 14 menus
// Refonte v1.0 (2026-05-23) : structure BEM .sidebar__* conforme au design system
// ZIP smartfarm-design-v1/components/sidebar.html — CSS dans design-v1.css
// ---------------------------------------------------------------------------
const nav = [
  // Pilotage
  { href: '/dashboard',             label: 'Tableau de bord',       icon: LayoutDashboard, group: 'Pilotage' },
  { href: '/alertes',               label: 'Alertes',               icon: Bell,            group: 'Pilotage' },
  { href: '/calendrier',            label: 'Calendrier',            icon: Calendar,        group: 'Pilotage' },
  { href: '/actions-rapides',       label: 'Actions rapides',       icon: Zap,             group: 'Pilotage' },
  { href: '/kpi',                   label: 'Mes résultats',         icon: TrendingUp,      group: 'Pilotage' },

  // Élevage
  { href: '/cheptel',               label: 'Cheptel',               icon: PiggyBank,       group: 'Élevage' },
  { href: '/batiments',             label: 'Bâtiments',             icon: Building2,       group: 'Élevage' },
  { href: '/reproduction',          label: 'Reproduction',          icon: Heart,           group: 'Élevage' },
  { href: '/mises-bas',             label: 'Mises bas',             icon: Baby,            group: 'Élevage' },

  // Santé
  { href: '/sanitaire',             label: 'Sanitaire',             icon: Stethoscope,     group: 'Santé' },

  // Alimentation
  { href: '/alimentation',          label: 'Alimentation',          icon: Wheat,           group: 'Alimentation' },
  { href: '/stock',                 label: 'Stock',                 icon: Package,         group: 'Alimentation' },

  // Outils
  { href: '/assistant',             label: 'Assistant',             icon: Sparkles,        group: 'Outils' },
  { href: '/parametres',            label: 'Paramètres',            icon: Settings,        group: 'Outils' },
]

// ---------------------------------------------------------------------------
// L2 Sprint 1 — Types pour user/ferme injectés depuis le layout serveur.
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

export interface SidebarProps {
  user: SidebarUser | null
  ferme: SidebarFerme | null
}

// ---------------------------------------------------------------------------
// Helpers identité (partagés sidebar/mobile-drawer si besoin plus tard)
// ---------------------------------------------------------------------------
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
 * Branding ligne 2 : "SF-XXXXXX · Localisation"
 * Si pas de code → fallback sur localisation seule. Si pas de loc → code seul.
 */
function getBrandSubline(user: SidebarUser | null, ferme: SidebarFerme | null): string {
  const code = user?.numero_client?.trim() || ''
  const loc = ferme?.localisation?.trim() || ''
  if (code && loc) return `${code} · ${loc}`
  if (code) return code
  if (loc) return loc
  return 'Élevage porcin · CI'
}

/**
 * Sidebar desktop/tablette large (≥lg = 1024px) — 256px largeur fixe.
 * Sous lg, la sidebar est cachée (cf. design-v1.css line 160 + classe Tailwind),
 * le MobileDrawer + BottomNav prennent le relais.
 *
 * Markup BEM strict (.sidebar__brand / .sidebar__nav / .sidebar__group-title /
 * .sidebar__item / .sidebar__user etc.) — styles 100% dans design-v1.css.
 * Active state : border-left 2px + bg semi-transparent (cf. .is-active CSS).
 */
export function Sidebar({ user, ferme }: SidebarProps) {
  const pathname = usePathname()
  const groups = Array.from(new Set(nav.map(n => n.group)))

  const initiales = getInitiales(user)
  const nomComplet = getNomComplet(user)
  const roleLabel = getRoleLabel(user)
  const subline = getBrandSubline(user, ferme)

  return (
    <aside
      className={cn('sidebar', 'hidden lg:flex sticky top-0')}
      role="navigation"
      aria-label="Navigation principale"
    >
      <div className="sidebar__brand">
        <div className="sidebar__glyph">
          <img src="/glyph-smartfarm.svg" alt="" width={40} height={40} />
        </div>
        <div className="min-w-0">
          <div className="sidebar__farm truncate">
            {ferme?.nom ?? 'Smart Farm'}
          </div>
          <div className="sidebar__id numeric truncate">{subline}</div>
        </div>
      </div>

      {/* Bandeau d'alerte si user pas lié à une ferme */}
      {user && !ferme && (
        <Link
          href="/onboarding"
          className={cn(
            'mx-3 mt-3 rounded-md border border-amber-500/40 bg-amber-500/10',
            'text-amber-200 hover:bg-amber-500/20 transition-colors',
            'flex items-center gap-2 p-2 text-[11px] leading-tight',
          )}
          title="Aucune ferme. Configurez votre exploitation."
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Aucune ferme.<br />
            <span className="text-amber-100 underline">Configurer mon exploitation →</span>
          </span>
        </Link>
      )}

      {/* GlobalSearch desktop (sticky position) */}
      <div className="px-3 py-2">
        <GlobalSearch />
      </div>

      <nav className="sidebar__nav">
        {groups.map(group => (
          <div className="sidebar__group" key={group}>
            <div className="sidebar__group-title">{group}</div>
            {nav.filter(n => n.group === group).map(item => {
              const active = pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn('sidebar__item', active && 'is-active')}
                >
                  <span className="sidebar__ic" aria-hidden>
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar__user">
        <div
          className="sidebar__avatar flex items-center justify-center text-[12px] font-bold text-white/90"
          aria-hidden
        >
          {initiales}
        </div>
        <div className="flex-1 min-w-0">
          <div className="sidebar__user-name">{nomComplet}</div>
          <div className="sidebar__user-role">{roleLabel}</div>
        </div>
        <form action={deconnexionAction}>
          <button
            type="submit"
            className="sidebar__logout"
            aria-label="Se déconnecter"
            title="Se déconnecter"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    </aside>
  )
}
