# Brief Audit S2 — recensement bugs/UX SmartFarm prod

## TOI
Auditeur senior NSA-level, contexte vierge. Tu chasses les bugs réels SUR PROD, pas les supposés.

## LIS D'ABORD (obligatoire)
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `/root/projects/smartfarm/.brain/CAVEMAN.md`

## OBJECTIF
Produire `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md` (≤6 KB) qui liste :
- **5 à 10 vrais bugs/manques** confirmés sur prod (https://smartfarm.group, compte 13smartfarm@gmail.com / SmartFarm2026!)
- Chaque entrée : `ID | sévérité (P0/P1/P2) | page | symptôme | preuve (output curl/playwright/log) | fichier coupable probable | fix proposé en 1 ligne`
- 1 tableau de synthèse en fin (ID/sévérité/fichier/effort minutes)

## MÉTHODE
1. Lis brain + caveman (≤30s).
2. `cd /root/projects/smartfarm && git log --oneline -10` pour voir l'historique récent (S0, S1 déjà livrés).
3. Lance `node /tmp/sf-s2/probe.mjs` (script à créer toi-même, voir gabarit ci-dessous) :
   - Playwright Pixel 7 + Desktop 1280×800
   - Login authentifié
   - Visite **8 pages** : /dashboard, /cheptel, /alertes, /pesees, /sanitaire/maladies, /calendrier, /stock, /reproduction
   - Pour chaque page collecte : HTTP, console errors, network 4xx/5xx, overflow horizontal, touch<44px (en excluant `<a>` parents), images cassées, formulaires sans label
4. Vérifie en **interactif** : clique 2-3 actions clés (créer pesée, snooze alerte, filtrer cheptel)
5. Cross-check schéma DB via `psql` ou curl Supabase si une page renvoie 500 / "no data" suspect
6. Capture screenshots ciblés (`/tmp/sf-s2/<page>.png`) UNIQUEMENT si bug visuel
7. Compile RAPPORT_AUDIT.md (≤6 KB, tableau + détails par bug)

## GABARIT PROBE (à compléter, pas à copier mot pour mot)
```js
import { chromium, devices } from 'playwright'
const browser = await chromium.launch({ headless: true })
// Pixel 7 d'abord
const ctx = await browser.newContext({ ...devices['Pixel 7'] })
const page = await ctx.newPage()
const log = { mobile: {}, desktop: {} }
page.on('pageerror', e => /* push */)
page.on('console', m => m.type()==='error' && /* push */)
page.on('response', r => r.status() >= 400 && /* push */)
await page.goto('https://smartfarm.group/connexion', {waitUntil:'networkidle'})
await page.fill('input[name=identifiant]', '13smartfarm@gmail.com')
await page.fill('input[name=password]', 'SmartFarm2026!')
await page.click('button[type=submit]')
await page.waitForTimeout(4000)
for (const p of PAGES) { ... collecte ... }
// puis Desktop pareil
console.log(JSON.stringify(log, null, 2))
```

## ENTRÉES déjà préparées
- `cd /root/projects/smartfarm` (repo, branch main)
- Service role key dans `/root/projects/smartfarm/app/.env.local` → SUPABASE_SERVICE_ROLE_KEY (utiliser curl `https://tpzhxjzwlxwujboboyit.supabase.co/rest/v1/*` si besoin schéma)
- Playwright installé global (chromium déjà téléchargé)

## SORTIE
**1 fichier unique** : `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md`
Taille cap : 6 KB. Si tu dépasses, élague — densité > exhaustivité.

## INTERDICTIONS
- ❌ Modifier le moindre fichier du projet (audit = read only sauf rapport)
- ❌ `npm install`, `npm run build`, restart serveur, `git commit`
- ❌ Inventer des bugs pour faire du chiffre — minimum 5, mais TOUS doivent avoir une preuve playwright/curl reproductible
- ❌ Vision_analyze sur >2 screenshots (texte d'abord, image en dernier recours)
- ❌ Plus de 8 reads de fichiers source (ce n'est PAS le rôle de l'audit, juste pointer le fichier coupable probable)
- ❌ Rapport >6 KB (tu seras tronqué)
- ❌ Format prose narratif — bullets, tableaux, télégraphique uniquement (cf CAVEMAN.md)

## CRITÈRES SUCCÈS
- ≥5 bugs réels confirmés avec preuve
- Tableau synthèse en fin avec colonne "effort minutes" (estimation honnête, 5/15/30/60)
- Aucun faux positif type "TOUCH<44 sur `<a>` parent inline" (voir S0 — déjà debunké)
- Mobile + Desktop tous deux audités

Go.
