# BRIEF B3 — Entité `actes_sanitaires` + dialog "Enregistrer traitement"

## TOI
Senior fullstack Next 16 + Supabase. Mode caveman.

## PÉRIMÈTRE
✅ Touche :
  - `supabase/migrations/YYYYMMDDHHMMSS_actes_sanitaires.sql` (new)
  - `app/src/app/(app)/sanitaire/actes/page.tsx` (new route — liste actes ferme)
  - `app/src/app/(app)/sanitaire/actes/_dialog-acte.tsx` (new — formulaire)
  - `app/src/app/(app)/sanitaire/actes/_server-actions.ts` (new — `creerActeSanitaire`)
  - `app/src/app/(app)/sanitaire/actes/_schemas.ts` (new — Zod)
  - `app/src/app/(app)/sanitaire/page.tsx` — UNIQUEMENT pour ajouter une 7e card module "Actes sanitaires" pointant vers `/sanitaire/actes`
❌ Touche pas : autres routes sanitaire (calendrier/ppa/biosecurite/mycotoxines/maladies/protocoles), composants UI globaux, cheptel

## CONTEXTE
- Repo `/Users/13mac/smartfarm/`
- Brief V2 §4.1 contient le schéma SQL complet → COPIE-LE
- Brief V2 §4.2 contient le mockup UI dialog → COPIE-LE
- Brief V2 §4.3 contient garde-fous métier (Ucaphoscal max 5j, etc.)
- Dépend de table `veterinaires_standards` (créée par Lane B1 en parallèle). Si absente : graceful → formulaire affiche message "Référentiel véto manquant — appliquer migration B1 d'abord"
- Stack : Server Component pour list, Client Component pour dialog (`'use client'`)

## MISSION

### 1. Migration SQL (copie brief V2 §4.1)
- Table `actes_sanitaires` :
  - `id uuid PK`, `ferme_id uuid NOT NULL FK fermes(id)`
  - Cible exclusive : `animal_id uuid NULL FK animaux(id)` OU `bande_id uuid NULL FK bandes(id)` avec CHECK constraint
  - `produit_id uuid NOT NULL FK veterinaires_standards(id)` (dépend B1)
  - `dose numeric(10,3) NOT NULL`, `unite_dose text NOT NULL`, `voie text NOT NULL`, `duree_jours int DEFAULT 1`
  - `motif text NULL`, `ordonnance_url text NULL`, `operateur_user_id uuid FK auth.users(id)`
  - `date_administration timestamptz NOT NULL DEFAULT now()`
  - `delai_attente_viande_jours int NULL`, `date_fin_delai_attente date GENERATED ALWAYS AS (...)`
- RLS multi-tenant : `ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid())`
- Index : `(ferme_id, date_administration DESC)`, `(animal_id) WHERE NOT NULL`, `(bande_id) WHERE NOT NULL`, `(date_fin_delai_attente)`
- Trigger PL/pgSQL `copy_delai_attente` qui copie depuis `veterinaires_standards.delai_attente_j` à l'insert si null

### 2. Server action `creerActeSanitaire`
- Validation Zod : cible exclusive, produit_id requis, dose>0, voie enum, duree_jours 1-30
- INSERT supabase + revalidatePath `/sanitaire/actes`, `/sanitaire`, `/cheptel/[animal_id]` si animal_id
- Garde-fou Ucaphoscal : si `produit.nom='Ucaphoscal' AND duree_jours > 5` → return error métier "Maximum 5 jours — risque toxicité cuivre"
- Try/catch erreurs Supabase → message FR métier

### 3. Dialog `_dialog-acte.tsx` (Client, `'use client'`)
- Form fields (cf brief V2 §4.2 mockup) :
  - Radio cible : Animal | Bande
  - Select animal (filtré ferme) OU select bande
  - Select produit (charge depuis `veterinaires_standards.select('id,nom,type,voie,delai_attente_j')`)
  - Auto-fill voie + delai_attente dès select produit (controlled state)
  - Input dose number + select unite (option : 'mL','dose','seringue_pre_remplie','comprimé','sachet','flacon','unité')
  - Input duree_jours (default 1)
  - Textarea motif optionnel
  - Input file ordonnance (si type='antibiotique' → encadré "Ordonnance véto recommandée") — UPLOAD Supabase Storage bucket 'ordonnances' (créer si absent par migration séparée OU skip si trop)
  - Affichage live "⚠ Délai d'attente viande : X jours" (calculé depuis selected produit)
  - Boutons : Annuler / ENREGISTRER
- Utilise `useActionState` ou `useTransition` pour le submit
- Toast success/error

### 4. Page liste `/sanitaire/actes/page.tsx` (Server Component)
- Query : `actes_sanitaires` filtré ferme actuelle, joined `veterinaires_standards(nom, type)`, `animaux(tag, nom)`, `bandes(code, nom)`, paginate 50/page
- Tableau colonnes : Date · Cible (tag animal OR code bande) · Produit · Dose/Voie · Opérateur · Délai attente fin
- Bouton "ENREGISTRER TRAITEMENT" → ouvre `<DialogActe />`
- Filtres : par mois (combobox), par type produit (combobox), par cible animal
- Empty state si 0 actes : `<EmptyOnboarding>` (créé par Lane B8 — fallback "Aucun acte enregistré" si pas dispo)

### 5. Hub sanitaire — ajout 7e card module
- `app/src/app/(app)/sanitaire/page.tsx` : ajouter card module "Actes sanitaires · Enregistrer traitements + carnet MIRAH" pointant `/sanitaire/actes`
- En tête liste sticky avec PPA + Calendrier (cohérent brief V2 §5)

## VÉRIFICATIONS OBLIGATOIRES
```bash
cd /Users/13mac/smartfarm/app
npx tsc --noEmit -p tsconfig.json
```

## LIVRABLES
1. `supabase/migrations/20260527170000_actes_sanitaires.sql`
2. 5 fichiers TSX/TS sous `app/src/app/(app)/sanitaire/actes/`
3. `sanitaire/page.tsx` modif minimale (1 card ajoutée)
4. Rapport `agents/sprint-phase-bc-2026-05-27/RAPPORT_B3.md` (≤150 lignes caveman)

## ANTI-PIÈGES
- ❌ Pas de PDF/CSV export ici (Lane B4 future)
- ❌ Pas de migration `bandes` table (utilise existante OU skip bande_id si absente avec graceful)
- ❌ Vocab strict : "Traitement" / "Acte sanitaire" pas "Soin"
- ❌ Si Lane B1 véto pas mergée : graceful "Référentiel véto manquant"

Mode caveman.
