# SMART FARM — CONTEXT.md (cerveau projet, mode caveman)
# Lu par tout sous-agent avant action. ≤ 200 lignes, télégraphique.

## STACK
Next 16.2.6 (Turbopack) · React 19 · TypeScript · Tailwind v4 · shadcn/ui · Supabase Cloud
PostgreSQL · Hostinger Cloud LSNODE/Passenger · output:"standalone" patché Passenger

## PROD
URL : https://smartfarm.group
Repo : github.com/bethd446/smartfarm (branch main)
Deploy auto sur push main → build Hostinger ~50s
Build cmd : `npm run build` = next build + patch-server-passenger.js + deploy-static-copy.sh
Start cmd : `npm start` = node .next/standalone/projects/smartfarm/app/server.js

## SECRETS HOSTINGER (env vars actives, 8 vars)
NEXT_PUBLIC_SUPABASE_URL=https://tpzhxjzwlxwujboboyit.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_VdYNHQZS-1ZMMSO4tpiVIg_bETYXHIT
NEXT_PUBLIC_APP_URL=https://smartfarm.group
NODE_ENV=production
SMARTFARM_DEMO_MODE=false
SUPABASE_SERVICE_ROLE_KEY=<.env.local>
OPENROUTER_API_KEY=<.env.local>
CHATBOT_SESSION_SECRET=<.env.local>
(PORT/HOSTNAME SUPPRIMÉES — causaient boot loop Passenger)

## SUPABASE CLOUD (tpzhxjzwlxwujboboyit)
50 tables / 31 vues / 18 functions / 42 triggers / 40 RLS policies
Tables clés : utilisateurs, fermes, user_farms, animaux, saillies, mises_bas, sevrages,
              porcelets, batiments, cases, pesees, alertes, donnees_metier
Vues alias compat : utilisateur_fermes, v_calendrier_repro V2, v_saillies_a_diagnostiquer
Management API SQL via SUPABASE_ACCESS_TOKEN env (jamais commiter)

## COMPTE TEST PROD
Email : 13smartfarm@gmail.com
Password : SmartFarm2026!
Profil : SF-000001
Ferme : "Smart Farm" id=fdba3bb2-85dd-4ac1-9ab3-713c750980dc, Yamoussoukro CI
Cheptel : 17 truies (10 gestantes / 5 vides / 2 allaitantes) + 2 verrats (B.89 BOBI + B.100 ALIGATOR boucles à renouveler) + 129 porcelets actifs (95 sevré + 34 croissance, post-fix S2 filtre statut=actif/deleted_at) — saillies/MB/sevrages à jour suite retour technicien 2026-05-24
Pesées : 117 (B1-M -18.8% sévère, B1-F -2.6% normal, B3-M -38.3% sévère, B3-F +7.1%)
Alertes auto : 54+ (sevrages retard, saillies non-diag, etc.)

## DESIGN SYSTEM v1.0 (livré Claude Design)
ZIP : /tmp/sf-design/release/smartfarm-design-v1/
État : tokens.css + logos + favicons + fonts INTÉGRÉS commit c8a60f7
       Composants HTML/CSS + screens NON ENCORE INTÉGRÉS dans React

Composants livrés (HTML+CSS pur, à porter en React shadcn) :
  - alert-critique / alert-attention / alert-info
  - card-kpi
  - form-fields
  - sidebar
  - table-cheptel
  - widget-cycle-truie

Screens livrés (HTML+CSS, à transcrire en routes Next) :
  - 01-landing      → src/app/page.tsx
  - 02-connexion    → src/app/(auth)/connexion/page.tsx
  - 03-dashboard    → src/app/(app)/dashboard/page.tsx
  - 04-cheptel-truies, 05-portees → src/app/(app)/cheptel/page.tsx
  - 06-fiche-truie  → src/app/(app)/cheptel/[id]/page.tsx
  - 07-reproduction → src/app/(app)/reproduction/page.tsx
  - 08-mises-bas    → src/app/(app)/mises-bas/page.tsx
  - 09-alertes      → src/app/(app)/alertes/page.tsx
  - 10-sanitaire    → src/app/(app)/sanitaire/page.tsx

Vibe : carnet d'éleveur tropical CI, austère pro vétérinaire, PAS SaaS US
Palette : sahel-700 #2D4A1F dominant + or-600 #A16207 accent + latérite-700 #9A3412
          mil-50 #FFFBEB surface + terre-900 #1C1917 ink
Fonts : Big Shoulders Display (titres+chiffres) + Instrument Sans (body)
Style : bordures fines, ombres parcimonieuses, stamp-ring CTAs, tabular-nums
        uppercase letter-spaced, F-pattern dashboard (critiques top-left)

## TOKENS CSS DÉJÀ CÂBLÉS dans app/src/app/globals.css
--sf-primary (#2D4A1F), --sf-accent (#A16207), --sf-terre (#9A3412)
--sf-ink, --sf-ink-secondary, --sf-muted, --sf-line, --sf-surface-0/1/2
--sf-danger, --sf-warning, --sf-success, --sf-focus
--sf-alert-{critical|critique,high|attention,medium|info}-{bg,ink,bd,border}
--sf-success/warning/danger/info/neutral-{bg,ink,border} (paires sémantiques)
--sf-radius-{xs,sm,md,lg,pill}, --sf-space-{xs,sm,md,lg,xl,2xl,3xl}
--sf-touch-{min,default,comfort} (44/48/56)
--sf-elev-{0..5}
--sf-stamp-{ring,ring-accent,press}
--sf-font-display ("Big Shoulders Display"...), --sf-font-body ("Instrument Sans"...)
Dark mode + html[data-contrast="high"] couverts.

## VOCABULAIRE FR PRO ZOOTECHNIQUE (RESPECTER STRICTEMENT)
✅ OK : Saillie, Mise bas, Sevrage, Diagnostic gestation, Cochette, Truie {gestante|allaitante|vide}, Réforme, Verrat, Porcelet, Échographie, Bande, Cycle, Lot
❌ INTERDIT : "faire monter", "elle a fait", "enlever les petits", "petite cochonne", "truc"...

## RÈGLES ABSOLUES
1. EPCV strict (Explore-Plan-Code-Verify) avant tout commit
2. PAS de seed démo, PAS de fallback magique, schéma propre
3. Migrations YYYYMMDDHHMMSS_*.sql, vues SQL security_invoker=true + GRANT
4. Multi-tenant via RLS current_farm_id() + user_farms
5. Climat tropical CI (24-32°C), GMQ -25g/+1°C >24°C, devise XOF
6. Races CI : LW, Landrace, Piétrain, Duroc, Korhogo
7. Cible UI : éleveur Android 4G, plein soleil 1500lx, mains sales, lecture 3s
8. Validation visuelle OBLIGATOIRE : browser_console computed styles + playwright screenshot
   PAS de "HTTP 200 = livré" — vérifier rendu réel
9. **Filtres animaux "vivants"** (post B1-EXT S2 2026-05-25) : RLS filtre par ferme MAIS PAS par statut.
   Toute query SELECT-list/count `from('animaux')` DOIT inclure :
   - `.in('statut', ['actif', 'malade']).is('deleted_at', null)` pour vue cheptel/KPI/calendrier sanitaire/pesées
   - `.eq('statut', 'actif').is('deleted_at', null)` STRICT pour reproduction (pas saillir un malade)
   - **Exceptions volontaires** : fiches détail (`cheptel/[id]/*`), généalogie, chatbot RAG, registre réglementaire → garder accès animaux réformés (traçabilité)
   - Mutations (INSERT/UPDATE) : pas de filtre statut (l'ID identifie l'animal)
10. **Hydration dates** (post B2-EXT S3 2026-05-25) : tout rendu de date côté JSX Server Component PASSE par les composants client `<RelativeTime>` ou `<FormattedDate>` (dans `components/ui/`). Bannir `formatDistanceToNow` / `toLocaleString` / `Intl.DateTimeFormat` dans du JSX serveur — risque erreur React #418.
11. **Multi-agent orchestration** : pour tout sprint complexe (≥3 fichiers, doute scope), charger skill `multi-agent-prof-review` (software-development/). Pattern : auditeur read-only → orchestrateur décide → N producteurs parallèles → prof reviewer. Mesuré 0 régression sur S2/B1-EXT/S3.

## ARCHITECTURE FICHIERS CLÉS
app/
├── next.config.ts            (output:"standalone" RESTAURÉ)
├── package.json              (build:standalone + start:node server.js standalone)
├── scripts/patch-server-passenger.js  (rewrite server.js pour Passenger)
├── deploy-static-copy.sh     (sync .next/static → public/_next/static + standalone)
├── public/
│   ├── logo-smartfarm.svg    (v1.0 Cachet Ivoire)
│   ├── glyph-smartfarm.svg
│   ├── manifest.json
│   ├── favicon{-16,-32,-48}.png + favicon.ico + apple-touch + android-192/512
│   ├── fonts/{BigShoulders,InstrumentSans}-{Regular,Bold}.woff2
│   └── logo/  (7 variants v1.0)
├── src/
│   ├── app/
│   │   ├── globals.css          (tokens v1.0 + dark + high-contrast)
│   │   ├── layout.tsx           (metadata multi-icons + viewport)
│   │   ├── page.tsx             (landing — À REFAIRE selon 01-landing.html)
│   │   ├── (auth)/connexion/    (À REFAIRE selon 02-connexion.html)
│   │   ├── (auth)/inscription/
│   │   ├── (app)/dashboard/     (À REFAIRE selon 03-dashboard.html)
│   │   ├── (app)/cheptel/       (4 onglets TRUIES/VERRATS/PORCELETS/PORTÉES OK)
│   │   ├── (app)/cheptel/[id]/  (fiche truie — À REFAIRE selon 06)
│   │   ├── (app)/reproduction/
│   │   ├── (app)/mises-bas/
│   │   ├── (app)/alertes/
│   │   ├── (app)/sanitaire/
│   │   └── (app)/layout.tsx     (sidebar — À REFAIRE selon sidebar.html)
│   ├── components/
│   │   ├── ui/                  (shadcn — alert, button, card, badge, input...)
│   │   ├── sidebar.tsx          (legacy)
│   │   ├── mobile-drawer.tsx
│   │   └── app-shell.tsx
│   ├── lib/
│   │   ├── supabase/{client,server,ferme-context}.ts
│   │   ├── chatbot/...
│   │   └── i18n.ts (à créer pour glossaire FR centralisé)
│   └── proxy.ts                 (ex-middleware, runtime forcé Node par Next 16)

## TESTS REQUIS APRÈS CHAQUE MODIF
1. TypeCheck : `npx tsc --noEmit` doit retourner 0 erreur
2. Build : `npm run build` doit aller au bout sans erreur
3. Playwright local : `node /tmp/check-css-real.js` pour vérifier rendu
4. Smoke prod : curl HTTP 200 sur 8 routes (/, /connexion, /inscription,
   /dashboard, /cheptel, /alertes, /sanitaire, /reproduction)

## BUGS CONNUS À FIXER (à jour 2026-05-23 16:25)
- Login 13smartfarm@gmail.com échoue (mot de passe perdu ?) → reset via Management API
- Landing actuelle ≠ design v1.0 (utilise ancien code, 28/44/100% sont des chiffres
  hardcodés au mauvais endroit, hero pas en stamp ring complet, pas de section
  "Trois piliers" Big Shoulders propre)
- Composants alertes shadcn non variant-isés sur les 3 niveaux v1.0
- Pas de Widget Cycle Truie React (HTML+CSS du ZIP à porter)
- Sidebar app n'utilise pas la structure sidebar.html du ZIP
- Photo terrain manquante sur landing (placeholder ZIP a marius-avatar.webp à retirer)

## INTERDITS ABSOLUS
- Toucher next.config.ts ou package.json sans triple-check (cause de 503 répétés)
- rm -rf public/_next (build artifact, géré par .gitignore + deploy-static-copy.sh)
- Modifier les env vars Hostinger via le wizard "Connect Database" (corrompt PORT/HOSTNAME)
- Inventer du vocabulaire métier (toujours valider contre glossaire FR pro)
- Pousser sans avoir testé build + Playwright en local

---
## RÉSOLU 2026-05-21 — GRANT manquants sur 7 tables métier

**Symptôme** : /mises-bas, /reproduction, /sanitaire/biosecurite|protocoles|mycotoxines, /bandes affichaient "0 portées / 0 visites / etc." malgré données présentes en BDD.

**Cause racine** : `permission denied for table mises_bas` (et 6 autres). RLS policies étaient `TO public` (donc OK pour authenticated), mais le GRANT au niveau ACL Postgres manquait. Postgres refuse l'accès AVANT même d'évaluer les policies RLS.

**Fix** (appliqué par user via Supabase Studio SQL Editor) :
```sql
ALTER TABLE public.{7 tables} ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.{7 tables} TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
```

**Tables concernées** : mises_bas, sevrages, diagnostics_gestation, visites_biosecurite, protocoles_vaccinaux, lots_matieres_premieres, bandes.

**Validation prod** :
- /mises-bas → 6 portées ✅
- /reproduction → 10 montées + diagnostics ✅
- /sanitaire/biosecurite, /protocoles, /mycotoxines → chargent sans erreur SQL ✅
- /bandes → "Aucune bande créée" UX (table vide en BDD, normal) ✅

**Leçon** : Sur Supabase, RLS policies seules ne suffisent pas. Tables créées via migrations custom doivent avoir GRANT explicite pour rôles `authenticated`/`anon`. Tables créées via Studio en ont par défaut. À vérifier systématiquement sur nouvelle table métier.

**Commit cleanup** : `78ff95c` (retrait debug probe `[MB=X ERR=Y]` sur /mises-bas).

---
## SEEDING DATA — 2026-05-23 (post-GRANT service_role)

**Contexte** : User a validé Option B (B.24 saillie post-MB → diag NÉGATIF, éditable manuellement plus tard).

### Diagnostics gestation (9 créés)
- 8 POSITIF (B.38, B.85, B.37, B.39, B.26, B.31, B.21, B.12) — saillies confirmées
- 1 NÉGATIF (B.24, 05/04/2026) — anomalie data (saillie 4j post-MB, à investiguer manuellement)
- 1 EN ATTENTE (B.29 saillie 10/05, fenêtre diag 18-24j pas encore atteinte)

### Sevrages (5 créés)
- B.37 (17/04), B.26 (28/03), B.85 (25/04), B.76 (28/04), B.24 (29/04)
- Effectif par défaut 10 porcelets @ 7.5kg (à affiner via UI)
- B.10 reste en allaitement (MB 05/05, J18)

### Protocoles vaccinaux (3 créés)
1. Cochette pré-saillie : Parvo/Rouget J-30, Rappel + Lepto J-15
2. Truie gestante : Coli J85, Rappel Coli/Clostri J100
3. Porcelet sevrage : Mycoplasmose + Circovirose PCV2 J21

### Réaffectations bâtiments
- B.76 : Maternité → Gestation (sevrée 28/04, retour gestation)
- 117 porcelets sevrés → Démarrage 2 (selon user)

### Fix bug /batiments
- Cause : JOIN sur table `cases` vide → query retournait []
- Fix commit `fbc033f` : 2 queries séparées (batiments + animaux), groupBy côté serveur
- Résultat attendu : 7 bâtiments visibles avec taux d'occupation

## LEÇONS 2026-05-23 (compte démo + audit fonctionnel)

### Bug pattern : submit silencieux
- Payload front contient colonnes absentes en BDD prod → PGRST204
- Dialog se ferme, aucun toast erreur
- Fix : aligner payload sur schéma réel + console.error server + return {error} client
- Cas vus : saillies (rang_porte/bcs_truie/idempotency_key), mouvements_stock (quantite vs qte_kg, date_mvt vs date)

### Catégorisation alertes
- View `v_alertes_actives` expose `type` métier (`retour_chaleurs_surveillance`, `sevrage_*`)
- PAS un code `Rxx-…` → mapping `type → categorie UI` nécessaire dans `alertes-list.tsx`

### KPI vue
- `v_kpi_techniques_ferme` renvoie `portee_moyenne_12m` (nés vivants moyens) PAS `nes_vivants_par_portee_moyen`
- Normaliser au lecture (alias)
- Taux fertilité = positifs/total `diagnostics_gestation` (à calculer direct, pas dans la vue)

### Bug schéma multi-tenant
- `portees.code_portee UNIQUE` global au lieu de `UNIQUE(ferme_id, code_portee)` → conflits cross-fermes
- RLS sur `mises_bas` masque parfois les MB côté anon malgré ownership → policies à auditer
- Migration future : ajouter colonnes `rang_porte`, `bcs_truie`, `idempotency_key` à `saillies` + RLS `mises_bas/portees` ownership

### Compte démo
- demo@smartfarm.group / Demo6734N0xUHH1I
- ferme_id réel : `3ed3960d-39e4-4b1b-8a12-bb28aff92fdf` (NOT cf7e-...)
- 59 animaux + 20 saillies + 17 diagnostics + 4 MB + 78 alertes (auto)
- Isolation RLS confirmée (tentative cross-ferme bloquée)

### Audit mobile 2026-05-23 (faux positifs)
- 9 "404" reportés sont des URLs INVENTÉES par l'auditeur (`/cheptel/truies`, `/sevrages`, etc.)
- Vraie architecture : `/cheptel?tab=truies|verrats|porcelets`, sevrages dans `/mises-bas`, `/reproduction` tout-en-un
- Sidebar n'expose AUCUN lien vers ces URLs imaginaires
- Vrais problèmes mobile : /alertes monstrueuse (244 boutons, 22k px), touch targets < 44px (82% sur /cheptel), tables forcées (besoin pattern card)

### Commit récent
- `f668daa` : fix 5 bugs P0/P1 démo (saillies/stock/alertes/KPI/fiche truie) - 4 fixés, BUG-5 fiche truie skippé (RLS mises_bas à investiguer)

---
## PHASE 1 STABILISATION — 2026-05-24

### Livrables
- ✅ Migration `portees.code_portee` → `UNIQUE(ferme_id, code_portee)` (20260524100000)
- ✅ Reset password `13smartfarm@gmail.com` → nouveau pass communiqué hors-bande
- ✅ Seed 235 pesées démo (porcelets/engraissement/truies/verrats/cochettes courbes croissance climat CI)
- ✅ Tests Playwright smoke prod : 11 tests, 11 PASS en 15s
- ✅ Workflow CI `.github/workflows/smoke.yml` post-push main
- ✅ RUNBOOK.md (procédures urgence, reset password, migrations, backup)
- ✅ /batiments/[id] nutrition prédictive (commit 638384b push enfin effectif)

### Leçons critiques
1. **GoTrue `?email=X` ne filtre pas** — toujours lister + filtrer côté script
2. **Toujours `git log origin/main..HEAD`** AVANT de débugger un fix qui "devrait marcher" : un commit peut être local sans être pushé
3. **Sous-agents parallèles sur même repo = conflits massifs** : sérialiser quand fichiers partagés (page.tsx, _actions.ts), paralléliser SEULEMENT sur chemins disjoints
4. **Management API SQL endpoint** : `POST https://api.supabase.com/v1/projects/{ref}/database/query` avec `Authorization: Bearer $SUPABASE_ACCESS_TOKEN` — pratique pour migrations sans Studio

### Secrets — emplacements actuels
- `SUPABASE_SERVICE_ROLE_KEY` : `/root/projects/smartfarm/app/.env.local`
- `SUPABASE_ACCESS_TOKEN` : env shell (`echo $SUPABASE_ACCESS_TOKEN`)
- Password ferme réelle : Bitwarden / 1Password (jamais commit)

## LEÇONS 2026-05-24 (Phase 2 mobile + rotation modèles)

### Rotation Hermes auxiliary models
- vision → google/gemini-2.5-pro ($0.011/audit vs $0.40 Opus, 40× cheaper)
- compression/web_extract/session_search → gemini-2.5-flash ($0.30/M)
- title_gen/triage/approval/mcp/skills_hub/profile → gpt-5-mini ($0.25/M)
- kanban_decomposer/delegation → claude-sonnet-4.5
- curator → claude-haiku-4.5
- conversation principale ↔ user → claude-opus-4.7 (inchangé)
- Restart gateway requis après modif config (systemctl --user restart hermes-gateway)

### Phase 2 mobile livraisons
- Commits : f3298a3 (touch targets) → daeb85f (ResponsiveTable) → 44f604a (FAB) → c4cf2e3 (skeletons) → 0a53a12 (PWA) → c96ea95 (pagination) → 26c7ea4 (tests smoke)
- ResponsiveTable migré : /cheptel + /alimentation/consommations seulement (5 autres à migrer)
- FAB sur 5 routes critiques (Cheptel/Repro/MB/Conso/Alertes)
- PWA : manifest + sw.js custom sans deps (offline-first sauf API Supabase)
- Pagination 10/page sur /alertes + filtres sticky

### KNOWN ISSUE 24/05 PM → RÉSOLUS
- ~~Login démo Supabase échoue~~ FAUX POSITIF : typo `l` vs `I` dans la clé que j'utilisais en test. La prod tournait correctement avec la vraie clé.
- ~~/cheptel 500 ERROR 3602523190~~ FIXÉ commit 3f7f2ce : ResponsiveTable était `'use client'` et recevait des fonctions render() en props depuis un Server Component → boundary client implicite + crash. Solution : vire `'use client'`, utilise `<table>` HTML natif au lieu du Table shadcn (qui est lui 'use client').

### LEÇON CRITIQUE Next.js 16 + RSC
Si un Server Component passe une **fonction** (callback, render prop) à un Client Component (`'use client'`), ça crash. 2 solutions :
1. Faire du composant un Server Component (virer `'use client'`, ne pas utiliser de hooks)
2. Wrapper le composant Client dans un autre composant Client qui définit les callbacks

Et : `shadcn/ui` Table a `'use client'` baked-in → ne pas wrapper directement depuis un Server Component avec des callbacks. Utiliser `<table>` HTML natif.

## Session 2026-05-24 — UX Fixes 1/3 + Audit Nutrition
### Commits prod
- `1ae2b99` — fix UX critique 3 lots (FAB sanitaire/alim/stock, empty state /alertes, dates contextuelles, kg, touch params, mise bas sans tiret)
- `af73d1a` — fix deploy.sh healthcheck (faux échec sur prod externe corrigé)

### Anomalies nutrition découvertes (Ferme Démo SF100001)
- 4/5 bâtiments ont `ration_kg_jour_par_sujet = 0` (Engraissement, Gestation, Maternité, Verraterie)
- Total théorique calculé = 19.2 kg/j vs réel enregistré 80-100 kg/j (×5)
- Stock Tourteau coton SOUS seuil (50<80) — alerte attendue
- 4/5 formules ont composants vides → projections faussées
- Tables `plans_alimentation` et `rations` vides (système utilise batiments.ration_kg_jour_par_sujet)

### Top 3 actions backlog
1. Widget "Health Check Nutrition" sur hub /alimentation
2. Validation ration obligatoire + alerte écart conso théorique vs réel
3. Alerte stock rouge agressive avec card pleine largeur + badge menu

### En attente Christophe
- Nouveaux poids ferme (à insérer via PAT Supabase)
- Plan alimentaire matières administrées par stade

## Session 2026-05-24 (suite) — Prix matières premières

### 🟢 Prix RÉELS confirmés Christophe
**Vitalac (concentrés industriels, distribution E3CIT CI)** :
- Ecolac (sevrage) : 22 890 FCFA / sac 25 kg = **915 FCFA/kg**
- Vitafaf 1,5% porc : 33 790 / sac 20 kg = **1 690 FCFA/kg**
- Vitafaf 1,5% truie : 33 245 / sac 20 kg = **1 662 FCFA/kg**
- Concentré 5% sécurisé : 37 060 / sac 25 kg = **1 482 FCFA/kg**
- Concentré 2,5% sécurisé : 63 220 / sac 25 kg = **2 529 FCFA/kg**

### 🟡 Prix EN ATTENTE confirmation Christophe (DB tient seed CI 2024)
Romelko (Koudijs) · KPC 5% (Koudijs) · Lysine · Méthionine · Enzymes
+ Maïs/Soja/Son blé/Coton/Drêche/Coquillage/Prémix (à valider vs seed)

### Fournisseurs cartographiés (seed_donnees_metier.py)
- **De Heus/Koudijs CI** (Attinguié PK24) → Romelko, KPC, aliments complets
- **Vitalac/E3CIT** (Abidjan) → Lactarine, Ecolac, Zenilac, Vitafaf
- **Maridav CI** (Marcory) → Concentrés Hendrix
- **Nutrika** (intérieur CI) → Premix, 1er âge
- **Kenz** (Abidjan) → MP brutes pour FAF
- **AfricAgri** (Abidjan) → Additifs spécialisés

### Documents alim référence
- `RATION_ALIMENTAIRE_PORCS.docx` : table par âge/poids + règles dynamiques verrat/truie
- `formule_aliment_porcin_optimisee.pdf` : 5 formules type Koudijs (Romelko+KPC base)

### Bâtiments cycle complet désormais (8/8) — Ferme Démo
Cycle réordonné : Verraterie→Truies vides→Gestation→Maternité→Démarrage→Démarrage 2→Croissance→Engraissement.
Enum DB étendu : `gestation_vide` ajouté.

### En attente Christophe (séquence)
1. Prix Koudijs (Romelko + KPC) + acides aminés
2. Formules Vitalac (5 stades) pour multi-fournisseur
3. **Nouveaux poids** (dernière pesée 2 mai 2026) → format `tag / kg / date`
4. Ferme cible pesées : démo / 13smart / les 2 ?

### Décisions terrain pesées (25/05/2026)
- **Bande Démarrage 2 (13smart)** : baseline officielle = **02/05/2026** (1ʳᵉ pesée réelle).
  Sevrage manqué assumé, PAS de pesée rétroactive inventée. Validé par Christophe (opt B).
- **Doublons 24/05** (B7-F, B12-F, B48-F, B55-F) : 2 animaux distincts en DB, flag
  `doublon_pesee_a_clarifier`, à résoudre prochaine pesée terrain.
- **Composant HistoriquePoids** : OK en prod (commit cd86cad), affiche courbe + table
  + GMQ par animal + référentiel Lavalier-Toulze.

## PITFALL build standalone (audit 2026-05-25)
- /root/package-lock.json (résidu install hors-projet) provoque warning Turbopack
  "multiple lockfiles" — **NE PAS supprimer** car détermine où Next met server.js :
  - AVEC lockfile root → .next/standalone/projects/smartfarm/app/server.js (attendu)
  - SANS lockfile root → .next/standalone/server.js (casse npm start + deploy-static-copy.sh)
- Warning cosmétique à laisser tel quel. turbopack.root dans next.config.ts a le même
  effet de bord. Solution propre = adapter deploy-static-copy.sh + npm start + Hostinger
  start cmd avant de purger — risque vs bénéfice = négatif, laisser dormir.
