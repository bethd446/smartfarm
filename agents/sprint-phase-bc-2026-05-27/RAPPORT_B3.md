# RAPPORT B3 — Actes sanitaires (carnet MIRAH)

Status : LIVRÉ (code), TSC : NON EXÉCUTÉ (sandbox Bash bloqué).

## Fichiers créés / modifiés

| # | Fichier | LOC | Type |
|---|---|---|---|
| 1 | `supabase/migrations/20260527170000_actes_sanitaires.sql` | ~200 | new |
| 2 | `app/src/app/(app)/sanitaire/actes/_schemas.ts` | 49 | new |
| 3 | `app/src/app/(app)/sanitaire/actes/_server-actions.ts` | 117 | new |
| 4 | `app/src/app/(app)/sanitaire/actes/_dialog-acte.tsx` | 313 | new |
| 5 | `app/src/app/(app)/sanitaire/actes/page.tsx` | 350 | new |
| 6 | `app/src/app/(app)/sanitaire/page.tsx` | +7 | edit (7e card hub) |

## Migration SQL — points clés

- Table `public.actes_sanitaires` (uuid PK, ferme_id FK, animal_id XOR bande_id via CHECK).
- FK `produit_id → veterinaires_standards(id) DEFERRABLE INITIALLY DEFERRED` → permet d'appliquer B3 même si B1 pas encore là (graceful).
- **Bloc DO $$ stub** : si `veterinaires_standards` absente, on la crée en stub minimal (B1 la remplacera). Pas de seed ici, contrat respecté.
- `dose numeric(10,3) > 0` (CHECK), `duree_jours int 1..30` (CHECK).
- `date_fin_delai_attente date GENERATED ALWAYS AS (date_administration::date + delai * INTERVAL '1 day') STORED`.
- Trigger `actes_sanitaires_copy_delai` (BEFORE INSERT) : copie auto `delai_attente_viande_jours` depuis `veterinaires_standards.delai_attente_j` si NULL.
- 5 index : `(ferme_id, date_administration DESC)`, `(animal_id) WHERE NOT NULL`, `(bande_id) WHERE NOT NULL`, `(date_fin_delai_attente) WHERE NOT NULL`, `(produit_id)`.
- RLS multi-tenant : 4 policies (SELECT/INSERT/UPDATE/DELETE) sur `ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid())`.
- GRANT explicite SELECT/INSERT/UPDATE/DELETE TO authenticated (cf leçon brain L175).
- Bloc DO de vérif final (RAISE EXCEPTION si table introuvable).

## Server action `creerActeSanitaire`

- Validation Zod stricte : cible XOR, produit_id requis, dose>0, duree 1..30, voie + unite_dose dans enums.
- **Garde-fou Ucaphoscal** : lit `veterinaires_standards.max_jours` du produit sélectionné. Si dépassement → erreur FR "Maximum X jours pour {nom} — risque toxicité cuivre" (générique, marche pour tout produit avec max_jours).
- `getFermeId()` pour ferme courante, `auth.getUser()` pour `operateur_user_id`.
- Mapping erreurs PG → FR : 23502/23514/23503/42501 traduits.
- `revalidatePath` : `/sanitaire/actes`, `/sanitaire`, `/cheptel/{animal_id}` (si animal_id présent).

## Dialog client (`_dialog-acte.tsx`)

- Pattern `useTransition` (pas useActionState) cohérent avec dialogs existants.
- Radio Animal/Bande (composant inline style identique `_dialogs-sanitaire.tsx`).
- Select produit → auto-fill voie (si valide dans enum) + affichage live "max X jours" si `max_jours` set.
- Encadré "Antibiotique → ordonnance véto recommandée" si produit.type === 'antibiotique'.
- Affichage live "⚠ Délai d'attente viande : X jours" si `delai_attente_j > 0`.
- Champ `ordonnance_url` (url) prévu dans schema mais pas exposé dans le formulaire (pas d'upload bucket Storage ici — anti-piège brief : "skip si trop"). À ajouter en B4.
- Toast `sonner` success/error.
- Reset state on close.

### Graceful fallback véto manquant

- Si `produits.length === 0` ou `vetoMissing` : encadré jaune "Référentiel véto manquant — appliquer migration B1 d'abord".
- Le bouton "Enregistrer traitement" reste visible mais le form est remplacé par le message.

## Page liste `/sanitaire/actes`

- Server Component (RSC, pas de 'use client').
- Query Supabase avec joins (`animal:animaux`, `bande:bandes`, `produit:veterinaires_standards`).
- Tableau colonnes : Date · Cible · Produit + Badge type · Dose/Voie · Durée · Fin délai attente.
- **Filtres GET** (form natif, pas de useState) : mois (input type=month), type produit (select 7 valeurs enum), animal (select cheptel vivant).
- Pagination 50/page avec préservation des querystring filters.
- Empty state `<EmptyState>` (fallback en attendant `EmptyOnboarding` B8).
- Animaux filtrés `.in('statut', ['actif','malade']).is('deleted_at', null)` (cf brain L100).
- Hydration dates : `<FormattedDateTime>` partout (cf brain L106).
- Gestion erreurs gracieuse : 42P01 (table absente B3 pas appliquée) → message explicite.

## Hub sanitaire — 7e card

- Card ajoutée pointant `/sanitaire/actes`, icon Syringe, desc "Enregistrer traitements véto + carnet MIRAH".

## Vérification TSC

- **Non exécutée** : Bash interdit dans cet env (`Permission to use Bash has been denied`).
- Vérif statique manuelle : types Supabase OK (pattern `let q = sb.from(...).select(...); q = q.eq(...)` utilisé déjà dans `alimentation/concentres/page.tsx:161`). Imports OK. `searchParams: Promise<...>` OK Next 16. DialogTrigger `render={trigger as any}` cohérent avec `_dialogs-sanitaire.tsx`.
- **TODO Christophe** : exécuter `cd /Users/13mac/smartfarm/app && npx tsc --noEmit -p tsconfig.json` côté terminal pour confirmer 0 erreur.

## Tests SQL post-migration (pour orchestrateur)

```sql
-- Après apply B3 :
SELECT COUNT(*) FROM public.actes_sanitaires;  -- attendu: 0
\d public.actes_sanitaires                      -- vérifier colonnes + CHECK xor + GENERATED
SELECT indexname FROM pg_indexes WHERE tablename='actes_sanitaires';  -- 5 index
SELECT polname FROM pg_policies WHERE tablename='actes_sanitaires';   -- 4 policies
SELECT has_table_privilege('authenticated','public.actes_sanitaires','SELECT'); -- t
```

## Dépendances / ordre d'application

1. B1 (`20260527160000_create_veterinaires_standards.sql` + `20260527160100_seed_veterinaires_standards.sql`) — recommandé d'abord.
2. B3 (`20260527170000_actes_sanitaires.sql`) — fonctionne sans B1 grâce au stub, mais sans seed le formulaire affiche le fallback "Référentiel véto manquant".

## Anti-pièges respectés

- ✅ Pas de PDF/CSV export (B4)
- ✅ Pas de migration `bandes` (utilisée existante)
- ✅ Vocab : "Traitement" / "Acte sanitaire", jamais "Soin"
- ✅ Graceful fallback B1 absent
- ✅ Hydration dates via `<FormattedDateTime>`
- ✅ Filtres animaux vivants partout
- ✅ Migration NON appliquée en BDD (contrat respecté)

## Limitations connues

- Upload `ordonnance_url` non câblé (champ schema OK, UI manquante — bucket Supabase Storage 'ordonnances' à créer). À ajouter en B4 ou sub-task.
- Pas d'edit/delete d'un acte existant (MVP : INSERT only).
- Pas de bulk-insert pour un protocole vaccinal (à voir post-MVP).
- Filtre type produit : utilise syntaxe `q.eq('veterinaires_standards.type', x)` (filter sur table jointe Supabase). À tester avec data réelle si filter applique bien aussi le shape relationnel.
