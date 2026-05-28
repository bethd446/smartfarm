/**
 * B4 — Route export registre MIRAH-CI.
 * GET /sanitaire/actes/export?format=pdf|csv&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Auth + RLS ferme courante. runtime=nodejs (Edge incompatible @react-pdf).
 */
import type { NextRequest } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { MirahDocument, type MirahActe } from '../_pdf-mirah'
import { serializeActesCsv } from '../_csv-mirah'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const isDate = (s: string | null): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const sanitize = (s: string): string =>
  s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'ferme'

function pick<T>(v: unknown): T | null {
  return (Array.isArray(v) ? v[0] ?? null : v ?? null) as T | null
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const format = sp.get('format') === 'csv' ? 'csv' : 'pdf'
  const today = new Date().toISOString().slice(0, 10)
  const from = isDate(sp.get('from')) ? sp.get('from')! : '2024-01-01'
  const to = isDate(sp.get('to')) ? sp.get('to')! : today

  try {
    const sb = await createClient()
    const fermeId = await getFermeId()

    const { data: fermeRow } = await sb
      .from('fermes').select('nom').eq('id', fermeId).maybeSingle()
    const fermeNom = (fermeRow as { nom?: string } | null)?.nom ?? 'Ferme'

    const { data, error } = await sb
      .from('actes_sanitaires')
      .select(`
        date_administration, dose, unite_dose, voie, duree_jours, motif,
        delai_attente_viande_jours, operateur_user_id,
        animal:animaux ( tag, nom ),
        bande:bandes ( code, nom ),
        produit:veterinaires_standards ( nom, type )
      `)
      .gte('date_administration', from)
      .lte('date_administration', to)
      .order('date_administration', { ascending: true })

    if (error) {
      return new Response(`Erreur fetch actes : ${error.message}`, { status: 500 })
    }

    const actes: MirahActe[] = (data ?? []).map((r: Record<string, unknown>) => ({
      date_administration: r.date_administration as string,
      dose: r.dose as number,
      unite_dose: r.unite_dose as string,
      voie: r.voie as string,
      duree_jours: r.duree_jours as number,
      motif: (r.motif as string | null) ?? null,
      delai_attente_viande_jours:
        (r.delai_attente_viande_jours as number | null) ?? null,
      operateur_user_id: (r.operateur_user_id as string | null) ?? null,
      animal: pick<MirahActe['animal']>(r.animal),
      bande: pick<MirahActe['bande']>(r.bande),
      produit: pick<MirahActe['produit']>(r.produit),
    }))

    const filename = `mirah-${sanitize(fermeNom)}-${from}_${to}.${format}`

    if (format === 'csv') {
      return new Response(serializeActesCsv(actes), {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const stream = await renderToStream(
      <MirahDocument actes={actes} ferme={{ nom: fermeNom }} periode={{ from, to }} />,
    )
    return new Response(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    const status =
      msg === 'Non authentifié' ? 401 : msg === 'Aucune ferme rattachée' ? 403 : 500
    return new Response(msg, { status })
  }
}
