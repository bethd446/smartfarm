# SmartFarm CONTEXT.md (caveman v2 — token frugal extrême)

> Sous-agent : lis ça, AGIS. Pas redécouvrir. Manque info → note dans rapport.

## STACK
- Next.js 16 / React 19 / Tailwind v4 / Radix / shadcn — `/root/projects/smartfarm/app/`
- Standalone :3000 — `next/standalone/projects/smartfarm/app/server.js`
- **DEPLOY** : `bash /root/projects/smartfarm/app/deploy.sh` (build + sync static/public + restart)
  - PIÈGE : `next build` ne copie PAS `.next/static/` et `public/` dans `.next/standalone/`
  - Sans ces dossiers → 404 sur tous chunks JS/CSS → page navigateur cassée (HTML servi mais blanc)
- Node 22 : `export PATH=/root/.hermes/node/bin:$PATH`
- DB : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`
- Vocab FR pro (Cochette, Reproduction, Mises bas, Sanitaire, Stock). PAS folklo CI.

## RÈGLES DURES sous-agent
- ❌ `npm run build` (orchestrateur fait, une fois, fin de vague)
- ❌ tuer/restart serveur
- ❌ modifier migration existante → toujours créer NOUVELLE `YYYYMMDDHHMMSS_*.sql`
- ❌ modifier `v_alertes_actives` sans `pg_get_viewdef` backup (26 règles à préserver)
- ❌ explorer schéma DB inutile → `\d tablename` ou `SELECT column_name FROM information_schema.columns WHERE table_name='X'`
- ✅ 3-5 fichiers max modifiés
- ✅ `security_invoker=true` + `GRANT … TO anon, authenticated` sur vue recréée
- ✅ `revalidatePath('/route')` après Server Action

## TABLES (43 — RLS ON partout, policies via `current_farm_id()`/`user_has_farm_access()`)
Liste : `\dt public.*` ou `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`.
Colonnes d'une table : `\d animaux` ou `SELECT column_name,data_type FROM information_schema.columns WHERE table_name='animaux'`.

**Tables clés** : animaux, bandes, batiments, cases, saillies, mises_bas, sevrages, diagnostics_gestation, vaccinations, traitements, mortalites, pesees, lots_matieres_premieres, matieres_premieres, formulations, consommations_aliment, consommations_eau, biosecurite_audits, ppa_observations, observations_bcs, produits_anti_mycotoxines, checks_post_mb, transits_phase, evenements_prevus, audit_logs.

## VUES SQL (lire `pg_get_viewdef('nom')` avant recréer)
| Vue | Note |
|---|---|
| **v_alertes_actives** | 26 règles R01-R26. UI mapping : `src/lib/alertes-regles.ts`. NE PAS casser. |
| **v_calendrier_sanitaire_porcelets** | Fer J1, Castration J5, Mycoplasma J14+J28, Sevrage J28 |
| **v_kpi_techniques_truie**, **v_kpi_techniques_ferme** | ISSF, TMM (exclut écrasés IFIP), PN, productivite |
| **v_bcs_historique_truie** | union saillies/MB/sevrages |
| **v_biosecurite_etat_actuel** | dernier audit par item |
| **v_calendrier_repro**, **v_kpi_truie**, **v_kpi_bande**, **v_densite_batiment**, **v_ppa_surveillance**, **v_recommandations_anti_mycotoxines**, **v_saillies_a_diagnostiquer**, **v_bande_effectif**, **v_checks_post_mb_attendus** | utilitaires |

## RÈGLES R01-R26 (catégories : reproduction / sanitaire / nutrition / pertes / stock)
Détails dans `src/lib/alertes-regles.ts`. Ne JAMAIS modifier numérotation existante. Nouvelle règle = R27+.

## ROUTES sidebar (14 items / 5 groupes)
```
PILOTAGE  : /dashboard /alertes /kpi
ÉLEVAGE   : /cheptel /bandes /batiments /reproduction /mises-bas
SANTÉ     : /sanitaire (HUB) /sanitaire/ppa
LOGISTIQUE: /alimentation /stock
SYSTÈME   : /assistant /parametres
```
Hors sidebar (accessibles URL) : `/cheptel/[id]`, `/bandes/[id]`, `/batiments/[id]`, `/mises-bas/check-j1`, `/sanitaire/{calendrier,biosecurite,mycotoxines,maladies,maladies/[slug],protocoles}`, `/alimentation/{matieres,formulations,concentres}`, `/actions-rapides`, `/calendrier`, `/conseiller`, `/pesees`.

Middleware redirects 308 : `/biosecurite` `/mycotoxines` `/calendrier-sanitaire` `/protocoles` `/maladies` `/ppa` → `/sanitaire/*`. `/sanitaire/eau` → 307 `/sanitaire`.

## LIB `src/lib/` (sources de vérité)
- `alertes-regles.ts` — 26 entrées R01-R26 (catégorie, gravite_default, nom, description)
- `nutrition-engine.ts` — `computeMixNutrition`, `calculerRatiosAA`, `CIBLES_RATIOS_AA` (NRC 2012 par stade), `AJUSTEMENT_HEAT_STRESS`
- `repro-cibles.ts` — `CIBLES_BCS` 5 stades, `bcsAlerte`, `evaluerBCS`
- `terrain-labels.ts` — vocab FR pro
- `colors.ts` — tones nominal/attendu/urgence/neutre
- `alertes-engine.ts` — types + helpers
- `supabase/server.ts` — wrapper SSR. Mode demo via `SMARTFARM_DEMO_MODE` + `SUPABASE_SERVICE_ROLE_KEY`. Switch prod = `SMARTFARM_DEMO_MODE=false`.

## COMPONENTS
`@/components/ui/{card,button,badge,dialog,input,label,select,radio-group,empty-state,skeleton}` · sidebar · bottom-nav · app-shell · mobile-drawer · contrast-toggle · barcode-scanner · export-button · kpi/kpi-tech-card.

⚠️ Pas de Tooltip dans `@/components/ui` → fallback `title=""` HTML natif.

## PATTERNS
### Server Action Next 16
```ts
'use server'
export async function maFonction(formData: FormData) {
  const x = String(formData.get('x') ?? '')
  // INSERT/UPDATE supabase
  revalidatePath('/route')
}
```
Page : `<form action={maFonction}>` + hidden inputs.

### Migration
`supabase/migrations/YYYYMMDDHHMMSS_*.sql` · `BEGIN; ... COMMIT;` · `psql -f`.

### Vue security_invoker
```sql
CREATE OR REPLACE VIEW v_xxx WITH (security_invoker=true) AS …;
GRANT SELECT ON v_xxx TO anon, authenticated;
```

### Test sans rebuild
- HTTP : `curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/route`
- SQL : `psql … -c "SELECT … FROM …;"`

## CHARTE "Terrain Vivant" actuelle
- Primary `--sf-primary` = #2D4A1F (vert sahel)
- Surfaces `--sf-surface-0` / `--sf-surface-1` (light + dark)
- Ink `--sf-ink`
- Display : Big Shoulders Display (uppercase tracking-wide)
- Body : Instrument Sans
- Boutons : min-h-14, uppercase tracking-[0.08em], stamp shadows
- Dark mode : light 9/10 + dark 9/10 (post-fix v3)

## SKILLS DESIGN OBLIGATOIRES (charger AVANT action design/UI/UX/visuel)

### Niveau 1 — Méthodologie (≥1 obligatoire)
- **impeccable** — squelette setup → register → sub-command. Refs : craft, shape, polish, audit, critique, harden, typography, motion, cognitive-load, brand. Anti "AI slop".
- **frontend-design** — production-grade, anti-générique.
- **ui-ux-pro-max** — DB BM25 : 67 styles, 161 palettes, 99 UX guidelines, 25 charts × 10 stacks. Script :
  `python3 ~/.hermes/skills/creative/ui-ux-pro-max/scripts/search.py "<query>" --domain <product|style|color|typography|landing|chart|ux>`

### Niveau 2 — Spécialistes
- **ckm:design-system** — tokens 3 couches (primitive→semantic→component)
- **ckm:ui-styling** — shadcn/ui + Tailwind + dark mode + a11y
- **canvas-design** — posters/PDF/PNG
- **brand-guidelines** — charte couleurs/typo
- **theme-factory** — 10 thèmes pré-réglés

### Règle dure
Output design SANS `skill_view(name='impeccable')` chargé = REJET.

## ÉTAT POST-OPTION-1 (mai 2026)
✓ 26 règles R01-R26, 43 tables RLS ON, wrapper service_role demo mode
✓ Sidebar 14 items, hub /sanitaire (6 cards), bottom-nav 5 slots
✓ BCS truie partout, KPI IFIP, calendrier sanitaire J1/J5/J14/J28
✓ Biosécurité 12 items, mycotoxines + 6 produits anti-myco, PPA surveillance
✓ Triggers auto-événements (cochette→J16 saillie, MB→Fer J1+Castration J5+Mycoplasma J14/J28)
✓ Mode dark fonctionnel, empty states, skeleton, chatbot WhatsApp, export PDF KPI
✓ Backup DB quotidien cron 03h + monitor 04h

## TODO non-bloquants
- Sprint B IFIP : MCA, IC ferme, GMQ par stade, AA matières CI hors Maïs/Soja
- Sprint C : automatisation calendrier unifié, FIFO mycotoxines, suggestion commande
- Barcode scanner mobile (PROD-B residue)
- Audit visuel R4 (en cours)
- Paie ouvriers, marketplace, finances (non démarré)

## DERNIÈRE MIGRATION
`20260522090000_rls_complete.sql` (+ patch RLS observations_bcs in-place)
## DÉCISIONS BRANDING (B1 mai 2026)
- **Nom marque** : SMART FARM (verrouillé — pas de rebrand Eburnea/Akwaba)
- **Logo officiel** : Cachet B Minimal (`public/logo-smartfarm.svg`) — octogone double-bordure + monogramme SF Big Shoulders 900, vert sahel #2D4A1F sur crème mil #FFFBEB
- **Palette Terre & Mil** appliquée dans `globals.css` : tokens additifs --sf-accent-warm (#A16207), --sf-terre (#9A3412), --sf-surface-2 (#FEF3C7), --sf-ink-deep (#14532D). WCAG 10/10 paires AA+ validées.
- **Tagline sidebar** : "Élevage porcin · Côte d'Ivoire" (text-[10px] uppercase tracking-[0.15em])

## ÉTAT POST-D4 (mai 2026 — Sprint enchaîné D1→D4)
✓ Identité B1 déployée (logo Cachet B + palette Terre & Mil + tagline)
✓ D2 fix 5 P0 : h1 uppercase 4 pages, h2/h3 sémantique 4 pages, button h-14 default, text-xs 13px base, aria-label défensif alertes
✓ D3 logo Cachet C v2 (3 variations truie subtile dans /tmp/d3-logo/) — choix Christophe en attente
✓ D4 IFIP : 3 nouvelles vues (v_kpi_mca_ferme, v_kpi_ic_ferme, v_kpi_gmq_par_stade), 2 nouvelles règles R27 IC plus de 3.2 + R28 GMQ moins de 600g/j, 11 matières CI seedées NRC, section UI /kpi avec MCA+IC+GMQ
✓ Migrations : 20260523000000_kpi_ifip_productivite + 20260523010000_aa_matieres_ci

## NOUVEAUTÉS SCHÉMA POST-D4
- 28 règles (R01-R28) dans v_alertes_actives
- Vues IFIP : `v_kpi_mca_ferme(ferme_id, mca_xof_par_kg, conso_total_kg, ...)` · `v_kpi_ic_ferme(ferme_id, ic, ...)` · `v_kpi_gmq_par_stade(ferme_id, bande_id, stade, gmq_g_par_jour, ...)`
- Stades nutrition : porcelet 0-28j / sevrage 28-70j / engraissement plus de 70j
- Cibles IFIP cards : MCA moins de 800 vert / 800-1200 gold / plus de 1200 rouge, IC 2.6-2.8 vert / 2.8-3.2 gold / plus de 3.2 rouge

## DERNIÈRE MIGRATION (mise à jour)
`20260523010000_aa_matieres_ci.sql`
