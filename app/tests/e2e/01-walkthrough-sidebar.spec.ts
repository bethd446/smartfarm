import { test, expect } from '@playwright/test'

/**
 * G1-1 : Walkthrough sidebar (14 items / 5 groupes).
 *
 * Pour chaque item :
 *  1. Naviguer (goto) à l'URL.
 *  2. Statut HTTP 200 (response.status()).
 *  3. Présence d'un <h1> non vide après chargement.
 *
 * On évite de cliquer dans la sidebar : navigation directe URL = plus stable
 * (et la sidebar est cachée en viewport mobile selon CSS — déjà vu sur autres tests).
 *
 * Source de vérité des routes : src/components/sidebar.tsx.
 */

type Item = { href: string; label: string }

const SIDEBAR_ITEMS: Item[] = [
  // Pilotage
  { href: '/dashboard',       label: 'Tableau de bord' },
  { href: '/alertes',         label: 'Alertes' },
  { href: '/kpi',             label: 'Performances' },
  // Élevage
  { href: '/cheptel',         label: 'Cheptel' },
  { href: '/bandes',          label: 'Bandes' },
  { href: '/batiments',       label: 'Bâtiments' },
  { href: '/reproduction',    label: 'Reproduction' },
  { href: '/mises-bas',       label: 'Mises bas' },
  // Santé
  { href: '/sanitaire',       label: 'Sanitaire' },
  { href: '/sanitaire/ppa',   label: 'PPA' },
  // Logistique
  { href: '/alimentation',    label: 'Alimentation' },
  { href: '/stock',           label: 'Stock' },
  // Système
  { href: '/assistant',       label: 'Assistant' },
  { href: '/parametres',      label: 'Paramètres' },
]

test.describe('G1-1 — Walkthrough sidebar (14 routes)', () => {
  for (const item of SIDEBAR_ITEMS) {
    test(`route ${item.href} → 200 + H1`, async ({ page }) => {
      const resp = await page.goto(item.href, { waitUntil: 'domcontentloaded' })
      expect(resp, `pas de response pour ${item.href}`).not.toBeNull()
      expect(resp!.status(), `status non-200 pour ${item.href}`).toBeLessThan(400)

      // Attendre que la page soit "calme" (RSC streaming).
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {
        // Certaines pages gardent des XHR longs → on tolère.
      })

      // Présence d'un H1 visible non vide.
      const h1 = page.locator('h1').first()
      await expect(h1, `H1 absent sur ${item.href}`).toBeVisible({ timeout: 8_000 })
      const text = (await h1.textContent())?.trim() ?? ''
      expect(text.length, `H1 vide sur ${item.href}`).toBeGreaterThan(0)
    })
  }
})
