# Brief B1-EXT LANE — Patcher 4 fichiers queries animaux

## TOI
Dev senior. 4 fichiers indépendants. Caveman.

## LIS D'ABORD
1. `/root/projects/smartfarm/agents/sprint-s2-b1-ext/RAPPORT_CARTO.md` (vue d'ensemble)

## DÉCISION ORCHESTRATEUR
Découverte en BDD : il existe statut=`malade` (6 animaux actuellement) en plus de `actif`.
- Un animal `malade` reste un animal **vivant à suivre** (vaccins, pesées, alertes)
- Donc filtre "vivant" = `.in('statut', ['actif', 'malade']).is('deleted_at', null)`
- **Sauf** quand le contexte exige strictement actif (ex: dropdown "faire monter" → ne pas saillir un malade)

## PÉRIMÈTRE
✅ Touche UNIQUEMENT :
- `/root/projects/smartfarm/app/src/app/(app)/dashboard/page.tsx`
- `/root/projects/smartfarm/app/src/app/(app)/pesees/page.tsx`
- `/root/projects/smartfarm/app/src/app/(app)/reproduction/page.tsx`
- `/root/projects/smartfarm/app/src/app/(app)/sanitaire/calendrier/_queries.ts`
❌ AUCUN autre fichier
❌ Pas `npm run build`, pas restart serveur, pas git commit

## MISSION

### F1 — dashboard/page.tsx (3 queries L92-94)
Effectif total + truies + verrats : **inclure malades** (animal vivant).
- **L92** count total : ajouter `.in('statut', ['actif', 'malade']).is('deleted_at', null)` (remplacer le `.eq('statut','actif')` existant)
- **L93** count truies : pareil
- **L94** count verrats : pareil

### F2 — pesees/page.tsx (1 query L17)
Dropdown animaux pour pesée : on peut peser un malade.
- **L17** : ajouter `.in('statut', ['actif', 'malade']).is('deleted_at', null).order('tag')`

### F3 — reproduction/page.tsx (2 queries L58-73)
Dropdowns saillie : **STRICT actif** (pas saillir un malade).
- **L58-64** dropdown truies : garder `.eq('statut','actif')` + ajouter `.is('deleted_at', null)`
- **L67-73** dropdown verrats : pareil

### F4 — sanitaire/calendrier/_queries.ts (2 queries L115, L409)
Calendrier sanitaire : malades inclus (doivent recevoir actes).
- **L115-117** liste actes : remplacer `.neq('statut', 'mort')` par `.in('statut', ['actif', 'malade']).is('deleted_at', null)`
- **L409-411** KPI taux mortalité : pareil — un malade compte comme effectif vivant

## VÉRIFICATIONS OBLIGATOIRES après modif
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `grep -c "deleted_at" /root/projects/smartfarm/app/src/app/\\(app\\)/dashboard/page.tsx` → ≥3
3. `grep -c "deleted_at" /root/projects/smartfarm/app/src/app/\\(app\\)/pesees/page.tsx` → ≥1
4. `grep -c "deleted_at" /root/projects/smartfarm/app/src/app/\\(app\\)/reproduction/page.tsx` → ≥2
5. `grep -c "deleted_at" /root/projects/smartfarm/app/src/app/\\(app\\)/sanitaire/calendrier/_queries.ts` → ≥2
6. `grep -c "neq.*mort\|neq('statut'" /root/projects/smartfarm/app/src/app/\\(app\\)/sanitaire/calendrier/_queries.ts` → 0 (plus de `.neq('mort')`)

## LIVRABLE
1. 4 fichiers patchés
2. Rapport stdout 10 lignes max :
   - F1 dashboard : 3 modifs LXX,LXX,LXX
   - F2 pesees : 1 modif LXX
   - F3 reproduction : 2 modifs LXX,LXX
   - F4 calendrier : 2 modifs LXX,LXX
   - tsc : OK / FAIL
   - greps OK

## ANTI-PIÈGES
- ❌ Ne PAS modifier les autres fichiers de la carto (cheptel/[id]/*, alertes, batiments, etc.)
- ❌ Ne PAS toucher chatbot/rag.ts ou get-animal-by-tag.ts (décision : laisser tel quel)
- ❌ Ne PAS toucher api/registre/* (laisser tel quel pour traçabilité réglementaire)
- ❌ Ne PAS retirer les filtres `.eq('categorie',...)`, `.eq('sexe',...)` existants — juste AJOUTER les nouveaux
- L'ordre des chaînes Supabase n'importe pas, mais garde un style cohérent (filtres avant `.order`)
- Pour reproduction (F3) : c'est `.eq('statut','actif')` + `.is('deleted_at',null)` (pas in array) — STRICT

Go.
