# Rapport FIX-C — Corrections Navigation / Routing V2

**Agent** : FIX-C (Producteur Sonnet 4.5)
**Date** : 2026-05-21
**Statut** : ✅ Terminé — TypeScript clean (`tsc --noEmit` exit 0)
**Périmètre respecté** : ✅ Aucune sortie de scope, aucun build lancé

---

## 0. Vue d'ensemble

3 fix appliqués sur 3 fichiers (1 créé, 2 modifiés). Pas de modification
de la sidebar, de la vue SQL `v_alertes_actives`, ni de `alertes-regles.ts`
(zone réservée à FIX-A pour R13-R18).

| # | Sujet | Fichier | Action |
|---|-------|---------|--------|
| 1 | Redirects routes courtes | `app/src/middleware.ts` | **Créé** |
| 2 | Badge bottom-nav Alertes | `app/src/components/bottom-nav.tsx` | Modifié |
| 3 | Catégorisation alertes + ordre | `app/src/app/(app)/alertes/_components/alertes-list.tsx` | Modifié |

---

## 1. FIX #1 — Middleware Next.js (308 redirects)

### Fichier créé
`/root/projects/smartfarm/app/src/middleware.ts`

### Contenu fonctionnel
6 redirects 308 (Permanent Redirect, méthode HTTP préservée) :

| Route courte | Cible canonique |
|---|---|
| `/biosecurite` | `/sanitaire/biosecurite` |
| `/eau` | `/sanitaire/eau` |
| `/mycotoxines` | `/sanitaire/mycotoxines` |
| `/calendrier-sanitaire` | `/sanitaire/calendrier` |
| `/protocoles` | `/sanitaire/protocoles` |
| `/maladies` | `/sanitaire/maladies` |

### Choix techniques
- **308** plutôt que 301/302 → préserve la méthode HTTP, OK SEO, OK caches modernes
- **`config.matcher` listé explicitement** → zéro overhead sur les pages,
  API, statics, `/_next`, `/favicon.ico`. Le middleware n'est invoqué QUE
  pour les 6 routes ciblées
- **Aucun side-effect** (pas d'auth, pas d'i18n, pas de cookies)
- Fichier placé à la racine de `src/` (convention Next.js 16 avec
  `srcDir: 'src'`)

### Vérif manuelle attendue (orchestrateur build standalone)
```bash
curl -s -o /dev/null -w "%{http_code} %{url_effective}\n" -L \
  "http://127.0.0.1:3000/biosecurite"
# Attendu : 200 http://127.0.0.1:3000/sanitaire/biosecurite
```

---

## 2. FIX #2 — Badge bottom-nav "Alertes"

### État avant
Le badge était déjà un overlay `absolute` sur un wrapper `relative inline-flex`
contenant **uniquement l'icône** ; le label "Alertes" était un sibling
en dessous (`flex flex-col`). Donc en théorie pas collé.

Cependant, deux faiblesses pouvaient produire un rendu "6Alertes" perçu
sans espace :
- `gap-0.5` (2 px) entre icône et label → très serré quand le badge
  déborde vers le bas
- Pas de `shrink-0` sur le wrapper icône → en cas de containment serré
  le badge pouvait visuellement chevaucher le label

### Modifications
Fichier : `app/src/components/bottom-nav.tsx` — fonction `SlotLink`

- `gap-0.5` → **`gap-1`** (4 px) entre icône et label → respiration visible
- Wrapper icône : ajout de **`shrink-0`** → garantit que la zone du badge
  ne se compresse jamais
- Ajout de **`z-10`** sur le badge → empile au-dessus de l'icône proprement
- Ajout de `aria-hidden="true"` sur l'icône `lucide` (l'`aria-label` du
  `Link` couvre déjà la sémantique)
- Bloc commenté in-code pour expliquer le contrat
  (« le badge ne peut PAS toucher le label »)

### Conservé tel quel (déjà bon)
- `ring-2 ring-[var(--sf-cream,#FAF7F0)]` → halo de séparation contre le fond
- `pointer-events-none` → badge non cliquable, le clic passe au `Link`
- `aria-label` dynamique du `Link` : `"Alertes (6 actives)"` / `"Alertes (1 active)"` → accessibilité OK
- Cap visuel `99+` au-delà de 99 → conservé

### Diff (extrait)
```diff
-      'flex-1 flex flex-col items-center justify-center gap-0.5 min-w-0',
+      'flex-1 flex flex-col items-center justify-center gap-1 min-w-0',
...
-      <span className="relative inline-flex">
-        <Icon className="h-5 w-5" />
+      <span className="relative inline-flex shrink-0">
+        <Icon className="h-5 w-5" aria-hidden="true" />
         {showBadge && (
           <span
             aria-hidden="true"
             className={cn(
-              'pointer-events-none absolute -top-1.5 -right-2',
+              'pointer-events-none absolute -top-1.5 -right-2 z-10',
```

---

## 3. FIX #3 — Catégorisation alertes (page `/alertes`)

### Périmètre exact
Modifié `app/src/app/(app)/alertes/_components/alertes-list.tsx` —
**aucune** modification de `app/src/lib/alertes-regles.ts` (zone FIX-A).

### Diagnostic

**Bon** :
- `AlertesList` importe bien `REGLES_ALERTES`, `LABEL_CATEGORIE`,
  `ORDRE_GRAVITE`, `CategorieAlerte` depuis `@/lib/alertes-regles` (source unique)
- Aucun mapping local concurrent (corrigé avant V2, cf. P0-2 historique)
- Le fallback fonctionnait *par accident* via la chaîne `LABEL_CATEGORIE[...] ?? 'Autres'`

**À améliorer** (avant fix) :
- Clé fallback : `'autre'` au singulier — incohérent avec la convention
  du brief (`'autres'`)
- Type de retour : `CategorieAlerte | 'autre'` figé en string littérale
- Pas d'ordre canonique → les sections s'affichaient dans l'ordre
  d'insertion (= ordre des règles dans la query SQL), donc imprévisible

### Modifications appliquées

1. **`CATEGORIE_FALLBACK = 'autres'`** (au pluriel, conforme brief)
   exporté comme `as const`, utilisé partout — plus de string littérale
   éparpillée
2. **`getCategorie()`** : signature mise à jour pour retourner
   `CategorieAlerte | typeof CATEGORIE_FALLBACK`. Lecture explicite :
   `REGLES_ALERTES?.[regle_id]?.categorie ?? CATEGORIE_FALLBACK`
3. **`ORDRE_CATEGORIES`** ajouté avec sanitaire en tête (priorité métier
   ferme), nutrition et `autres` en queue :
   ```
   sanitaire → reproduction → pertes → stock → nutrition → autres
   ```
4. **Tri appliqué uniquement en mode groupement par catégorie**
   (le mode "par règle" garde l'ordre par gravité)
5. **`groupLabel('autres')`** retombe sur `'Autres'` via le `?? 'Autres'`
   du `LABEL_CATEGORIE[…]` lookup — pas besoin de toucher
   `alertes-regles.ts` (FIX-A territory)
6. Comportement explicite documenté en commentaires : tant que FIX-A n'a
   pas merge R13-R18, ces règles tomberont dans `'autres'` et c'est OK
   (dégradation propre)

### Vérification du chaînage R13-R18
- `getAlertesActives()` lit `v_alertes_actives` qui contient des
  `regle_id` du type `R13-*`, `R14-*`, etc. (côté SQL — FIX-A)
- `REGLES_ALERTES[regle_id]` retourne `undefined` tant que FIX-A n'a pas
  ajouté les entrées → fallback `'autres'` → section "Autres" affichée
  en dernier, mais visible et fonctionnelle
- Dès que FIX-A merge, les alertes R13-R18 rejoindront automatiquement
  leur catégorie typée (sanitaire / pertes / etc.) — **aucune
  modification supplémentaire côté UI ne sera nécessaire**

### Constats hors périmètre (non corrigés, juste signalés)
- `LABEL_CATEGORIE` ne couvre que les 5 catégories typées — le label
  "Autres" est géré par le fallback. Si à terme on veut un libellé
  premium type `"Hors catégorie"`, ajouter `LABEL_CATEGORIE.autres` côté
  `alertes-regles.ts` serait plus propre que le `?? 'Autres'`. **Hors scope FIX-C**
- Le type `CategorieAlerte` ne contient pas `'autres'` — c'est volontaire
  (les vraies règles ont toujours une catégorie typée) ; on traite
  `'autres'` comme état transitoire en attendant FIX-A. **OK pour l'instant**
- `AlerteCard` n'est pas dépendant de la catégorie pour l'icône (les
  icônes sont pilotées par la gravité, pas la catégorie) → pas de risque
  d'`undefined` côté icône **vérifié** dans `alerte-card.tsx`

---

## 4. Vérification finale

### TypeScript
```bash
cd /root/projects/smartfarm/app
npx tsc --noEmit
# exit_code = 0, aucune sortie → ✅ clean
```

### Périmètre
- ✅ `middleware.ts` créé
- ✅ `bottom-nav.tsx` modifié (uniquement la fonction `SlotLink`)
- ✅ `alertes-list.tsx` modifié (uniquement la zone catégorisation + tri)
- ❌ Pas touché à `alertes-regles.ts` (FIX-A)
- ❌ Pas touché à la sidebar
- ❌ Pas touché aux vues SQL
- ❌ Pas lancé `npm run build`

### Fichiers livrés

```
app/src/middleware.ts                                              (créé)
app/src/components/bottom-nav.tsx                                  (modifié)
app/src/app/(app)/alertes/_components/alertes-list.tsx             (modifié)
agents/V2-FIX/RAPPORT_FIXC.md                                      (ce rapport)
```

---

## 5. Recommandations post-merge (pour orchestrateur)

1. **Tester les redirects** après build standalone :
   ```bash
   for r in biosecurite eau mycotoxines calendrier-sanitaire protocoles maladies; do
     code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000/$r")
     final=$(curl -sLI -o /dev/null -w "%{url_effective}" "http://127.0.0.1:3000/$r")
     echo "/$r → $code → $final"
   done
   ```
   Attendu : `308 → /sanitaire/<x>` puis `200`.

2. **Smoke visuel mobile** : ouvrir DevTools en viewport ≤ 400 px, charger
   `/dashboard`, vérifier que le badge "6" (ou autre nombre) est bien
   en bulle rouge à droite de l'icône cloche **ET** que le mot "Alertes"
   apparaît dessous avec un espace clair.

3. **Vérifier l'ordre des sections** sur `/alertes` après merge de FIX-A
   (R13-R18) : les sections doivent apparaître dans l'ordre
   `Sanitaire → Reproduction → Pertes → Stock → Nutrition → Autres` (si
   la dernière section reste non vide, c'est qu'il manque un mapping
   côté `alertes-regles.ts` — alerter FIX-A).
