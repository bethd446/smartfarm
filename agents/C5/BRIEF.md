# CHANTIER C5 — Module Sanitaire complet

## Contexte projet (à lire en entier)

Smart Farm est une webapp Next.js 16 + React 19 + Tailwind v4 + Supabase (Docker local) pour gestion d'élevage porcin en Côte d'Ivoire. Stack UI : shadcn/ui + Radix UI (Dialog/Select/DropdownMenu déjà migrés). Vocabulaire français standard pro (pas ivoirien folklorique).

Repo : `/root/projects/smartfarm/app/`
DB : Postgres 15 via Supabase CLI local (`supabase start`), service role key dans `.env.local`
Module Sanitaire V1 existant : vaccinations, traitements (soins), mortalités. Page : `app/src/app/(app)/sanitaire/page.tsx`.

Tables existantes :
- `animaux` (id, tag, nom, sexe, categorie, date_naissance, statut)
- `bandes` (id, code, nom, date_debut)
- `vaccinations` (id, animal_id, bande_id, date_vaccination, produit, lot, dose_ml, veterinaire, observations)
- `traitements` (id, animal_id, bande_id, date_debut, date_fin, motif, produit, posologie, voie, veterinaire, cout, observations)
- `mortalites` (id, animal_id, bande_id, date_mort, cause, diagnostic, autopsie, observations)
- `protocoles_vaccinaux` (id, ferme_id, nom, categorie_cible, age_jours, produit, voie, dose_ml, rappel_jours, actif) — **déjà existante, à exploiter**

## Mission C5

Transformer le module Sanitaire en outil clé qui guide l'éleveur :
1. **Protocoles vétérinaires automatiques** par âge (J1, J3, J7, J14, J21, J42, J70+) seedés en DB
2. **Catalogue maladies porcines** (15 pathologies les + fréquentes en CI : peste porcine, rouget, parvovirose, colibacillose, salmonellose, mycoplasmose, gale, ascaridiose, etc.) avec symptômes/diagnostic/traitement/prévention
3. **Calendrier sanitaire auto** : liste des actes à faire dans les 30 jours déclenchés par naissance animaux/bandes
4. **Dashboard sanitaire enrichi** : alertes retards vaccinaux, taux mortalité 30j, top causes mortalité

## Périmètres disjoints — 3 agents en parallèle

### AGENT C5-A — Protocoles vaccinaux (BDD + seed + page liste)
**Fichiers AUTORISÉS** (à créer/modifier exclusivement) :
- `supabase/migrations/20260520180001_protocoles_seed.sql` (NEW) — migration ajoute colonnes manquantes + seed 12 protocoles standards
- `app/src/app/(app)/sanitaire/protocoles/page.tsx` (NEW)
- `app/src/app/(app)/sanitaire/protocoles/_actions.ts` (NEW)
- `app/src/app/(app)/sanitaire/protocoles/_schemas.ts` (NEW)
- `app/src/app/(app)/sanitaire/protocoles/_dialog-protocole.tsx` (NEW)

**Spec** :
- Ajouter colonnes à `protocoles_vaccinaux` : `description text`, `rappels_jours int[]` (multi-rappels), `obligatoire boolean default false`
- Seed 12 protocoles porcins standards Côte d'Ivoire :
  - J1 : Fer dextran (anti-anémie) - voie IM - 2ml - obligatoire
  - J3 : Coccidiostatique oral (Baycox) - voie orale - 1ml - recommandé
  - J7 : Castration mâles + traitement plaie - obligatoire
  - J14 : Vaccin Mycoplasma hyopneumoniae 1ère dose - IM - 2ml - rappel J28
  - J21 : Vermifuge (Ivermectine) - SC - 0.3ml/10kg
  - J28 : Vaccin Mycoplasma rappel + Circovirus - IM
  - J42 (sevrage) : Vaccin Peste Porcine Africaine (si dispo) + Rouget
  - J56 : Vermifuge rappel
  - J70 : Vaccin Parvovirose + Leptospirose (cochettes futures)
  - J100 : Vaccin Pasteurellose
  - Truies gestantes : Erysipèle/Parvovirose 2-3 sem avant mise-bas
  - Verrats : Parvo + Lepto 2x/an
- Page liste protocoles : tableau colonnes Nom/Âge/Produit/Voie/Dose/Obligatoire/Actions
- Dialog création/édition protocole (CRUD complet)
- Bouton "Réinitialiser aux standards" (réimporte le seed)

**Définition de DONE** :
- Migration SQL appliquée sans erreur : `cd /root/projects/smartfarm && docker compose exec -T db psql -U postgres -d postgres -f /tmp/migration.sql` (ou via `supabase db push`)
- 12 protocoles visibles dans la liste
- Création nouveau protocole fonctionnelle (INSERT visible en DB)
- Édition fonctionnelle
- `npm run build` ✅ vert

### AGENT C5-B — Catalogue maladies (page + données statiques)
**Fichiers AUTORISÉS** :
- `app/src/lib/maladies-porcines.ts` (NEW) — données statiques TypeScript (15 maladies)
- `app/src/app/(app)/sanitaire/maladies/page.tsx` (NEW)
- `app/src/app/(app)/sanitaire/maladies/[slug]/page.tsx` (NEW) — page détail
- `app/src/app/(app)/sanitaire/maladies/_search.tsx` (NEW) — composant client recherche

**Spec maladies** (15 pathologies, format strict pour chaque) :
```ts
type Maladie = {
  slug: string
  nom: string
  nom_scientifique: string
  categorie: 'virale' | 'bactérienne' | 'parasitaire' | 'nutritionnelle' | 'autre'
  gravite: 'faible' | 'moyenne' | 'élevée' | 'critique'
  contagiosite: 'aucune' | 'faible' | 'moyenne' | 'élevée'
  age_concerne: string // ex "Tous âges" ou "Porcelets < 6 semaines"
  symptomes: string[] // 5-8 items
  diagnostic_differentiel: string[] // 2-4 items
  examens_recommandes: string[] // ex "Prise température", "Prélèvement sang"
  traitement: { molecule: string; posologie: string; duree: string }[] // 1-3 options
  prevention: string[] // 3-5 items
  reglementation_ci: string // statut OIE/réglementation CI si applicable
  notes_terrain: string // 2-3 phrases pratiques
}
```

Les 15 maladies à couvrir :
1. peste-porcine-africaine
2. peste-porcine-classique
3. rouget-du-porc
4. parvovirose-porcine
5. colibacillose-neonatale
6. colibacillose-post-sevrage
7. salmonellose
8. mycoplasmose-pulmonaire
9. circovirose (PCV2)
10. gastro-enterite-transmissible
11. gale-sarcoptique
12. ascaridiose
13. coccidiose
14. anemie-ferriprive-porcelet
15. mma-syndrome (mammite-métrite-agalactie)

- Page liste : grille de cards par gravité (color-coded), recherche en haut
- Page détail : sections Symptômes / Diagnostic / Traitement / Prévention / Notes terrain
- Recherche client-side sur nom + symptômes
- Badge gravité couleur : critique=rouge, élevée=orange, moyenne=jaune, faible=vert
- **Sources obligatoires en commentaire en haut de `maladies-porcines.ts`** : OIE, FAO, INRAE, mémo vétérinaire porc Africa (NE PAS inventer de chiffres médicaux)

**Définition de DONE** :
- 15 maladies complètes (zéro placeholder, zéro "TODO")
- Page liste affiche les 15
- Page détail accessible via `/sanitaire/maladies/peste-porcine-africaine`
- Recherche filtre correctement
- `npm run build` ✅

### AGENT C5-C — Calendrier sanitaire + dashboard alertes
**Fichiers AUTORISÉS** :
- `app/src/app/(app)/sanitaire/calendrier/page.tsx` (NEW)
- `app/src/app/(app)/sanitaire/calendrier/_queries.ts` (NEW) — calcul des actes prévus 30j
- `app/src/app/(app)/sanitaire/_components/sanitaire-stats.tsx` (NEW) — composant stats
- `app/src/app/(app)/sanitaire/page.tsx` (MODIFY uniquement la section header + ajout 4 KPI cards en haut, ne PAS toucher au reste de la page existante)

**Spec calendrier** :
- Pour chaque animal vivant + chaque bande active :
  - Calculer l'âge en jours (date_naissance)
  - Pour chaque protocole `obligatoire=true` ou `actif=true` matchant `categorie_cible` :
    - Si âge correspond à `age_jours ± 2 jours` ET pas de vaccination existante avec ce produit → ACTE À FAIRE AUJOURD'HUI
    - Si âge dans `[age_jours - 30, age_jours - 2]` ET pas de vaccination → EN RETARD
    - Si âge dans `[age_jours + 2, age_jours + 14]` → À VENIR
- Affichage : 3 sections (En retard ❗, Aujourd'hui 🔔, À venir 📅)
- Chaque ligne : Animal/Bande + Acte + Produit + Date prévue + Bouton "Marquer fait" (ouvre dialog vaccin pré-rempli)

**Spec dashboard sanitaire stats** :
- 4 KPI cards :
  1. **Couverture vaccinale** = (vaccinations 30j) / (vaccinations attendues 30j) en %
  2. **Taux mortalité 30j** = (morts 30j) / (effectif moyen) en %
  3. **Actes sanitaires en retard** = count des "en retard"
  4. **Top cause mortalité** (texte) sur les 90 derniers jours

**Définition de DONE** :
- Page `/sanitaire/calendrier` affiche les 3 sections
- Si DB vide → message neutre ("Aucun acte prévu, configurez les protocoles")
- Stats cards visibles en haut de `/sanitaire`
- `npm run build` ✅
- Pas de mutation autre que la lecture sur la page existante

## Contraintes communes — TOUS LES AGENTS

1. **Vocabulaire français standard pro** (cf. `app/src/lib/terrain-labels.ts`)
2. **Stack imports** :
   - UI : `@/components/ui/{button,card,badge,input,dialog,select,table}`
   - DB : `createClient` from `@/lib/supabase/server` pour pages, `@supabase/supabase-js` direct + service role pour actions
   - Date : `date-fns` (déjà installé), format `dd MMM yyyy` locale fr
3. **Pas de classes Tailwind v3 deprecated** : utiliser `text-sm`, `gap-2`, `space-y-4`, etc. + variables CSS `var(--sf-primary)`, `var(--sf-ink)`, `var(--sf-muted)`, `var(--sf-bg)`
4. **Pas de hardcoded colors** (pas de `#XXX` en raw, sauf dans `terrain-labels.ts`)
5. **Server Components par défaut**, `'use client'` uniquement quand interactif
6. **Server Actions** : extraire les schemas Zod dans `_schemas.ts` séparé (un fichier `'use server'` ne peut exporter que des fonctions async)
7. **Toast** : `import { toast } from 'sonner'` (déjà installé)
8. **Vérif build** : avant de finir, lancer `cd /root/projects/smartfarm/app && npm run build` et coller la sortie dans ton rapport
9. **Ferme DEMO_FERME_ID** = `'00000000-0000-0000-0000-000000000001'` (cf actions existantes)

## Hors-périmètre (NE PAS TOUCHER)
- Reproduction, mises-bas, pesées, stock, alimentation, cheptel : **interdit**
- Vaccinations/traitements/mortalités existants : **lecture seule**
- Sidebar/layout : **interdit**
- Composants UI base (Dialog/Select/etc.) : **interdit**

## Livrable attendu (à coller en rapport final)
1. Liste des fichiers créés/modifiés avec chemin absolu
2. Sortie de `npm run build` (les ~30 dernières lignes minimum)
3. 1-2 captures d'écran (si tu peux via curl + le port 3000) ou résultat HTTP `curl -sI http://localhost:3000/sanitaire/protocoles` pour valider HTTP 200
4. Note des hypothèses prises et choix techniques

GO.
