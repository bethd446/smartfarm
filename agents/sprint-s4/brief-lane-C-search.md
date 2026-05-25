# Brief LANE C — Recherche globale top-bar (Cmd+K) S4

## TOI
Dev senior React+Supabase. Caveman. Contexte vierge. 60 min.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (notamment règle 9 filtres animaux)
2. `/root/projects/smartfarm/agents/sprint-s4/RAPPORT_S4_AUDIT.md` §4

## DÉCISION orchestrateur #5
Recherche par boucle = **top-bar persistante** (PAS Cmd+K only).
→ Un champ recherche visible en permanence (sur desktop ET mobile via icône loupe qui ouvre overlay).

## PÉRIMÈTRE
✅ Crée :
- `/root/projects/smartfarm/app/src/components/global-search.tsx` (nouveau client component)

✅ Modifie :
- `/root/projects/smartfarm/app/src/components/app-shell.tsx` (intégrer le composant dans le header)

✅ Crée éventuellement :
- `/root/projects/smartfarm/supabase/migrations/<timestamp>_rpc_search_animaux_by_tag.sql` (RPC fuzzy search)

❌ NE PAS toucher sidebar.tsx, mobile-drawer.tsx, bottom-nav.tsx (Lane A s'en occupe)
❌ NE PAS `npm run build`, pas git commit, PAS appliquer la migration SQL en BDD prod (juste créer le fichier .sql, l'orchestrateur applique ensuite)

## MISSION

### Phase 1 — RPC Supabase (~10 min)

Créer migration SQL avec naming convention `YYYYMMDDHHMMSS_rpc_search_animaux_by_tag.sql`. Récupère le timestamp UTC actuel :
```bash
date -u +%Y%m%d%H%M%S
```

Contenu :
```sql
-- RPC fuzzy search animaux par tag (boucle)
-- Sécurité : SECURITY INVOKER → respecte RLS existante (current_farm_id)

CREATE OR REPLACE FUNCTION public.search_animaux_by_tag(query TEXT)
RETURNS TABLE (
  id UUID,
  tag TEXT,
  nom TEXT,
  categorie TEXT,
  stade TEXT,
  batiment_nom TEXT
)
LANGUAGE sql
SECURITY INVOKER
STABLE
AS $$
  SELECT a.id, a.tag, a.nom, a.categorie::text, a.stade::text, b.nom AS batiment_nom
  FROM public.animaux a
  LEFT JOIN public.batiments b ON b.id = a.batiment_id
  WHERE 
    a.statut IN ('actif', 'malade')
    AND a.deleted_at IS NULL
    AND (
      a.tag ILIKE '%' || query || '%' 
      OR a.nom ILIKE '%' || query || '%'
    )
  ORDER BY 
    -- Priorité tag exact > préfixe > contains
    CASE 
      WHEN a.tag = query THEN 1
      WHEN a.tag ILIKE query || '%' THEN 2
      ELSE 3 
    END,
    a.tag
  LIMIT 20;
$$;

GRANT EXECUTE ON FUNCTION public.search_animaux_by_tag(TEXT) TO authenticated;
```

⚠️ **Vérifier les types des colonnes AVANT** :
```bash
cd /root/projects/smartfarm/app && SR=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2)
curl -s "https://tpzhxjzwlxwujboboyit.supabase.co/rest/v1/animaux?select=id,tag,nom,categorie,stade,batiment_id&limit=1" -H "apikey: $SR" -H "Authorization: Bearer $SR"
```
Si `categorie` est enum → cast `::text` (déjà fait dans le SQL ci-dessus). Si `stade` n'existe pas → retirer.

### Phase 2 — Composant `<GlobalSearch>` (~35 min)

`/root/projects/smartfarm/app/src/components/global-search.tsx` :

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AnimalResult {
  id: string
  tag: string
  nom: string | null
  categorie: string
  stade: string | null
  batiment_nom: string | null
}

export function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<AnimalResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  // Raccourci clavier Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
        document.getElementById('global-search-input')?.focus()
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Debounce recherche
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    setLoading(true)
    const handler = setTimeout(async () => {
      const sb = createClient()
      const { data, error } = await sb.rpc('search_animaux_by_tag', { query: query.trim() })
      if (!error && data) setResults(data as AnimalResult[])
      setLoading(false)
    }, 200)
    return () => clearTimeout(handler)
  }, [query])

  const handleSelect = (id: string) => {
    router.push(`/cheptel/${id}`)
    setOpen(false)
    setQuery('')
  }

  return (
    <>
      {/* Champ desktop (sticky top-bar) */}
      <div className="relative w-full max-w-md hidden md:block">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--sf-muted)]" />
        <input
          id="global-search-input"
          type="search"
          placeholder="Rechercher une boucle… (Ctrl+K)"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          className="h-10 w-full rounded-md border border-[var(--sf-line)] bg-[var(--sf-surface-1)] pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--sf-primary)]/30"
          aria-label="Rechercher un animal par boucle"
        />
        {open && (results.length > 0 || loading) && (
          <ResultsList results={results} loading={loading} onSelect={handleSelect} onClose={() => setOpen(false)} />
        )}
      </div>

      {/* Icône mobile (toggle overlay) */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden inline-flex items-center justify-center h-11 w-11 rounded-md hover:bg-[var(--sf-surface-2)]"
        aria-label="Rechercher"
      >
        <Search className="h-5 w-5" />
      </button>

      {/* Overlay mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 bg-[var(--sf-surface-1)] p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              autoFocus
              type="search"
              placeholder="Tag ou nom…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 flex-1 rounded-md border border-[var(--sf-line)] px-3"
            />
            <button onClick={() => { setOpen(false); setQuery('') }} className="h-11 w-11 inline-flex items-center justify-center">
              <X className="h-5 w-5" />
            </button>
          </div>
          <ResultsList results={results} loading={loading} onSelect={handleSelect} mobile />
        </div>
      )}
    </>
  )
}

function ResultsList({ results, loading, onSelect, onClose, mobile }: {
  results: AnimalResult[]
  loading: boolean
  onSelect: (id: string) => void
  onClose?: () => void
  mobile?: boolean
}) {
  if (loading) return <div className={mobile ? "py-8 text-center" : "absolute top-full mt-1 w-full bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-md p-3 shadow-lg z-50"}>Recherche…</div>
  if (results.length === 0) return <div className={mobile ? "py-8 text-center text-[var(--sf-muted)]" : "absolute top-full mt-1 w-full bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-md p-3 shadow-lg z-50 text-[var(--sf-muted)] text-sm"}>Aucun résultat</div>
  return (
    <ul className={mobile ? "space-y-1" : "absolute top-full mt-1 w-full bg-[var(--sf-surface-1)] border border-[var(--sf-line)] rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"}>
      {results.map((r) => (
        <li key={r.id}>
          <button
            onClick={() => onSelect(r.id)}
            className="w-full text-left p-3 hover:bg-[var(--sf-surface-2)] flex items-center gap-3 min-h-11"
          >
            <span className="font-mono font-bold tabular-nums">{r.tag}</span>
            {r.nom && <span className="text-[var(--sf-muted)]">{r.nom}</span>}
            <span className="ml-auto text-xs text-[var(--sf-muted)] capitalize">{r.categorie}</span>
            {r.batiment_nom && <span className="text-xs text-[var(--sf-muted)]">{r.batiment_nom}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
```

### Phase 3 — Intégration `app-shell.tsx` (~15 min)

Insérer `<GlobalSearch />` dans le header (probablement à droite du logo / titre, avant les boutons utilisateur). Lire d'abord `app-shell.tsx` pour comprendre la structure exacte.

```tsx
import { GlobalSearch } from '@/components/global-search'

// Dans le JSX header :
<header className="...">
  {/* logo + titre existants */}
  <GlobalSearch />
  {/* user menu existant */}
</header>
```

## VÉRIFICATIONS OBLIGATOIRES
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `grep -c "GlobalSearch" /root/projects/smartfarm/app/src/components/app-shell.tsx` → ≥2 (import + usage)
3. `test -f /root/projects/smartfarm/supabase/migrations/*_rpc_search_animaux_by_tag.sql` → existe
4. Lire le fichier migration créé pour confirmer syntaxe SQL

## LIVRABLE
1. 3 fichiers (composant + app-shell + migration)
2. Rapport stdout 8 lignes max :
   - Migration : YYYYMMDDHHMMSS_*.sql créée
   - global-search.tsx : créé ~250 lignes
   - app-shell.tsx : import + insertion ligne LXX
   - Schéma vérifié : colonnes RPC valides OUI/NON
   - tsc : OK / FAIL

## ANTI-PIÈGES
- ❌ Ne PAS appliquer la migration en BDD prod — juste créer le fichier .sql (l'orchestrateur applique)
- ❌ Ne PAS utiliser SECURITY DEFINER — utiliser SECURITY INVOKER pour respecter RLS
- ❌ Si la colonne `stade` n'existe pas → retirer du RETURNS et SELECT (audit BDD d'abord)
- ❌ Ne PAS importer `lucide-react` icônes hors {Search, X}
- ❌ Ne PAS ajouter de dépendance externe (`cmdk`, `fuse.js` etc.) — implémentation maison suffit
- Si `app-shell.tsx` est un Server Component → tu peux quand même importer `<GlobalSearch>` (client component s'auto-isole)

Go.
