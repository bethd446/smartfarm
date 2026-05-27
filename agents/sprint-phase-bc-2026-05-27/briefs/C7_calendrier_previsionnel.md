# BRIEF C7 — Calendrier prévisionnel auto-généré + export iCal

## TOI
Senior fullstack Next 16 + Supabase + date-fns. Mode caveman.

## PÉRIMÈTRE
✅ Touche :
  - `app/src/app/(app)/calendrier/page.tsx` (EXIST — refonte du contenu, garde la route)
  - `app/src/app/(app)/calendrier/_components/*` (new si besoin)
  - `app/src/app/api/calendrier/ical/route.ts` (new — export iCal GET)
  - `app/src/lib/calendrier-helpers.ts` (new — projection cycles physiologiques)
❌ Touche pas : autres routes, conseiller, dashboard

## CONTEXTE
- Repo `/Users/13mac/smartfarm/`
- Brief V2 §6.3 (table conseils contextuels par phase) + §C7
- L'app a déjà `/calendrier` (route existe, Phase A6 OK). Le contenu actuel ne projette PAS les événements physiologiques auto
- Cycles physiologiques attendus :
  - Saillie → diag gestation J18-J24 (retour chaleurs), J28-J35 (échographie)
  - Saillie → MB J114 ± 3
  - MB → fer injectable J3
  - MB → sevrage J21-J28 (configurable par ferme)
  - Sevrage → retour chaleurs J4-J7
  - Vaccins truie gestante : Coli J85, Rappel J100
- Tables sources : `saillies` (date_saillie), `mises_bas` (date_mb), `sevrages` (date_sevrage)
- Lib : `date-fns` est dans deps (cf package.json)

## MISSION

### 1. `lib/calendrier-helpers.ts` — projection cycles
Fonctions pures TS, sans I/O :
```ts
type EvenementPrevu = {
  id: string  // ex: "saillie-{saillie_id}-echo"
  date: Date
  type: 'diag_gestation' | 'echographie' | 'mise_bas_prevue' | 'fer_porcelet' | 'sevrage_prevu' | 'retour_chaleurs' | 'vaccin_coli' | 'vaccin_parvo'
  cible: 'truie' | 'porcelets' | 'bande'
  cible_id: string  // animal_id ou bande_id
  cible_label: string  // ex: "Adèle T01"
  description: string  // ex: "Échographie possible — fenêtre J28-J35"
  priorite: 'critique' | 'eleve' | 'moyen' | 'info'
  retard_jours: number  // négatif si à venir, positif si en retard
}

export function projeterEvenementsSaillie(saillie: Saillie, today: Date): EvenementPrevu[]
export function projeterEvenementsMiseBas(mb: MiseBas, today: Date): EvenementPrevu[]
export function projeterEvenementsSevrage(sv: Sevrage, today: Date): EvenementPrevu[]
export function projeterTous(saillies: Saillie[], mb: MiseBas[], sv: Sevrage[], today: Date): EvenementPrevu[]
```

Logique projeter :
- Saillie 26/03 → 2 événements : diag_gestation 13/04 (J18), échographie 23/04 (J28), MB_prevue 18/07 (J114)
- MB 24/12/25 → 2 événements : fer_porcelet 27/12 (J3), sevrage_prevu 14/01 (J21)
- Sevrage 14/01 → 1 événement : retour_chaleurs 18-21/01 (J4-J7)

Filtrer : ignorer les événements déjà résolus (cf vue `v_saillies_a_diagnostiquer` pour pattern — saillie + diagnostic_gestation positif = pas d'évé "à diag")

### 2. Page `/calendrier/page.tsx` (Server Component)
- Charge données ferme : saillies / mises_bas / sevrages (vivantes uniquement, filtre statut+deleted_at règle 9 brain)
- Appelle `projeterTous(...)` → liste EvenementPrevu
- Trie : en retard d'abord (priorité critique haut), puis à venir 7j, puis à venir 14j
- 3 sections UI :
  - **EN RETARD** (badge rouge `retard_jours > 0`) — rouge fond
  - **CETTE SEMAINE** (J0 à J7) — orange fond
  - **CES 14 PROCHAINS JOURS** (J7 à J14) — vert fond
- Chaque carte événement : icône Lucide selon type + date FR (`<FormattedDate>` règle 10 brain) + cible_label + description + lien `[Voir la fiche →]` vers `/cheptel/[id]` ou `/reproduction`
- Header KPI : "Total prévisionnel 30j : X événements" + bouton "Exporter iCal" (download `/api/calendrier/ical`)
- Empty state si rien : `<EmptyOnboarding>` (Lane B8) — sinon fallback simple "Tout est à jour 🎉"

### 3. API `/api/calendrier/ical/route.ts`
Export iCal au format RFC 5545 :
```ts
export async function GET(request: Request) {
  // 1. Auth check (Supabase server)
  // 2. Charge évé prévus 30j ferme actuelle
  // 3. Génère VCALENDAR + VEVENT[] (lib `ics` si déjà installée OU manuelle)
  // 4. Return Response avec Content-Type 'text/calendar' + filename header
}
```
Pas de lib ext : générer manuellement le format (template string simple). Header `Content-Disposition: attachment; filename="smartfarm-calendrier.ics"`.

### 4. Dashboard widget (optionnel — skip si dépasse 4h)
Ajouter widget "Prochains 7 jours" sur dashboard avec top 5 événements à venir. SI conflit Phase A (touche dashboard) → SKIP et noter pour vague 4.

## VÉRIFICATIONS OBLIGATOIRES
```bash
cd /Users/13mac/smartfarm/app
npx tsc --noEmit -p tsconfig.json
# Test iCal manuel
curl http://localhost:3000/api/calendrier/ical -H "Cookie: sb-..." > /tmp/cal.ics
cat /tmp/cal.ics | head -20
```

## LIVRABLES
1. `lib/calendrier-helpers.ts` (fonctions pures testables)
2. `app/(app)/calendrier/page.tsx` (refonte server component)
3. `app/api/calendrier/ical/route.ts` (export)
4. Rapport `agents/sprint-phase-bc-2026-05-27/RAPPORT_C7.md` (≤100 lignes caveman)

## ANTI-PIÈGES
- ❌ Pas de `formatDistanceToNow` JSX serveur (règle 10 brain — utiliser `<RelativeTime>`/`<FormattedDate>`)
- ❌ Pas d'install lib `ics` ou `ical-generator` (génération manuelle suffit)
- ❌ Si table `sevrages` schéma différent (col date_sevrage vs date) → check brain CONTEXT.md §3 colonnes
- ❌ Cache : `force-dynamic` sur page calendrier (cf brain D6 reco future ISR, mais hors-scope)

Mode caveman.
