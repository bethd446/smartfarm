# Brief CHANT-B — Bâtiments cliquables (occupation détaillée)

## Périmètre
✅ Touche : `src/app/(app)/batiments/page.tsx` + créer `src/app/(app)/batiments/[id]/page.tsx`
❌ Pas : DB, autres modules

## Contexte
Lis CONTEXT.md + CLAUDE.md d'abord. Pas `npm run build`.

## Règles métier
Éleveur veut **cliquer un bâtiment** pour voir :
- Cases présentes (numéro, type, capacité)
- Animaux dans chaque case (tag, sexe, catégorie, poids estimé)
- Taux d'occupation (animaux / capacité)
- Bandes actives dans le bâtiment

Types bâtiments (CHECK constraint déjà en place) : `maternité`, `gestation`, `verraterie`, `post-sevrage`, `engraissement`, `quarantaine`, `infirmerie`.

## Mission

### 1. Modifier `/batiments/page.tsx` : cartes cliquables
Chaque bâtiment devient un `<Link href={`/batiments/${b.id}`}>` autour de la card existante :
- Badge type
- Capacité totale
- **Occupation actuelle** : COUNT animaux dont case.batiment_id = ce bâtiment, animaux.statut='actif'
- **Taux %** : occupation / capacité, badge couleur (vert <70%, jaune 70-90%, rouge >90%)

Query :
```ts
const { data: batiments } = await sb
  .from('batiments')
  .select(`
    *,
    cases(id, numero, capacite, type, animaux(id, tag, statut, sexe, categorie))
  `)
  .order('nom')
```

Calculer côté client :
```ts
const occupation = batiments.map(b => {
  const animauxActifs = b.cases.flatMap(c => c.animaux ?? []).filter(a => a.statut === 'actif')
  return { ...b, animauxActifs, taux: b.capacite ? animauxActifs.length / b.capacite * 100 : 0 }
})
```

### 2. Créer `/batiments/[id]/page.tsx` — page détail

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function BatimentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()

  const { data: batiment } = await sb
    .from('batiments')
    .select(`
      *,
      cases(
        id, numero, capacite, type, salle_id,
        animaux(id, tag, nom, sexe, categorie, statut, date_naissance, race:race_id(nom))
      )
    `)
    .eq('id', id)
    .single()

  if (!batiment) notFound()

  const totalAnimaux = (batiment.cases ?? []).flatMap((c: any) => c.animaux ?? [])
    .filter((a: any) => a.statut === 'actif')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1>{batiment.nom}</h1>
        <p className="text-sm text-muted-foreground">
          {batiment.type} · Capacité {batiment.capacite} · {totalAnimaux.length} animaux présents · {batiment.surface_m2} m²
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent><div className="text-xs text-muted">Animaux présents</div><div className="text-3xl font-bold">{totalAnimaux.length}</div></CardContent></Card>
        <Card><CardContent><div className="text-xs text-muted">Capacité totale</div><div className="text-3xl font-bold">{batiment.capacite}</div></CardContent></Card>
        <Card><CardContent><div className="text-xs text-muted">Taux occupation</div><div className="text-3xl font-bold">{batiment.capacite ? Math.round(totalAnimaux.length/batiment.capacite*100) : 0}%</div></CardContent></Card>
        <Card><CardContent><div className="text-xs text-muted">Cases</div><div className="text-3xl font-bold">{batiment.cases?.length ?? 0}</div></CardContent></Card>
      </div>

      {/* Liste des cases avec animaux */}
      <Card>
        <CardHeader><CardTitle>Cases ({batiment.cases?.length ?? 0})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(batiment.cases ?? []).length === 0 ? (
            <EmptyState icon={Building2} title="Aucune case configurée" description="Ajouter des cases pour ce bâtiment depuis les paramètres." />
          ) : (
            batiment.cases.map((c: any) => {
              const animauxCase = (c.animaux ?? []).filter((a: any) => a.statut === 'actif')
              return (
                <div key={c.id} className="border rounded-md p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold">Case {c.numero} {c.type && <span className="text-sm text-muted">({c.type})</span>}</div>
                    <Badge variant={animauxCase.length > (c.capacite ?? 0) ? 'danger' : 'secondary'}>
                      {animauxCase.length} / {c.capacite ?? '?'}
                    </Badge>
                  </div>
                  {animauxCase.length === 0 ? (
                    <p className="text-xs text-muted italic">Case vide</p>
                  ) : (
                    <ul className="text-sm space-y-1">
                      {animauxCase.map((a: any) => (
                        <li key={a.id} className="flex items-center gap-2">
                          <Link href={`/cheptel/${a.id}`} className="font-mono hover:underline">{a.tag}</Link>
                          <span className="text-muted">{a.nom ?? '—'}</span>
                          <Badge variant="secondary">{a.sexe}</Badge>
                          <Badge>{a.categorie}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: `Bâtiment — Smart Farm` }
}
```

### 3. Lien de retour dans header
Ajouter en haut un `<Link href="/batiments">← Tous les bâtiments</Link>`.

## Vérif
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/batiments
# = 200
# Récupérer un id et tester
BAT_ID=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c "SELECT id FROM batiments LIMIT 1;")
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/batiments/$BAT_ID
# = 200
```

## Livrable
1. `/batiments/page.tsx` cartes cliquables avec occupation
2. `/batiments/[id]/page.tsx` créé avec détail cases + animaux
3. Rapport `/root/projects/smartfarm/agents/V2-METIER/RAPPORT_CHANT_B.md` ≤ 60 lignes

## Anti-pièges
- Pas de DB modifications
- `params` est `Promise<{id}>` en Next 16 → `await`
- Si pas d'animaux dans aucune case (données démo), afficher EmptyState par case
- Conserver le métadata `title`
