# 🔥 Smart Farm — Verdict consolidé Sprint Critique R6
> 4 audits adversaires en contexte vierge. Aucun compliment, que des verdicts crus.
> Date : 22 mai 2026. Périmètre : Smart Farm v0.3.0 + Sprint 2 Wave 1+2.

---

## ⚠️ Verdict global : **NO-GO PRODUCTION** sur les 4 axes

| Critique | Verdict | Score |
|---|---|---|
| **K1 — Métier (éleveur 25 ans)** | RÉSILIE — utilisable en bureau, pas terrain | **3.6/10** |
| **K2 — Technique (architecte senior)** | NON production-ready | **4.1/10** |
| **K3 — Design (DA Stripe/Linear)** | NON launchable publiquement | **4.6/10** |
| **K4 — Sécurité (pentesteur)** | NON sécurisable en l'état | **3.9/10** |

**Score moyen consolidé : 4.05/10** → catégorie "POC démontrable, pas user-ready"

---

## 🚨 TOP 10 BLOCKERS critiques (toutes critiques fusionnées)

| # | Faille | Source | Gravité | Effort |
|---|---|---|---|---|
| **1** | **`DEMO_API_TOKEN` exposé côté client → exfiltration totale via `/api/export/*`** | K4-V1 CRITICAL | 🔴 | S (1h) |
| **2** | **Bucket Storage `animaux_photos` ouvert anonyme INSERT/UPDATE/DELETE/SELECT sans scope ferme_id** | K4-V2 CRITICAL | 🔴 | S (2h) |
| **3** | **Aucune authentification applicative** — toutes pages publiques sans cookie/session | K4-V3 CRITICAL | 🔴 | L (1-2j) |
| **4** | **`service_role` dispersé dans 18 fichiers** → RLS bypass total prod | K4-V4 + K2-#2 | 🔴 | L (1j) |
| **5** | **0 CI/CD** — pas de tests à chaque push, deploy à l'aveugle | K2-#1 | 🟠 | M (4h) |
| **6** | **Mensonge "offline-first"** — manifest.json + sw.js = 404, panne 4G = app morte | K1-#1 | 🟠 | M (1j) |
| **7** | **Wizard mise bas 5 étapes / 12 champs / 8+ taps** — geste #1 du métier = experience #1 lourde | K1-#2 | 🟠 | M (4h) |
| **8** | **Headers sécurité absents** — CSP, HSTS, X-Frame-Options, SameSite : tout ouvert | K4-V5 HIGH | 🟠 | XS (30min) |
| **9** | **`lucide-react@1.16.0` = version inexistante upstream** — `rm -rf node_modules` = build cassé | K2-#10 | 🟠 | XS (5min) |
| **10** | **Vue `v_alertes_actives` = 34 KB SQL, 26 CTE** → explose à 200 truies | K2-#3 | 🟡 | M (4h) |

---

## 📊 Détail par axe

### K1 — Métier : "Je résilie"
**Top 5 fails** :
1. Pas d'offline (promesse cassée)
2. Wizard mise bas trop long
3. Aucun batch (saillies, vacc, pesées 1 par 1)
4. Cause mortalité = champ libre (analytics ruinés)
5. Pas de QR scan boucle dans dialogs

**Fonctionnalités IFIP manquantes** : picker cause mortalité normé, mouvements globaux, dossier sanitaire PDF par animal, températures bâtiments, plan prophylaxie 12 mois, calcul économique par bande, mode vocal, photo+OCR boucle.

**Verbatim cru** : *« Conçue par des gens qui n'ont pas tenu un stylo dans une maternité à 5h du matin. »*

### K2 — Technique : 4.1/10
- **Stats** : 32 377 LOC, 173 fichiers, bundle 3 MB, 0 test unitaire, 0 CI, 0 Suspense, 4 boundaries / 14 routes
- **15 FK sans index** (9 critiques métier) : `mises_bas_bande_id`, `sevrages_truie_id`, `animaux_case_id`, `animaux_mere_id`, `animaux_pere_id`
- **34 `service_role`**, 34 `: any`, 169 Zod (OK), 117 revalidatePath
- **God-files** : `lib/maladies-porcines.ts` 975 LOC, `kpi/page.tsx` 864 LOC

**Bombes à retardement** :
1. `lucide-react@1.16.0` fantôme → 1er reinstall = build cassé
2. `v_alertes_actives` 34 KB → explose à 200 truies
3. `service_role` 13 fichiers → 1er Server Action sans `getFermeId()` = leak prod

### K3 — Design : 4.6/10
**Top 5 fails** :
1. **2 logos officiels parallèles** dans `public/` (Cachet C v2.2 + horizontal plain), CONTEXT promet "Cachet B" (3 cachets différents en circulation)
2. **Cachet 240×240 ratatiné à 36×36** dans sidebar (bouillie verte)
3. **Triple couche tokens conflictuels** : `@theme`, shadcn OKLCH, `--sf-*`, smartfarm-tokens.css — `--sf-accent` ≠ `--sf-accent-warm`
4. **4 styles H1 différents sur 14 pages**
5. **137 couleurs Tailwind hardcodées** hors palette + dark mode cassé sur 9/14 pages
6. **Instrument Sans annoncée mais jamais chargée** (fichier woff2 absent ?) — body tombe en system-ui

**Comparaison verticale** : *« meilleur que concurrence FR/EU IFIP/Hipra (Bootstrap 2017), à 2 sprints d'atteindre Stripe vertical SaaS. »*

### K4 — Sécurité : 3.9/10
| Axe | Note |
|---|---|
| RLS DB | 8/10 (44/44 tables, 102 policies) |
| Injection | 8/10 (Zod 169×) |
| **Auth** | **1/10** (zéro auth applicative) |
| **Storage** | **0/10** (bucket ouvert anonyme CRUD) |
| Intégrité | 3/10 (audit 26 tables, hard delete 5 tables) |
| Secrets | 3/10 (NEXT_PUBLIC token = privé) |
| RGPD | 4/10 (pas d'export user, pas de retention) |

**10 vulnérabilités** :
- V1-V3 CRITICAL : token exposé / bucket ouvert / aucune auth
- V4-V7 HIGH : service_role / headers / hard delete / no MIME check
- V8-V10 MEDIUM/LOW : DEMO_FERME_ID / lost updates / HMAC sans rotation

---

## 🎯 PLAN DE CORRECTION — Sprint R7 (12 jours estimés)

Ordonné par **gravité × ROI** :

### 🚨 Jour 1-3 : **STOP-THE-BLEED** (sécurité critique)
- Fix V1 : supprimer `NEXT_PUBLIC_DEMO_API_TOKEN`, mettre token côté serveur uniquement
- Fix V2 : bucket photos privé + policies scoped ferme_id + MIME+taille check
- Fix V3 : auth Supabase basique (email/magic link), pages protégées par middleware
- Fix V4-V5 : headers sécurité (next.config.ts `headers()`), purge `service_role` hors `lib/supabase/`
- Fix V9-V10 (déjà partiel, finaliser)
- Fix K2-#10 : `lucide-react` → version réelle (~0.5xx)

### 🔧 Jour 4-6 : **STABILITY** (technique)
- CI GitHub Actions : lint + typecheck + tests E2E à chaque push
- 4 fails Playwright → fix selectors data-testid (passer 14/18 → 18/18)
- Index sur 9 FK critiques métier
- Refactor `v_alertes_actives` : matérialisée ou split en 4-5 vues thématiques
- Try/catch dans les 80% Server Actions sans

### 🎨 Jour 7-9 : **VISUAL CONSISTENCY**
- 1 SEUL logo (décision Christophe : Cachet B OU Cachet C OU monogramme)
- Composant `<PageTitle>` unique
- Composant `<Eyebrow>` distinct
- Purge `lib/colors.ts` → tokens sémantiques `--sf-success/warning/danger`
- Charger Instrument Sans ou la retirer de la promesse
- Mode dark validé sur 14/14 pages

### 🌾 Jour 10-12 : **TERRAIN FIRST**
- Wizard mise bas en 1 étape compactée (BCS reporté à J+3 conformément IFIP)
- Batch saillies/pesées/vaccinations 1-formulaire-N-animaux
- Picker cause mortalité normé (15 enum IFIP)
- QR scan tag boucle dans 4 dialogs critiques
- PWA manifest.json + sw.js + page /offline
- Routes `/cheptel/classement-truies` et `/genealogie` dans sidebar
- Mode "ouvrier" : sidebar simplifiée 5 actions, vocabulaire allégé

---

## 📌 Décisions à escalader (Christophe doit trancher)

1. **Logo final** : Cachet B (promis CONTEXT) ? Cachet C v2.2 (déployé) ? Horizontal landing ? Monogramme nouveau ?
2. **Auth flow** : Magic link email ? OTP SMS (CI = Orange/MTN) ? Mot de passe classique ?
3. **PWA scope** : Offline-first total (LocalStorage queue) ou juste cache pages statiques ?
4. **Mode ouvrier** : variantes simplifiées par rôle ? Ou app séparée ?
5. **Multilingue** : Dioula/Baoulé/Français-simple maintenant ou phase 2 ?
6. **MVP scope révisé** : on garde les 14 pages ou on coupe à 7 essentielles pour le pilote terrain ?

---

## Files
- K1 — Métier : `/root/projects/smartfarm/.brain/audits/sprint1/K1-critique-metier.md` (293 lignes)
- K2 — Technique : `/root/projects/smartfarm/.brain/audits/sprint1/K2-critique-tech.md` (122 lignes)
- K3 — Design : `/root/projects/smartfarm/.brain/audits/sprint1/K3-critique-design.md` (303 lignes)
- K4 — Sécurité : `/root/projects/smartfarm/.brain/audits/sprint1/K4-critique-secu.md` (436 lignes)
- **Total** : 1154 lignes de critique brute
