# BRIEF B10 — Module Mortalités avec motifs codifiés

## TOI
Senior fullstack Next 16 + Supabase + Zod. Mode caveman.

## PÉRIMÈTRE
✅ Touche :
  - `supabase/migrations/YYYYMMDDHHMMSS_mortalites.sql` (new)
  - `app/src/app/(app)/mortalites/page.tsx` (new route — liste + dialog)
  - `app/src/app/(app)/mortalites/_dialog-mortalite.tsx` (new)
  - `app/src/app/(app)/mortalites/_server-actions.ts` (new)
  - `app/src/app/(app)/mortalites/_schemas.ts` (new — Zod motifs enum)
  - `app/src/components/sidebar.tsx` UNIQUEMENT pour ajouter entrée nav "Mortalités" sous groupe ÉLEVAGE
❌ Touche pas : autres routes, cheptel (même si fiche animal pourrait avoir bouton "Marquer mort" futur)

## CONTEXTE
- Repo `/Users/13mac/smartfarm/`
- Brief V2 §3.3 : motifs codifiés (asphyxie/écrasement/hypothermie/diarrhée/malformation/PPA suspect/pneumonie/septicémie/cannibalisme/prédateur/indéterminé/autre)
- Audit V2 : module mortalités INEXISTANT (cf brief V2 §A — Top P0 hors carnet sanitaire)
- L'app a déjà `animaux.statut` enum incluant `'mort'`/`'reforme'` mais pas de table dédiée motifs

## MISSION

### 1. Migration SQL
- Enum `motif_mortalite` : `'asphyxie' | 'ecrasement' | 'hypothermie' | 'diarrhee' | 'malformation' | 'ppa_suspect' | 'pneumonie' | 'septicemie' | 'cannibalisme' | 'predateur' | 'indetermine' | 'autre'`
- Table `mortalites` :
  - `id uuid PK`, `ferme_id uuid NOT NULL FK fermes(id)`
  - `animal_id uuid NULL FK animaux(id)` — si individuel
  - `bande_id uuid NULL FK bandes(id)` — si masse (epidémie)
  - `nb_animaux int NOT NULL DEFAULT 1 CHECK (nb_animaux > 0)`
  - `motif motif_mortalite NOT NULL`
  - `motif_libre text NULL` — requis si motif='autre'
  - `date_mortalite date NOT NULL DEFAULT current_date`
  - `observations text NULL`
  - `declarer_user_id uuid FK auth.users(id)`
  - `created_at timestamptz DEFAULT now()`
  - CHECK contrainte cible exclusive : (animal_id NOT NULL AND bande_id NULL AND nb_animaux=1) OR (animal_id NULL AND bande_id NOT NULL)
- RLS multi-tenant `current_farm_id()`
- Index `(ferme_id, date_mortalite DESC)`, `(animal_id)`, `(bande_id)`
- Trigger `on_mortalite_insert` : si `animal_id` NOT NULL → UPDATE `animaux.statut='mort', deleted_at=now()` automatique (sinon double saisie)

### 2. Server action `declarerMortalite`
- Validation Zod stricte : motif enum, motif_libre requis si motif='autre' (max 200 chars), nb_animaux 1-1000, date ≤ today
- INSERT mortalites + revalidatePath
- Return error métier français si validation échoue

### 3. Dialog `_dialog-mortalite.tsx`
- Form fields :
  - Radio cible : Animal individuel | Lot/bande
  - Si Animal : select animaux (filtré ferme actuelle, statut='actif')
  - Si Bande : select bandes + input nb_animaux
  - Select motif (dropdown 12 options enum, label FR pretty)
  - Si motif='autre' : input texte libre requis
  - DatePicker date_mortalite (default today, max today)
  - Textarea observations optionnel
  - Boutons Annuler / DÉCLARER MORTALITÉ (rouge danger)
- Confirmation 2-step (modal "Êtes-vous sûr ?" car action destructive)

### 4. Page liste `/mortalites/page.tsx`
- Server Component
- Query `mortalites` joined `animaux(tag,nom)`, `bandes(code)`, paginate 50/page
- KPI header : Total mortalités YTD / Mortalité mois courant / Top 3 motifs (graphe simple)
- Tableau : Date · Cible · Motif · Nb · Déclaré par
- Bouton "DÉCLARER MORTALITÉ" → ouvre dialog
- Filtres : par mois, par motif
- Empty state : "Aucune mortalité enregistrée — bonne nouvelle 🍀" (positif, pas hostile)

### 5. Sidebar nav
- Ajouter `{ href: '/mortalites', label: 'Mortalités', icon: <Skull />, group: 'ÉLEVAGE' }` (icône Lucide Skull ou HeartCrack)
- Position après "Mises bas" dans le groupe ÉLEVAGE

## VÉRIFICATIONS OBLIGATOIRES
```bash
cd /Users/13mac/smartfarm/app
npx tsc --noEmit -p tsconfig.json
```

## LIVRABLES
1. `supabase/migrations/20260527180000_mortalites.sql`
2. 4 fichiers TSX/TS sous `app/(app)/mortalites/`
3. `components/sidebar.tsx` modif minimale (1 ligne ajoutée)
4. Rapport `agents/sprint-phase-bc-2026-05-27/RAPPORT_B10.md` (≤120 lignes caveman)

## ANTI-PIÈGES
- ❌ Pas d'export PDF MIRAH ici (futur)
- ❌ Action destructive : confirmation 2-step OBLIGATOIRE
- ❌ Vocab strict : "Mortalité" pas "Décès" ou "Mort"
- ❌ Si `bandes` table absente : graceful (cible animal only)

Mode caveman.
