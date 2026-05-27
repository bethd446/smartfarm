/**
 * GET /api/calendrier/ical
 * ─────────────────────────────────────────────────────────────
 * Export iCalendar (RFC 5545) des événements physiologiques
 * prévisionnels de la ferme courante.
 *
 * - Auth obligatoire (RLS isole les rows par ferme via session cookie)
 * - Cycles projetés sur 30 jours (cf. lib/calendrier-helpers.ts)
 * - Pas de dépendance externe (génération manuelle template string)
 * - Content-Type: text/calendar; charset=utf-8
 * - Content-Disposition: attachment; filename="smartfarm-calendrier.ics"
 */

import { createClient } from '@/lib/supabase/server'
import {
  projeterTous,
  bucketize,
  genererIcal,
  type SaillieRow,
  type MiseBasRow,
  type SevrageRow,
  type DiagnosticGestationRow,
} from '@/lib/calendrier-helpers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const sb = await createClient()

  // 1) Auth check
  const {
    data: { user },
    error: errUser,
  } = await sb.auth.getUser()
  if (errUser || !user) {
    return new Response('Non authentifié', { status: 401 })
  }

  // 2) Charge sources (RLS isole par ferme)
  const [{ data: saillesRaw }, { data: mbRaw }, { data: sevRaw }, { data: diagsRaw }] =
    await Promise.all([
      sb
        .from('saillies')
        .select('id, truie_id, verrat_id, date_saillie, truie:truie_id(tag,nom)')
        .order('date_saillie', { ascending: false }),
      sb
        .from('mises_bas')
        .select('id, truie_id, saillie_id, date_mise_bas, truie:truie_id(tag,nom)')
        .order('date_mise_bas', { ascending: false }),
      sb
        .from('sevrages')
        .select('id, mb_id, truie_id, date_sevrage, truie:truie_id(tag,nom)')
        .order('date_sevrage', { ascending: false }),
      sb.from('diagnostics_gestation').select('saillie_id, resultat, date_diag'),
    ])

  const saillies = (saillesRaw ?? []) as unknown as SaillieRow[]
  const mb = (mbRaw ?? []) as unknown as MiseBasRow[]
  const sev = (sevRaw ?? []) as unknown as SevrageRow[]
  const diags = (diagsRaw ?? []) as unknown as DiagnosticGestationRow[]

  // 3) Projection + filtre 30j
  const now = new Date()
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  )
  const tous = projeterTous(saillies, mb, sev, today, { diagnostics: diags })
  const buckets = bucketize(tous)
  const fenetre = [
    ...buckets.enRetard,
    ...buckets.cetteSemaine,
    ...buckets.ces14Jours,
    ...buckets.apresJ14,
  ]

  // 4) Nom de ferme (best-effort, fallback "Smart Farm")
  let fermeNom = 'Smart Farm'
  try {
    const { data: fermeIdData } = await sb.rpc('current_farm_id')
    if (fermeIdData) {
      const { data: ferme } = await sb
        .from('fermes')
        .select('nom')
        .eq('id', fermeIdData as string)
        .maybeSingle()
      if (ferme?.nom) fermeNom = ferme.nom as string
    }
  } catch {
    // silencieux : si on ne récupère pas le nom, on garde le fallback
  }

  // 5) Génération iCal
  const ics = genererIcal(fenetre, { fermeNom, now })

  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="smartfarm-calendrier.ics"',
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}
