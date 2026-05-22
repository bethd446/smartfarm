# CHANGELOG

Toutes les modifications notables de Smart Farm sont documentées ici.
Format basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Suit le [Versionnement Sémantique](https://semver.org/lang/fr/).

---

## [0.3.0] — 2026-05-22

### Identité de marque (B1)
- **Logo Cachet Ivoire** v2-2 "Truie au pied" — octogone double bordure + monogramme SF Big Shoulders 900 + silhouette truie subtile entre filets gold
- **Palette Terre & Mil** validée WCAG AA (10/10 paires)
  - Sahel `#2D4A1F` (primary, conservé)
  - Harvest Gold `#A16207` (accent chaud, nouveau)
  - Latérite `#9A3412` (accent terroir, nouveau)
  - Mil `#FFFBEB` (crème chaude, surface)
  - Terre `#1C1917` (encre)
- **Tagline** "ÉLEVAGE PORCIN · CÔTE D'IVOIRE" omniprésente (sidebar + mobile drawer + header)

### Sprint D2 — Fix 5 P0 design
- H1 unifié `text-4xl font-black uppercase tracking-[0.02em]` sur cheptel/reproduction/kpi/sanitaire
- Hiérarchie sémantique : h2/h3 sur 4 pages (≥2 h2 et/ou ≥3 h3)
- Bouton variant `default` : `h-14 min-h-14` (WCAG 2.5.5 tap target ≥56px)
- `text-xs` base 13px floor (lisibilité terrain Sahel plein soleil)
- aria-label défensif sur boutons icon-only `/alertes`

### Sprint D4 — KPI Productivité IFIP
- Vue `v_kpi_mca_ferme` — Marge sur Coût Alimentaire (XOF/kg croît)
- Vue `v_kpi_ic_ferme` — Indice de Consommation (kg aliment / kg croît)
- Vue `v_kpi_gmq_par_stade` — GMQ par stade (porcelet 0-28j / sevrage 28-70j / engraissement >70j)
- Règle **R27** — IC ferme > 3.2 sur ≥30 jours (gravité moyenne, catégorie nutrition)
- Règle **R28** — GMQ engraissement < 600g/j (gravité moyenne, catégorie nutrition)
- 11 matières CI seedées NRC 2012 (Thr/Trp/Cys/Lys/Met) — Manioc, Sorgho, Mil, Riz, Son de blé, DDGS brasserie, Tourteaux coton/arachide/palmiste, Farine de poisson, Cacao
- UI `/kpi` enrichie : 2 KpiTechCards (MCA, IC ferme) + tableau GMQ par stade avec tones IFIP

### Seed démo IFIP
- 12 animaux engraissement, 144 pesées, 25 consos sur 90 jours
- Données IFIP-cohérentes : MCA 888 XOF/kg, IC 3.65 (R27 active), GMQ engraissement 777 g/j, sevrage 468 g/j

### Cerveau projet (économie tokens)
- `.brain/CONTEXT.md` v2 compacté 16.7KB → 9.4KB (-55%)
- `.brain/CAVEMAN.md` règles briefs télégraphiques sous-agents
- Économie observée : **-80% tokens IN par sous-agent** (validé sur D1→D4)

### Audit R6
- **Score consolidé : 7.9/10** (sur 7 axes : I 8.0 · C 7.5 · H 8.0 · X 8.0 · É 7.5 · F 8.5 · D 8.0)
- Delta vs baseline R4 (4.6) : **+3.3 points**
- Verdict : **GO-PILOTE-TERRAIN** (1 ferme Yamoussoukro, 4-6 semaines)

### Infrastructure
- Backup BDD pré-Sprint-C : `/root/backups/smartfarm/sf-v030-20260522-011240.sql.gz` (150 KB, 139 tables/vues)
- CI GitHub Actions : déclenchement étendu (PR + push main + workflow_dispatch)
- Tag git : `v0.3.0`

### Livrables
- `app/public/logo-smartfarm.svg` — Logo Cachet C v2-2
- `/tmp/sf-pitch-v030.pdf` — Synthèse pitch 2 pages (78 KB)
- `/tmp/sf-r6/RAPPORT-R6.md` — Audit consolidé

---

## [0.2.0] — 2026-05-21 (interne, non taggué)

### Ajouté
- Sprint A — R23-R26 (vermifuge truie pré-MB INRAE, Fer porcelet J3 CIRAD, BCS sevrage <2.5 IFIP, surdensité bâtiment FAO)
- Page `/sanitaire/ppa` (déclaration OIE, 6 symptômes)
- Triggers auto-événements (animal cochette → événements J16 saillie ; mise-bas → Fer/Castration/Mycoplasma/Sevrage)
- Page `/mises-bas/check-j1` (post-mortem J+1 à J+7)
- Sidebar 14 items / 5 groupes (vs 20 avant)
- Mycotoxines enrichi : 6 produits anti-myco référencés CI (Vitalac Mycoprotect, Mycofix Plus Biomin, Toxy-Nil Plus, Mycosorb A+, Biotox, Detoxa Plus)

### Production
- RLS multi-tenant sur 44/44 tables (`verify_rls_status()`)
- Wrapper auth demo `SMARTFARM_DEMO_MODE` (switch service_role ↔ SSR auth)
- Backup BDD quotidien (cron 03h + monitor 04h)

---

## [0.1.0] — 2026-05-20

### Initial
- Bootstrap Next.js 16 + React 19 + Tailwind v4 + shadcn/ui
- Stack Supabase Docker local (PostgreSQL 17.6)
- 33 tables initiales, 20 règles d'alertes R01-R20
- Charte Terrain Vivant V1 (Big Shoulders, vert sahel mono)
- Déploiement test VPS Hostinger (smartfarm.187-127-225-24.nip.io HTTPS)
- 12 pages V1 fonctionnelles
