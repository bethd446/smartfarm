# Diagnostic P0 — Smart Farm

> Audit lecture/analyse — **AUCUNE modification appliquée**
> Stack : Next.js 16 (app router) + React 19 + Supabase (projet `tpzhxjzwlxwujboboyit`)
> Date : 2026-05-23

---

## 🔥 Constat global (root cause transverse)

**Le schéma BDD réel diverge massivement du schéma supposé par le code.**

| Élément attendu par le code | Présent en BDD ? |
|---|---|
| Table `bandes`                       | ❌ N'existe pas |
| Table `sevrages`                     | ❌ N'existe pas |
| Table `vaccinations`                 | ❌ N'existe pas |
| Table `traitements`                  | ❌ N'existe pas |
| Table `observations_bcs`             | ❌ N'existe pas |
| Table `bande_animaux`                | ❌ N'existe pas |
| Table `formules`, `ingredients`      | ❌ N'existe pas |
| Vue `v_calendrier_repro`             | ❌ (existe sous `v_calendrier_reproductif`) |
| Vue `v_kpi_techniques_ferme`         | ❌ N'existe pas |
| Vue `v_kpi_techniques_truie`         | ❌ N'existe pas |
| Vue `v_score_truie`                  | ❌ N'existe pas |
| Vue `v_bcs_historique_truie`         | ❌ N'existe pas |
| `mises_bas.date_mise_bas`            | ❌ s'appelle `date_mb` |
| `mises_bas.nes_morts`                | ❌ s'appelle `morts_nes` |
| `mises_bas.nes_totaux`               | ❌ N'existe pas (calculer = nv + mn + mom) |
| `mises_bas.ecrases`                  | ❌ N'existe pas |
| `mises_bas.poids_portee_kg`          | ❌ N'existe pas |
| `mises_bas.bcs_truie`                | ❌ N'existe pas |
| `mises_bas.bande_id`                 | ❌ N'existe pas |
| `mises_bas.idempotency_key`          | ❌ N'existe pas |
| `mises_bas.duree_minutes`            | ❌ s'appelle `duree_mb_minutes` |
| `saillies.bande_id`                  | ❌ N'existe pas |
| `animaux.numero_boucle`              | ❌ s'appelle `tag` (B.22, B.10, etc.) |
| `animaux.rang_porte`                 | ❌ N'existe pas (utilisé par `toneTruie`) |
| `animaux.statut = 'active'` (bande)  | ⚠ `bandes` n'existe pas |

**Tables présentes** (20) : `alertes_loge, animaux, audit_log, batiments, donnees_metier, evenements_prevus, evenements_sante, fermes, matieres_premieres, mises_bas, mouvements, pesees, playbooks, portees, races, rations, saillies, tracabilite_decisions, user_farms, utilisateurs`.

**Vues présentes** (13) : `utilisateur_fermes, v_alertes_actives, v_calendrier_reproductif, v_courbe_croissance_referentielle, v_cycle_vie_portee, v_dashboard_kpi, v_fertilite_truies, v_fertilite_verrats, v_gmq_corrige_thermique, v_gmq_par_phase, v_inventaire_batiment, v_priorisation_alertes, v_score_progression_porc`.

Le client Supabase JS retourne `{data: null, error}` sans throw → la plupart des pages **rendent vides** plutôt que crasher. Mais certaines paths (server actions avec INSERT) échouent silencieusement, et certaines `<Link>` prefetch puis re-streaming RSC déclenche un crash visuel.

---

## Bug #1 — Crash fiche détail animal en navigation client-side

### Symptôme
- `/cheptel` → clic sur ligne → écran « This page couldn't load ».
- URL directe `/cheptel/<uuid>` fonctionne normalement.

### Cause racine
La navigation client-side via `<CheptelRow>` (`router.push`) passe par le **prefetch RSC** de Next.js. La page `app/(app)/cheptel/[id]/page.tsx` exécute **15+ requêtes Supabase en parallèle**, dont **6 cibles inexistantes** :

1. `mises_bas` avec colonnes inexistantes (`date_mise_bas`, `nes_morts`, `ecrases`, `poids_portee_kg`, `bcs_truie`, `nes_totaux`) → erreur PostgREST sur le `select(...)` ligne 127, 132, 117–123 → renvoie `{data: null}` mais l'`.order('date_mise_bas', ...)` casse côté PostgREST (colonne inexistante dans ORDER BY) ;
2. `sb.from('v_bcs_historique_truie')` (ligne 133) — vue inexistante ;
3. `sb.from('v_kpi_techniques_truie')` (ligne 162) — vue inexistante ;
4. `sb.from('v_score_truie')` (ligne 202) — vue inexistante ;
5. `sb.from('vaccinations')` (ligne 173) — table inexistante ;
6. `sb.from('traitements')` (ligne 179) — table inexistante.

**Pourquoi URL directe OK et clic KO ?** Le SSR initial (URL directe) tolère mieux les `{data: null}` parce que le rendu se termine avec data null + pas d'exception JS. Mais le **flight stream RSC** déclenché par `router.push` après prefetch tente de streamer en JSON tous les sous-arbres, et lorsqu'un Server Action est passé en prop (`uploadAction={uploadPhotoAnimal}` ligne 249), Next.js doit résoudre l'**Action ID hash**. Sur un build où le code parent a changé entre prefetch et navigation (HMR / déploiement), le hash est désynchronisé → `Error: Cannot find Server Action` → « This page couldn't load ». Hors `error.tsx` au niveau `/cheptel` ou `[id]`, l'erreur remonte comme un crash générique.

### Fichiers à modifier
- `app/src/app/(app)/cheptel/[id]/page.tsx` — lignes 60-90, 104-138, 161-209, 171-181 (toutes les requêtes vers tables/vues inexistantes).
- `app/src/app/(app)/cheptel/[id]/error.tsx` — **À CRÉER** (manquant : aucune segment-level error boundary).
- `app/src/app/(app)/cheptel/[id]/page.tsx` ligne 246-250 — extraire `AnimalPhotoUpload` derrière un Suspense boundary ou retirer le passage d'action en prop (utiliser `'use server'` import direct côté composant client via wrapper).

### Patch suggéré (pseudocode)
```diff
// 1. Créer cheptel/[id]/error.tsx
+'use client'
+export default function Error({ error, reset }: { error: Error; reset: () => void }) {
+  console.error('[cheptel/[id]] crash:', error)
+  return (
+    <div className="p-8">
+      <h1>Impossible de charger la fiche</h1>
+      <pre className="text-xs">{error.message}</pre>
+      <button onClick={reset}>Réessayer</button>
+      <a href="/cheptel">Retour au cheptel</a>
+    </div>
+  )
+}

// 2. Aligner page.tsx sur le schéma réel
- sb.from('mises_bas').select('id, date_mise_bas, nes_vivants, nes_morts, momifies, ecrases, poids_portee_kg, bcs_truie').order('date_mise_bas', ...)
+ sb.from('mises_bas').select('id, date_mb, nes_vivants, morts_nes, momifies').order('date_mb', ascending: false)

- sb.from('v_bcs_historique_truie')...     → supprimer (vue absente), historique BCS = feature à reporter
- sb.from('v_kpi_techniques_truie')...     → supprimer ou substituer par v_fertilite_truies
- sb.from('v_score_truie')...              → supprimer (vue absente)
- sb.from('vaccinations').count            → 0 hardcodé en attendant la table
- sb.from('traitements').count             → 0 hardcodé en attendant la table

// 3. Wrap des fetchs optionnels dans Promise.allSettled au lieu de Promise.all,
//    pour qu'une vue manquante ne plante pas le stream.
```

### Difficulté : **moyen (1-2 h)**
- Trivial pour créer le `error.tsx` et stopper le crash visuel (< 30 min).
- Moyen pour aligner toutes les requêtes au schéma réel et masquer les sections KPI/score sans données.

---

## Bug #2 — Pas de séparation truies / verrats / porcelets / portées

### Symptôme
- `/cheptel` affiche **1 table de 136 lignes** : 17 truies + 2 verrats + 117 porcelets sevrés (catégories vérifiées en BDD).

### Cause racine
`app/src/app/(app)/cheptel/page.tsx` ligne 27 :
```ts
sb.from('animaux').select('*, races(nom)').order('tag')
```
Aucun filtre `.eq('categorie', ...)`, aucun onglet client, aucune sous-route. Tout est rendu dans la même `<table>` (lignes 84–139).

### Fichiers à modifier
- `app/src/app/(app)/cheptel/page.tsx` lignes 24-145 — refonte complète.
- Créer sous-routes ou onglets : `cheptel/(reproducteurs)/page.tsx`, `cheptel/(porcelets)/page.tsx`, `cheptel/(portees)/page.tsx`.

### Patch suggéré (structure recommandée)

**Option A — Onglets URL-stateful (recommandé)** :
```
app/(app)/cheptel/
├── page.tsx                    → redirect ('/cheptel/truies')
├── layout.tsx                  → tabs <Tabs value={pathname}>
├── truies/page.tsx             → animaux WHERE categorie IN ('truie','cochette') AND sexe='F'
├── verrats/page.tsx            → animaux WHERE categorie='verrat' AND sexe='M'
├── porcelets/page.tsx          → animaux WHERE categorie LIKE 'porcelet_%' OR 'porc_%'
├── portees/page.tsx            → portees JOIN animaux (mère) + age + effectif
└── [id]/page.tsx               → conservé (fiche détail individuelle)
```

**Option B — Onglets client + filtre côté SQL via searchParams** :
```tsx
export default async function CheptelPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = 'truies' } = await searchParams
  const filtres: Record<string, any> = {
    truies:    { categorie: ['truie', 'cochette'], sexe: 'F' },
    verrats:   { categorie: ['verrat'], sexe: 'M' },
    porcelets: { categorie: ['porcelet_sevre', 'porcelet_lait', 'porcelet_croissance'] },
  }
  let q = sb.from('animaux').select('*, races(nom)')
  if (filtres[tab].categorie) q = q.in('categorie', filtres[tab].categorie)
  if (filtres[tab].sexe)      q = q.eq('sexe', filtres[tab].sexe)
  ...
}
```

Pour l'onglet « Portées » : `sb.from('portees').select('*, truie:truie_id(tag,nom), mb:mb_id(date_mb, nes_vivants))`.

### Difficulté : **moyen (2 h)**
- Trivial : ajouter un filtre simple (< 30 min).
- Moyen : refonte propre avec sous-routes ou onglets URL-stateful + 4 listes typées.

---

## Bug #3 — Portées non remontées sur fiche truie B.22 Monette

### Symptôme
- Section « HISTORIQUE DES PORTÉES » vide pour B.22 Monette (id `5a63a7f1-225e-4183-9d42-086635fa1345`).
- L'utilisateur affirme avoir saisi la MB du 03/03.

### Cause racine

**1. Aucune ligne en BDD pour Monette :**
```sql
SELECT * FROM portees WHERE truie_id = '5a63a7f1-225e-4183-9d42-086635fa1345';   -- 0 rows
SELECT * FROM mises_bas WHERE truie_id = '5a63a7f1-225e-4183-9d42-086635fa1345'; -- 0 rows
```
Cross-check : 17 truies, mais seules 6 mises_bas existent (B.10, B.24, B.26, B.37, B.76, B.85 — pas Monette). La saisie utilisateur n'a **jamais été persistée**.

**2. Pourquoi l'INSERT a échoué silencieusement :**
Le Server Action `app/src/app/(app)/mises-bas/_server-actions.ts` lignes 38-51 tente d'insérer 11 champs dont **9 sont des colonnes inexistantes** ou désalignées :
```ts
payload = {
  saillie_id, truie_id,
  bande_id,                  // ❌ saillie n'a pas de bande_id → saillie.bande_id = undefined
  date_mise_bas,             // ❌ colonne s'appelle date_mb
  nes_totaux,                // ❌ colonne inexistante
  nes_vivants,               // ✅
  nes_morts,                 // ❌ colonne s'appelle morts_nes
  momifies,                  // ✅
  ecrases,                   // ❌ colonne inexistante
  assistance,                // ✅
  idempotency_key,           // ❌ colonne inexistante
}
if (poids_portee_kg)  payload.poids_portee_kg = ...  // ❌ inexistant
if (duree_minutes)    payload.duree_minutes   = ...  // ❌ s'appelle duree_mb_minutes
if (bcs_truie)        payload.bcs_truie       = ...  // ❌ inexistant
```
PostgREST refuse → `{error: { code: 'PGRST204', message: "Column 'date_mise_bas' not found" }}`. Le `_dialog-mise-bas.tsx` affiche un toast d'erreur mais la portée n'est jamais créée. Pire : la lecture côté fiche détail tente aussi `mises_bas.date_mise_bas` (idem KO), donc même si une MB existait sous le bon schéma, elle ne s'afficherait pas.

**3. La table `portees` (distincte de `mises_bas`) n'est pas alimentée par le Server Action** — il n'y a pas d'INSERT dans `portees` du tout dans le code. La logique métier suppose qu'un trigger SQL crée la portée depuis `mises_bas`, mais le commentaire ligne 61 le mentionne sans certitude.

**4. RLS** : 2 policies sur `portees` (`portees_select`, `portees_modify`) basées sur `user_farms` — OK, pas la cause.

### Fichiers à modifier
- `app/src/app/(app)/mises-bas/_server-actions.ts` lignes 39-58 — payload aligné schéma.
- `app/src/app/(app)/mises-bas/_schemas.ts` — possiblement à ajuster.
- `app/src/app/(app)/cheptel/[id]/page.tsx` lignes 104-138 — fetch `portees` au lieu de `mises_bas`, ou JOIN.

### Patch suggéré (pseudocode)
```diff
// mises-bas/_server-actions.ts
- const { data: saillie } = await supabase
-   .from('saillies').select('truie_id, bande_id')...
+ const { data: saillie } = await supabase
+   .from('saillies').select('truie_id, ferme_id')...

  const payload = {
    saillie_id: d.saillie_id,
    truie_id:   saillie.truie_id,
+   ferme_id:   saillie.ferme_id,
-   bande_id:   saillie.bande_id,
-   date_mise_bas: d.date_mise_bas,
+   date_mb:    d.date_mise_bas,
    nes_vivants: d.nes_vivants,
-   nes_morts:  d.nes_morts,
+   morts_nes:  d.nes_morts,
    momifies:   d.momifies,
-   ecrases:    d.ecrases,
    assistance: d.assistance,
-   idempotency_key: idempotencyKey,
  }
- if (d.duree_minutes) payload.duree_minutes = d.duree_minutes
+ if (d.duree_minutes) payload.duree_mb_minutes = d.duree_minutes
- if (d.poids_portee_kg) payload.poids_portee_kg = ...   // colonne à ajouter en BDD ou ignorer
- if (d.bcs_truie) payload.bcs_truie = ...               // idem
```

Et créer manuellement la portée pour Monette si l'utilisateur insiste pour ne pas perdre la donnée :
```sql
-- À exécuter SEPARÉMENT (humain), pas ici
INSERT INTO mises_bas (ferme_id, truie_id, date_mb, nes_vivants, morts_nes, momifies)
VALUES ('fdba3bb2-85dd-4ac1-9ab3-713c750980dc',
        '5a63a7f1-225e-4183-9d42-086635fa1345',
        '2026-03-03', X, Y, Z);
```

### Difficulté : **moyen (1 h)**
- Trivial pour aligner le payload sur le schéma (< 30 min).
- Moyen si on veut ajouter en BDD les colonnes manquantes (`ecrases, poids_portee_kg, bcs_truie, idempotency_key`) via migration Supabase + maintenir une rétro-compat.

---

## Bug #4 — Dashboard « BANDES ACTIVES : 0 »

### Symptôme
- Widget dashboard affiche `0` bandes actives malgré 117 porcelets actifs en BDD.

### Cause racine
**La table `bandes` n'existe pas en BDD.**

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema='public' AND table_name='bandes';   -- 0 rows
```

`app/src/app/(app)/dashboard/page.tsx` ligne 82 :
```ts
sb.from('bandes').select('*', { count: 'exact', head: true }).eq('statut', 'active')
```
PostgREST renvoie `{count: null, error: { message: 'relation "public.bandes" does not exist' }}`. Le code ne logge pas l'erreur, juste `nbBandesActives = null`, et `?? 0` à l'affichage → on voit "0".

**12 autres fichiers** du code utilisent aussi `from('bandes')` :
- `app/(app)/bandes/page.tsx`
- `app/(app)/bandes/[id]/page.tsx`
- `app/(app)/bandes/_server-actions.ts`
- `app/(app)/pesees/page.tsx`
- `app/(app)/reproduction/page.tsx`
- `app/(app)/sanitaire/calendrier/_queries.ts`
- `app/(app)/alimentation/plans/page.tsx`
- `app/(app)/alimentation/consommations/page.tsx`
- `lib/chatbot/rag.ts`
- etc.

### Fichiers à modifier
**Option A — court terme : créer la table** (recommandé) :
- Migration SQL Supabase : `CREATE TABLE bandes (id uuid pk, ferme_id uuid fk, nom text, code text, date_debut date, date_fin date, statut text default 'active', phase_courante text, ...)`.
- Ajouter `bande_id` aux tables `saillies`, `mises_bas`, `porcelets` selon le modèle métier.

**Option B — court terme : neutraliser le widget** :
- `app/src/app/(app)/dashboard/page.tsx` ligne 82 → remplacer par `Promise.resolve({ count: null })` et masquer la Card "Bandes actives" (lignes 200-210).
- Idem pour le sub-text ligne 171.

**Option C — sémantique alternative** : si "bande" = cohorte de porcelets actifs partageant `portee_id` similaire → calculer depuis `portees` :
```ts
sb.from('portees')
  .select('*', { count: 'exact', head: true })
  .is('date_sortie_finition', null)
  .gt('effectif_actuel', 0)
```

### Patch suggéré
```diff
// dashboard/page.tsx ligne 82
- sb.from('bandes').select('*', { count: 'exact', head: true }).eq('statut', 'active'),
+ // TEMP : 'bandes' n'existe pas en BDD → compter via portees actives
+ sb.from('portees').select('*', { count: 'exact', head: true })
+   .is('deleted_at', null)
+   .is('date_sortie_finition', null)
+   .gt('effectif_actuel', 0),
```

### Difficulté : **moyen-dur (2-4 h)**
- Trivial (< 30 min) si on accepte de définir "bande = portée active" et de simplement substituer la requête.
- Dur (> 2 h) si on doit créer la vraie table `bandes` avec migration, seeds, FK croisées (`saillies.bande_id`, `mises_bas.bande_id`), et un workflow de création de bande dans `/bandes`.

---

## Bug #5 — Dashboard « DERNIÈRES NAISSANCES : AUCUNE »

### Symptôme
- Widget affiche un EmptyState alors que `mises_bas` contient 6 lignes (du 28/02 au 05/05).

### Cause racine
`app/src/app/(app)/dashboard/page.tsx` ligne 84 :
```ts
sb.from('mises_bas').select('*, animaux:truie_id(tag,nom)').order('date_mise_bas', { ascending: false }).limit(5)
```

**La colonne `date_mise_bas` n'existe pas** — la vraie colonne est `date_mb`. PostgREST refuse l'ORDER BY → `{data: null, error: 'column "date_mise_bas" does not exist'}` → fallback `?? []` → EmptyState.

Bonus : ligne 369-378 utilise aussi `mb.nes_totaux`, `mb.nes_morts` (n'existent pas, le second s'appelle `morts_nes`).

### Vérification en BDD
```sql
SELECT id, truie_id, date_mb, nes_vivants, morts_nes
FROM mises_bas
ORDER BY date_mb DESC LIMIT 10;
-- → 6 lignes du 2026-05-05 au 2026-02-28, nes_vivants 0..13
```

### Fichiers à modifier
- `app/src/app/(app)/dashboard/page.tsx` lignes 84, 369-382.
- `app/src/app/(app)/cheptel/[id]/page.tsx` lignes 117-138 (mêmes colonnes).
- `app/src/app/(app)/mises-bas/page.tsx` et `_dialog-mise-bas.tsx` (à vérifier — même schéma).

### Patch suggéré
```diff
// dashboard/page.tsx ligne 84
- sb.from('mises_bas').select('*, animaux:truie_id(tag,nom)').order('date_mise_bas', { ascending: false }).limit(5),
+ sb.from('mises_bas').select('id, truie_id, date_mb, nes_vivants, morts_nes, momifies, animaux:truie_id(tag,nom)').order('date_mb', { ascending: false }).limit(5),

// dashboard/page.tsx ligne 369-382 (rendu)
- const totaux  = mb.nes_totaux ?? 0
- const vivants = mb.nes_vivants ?? 0
+ const vivants = mb.nes_vivants ?? 0
+ const totaux  = vivants + (mb.morts_nes ?? 0) + (mb.momifies ?? 0)
...
- {totaux} totaux · {mb.nes_morts ?? 0} morts
+ {totaux} totaux · {mb.morts_nes ?? 0} mort-nés
...
- {new Date(mb.date_mise_bas).toLocaleDateString('fr-FR')}
+ {new Date(mb.date_mb).toLocaleDateString('fr-FR')}
```

### Difficulté : **facile (< 30 min)**
- Substitution mécanique de `date_mise_bas` → `date_mb` et `nes_morts` → `morts_nes`.
- Calculer `nes_totaux` côté code (somme nv+mn+mom).

---

## 📋 Récap difficulté

| Bug | Difficulté | Temps estimé |
|---|---|---|
| #5 — Dernières naissances vides | **facile** | < 30 min |
| #4 — Bandes actives = 0 | **moyen** | 2-4 h (selon option) |
| #3 — Portées Monette manquantes | **moyen** | 1 h (alignement schéma) |
| #2 — Pas de filtre cheptel | **moyen** | 2 h (refonte) |
| #1 — Crash fiche animal (clic) | **moyen** | 1-2 h |

---

## 🎯 Ordre suggéré de fix

1. **Bug #5** (30 min) — quick win, montre tout de suite que le dashboard "vit". Élimine au passage le pattern `date_mise_bas` partout.
2. **Bug #3** (1 h) — directement enchaîné car même alignement schéma `mises_bas` (date_mb / morts_nes). Donne la confiance que la saisie utilisateur fonctionne.
3. **Bug #1** (1-2 h) — créer `cheptel/[id]/error.tsx` + nettoyer les fetchs vers vues/tables fantômes. Une fois fait, la navigation est utilisable.
4. **Bug #4** (2 h, option C) — substituer `bandes` par `portees actives` côté widget dashboard ; reporter la création de la vraie table `bandes` à un sprint dédié.
5. **Bug #2** (2 h) — refonte cheptel en 4 onglets (truies / verrats / porcelets / portées), maintenant que les fiches détail sont stables et que les filtres SQL fonctionnent.

**Préalable transverse** : auditer les **8 autres tables/vues fantômes** (sevrages, vaccinations, traitements, observations_bcs, bande_animaux, formules, ingredients, v_kpi_techniques_*) — soit migration SQL d'alignement, soit suppression des features non-implémentées en BDD. Idéalement avant le sprint UI Bug #2.
