# RAPPORT C7 — Calendrier prévisionnel auto-généré + export iCal

**Branche** : `feat/phase-vague-3`
**Date** : 2026-05-27
**Statut** : ✅ READY (tsc 0 erreur)

## Périmètre livré

| Fichier | LoC | Rôle |
|---|---|---|
| `app/src/lib/calendrier-helpers.ts` | ~430 | Projection cycles + bucketize + générateur iCal (pur, sans I/O) |
| `app/src/app/(app)/calendrier/page.tsx` | ~250 | Refonte Server Component (3+1 sections, EmptyOnboarding, bouton export) |
| `app/src/app/api/calendrier/ical/route.ts` | ~95 | Endpoint GET → text/calendar RFC 5545, auth obligatoire |

## Décisions techniques

### Schéma BDD (vérifié sur code prod existant)
- `saillies` : `id, truie_id, verrat_id, date_saillie` + relation `truie:truie_id(tag,nom)`
- `mises_bas` : `id, truie_id, saillie_id, date_mise_bas` (col physique = `date_mb`, GENERATED)
- `sevrages` : `id, mb_id, truie_id, date_sevrage` (col legacy `mise_bas_id` aussi vue ailleurs — j'ai pris `mb_id` qui est utilisée dans `mises-bas/page.tsx` + insert action)
- `diagnostics_gestation` : `saillie_id, resultat, date_diag` (pour masquer diag/echo résolus)
- **Pas inventé une colonne** : ferme RLS isole, aucun `.eq('ferme_id', …)` ajouté côté lecture (toutes les queries existantes ne le font pas non plus, RLS suffit)

### Cycles projetés (conforme brief §CONTEXTE)
- **Saillie** → 5 évé : diag J21 (fenêtre J18-J24), echo J32 (J28-J35), vaccin Coli J85, rappel J100, MB J114
- **Mise bas** → 2 évé : fer J3, sevrage J21 (paramétrable `ageSevrageJours`)
- **Sevrage** → 1 évé : retour chaleurs J5 (milieu J4-J7)

### Filtrage des évé déjà résolus
- diag/echo masqués si `diagnostics_gestation.resultat ∈ {positif,negatif}` existe pour la saillie
- mise_bas_prevue + vaccins masqués si `mises_bas` existe pour la saillie (gestation terminée)
- sevrage + fer masqués si `sevrages.mb_id` existe pour la MB

### Buckets UI
- **EN RETARD** (rouge danger) : `retard_jours > 0`
- **CETTE SEMAINE** (orange warning) : J0 à J7
- **14 PROCHAINS JOURS** (vert success) : J8 à J14
- **PLUS TARD** (bleu info) : J15 à J30
- Au-delà de J30 : ignoré (fenêtre demandée par brief)

### iCalendar RFC 5545
- Génération manuelle (pas de lib `ics` installée — brief explicite)
- `VEVENT` all-day (`DTSTART;VALUE=DATE` + `DTEND` exclusif J+1)
- Échappement `;` `,` `\n` + line folding 75 octets
- `PRIORITY` mappée 1/3/5/7 selon `critique/eleve/moyen/info`
- `UID` stable par évé (ex: `saillie-{uuid}-echo@smartfarm.group`) → re-imports propres
- Header `Content-Type: text/calendar; charset=utf-8` + `Content-Disposition: attachment; filename="smartfarm-calendrier.ics"`
- `X-WR-CALNAME` injecte le nom de la ferme (best-effort via RPC `current_farm_id` + lookup)

### Conformité règles brain
- **Règle 9 (animaux vivants)** : pas applicable directement — on lit `saillies`/`mises_bas`/`sevrages` (pas `animaux`). La relation `truie:truie_id(tag,nom)` ne filtre pas par statut (cohérent : truie réformée peut avoir saillie historique encore en cours d'analyse). Si besoin d'exclure les saillies de truies réformées : à voir vague 4.
- **Règle 10 (hydration dates)** : 0 `formatDistanceToNow`, 0 `toLocaleString` JSX serveur. Composant `<FormattedDateTime>` client utilisé pour la date absolue dans chaque carte. Le calcul `retard_jours` est numérique (pas de format locale) donc sûr SSR.
- **Force-dynamic** : `export const dynamic = 'force-dynamic'` sur la page (calcul reposant sur `today`, ISR cache négatif)

## Vérifications

```bash
cd /Users/13mac/smartfarm/app && npx tsc --noEmit -p tsconfig.json
# → 0 erreur, exit 0
```

Check direct sur le helper isolé (`--strict`) :
```
npx tsc --noEmit --strict src/lib/calendrier-helpers.ts → 0 erreur
```

## Anti-pièges respectés

- ❌ Pas d'install lib `ics` / `ical-generator`
- ❌ Pas de `formatDistanceToNow` côté JSX serveur (FormattedDateTime client)
- ❌ Pas de colonne inventée (toutes vérifiées via grep sur code prod existant)
- ❌ Pas touché : conseiller, dashboard, autres routes (périmètre exclusif respecté)
- ✅ Widget dashboard "Prochains 7j" : **SKIP** (optionnel brief §4, évite conflit Phase A). À traiter vague 4 si besoin.

## Limites connues / TODO vague 4

1. **age_sevrage par ferme** : actuellement constante 21j. Si ferme veut 28j → ajouter colonne `fermes.age_sevrage_default` et passer en `options.ageSevrageJours`
2. **Évé "tarissement"** : pas projeté (le code legacy mentionne un trigger SQL qui le crée). À ajouter si table dédiée
3. **Fuseau** : tout en UTC. Côte d'Ivoire = UTC+0 donc OK; si extension Tunisie/Maroc → ajouter `TZID:Africa/Abidjan`
4. **Webcal subscribe** : actuellement download ICS one-shot. Pour abonnement Google Cal live → endpoint `/api/calendrier/ical.ics` exposé en HTTPS public derrière token signé (hors scope C7)

## Pour tester localement

```bash
cd /Users/13mac/smartfarm/app && npm run dev
# Browser → /calendrier (login demo@smartfarm.group)
# Click "Exporter iCal" → smartfarm-calendrier.ics téléchargé
# Ouvrir avec Calendar.app ou Google Cal → import
```

Commande curl directe (cookie auth requis) :
```bash
curl -sS http://localhost:3000/api/calendrier/ical -H "Cookie: sb-...=..." | head -30
```
