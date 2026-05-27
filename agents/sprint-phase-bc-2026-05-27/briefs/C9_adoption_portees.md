# BRIEF C9 — Adoption / croisement de portées UI maternité

## TOI
Senior fullstack Next 16 + Supabase + vétérinaire-friendly UX. Mode caveman.

## PÉRIMÈTRE
✅ Touche :
  - `supabase/migrations/YYYYMMDDHHMMSS_adoptions.sql` (new)
  - `app/src/app/(app)/mises-bas/_dialog-adoption.tsx` (new — Client Component)
  - `app/src/app/(app)/mises-bas/_server-actions.ts` UNIQUEMENT pour ajouter `transfererPorcelets` (extend existant)
  - `app/src/app/(app)/mises-bas/page.tsx` UNIQUEMENT pour ajouter bouton "ADOPTION" en header + bouton inline par portée
❌ Touche pas : autres routes, fiche animal cheptel/[id], composants UI globaux

## CONTEXTE
- Repo `/Users/13mac/smartfarm/`
- Brief V2 §C9 + zootech §10 manques métier critiques (adoption pratique quotidienne maternité)
- Concept métier : truie A a 14 porcelets (trop, max ~10 tétines fonctionnelles) → transférer 4 porcelets vers truie B qui a 6 porcelets (capacité tétines) ou perdu sa portée. Équalisation = pratique IFIP courante
- Tables existantes : `mises_bas` (truie_id, date_mb), `porcelets_individuels` ou `animaux WHERE categorie='porcelet'` (à valider via brain — Hermes Lane 1 a fait sync enum stade)

## MISSION

### 1. Migration SQL
- Table `adoptions` :
  - `id uuid PK`
  - `ferme_id uuid NOT NULL FK fermes(id)`
  - `date_adoption date NOT NULL DEFAULT current_date`
  - `mb_source_id uuid NOT NULL FK mises_bas(id)` — portée donneuse
  - `mb_destination_id uuid NOT NULL FK mises_bas(id)` — portée receveuse
  - `nb_porcelets int NOT NULL CHECK (nb_porcelets > 0)`
  - `motif_adoption text NOT NULL` (enum à créer : `surcharge_donneuse | perte_receveuse | egalisation_taille | sante_porcelet | autre`)
  - `motif_libre text NULL` — requis si motif='autre'
  - `operateur_user_id uuid FK auth.users(id)`
  - `observations text NULL`
  - CHECK constraint : mb_source_id ≠ mb_destination_id ET même `ferme_id` des 2 MB
- RLS multi-tenant
- Index `(ferme_id, date_adoption DESC)`, `(mb_source_id)`, `(mb_destination_id)`

### 2. Mise à jour `porcelets_individuels` (ou `animaux` selon archi)
Si table `porcelets_individuels` existe : ajouter colonne `mb_origine_id uuid` (portée naissance ORIGINALE) + `mb_actuelle_id uuid` (portée actuelle après adoption). Sinon adapter sur `animaux.portee_id`.

**Trigger** `on_adoption_insert` :
- UPDATE `porcelets_individuels.mb_actuelle_id = NEW.mb_destination_id` pour N porcelets de la mb_source choisie
- Met à jour compteurs MB source (nb_sevre_prevu -= N) et destination (+N)

### 3. Server action `creerAdoption`
- Validation Zod : nb_porcelets entre 1 et 10, motif enum, date ≤ today
- Vérif métier : 
  - nb_porcelets ≤ porcelets vivants restants MB source
  - destination existe et active (non sevrée)
  - destination capacité tétines (max ~12-14 selon race, alerter si dépasse)
- INSERT adoptions + trigger fait le reste
- revalidatePath `/mises-bas`, `/cheptel`

### 4. Dialog `_dialog-adoption.tsx`
Form fields :
- Select MB source (filtrée par allaitement en cours, max 28j post-MB) → affiche `Adèle T01 (12 vivants · J5)`
- Select MB destination (idem) → affiche `Diana T04 (4 vivants · J6 · capacité 8+)`
- Input nb_porcelets (min=1, max=auto calculé depuis source)
- Select motif (enum, label FR)
- Si autre : input motif_libre
- Textarea observations
- Aperçu impact temps réel : "Après adoption : T01 = 8 vivants / T04 = 8 vivants"
- Boutons Annuler / TRANSFÉRER N PORCELETS

### 5. Intégration page `/mises-bas`
- Bouton header "ADOPTION" → ouvre dialog vide
- Bouton inline par ligne portée : "Adopter depuis cette portée" → ouvre dialog avec source pré-sélectionnée
- Section nouvelle "ADOPTIONS RÉCENTES (30j)" en bas page, liste adoptions

## VÉRIFICATIONS OBLIGATOIRES
```bash
cd /Users/13mac/smartfarm/app
npx tsc --noEmit -p tsconfig.json
```

## LIVRABLES
1. `supabase/migrations/20260527190000_adoptions.sql`
2. `app/(app)/mises-bas/_dialog-adoption.tsx`
3. `app/(app)/mises-bas/_server-actions.ts` patch
4. `app/(app)/mises-bas/page.tsx` patch (bouton header + section adoptions récentes)
5. Rapport `agents/sprint-phase-bc-2026-05-27/RAPPORT_C9.md` (≤120 lignes caveman)

## ANTI-PIÈGES
- ❌ Si table `porcelets_individuels` n'existe pas → adapter sur `animaux.portee_id` avec note rapport
- ❌ Pas de transfert auto si source/destination dans fermes différentes (RLS check)
- ❌ Vocab strict : "Adoption" pas "Croisement" (croisement = génétique reproductive, autre concept)
- ❌ Action sensible : alerter si capacité tétines dépassée mais ne pas BLOQUER (override possible avec confirmation)

Mode caveman.
