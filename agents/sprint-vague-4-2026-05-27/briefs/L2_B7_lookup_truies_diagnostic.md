# Brief L2 — B7 Lookup truies dialog DIAGNOSTIC

## TOI
Dev senior React/Next. Tu améliores UX d'un dialog existant avec un sélecteur amont par truie.

## LIS D'ABORD (obligatoire, dans cet ordre)
1. `CLAUDE.md` (racine) — règles projet, vocab FR strict §10
2. `app/src/app/(app)/reproduction/_dialog-diagnostic.tsx` — dialog complet à modifier (359 lignes)
3. `app/src/app/(app)/reproduction/page.tsx` — comment le dialog est appelé (props passées), savoir si `truies` est déjà chargé
4. `app/src/app/(app)/reproduction/_dialog-faire-monter.tsx` — chercher si déjà un pattern Select truies (pour copier idéalement)
5. `app/src/app/(app)/reproduction/_schemas.ts` — `diagnosticSchema` (35 lignes)

## Périmètre
✅ Touche UNIQUEMENT :
- `app/src/app/(app)/reproduction/_dialog-diagnostic.tsx`

⚠️ POSSIBLEMENT touche aussi `app/src/app/(app)/reproduction/page.tsx` SI et SEULEMENT SI la prop `truies` doit être ajoutée (vérifie d'abord, n'agis qu'au besoin).

❌ Touche pas :
- `_dialog-faire-monter.tsx`, `_schemas.ts`, `_server-actions.ts` (ces 3 fichiers restent intacts)
- Aucune migration SQL, aucun nouveau fichier
- Tout fichier hors `reproduction/`

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push, pas restart serveur.

## Contexte

État actuel du dialog `_dialog-diagnostic.tsx` :
- Champ "La montée *" = select `saillies` avec libellé `${truie.nom ?? tag} — montée DATE × verrat`
- `defaultSaillieId` existe pour pré-sélectionner depuis une URL ou un parent
- PROBLÈME : si une truie a 30+ saillies en attente diagnostic, la liste est longue et fastidieuse à parcourir

**Mission** : ajouter un sélecteur amont "Truie" qui filtre la liste des saillies par truie, avec :
- Si 1 seule saillie pour la truie → auto-sélection
- Si plusieurs → filtre visible dans le select saillies
- Recherche par tag ou nom (text-input + match `nom`/`tag`)

## Mission
1. Ajouter dans le dialog un nouveau champ AMONT "Truie" (Combobox texte avec liste filtrée)
2. Quand une truie est sélectionnée, filtrer `saillies` par `truie_id` correspondant
3. Si 1 saillie filtrée → auto-set `saillie_id` form (via `setValue`)
4. Quand truie désélectionnée (input vidé) → revenir à la liste complète saillies
5. Vérifier que `defaultSaillieId` continue de fonctionner (rétro-compat)

## Détails techniques

### Données disponibles
Le type `SaillieOption` (ligne 30) contient déjà `truie_id?: string`, `truie_tag: string`, `truie_nom: string | null`. Donc on peut déduire la liste truies UNIQUE depuis `saillies` directement, **pas besoin de nouvelle prop**.

```tsx
const truiesUniques = useMemo(() => {
  const map = new Map<string, { id: string; tag: string; nom: string | null }>()
  for (const s of saillies) {
    const key = s.truie_id ?? s.truie_tag
    if (!map.has(key)) {
      map.set(key, {
        id: s.truie_id ?? '',
        tag: s.truie_tag,
        nom: s.truie_nom,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.tag.localeCompare(b.tag))
}, [saillies])
```

### Nouveau state
```tsx
const [truieFilter, setTruieFilter] = useState<string>('') // tag truie sélectionnée
const [truieSearch, setTruieSearch] = useState<string>('') // text input
```

### Filtre saillies par truie sélectionnée
```tsx
const saillesFiltrees = useMemo(() => {
  if (!truieFilter) return saillies
  return saillies.filter((s) => s.truie_tag === truieFilter)
}, [saillies, truieFilter])
```

### Auto-select si 1 seule saillie
```tsx
useEffect(() => {
  if (saillesFiltrees.length === 1 && truieFilter && selectedSaillieId !== saillesFiltrees[0].id) {
    setValue('saillie_id', saillesFiltrees[0].id, { shouldValidate: true, shouldDirty: true })
  }
}, [saillesFiltrees, truieFilter, selectedSaillieId, setValue])
```

⚠️ Importer `useEffect` depuis 'react' (ajouter à l'import existant).

### UI : nouveau champ amont (avant "La montée *")

Insère AVANT le `<div>` du champ saillie_id (juste après l'ouverture du `<form>`) :

```tsx
{/* Filtre amont : recherche truie pour pré-filtrer la liste de saillies */}
<div>
  <Label htmlFor="truie-search">Truie (optionnel — filtre la liste ci-dessous)</Label>
  <div className="relative">
    <Input
      id="truie-search"
      type="search"
      placeholder="Tag ou nom (ex: SF-T-042 ou Roxane)"
      value={truieSearch}
      onChange={(e) => {
        setTruieSearch(e.target.value)
        const q = e.target.value.trim().toLowerCase()
        if (!q) { setTruieFilter(''); return }
        // Match exact tag ou tag commence par q ou nom contient q
        const match = truiesUniques.find(
          (t) =>
            t.tag.toLowerCase() === q ||
            t.tag.toLowerCase().startsWith(q) ||
            (t.nom?.toLowerCase().includes(q) ?? false),
        )
        if (match) setTruieFilter(match.tag)
        else setTruieFilter('')
      }}
      list="truies-datalist"
    />
    <datalist id="truies-datalist">
      {truiesUniques.map((t) => (
        <option key={t.tag} value={t.tag}>
          {t.nom ? `${t.tag} — ${t.nom}` : t.tag}
        </option>
      ))}
    </datalist>
  </div>
  {truieFilter && (
    <p className="mt-1 text-xs text-[var(--sf-muted)]">
      {saillesFiltrees.length} saillie{saillesFiltrees.length > 1 ? 's' : ''} pour {truieFilter} —{' '}
      <button
        type="button"
        className="underline text-[var(--sf-primary)] hover:opacity-80"
        onClick={() => { setTruieFilter(''); setTruieSearch('') }}
      >
        effacer le filtre
      </button>
    </p>
  )}
</div>
```

### Modif select "La montée"
Remplacer `{saillies.map((s) => {` par `{saillesFiltrees.map((s) => {` (1 seul changement, ligne ~181 de la version courante).

### Important : préserver `defaultSaillieId`
Si `defaultSaillieId` est fourni et trouve une saillie correspondante dans `saillies`, **pré-remplir le filtre truie** au montage :

```tsx
useEffect(() => {
  if (defaultSaillieId) {
    const s = saillies.find((s) => s.id === defaultSaillieId)
    if (s) {
      setTruieFilter(s.truie_tag)
      setTruieSearch(s.truie_nom ? `${s.truie_tag} — ${s.truie_nom}` : s.truie_tag)
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [defaultSaillieId])
```

⚠️ Ne déclenche QU'AU MONTAGE (deps `[defaultSaillieId]` seulement) sinon boucle.

## VÉRIFICATIONS OBLIGATOIRES (à reporter dans rapport)
1. `grep -c "truieFilter\|truieSearch\|truiesUniques\|saillesFiltrees" app/src/app/\(app\)/reproduction/_dialog-diagnostic.tsx` → attendu ≥ 8 mentions
2. `grep "truies-datalist" app/src/app/\(app\)/reproduction/_dialog-diagnostic.tsx` → présent
3. `grep "useEffect" app/src/app/\(app\)/reproduction/_dialog-diagnostic.tsx` → ≥ 2 useEffect (1 montage, 1 auto-select)
4. `grep "saillies.map" app/src/app/\(app\)/reproduction/_dialog-diagnostic.tsx` → 0 occurrence (remplacé par `saillesFiltrees.map`)
5. `wc -l app/src/app/\(app\)/reproduction/_dialog-diagnostic.tsx` → 359 ± 60 lignes (croissance acceptable ~+60)

## LIVRABLE
1 fichier : `agents/sprint-vague-4-2026-05-27/rapports/RAPPORT_L2.md` (≤80 lignes)

Format :
```md
# RAPPORT L2 — B7 Lookup truies diagnostic

## Fait
- `_dialog-diagnostic.tsx` modifié (+N -M lignes)

## Vérifs (sorties grep réelles)
- `grep -c ...` → N

## Divergences brief
- ...

## TODO orchestrateur
- `npx tsc --noEmit`
- Smoke desktop + mobile : ouvrir dialog diagnostic, taper tag truie, vérifier filtre + auto-select
```

## INTERDITS
- ❌ Modifier `_dialog-faire-monter.tsx`, `_schemas.ts`, `_server-actions.ts`, `page.tsx` (sauf cas justifié documenté)
- ❌ Ajouter dépendance npm (datalist HTML5 natif suffit)
- ❌ Nouvelle prop dans le composant (les truies se déduisent de `saillies`)
- ❌ Rapport > 80 lignes

Go.
