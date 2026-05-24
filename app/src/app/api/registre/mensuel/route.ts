/**
 * Sprint 3.D — GET /api/registre/mensuel
 * Génère un PDF A4 mensuel (KPIs, reproduction, bandes, top truies, alertes)
 * Auth via user_farms, design Terrain Vivant en print
 */

import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { fetchRapportMensuelData, validateUserFermeAccess } from './_helpers'
import { buildRapportMensuelDocument } from './_template'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/registre/mensuel?ferme_id=<uuid>&mois=YYYY-MM
 * 
 * Query params:
 * - ferme_id: UUID de la ferme (requis)
 * - mois: format YYYY-MM (requis)
 * 
 * Returns: PDF téléchargeable
 */
export async function GET(req: Request) {
  try {
    // Parse query params
    const url = new URL(req.url)
    const ferme_id = url.searchParams.get('ferme_id')
    const mois = url.searchParams.get('mois')

    // Validation des paramètres
    if (!ferme_id) {
      return NextResponse.json(
        { error: 'Paramètre ferme_id requis' },
        { status: 400 }
      )
    }

    if (!mois) {
      return NextResponse.json(
        { error: 'Paramètre mois requis (format YYYY-MM)' },
        { status: 400 }
      )
    }

    // Validation format mois
    const moisRegex = /^\d{4}-\d{2}$/
    if (!moisRegex.test(mois)) {
      return NextResponse.json(
        { error: 'Format mois invalide. Attendu YYYY-MM (ex: 2026-05)' },
        { status: 400 }
      )
    }

    // Auth : vérifier que l'utilisateur a accès à cette ferme via user_farms
    const authCheck = await validateUserFermeAccess(ferme_id)
    if (!authCheck.ok) {
      return NextResponse.json(
        { error: authCheck.error ?? 'Accès non autorisé' },
        { status: 403 }
      )
    }

    // Fetch data
    const data = await fetchRapportMensuelData(ferme_id, mois)

    // Générer PDF via @react-pdf/renderer
    const doc = buildRapportMensuelDocument(data)
    const pdfBuffer = await renderToBuffer(doc)

    // Filename : rapport-<code_ferme>-<mois>.pdf
    const fermeCode = data.ferme?.code ?? 'ferme'
    const filename = `rapport-${fermeCode}-${mois}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('[API /registre/mensuel] Error:', error)

    // Message d'erreur structuré
    const errMsg = error instanceof Error ? error.message : 'Erreur inconnue'

    return NextResponse.json(
      {
        error: 'Erreur lors de la génération du rapport',
        details: errMsg,
      },
      { status: 500 }
    )
  }
}
