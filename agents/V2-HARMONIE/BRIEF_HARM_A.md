# Brief HARM-A — Sidebar simplifiée + redirects + hub sanitaire

## Périmètre
✅ Touche : `src/components/sidebar.tsx`, `src/components/bottom-nav.tsx`, `src/components/mobile-drawer.tsx`, `src/middleware.ts`, `src/app/(app)/sanitaire/page.tsx` (refonte hub)
❌ Pas : DB, autres pages métier, alertes-regles

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md` d'abord. Pas `npm run build`.

## Demande utilisateur (Christophe)
"trop de menu inutile, supprime /sanitaire/eau, fusionne, app facile à comprendre, intelligente, optimisée"

## Nouvelle architecture sidebar — 5 groupes / 11 menus

| Groupe | Menus (label → href) |
|---|---|
| **Pilotage** | Tableau de bord `/dashboard` · Alertes `/alertes` · Performances `/kpi` |
| **Élevage** | Cheptel `/cheptel` · Bandes `/bandes` · Bâtiments `/batiments` · Reproduction `/reproduction` · Mises bas `/mises-bas` |
| **Santé** | Sanitaire `/sanitaire` · PPA `/sanitaire/ppa` |
| **Logistique** | Alimentation `/alimentation` · Stock `/stock` |
| **Système** | Assistant `/assistant` · Paramètres `/parametres` |

Items **retirés de la sidebar** :
- `/actions-rapides` (déjà accessible via bouton FAB sur certaines pages)
- `/pesees` (à intégrer dans la fiche `/cheptel/[id]` comme action contextuelle)
- `/calendrier` (doublon avec `/sanitaire/calendrier` et le hub sanitaire)
- `/sanitaire/calendrier` → onglet du hub `/sanitaire`
- `/sanitaire/biosecurite` → onglet du hub `/sanitaire`
- `/sanitaire/eau` → **SUPPRIMER** complètement (Christophe l'a demandé)
- `/sanitaire/mycotoxines` → onglet du hub `/sanitaire`
- `/sanitaire/maladies` → onglet du hub `/sanitaire`
- `/sanitaire/protocoles` → onglet du hub `/sanitaire`
- `/conseiller` → fusionner dans Assistant (lien depuis l'assistant)

Les pages SOUS-JACENTES restent accessibles via URL directe (au cas où) — on les retire juste de la navigation.

## Mission

### 1. Refactor `src/components/sidebar.tsx`
Remplacer le tableau `items` par exactement les 11 entrées ci-dessus (5 groupes). Conserver tout le reste (responsive, tooltip, item actif).

### 2. Refactor `src/components/bottom-nav.tsx`
Garder 5 slots mobile mais ajuster si besoin :
- Accueil (`/dashboard`)
- Cheptel (`/cheptel`)
- Reproduction (`/reproduction`)
- Alertes (`/alertes`) avec badge count
- Plus (drawer)

### 3. Refactor `src/components/mobile-drawer.tsx`
Aligner sur la même structure 11 menus / 5 groupes que la sidebar.

### 4. Refactor `src/middleware.ts` — supprimer /eau redirect

```ts
const SANITAIRE_ALIASES: Record<string, string> = {
  '/biosecurite': '/sanitaire/biosecurite',
  // '/eau' SUPPRIMÉ
  '/mycotoxines': '/sanitaire/mycotoxines',
  '/calendrier-sanitaire': '/sanitaire/calendrier',
  '/protocoles': '/sanitaire/protocoles',
  '/maladies': '/sanitaire/maladies',
  '/ppa': '/sanitaire/ppa',  // NOUVEAU
}

export const config = {
  matcher: ['/biosecurite', '/mycotoxines', '/calendrier-sanitaire', '/protocoles', '/maladies', '/ppa'],
}
```

### 5. Refactor `src/app/(app)/sanitaire/page.tsx` — devenir un HUB

Avant : 3 cards (calendrier / biosécurité / vaccins).
Après : grille de **6 cards** vers les sous-modules + KPI rapides.

```tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Stethoscope, CalendarClock, ShieldCheck, FlaskConical, Syringe, ScrollText, AlertTriangle, Activity } from 'lucide-react'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'Sanitaire — Smart Farm' }

export default async function SanitairePage() {
  const sb = await createClient()

  // KPI rapides
  const { count: alertesSantePending } = await sb
    .from('v_alertes_actives')
    .select('*', { count: 'exact', head: true })
    .in('regle_id', ['R06-porcelets-non-vaccines-J14', 'R12-acte-sanitaire-en-retard', 'R13-truie-anorexie', 'R17-eau-chute-importante', 'R18-lot-non-analyse', 'R23-vermifuge-truie-pre-mb', 'R24-fer-porcelet-j3', 'R25-bcs-sevrage-bas'])

  const { count: nbProtocoles } = await sb.from('protocoles_vaccinaux').select('*', { count: 'exact', head: true }).eq('actif', true)
  const { count: nbMaladies } = await sb.from('maladies').select('*', { count: 'exact', head: true })

  const modules = [
    {
      href: '/sanitaire/calendrier',
      icon: CalendarClock,
      title: 'Calendrier sanitaire',
      desc: 'Actes porcelets attendus (Fer, vaccins, sevrage) + protocoles à venir',
      badge: null,
    },
    {
      href: '/sanitaire/ppa',
      icon: AlertTriangle,
      title: 'PPA — Surveillance',
      desc: 'Peste Porcine Africaine — déclaration OIE/WOAH obligatoire',
      badge: { label: 'OBLIGATOIRE', variant: 'danger' as const },
    },
    {
      href: '/sanitaire/biosecurite',
      icon: ShieldCheck,
      title: 'Biosécurité',
      desc: 'Checklist 12 items + registre visiteurs avec audit',
      badge: null,
    },
    {
      href: '/sanitaire/mycotoxines',
      icon: FlaskConical,
      title: 'Mycotoxines',
      desc: 'Lots maïs/arachide/soja, analyses (Afla, ZEA, DON, OTA, FUM)',
      badge: { label: 'Saison pluies', variant: 'warning' as const },
    },
    {
      href: '/sanitaire/maladies',
      icon: Activity,
      title: 'Maladies',
      desc: `${nbMaladies ?? 0} fiches maladies porcines (PPA, mycoplasmose, etc.)`,
      badge: null,
    },
    {
      href: '/sanitaire/protocoles',
      icon: Syringe,
      title: 'Protocoles vaccinaux',
      desc: `${nbProtocoles ?? 0} protocoles actifs (cochette, porcelet, truie, verrat)`,
      badge: null,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold flex items-center gap-3" style={{ fontFamily: "var(--sf-font-display)" }}>
          <Stethoscope className="h-8 w-8 text-[var(--sf-primary)]" />
          Sanitaire
        </h1>
        <p className="text-sm text-[var(--sf-muted)] mt-1">
          Hub santé : {alertesSantePending ?? 0} alerte(s) sanitaire(s) active(s)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <m.icon className="h-8 w-8 text-[var(--sf-primary)]" />
                  {m.badge && <Badge variant={m.badge.variant}>{m.badge.label}</Badge>}
                </div>
                <CardTitle className="mt-2">{m.title}</CardTitle>
                <CardDescription>{m.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
```

### 6. Page `/sanitaire/eau` — désactiver

NE PAS supprimer le fichier (peut casser un import). Juste remplacer son contenu par un redirect server :

```tsx
import { redirect } from 'next/navigation'

export default function EauDeprecated() {
  redirect('/sanitaire')
}
```

Données `consommations_eau` restent en DB (8 lignes seed), pas de purge — juste retrait UI.

## Vérif
```bash
# Routes principales doivent être 200
for r in / /dashboard /alertes /kpi /cheptel /bandes /batiments /reproduction /mises-bas /sanitaire /sanitaire/ppa /alimentation /stock /assistant /parametres; do
  echo "$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000$r")  $r"
done

# Eau redirige vers /sanitaire
curl -sI http://127.0.0.1:3000/sanitaire/eau | grep -i location

# Sidebar contient 11 items dans 5 groupes
grep -c "label:" /root/projects/smartfarm/app/src/components/sidebar.tsx
```

## Livrable
1. Sidebar refactorisée 5 groupes / 11 menus
2. Bottom-nav adaptée
3. Drawer aligné
4. Middleware sans /eau
5. /sanitaire devient hub 6 cards
6. /sanitaire/eau redirige vers /sanitaire
7. Rapport `/root/projects/smartfarm/agents/V2-HARMONIE/RAPPORT_HARM_A.md` ≤ 60 lignes

## Anti-pièges
- NE supprime PAS les pages `/pesees`, `/calendrier`, `/actions-rapides`, `/conseiller`, `/sanitaire/biosecurite|mycotoxines|maladies|protocoles|calendrier` — elles restent accessibles via URL directe, juste retirées de la nav
- /sanitaire/eau remplace son content par un `redirect()` (Next.js 16 OK)
- Conserve `text-white/70 hover:bg-white/5` etc. dans sidebar (overlay intentionnel)
- Vérifie types des Badge variants (success/warning/danger/secondary)
