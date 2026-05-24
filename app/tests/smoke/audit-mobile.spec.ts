import { test } from '@playwright/test';

const ROUTES = [
  '/dashboard',
  '/cheptel',
  '/reproduction',
  '/mises-bas',
  '/alertes',
  '/batiments',
  '/alimentation/consommations',
  '/alimentation/plans',
  '/sanitaire/protocoles',
  '/kpi',
];

const DEMO_EMAIL = 'demo@smartfarm.group';
const DEMO_PASS = 'Demo6734N0xUHH1I';

test('audit mobile screenshots Pixel 7', async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto('/connexion');
  await page.getByLabel(/email/i).fill(DEMO_EMAIL);
  await page.getByLabel(/mot de passe/i).fill(DEMO_PASS);
  await page.getByRole('button', { name: /se connecter/i }).click();
  await page.waitForURL(/\/(dashboard|cheptel)/, { timeout: 15000 });
  for (const r of ROUTES) {
    await page.goto(r);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(()=>{});
    await page.waitForTimeout(800);
    const file = `/tmp/audit${r.replace(/\//g,'_')}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`📸 ${r} -> ${file}`);
  }
});
