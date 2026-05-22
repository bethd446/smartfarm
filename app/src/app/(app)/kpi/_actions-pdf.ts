'use server'

import { createClient } from '@/lib/supabase/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import path from 'path'

const execAsync = promisify(exec)

/**
 * Génère un PDF KPI mensuel via weasyprint (déjà installé /usr/local/bin/weasyprint).
 * Retourne base64 + filename pour download client-side.
 */
export async function exportKpiPDF(): Promise<{ filename: string; base64: string }> {
  const sb = await createClient()

  const { data: kpi } = await sb
    .from('v_kpi_techniques_ferme')
    .select('*')
    .maybeSingle()

  const { data: alertes } = await sb
    .from('v_alertes_actives')
    .select('regle_id, cible_label, gravite, titre')
    .limit(30)

  const now = new Date()
  const dateFR = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const moisAnnee = now.toISOString().slice(0, 7)

  const fmt = (v: number | null | undefined, dec = 1, suffix = '') =>
    v === null || v === undefined || isNaN(Number(v)) ? '—' : `${Number(v).toFixed(dec)}${suffix}`

  const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>KPI Smart Farm — ${moisAnnee}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Helvetica', sans-serif; color: #1a1a1a; font-size: 12px; line-height: 1.4; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #2D4A1F; padding-bottom: 8px; margin-bottom: 16px; }
  .header h1 { color: #2D4A1F; font-size: 24px; margin: 0; letter-spacing: 0.02em; }
  .header .meta { font-size: 11px; color: #5C5346; text-align: right; }
  h2 { color: #2D4A1F; font-size: 15px; margin: 20px 0 8px; border-bottom: 1px solid #E5DDD0; padding-bottom: 4px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0; }
  .kpi { background: #FAF7F0; padding: 10px 12px; border-radius: 6px; border-left: 3px solid #2D4A1F; }
  .kpi-label { font-size: 10px; color: #5C5346; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi-value { font-size: 18px; font-weight: bold; color: #2D4A1F; margin-top: 2px; }
  .kpi-target { font-size: 9px; color: #8A7E6E; margin-top: 2px; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 11px; }
  th { background: #FAF7F0; text-align: left; padding: 6px 8px; border: 1px solid #E5DDD0; color: #5C5346; font-weight: 600; text-transform: uppercase; font-size: 10px; }
  td { padding: 5px 8px; border: 1px solid #EFE7D6; }
  tr:nth-child(even) td { background: #FBF9F4; }
  .gravite-critique { background: #FEE2E2; color: #991B1B; font-weight: bold; }
  .gravite-élevée { background: #FED7AA; color: #9A3412; }
  .gravite-moyenne { background: #FEF3C7; color: #92400E; }
  .footer { position: fixed; bottom: 12mm; left: 18mm; right: 18mm; font-size: 9px; color: #8A7E6E; border-top: 1px solid #E5DDD0; padding-top: 4px; display: flex; justify-content: space-between; }
</style></head>
<body>
  <div class="header">
    <div>
      <h1>🐷 SMART FARM</h1>
      <div style="color:#5C5346;font-size:13px;margin-top:2px">Rapport KPI mensuel</div>
    </div>
    <div class="meta">
      <strong>${dateFR}</strong><br/>
      Yamoussoukro · Côte d'Ivoire
    </div>
  </div>

  <h2>📊 Performance reproduction</h2>
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-label">Truies actives</div>
      <div class="kpi-value">${kpi?.truies_actives ?? 0}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Nés vivants/portée</div>
      <div class="kpi-value">${fmt(kpi?.nes_vivants_par_portee_moyen)}</div>
      <div class="kpi-target">cible IFIP ≥ 12</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Sevrés/portée</div>
      <div class="kpi-value">${fmt(kpi?.sevres_par_portee_moyen)}</div>
      <div class="kpi-target">cible IFIP ≥ 11</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">ISSF moyen</div>
      <div class="kpi-value">${fmt(kpi?.issf_moyen, 1, ' j')}</div>
      <div class="kpi-target">cible 5-7 j</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">TMM (mortinatalité)</div>
      <div class="kpi-value">${fmt(kpi?.tmm_moyen_pct, 2, ' %')}</div>
      <div class="kpi-target">cible IFIP ≤ 8%</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Productivité num.</div>
      <div class="kpi-value">${fmt(kpi?.productivite_moyenne)}</div>
      <div class="kpi-target">porcelets/truie/an</div>
    </div>
  </div>

  <h2>🚨 Alertes actives (${alertes?.length ?? 0})</h2>
  ${(alertes ?? []).length === 0 ? '<p style="color:#5C5346;font-style:italic">Aucune alerte active — tout va bien 🎉</p>' : `
  <table>
    <thead><tr>
      <th style="width:90px">Code</th>
      <th style="width:80px">Cible</th>
      <th style="width:80px">Gravité</th>
      <th>Description</th>
    </tr></thead>
    <tbody>
      ${(alertes ?? []).map((a: any) => `
        <tr>
          <td><code style="font-family:monospace;font-size:10px">${a.regle_id}</code></td>
          <td>${a.cible_label ?? '—'}</td>
          <td class="gravite-${a.gravite}">${a.gravite}</td>
          <td>${a.titre}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>`}

  <div class="footer">
    <span>Smart Farm — Système de gestion d'élevage porcin</span>
    <span>Généré le ${dateFR}</span>
  </div>
</body></html>`

  const tmpHtml = path.join(tmpdir(), `sf-kpi-${randomUUID()}.html`)
  const tmpPdf = tmpHtml.replace('.html', '.pdf')

  await writeFile(tmpHtml, html, 'utf8')

  try {
    await execAsync(`weasyprint "${tmpHtml}" "${tmpPdf}"`)
    const buf = await readFile(tmpPdf)
    return {
      filename: `smartfarm-kpi-${moisAnnee}.pdf`,
      base64: buf.toString('base64'),
    }
  } finally {
    try { await unlink(tmpHtml) } catch {}
    try { await unlink(tmpPdf) } catch {}
  }
}
