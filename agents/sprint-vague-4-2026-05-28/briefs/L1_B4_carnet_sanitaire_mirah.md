# Brief L1 — B4 Carnet sanitaire MIRAH (PDF + CSV)

## TOI
Dev senior React/Next + @react-pdf/renderer. Tu génères un export réglementaire ivoirien (MIRAH = Ministère Ressources Animales et Halieutiques CI) au format PDF + CSV.

## LIS D'ABORD (obligatoire)
1. `CLAUDE.md` (racine) — règles charte, vocab FR pro zootech
2. `app/src/app/(app)/sanitaire/actes/page.tsx` — page liste actes existante + structure `ActeRow` (filtres mois/type/animal_id, pagination 50)
3. `app/src/app/(app)/sanitaire/actes/_schemas.ts` — enums `UNITES_DOSE`, `VOIES_ADMINISTRATION`
4. `app/src/app/(app)/sanitaire/actes/_server-actions.ts` — pattern fetch actes
5. `app/package.json` — vérifier `@react-pdf/renderer` (✅ déjà installé v4.5.1)

## Périmètre
✅ Touche (NOUVEAUX fichiers tous) :
- `app/src/app/(app)/sanitaire/actes/export/route.ts` (API route GET → PDF ou CSV selon `?format=pdf|csv`)
- `app/src/app/(app)/sanitaire/actes/_pdf-mirah.tsx` (composant `<Document>` @react-pdf/renderer)
- `app/src/app/(app)/sanitaire/actes/_csv-mirah.ts` (sérialiseur CSV pur — RFC 4180, séparateur `;` pour Excel FR)

❌ Touche pas :
- `sanitaire/actes/page.tsx` (l'orchestrateur ajoutera le bouton "Exporter MIRAH" en suivi)
- `_dialog-acte.tsx`, `_schemas.ts`, `_server-actions.ts` (intacts)
- Tout autre fichier hors `sanitaire/actes/`
- Aucune migration SQL (table `actes_sanitaires` existe déjà depuis Vague 2)

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push, pas restart serveur.

## Contexte

Format MIRAH = registre obligatoire véto CI tenu par chaque éleveur. Colonnes réglementaires :

| Date | Animal/Bande | Produit | Type | Voie | Dose + Unité | Durée (j) | Délai attente viande (j) | Motif | Opérateur |
|---|---|---|---|---|---|---|---|---|---|

Le PDF doit avoir :
- En-tête : "REGISTRE DE TRAITEMENTS SANITAIRES — MIRAH-CI" + nom ferme + période + date impression
- Tableau A4 paysage, font monospace pour lisibilité véto
- Pied de page : "Document de traçabilité conforme à l'arrêté CI réglementant l'usage vétérinaire — page X/Y"
- Aucun branding Smart Farm visible dans le doc (registre officiel neutre)

CSV : séparateur `;`, encodage UTF-8 BOM (Excel FR), 1 ligne header + N lignes actes.

## Mission
1. Créer `_csv-mirah.ts` : fonction `serializeActesCsv(actes: ActeRow[]): string` qui retourne un string CSV complet (avec BOM `﻿`)
2. Créer `_pdf-mirah.tsx` : composant `<MirahDocument actes ferme periode />` qui rend un PDF A4 paysage avec tableau
3. Créer `route.ts` (Next.js Route Handler) : `GET /sanitaire/actes/export?format=pdf|csv&from=YYYY-MM-DD&to=YYYY-MM-DD&type=...`
   - Auth obligatoire (createClient + getFermeId)
   - Fetch actes filtrés période + ferme courante via RLS
   - Si `format=csv` → return new Response(csv, headers Content-Type text/csv + Content-Disposition attachment + filename)
   - Si `format=pdf` → utilise `@react-pdf/renderer` server-side (`renderToStream`) → return new Response(stream)
   - Default `format=pdf`

## Détails techniques

### Fix #1 — `_csv-mirah.ts`

```ts
import type { ActeRow } from './page'

// Si page.tsx n'exporte pas ActeRow, redéfinis localement (vérifier d'abord par grep)
type ActeRowLocal = {
  date_administration: string
  dose: number
  unite_dose: string
  voie: string
  duree_jours: number
  motif: string | null
  delai_attente_viande_jours: number | null
  animal: { tag: string | null; nom: string | null } | null
  bande: { code: string | null; nom: string | null } | null
  produit: { nom: string; type: string } | null
  operateur_user_id: string | null
}

const HEADER = [
  'Date', 'Animal/Bande', 'Produit', 'Type', 'Voie',
  'Dose', 'Unité', 'Durée (j)', 'Délai attente viande (j)',
  'Motif', 'Opérateur',
]

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(';') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function serializeActesCsv(actes: ActeRowLocal[]): string {
  const BOM = '﻿' // UTF-8 BOM pour Excel FR
  const rows: string[] = [HEADER.join(';')]
  for (const a of actes) {
    const cible = a.animal?.tag ?? a.bande?.code ?? '—'
    const cibleLabel = a.animal?.nom ? `${cible} (${a.animal.nom})` : cible
    rows.push([
      a.date_administration,
      cibleLabel,
      a.produit?.nom ?? '—',
      a.produit?.type ?? '—',
      a.voie,
      String(a.dose),
      a.unite_dose,
      String(a.duree_jours),
      a.delai_attente_viande_jours != null ? String(a.delai_attente_viande_jours) : '—',
      a.motif ?? '',
      a.operateur_user_id ?? '',
    ].map(csvEscape).join(';'))
  }
  return BOM + rows.join('\r\n')
}
```

### Fix #2 — `_pdf-mirah.tsx`

```tsx
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: 'Courier', fontSize: 8 },
  header: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subheader: { fontSize: 9, textAlign: 'center', marginBottom: 10, color: '#444' },
  table: { width: '100%', borderTop: 1, borderLeft: 1, borderColor: '#000' },
  row: { flexDirection: 'row', borderBottom: 1, borderColor: '#000', minHeight: 18 },
  cellHead: { padding: 3, borderRight: 1, borderColor: '#000', fontWeight: 'bold', backgroundColor: '#eee' },
  cell: { padding: 3, borderRight: 1, borderColor: '#000' },
  footer: { position: 'absolute', bottom: 12, left: 28, right: 28, fontSize: 7, textAlign: 'center', color: '#666' },
})

// Largeurs colonnes (% — total 100)
const W = { date: 8, cible: 14, produit: 14, type: 8, voie: 6, dose: 6, unite: 8, duree: 6, delai: 8, motif: 14, op: 8 }

type Props = {
  actes: Array<{
    date_administration: string
    dose: number; unite_dose: string; voie: string; duree_jours: number
    motif: string | null
    delai_attente_viande_jours: number | null
    animal: { tag: string | null; nom: string | null } | null
    bande: { code: string | null; nom: string | null } | null
    produit: { nom: string; type: string } | null
    operateur_user_id: string | null
  }>
  ferme: { nom: string }
  periode: { from: string; to: string }
}

export function MirahDocument({ actes, ferme, periode }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.header}>REGISTRE DE TRAITEMENTS SANITAIRES — MIRAH-CI</Text>
        <Text style={styles.subheader}>
          Ferme : {ferme.nom} · Période : {periode.from} → {periode.to} · Imprimé le {today}
        </Text>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.cellHead, { width: `${W.date}%` }]}>Date</Text>
            <Text style={[styles.cellHead, { width: `${W.cible}%` }]}>Animal/Bande</Text>
            <Text style={[styles.cellHead, { width: `${W.produit}%` }]}>Produit</Text>
            <Text style={[styles.cellHead, { width: `${W.type}%` }]}>Type</Text>
            <Text style={[styles.cellHead, { width: `${W.voie}%` }]}>Voie</Text>
            <Text style={[styles.cellHead, { width: `${W.dose}%` }]}>Dose</Text>
            <Text style={[styles.cellHead, { width: `${W.unite}%` }]}>Unité</Text>
            <Text style={[styles.cellHead, { width: `${W.duree}%` }]}>Durée (j)</Text>
            <Text style={[styles.cellHead, { width: `${W.delai}%` }]}>Délai viande (j)</Text>
            <Text style={[styles.cellHead, { width: `${W.motif}%` }]}>Motif</Text>
            <Text style={[styles.cellHead, { width: `${W.op}%` }]}>Opérateur</Text>
          </View>
          {actes.map((a, i) => {
            const cible = a.animal?.tag ?? a.bande?.code ?? '—'
            return (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: `${W.date}%` }]}>{a.date_administration}</Text>
                <Text style={[styles.cell, { width: `${W.cible}%` }]}>{cible}</Text>
                <Text style={[styles.cell, { width: `${W.produit}%` }]}>{a.produit?.nom ?? '—'}</Text>
                <Text style={[styles.cell, { width: `${W.type}%` }]}>{a.produit?.type ?? '—'}</Text>
                <Text style={[styles.cell, { width: `${W.voie}%` }]}>{a.voie}</Text>
                <Text style={[styles.cell, { width: `${W.dose}%` }]}>{String(a.dose)}</Text>
                <Text style={[styles.cell, { width: `${W.unite}%` }]}>{a.unite_dose}</Text>
                <Text style={[styles.cell, { width: `${W.duree}%` }]}>{String(a.duree_jours)}</Text>
                <Text style={[styles.cell, { width: `${W.delai}%` }]}>{a.delai_attente_viande_jours != null ? String(a.delai_attente_viande_jours) : '—'}</Text>
                <Text style={[styles.cell, { width: `${W.motif}%` }]}>{a.motif ?? '—'}</Text>
                <Text style={[styles.cell, { width: `${W.op}%` }]}>{a.operateur_user_id?.slice(0, 8) ?? '—'}</Text>
              </View>
            )
          })}
        </View>

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Document de traçabilité conforme à la réglementation vétérinaire ivoirienne — page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  )
}
```

### Fix #3 — `route.ts` (Route Handler GET)

```ts
import { NextRequest } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { MirahDocument } from '../_pdf-mirah'
import { serializeActesCsv } from '../_csv-mirah'

export const runtime = 'nodejs' // @react-pdf/renderer nécessite Node, pas Edge

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const format = sp.get('format') === 'csv' ? 'csv' : 'pdf'
  const from = sp.get('from') || '2024-01-01'
  const to = sp.get('to') || new Date().toISOString().slice(0, 10)

  const sb = await createClient()
  const fermeId = await getFermeId()

  // Fetch ferme
  const { data: ferme } = await sb.from('fermes').select('nom').eq('id', fermeId).maybeSingle()
  const fermeNom = (ferme as { nom?: string } | null)?.nom ?? 'Ferme'

  // Fetch actes (RLS auto par ferme)
  const { data: actes, error } = await sb
    .from('actes_sanitaires')
    .select(`
      date_administration, dose, unite_dose, voie, duree_jours, motif,
      delai_attente_viande_jours, operateur_user_id,
      animal:animal_id(tag, nom),
      bande:bande_id(code, nom),
      produit:produit_id(nom, type)
    `)
    .gte('date_administration', from)
    .lte('date_administration', to)
    .order('date_administration', { ascending: true })

  if (error) {
    return new Response(`Erreur fetch : ${error.message}`, { status: 500 })
  }

  const actesArr = (actes ?? []) as unknown as Parameters<typeof MirahDocument>[0]['actes']
  const filename = `mirah-${fermeNom.replace(/\s+/g, '-')}-${from}_${to}.${format}`

  if (format === 'csv') {
    const csv = serializeActesCsv(actesArr as Parameters<typeof serializeActesCsv>[0])
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  }

  const stream = await renderToStream(
    <MirahDocument actes={actesArr} ferme={{ nom: fermeNom }} periode={{ from, to }} />,
  )
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
```

⚠️ Si `renderToStream` n'est pas typé compatible `ReadableStream`, utilise un wrapper `Readable.toWeb()` Node ou pass directement le NodeJS stream à `new Response()` (Next supporte les 2). Tester via grep si déjà usage projet.

⚠️ Lire le brief CAVEMAN avant de coder. Si une colonne ne matche pas (`fermes.nom` peut être `fermes.name` selon migration), GREP avant.

## VÉRIFICATIONS OBLIGATOIRES
1. `ls app/src/app/\(app\)/sanitaire/actes/export/route.ts app/src/app/\(app\)/sanitaire/actes/_pdf-mirah.tsx app/src/app/\(app\)/sanitaire/actes/_csv-mirah.ts` → 3 fichiers
2. `grep -c "@react-pdf/renderer" app/src/app/\(app\)/sanitaire/actes/_pdf-mirah.tsx` → 1
3. `grep "export const runtime" app/src/app/\(app\)/sanitaire/actes/export/route.ts` → présent (Node, pas Edge)
4. `grep "\\\\uFEFF" app/src/app/\(app\)/sanitaire/actes/_csv-mirah.ts` → présent (BOM Excel FR)
5. `wc -l` sur les 3 nouveaux → route < 100, pdf < 200, csv < 80

## LIVRABLE
1 fichier : `agents/sprint-vague-4-2026-05-28/rapports/RAPPORT_L1.md` (≤100 lignes)

Format télégraphique. TODO orchestrateur = ajout bouton "Exporter MIRAH" dans `sanitaire/actes/page.tsx` (lien vers `/sanitaire/actes/export?format=pdf` + `?format=csv`).

## INTERDITS
- ❌ Modifier `page.tsx`/`_dialog-acte.tsx`/`_schemas.ts`/`_server-actions.ts`
- ❌ Ajouter dépendance npm (`@react-pdf/renderer` déjà là, suffit)
- ❌ Inventer colonnes : si doute sur structure `fermes` ou `actes_sanitaires` → GREP migrations existantes
- ❌ Rapport > 100 lignes

Go.
