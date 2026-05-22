# Brief PROD-B — UX mobile critique (Sprint D condensé)

## Périmètre
✅ Touche : 5 composants/pages UX terrain mobile
❌ Pas : DB, migrations, sidebar (terminé), alertes-regles

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md`.

## Objectif
**Préparer l'app pour un pilote terrain** sur le smartphone d'un éleveur en CI :
- Saisie 1-tap (mains sales, soleil, animaux qui bougent)
- Snooze alertes pour éviter saturation
- "Marquer fait" présent partout
- Export PDF mensuel
- Composant `<barcode-scanner>` à brancher

## Mission (5 fixes ciblés)

### 1. BCS 1-tap sur fiche `/cheptel/[id]`

Sur la fiche truie, ajouter une mini-card **"Saisie BCS rapide"** avec 5 boutons radio gros (44px+) :

```tsx
// Server Action _actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saisirBcsRapide(formData: FormData) {
  const animal_id = String(formData.get('animal_id') ?? '')
  const bcs = parseFloat(String(formData.get('bcs') ?? '0'))
  if (!animal_id || !bcs || bcs < 1 || bcs > 5) return

  const sb = await createClient()
  // Stocke comme observation BCS dans observations table générique
  // OU créer un INSERT minimal dans une nouvelle ligne saillies/sevrages
  // SIMPLE : on stocke dans audit_logs avec metadata
  await sb.from('audit_logs').insert({
    action: 'bcs_observation',
    entity_type: 'animal',
    entity_id: animal_id,
    metadata: { bcs },
  })
  revalidatePath(`/cheptel/${animal_id}`)
}
```

⚠️ Vérifie le schéma de `audit_logs` avant d'insérer. Si la structure ne convient pas, créer une fiche minimaliste BCS dans une NEW table légère :
```sql
-- Si besoin (migration optionnelle, sinon utilise audit_logs)
CREATE TABLE IF NOT EXISTS observations_bcs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  animal_id uuid REFERENCES animaux(id) ON DELETE CASCADE,
  bcs numeric(2,1) NOT NULL CHECK (bcs BETWEEN 1 AND 5),
  date_observation date DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

UI sur fiche animal :
```tsx
<Card>
  <CardHeader><CardTitle>BCS du jour</CardTitle></CardHeader>
  <CardContent>
    <form action={saisirBcsRapide} className="flex gap-2 flex-wrap">
      <input type="hidden" name="animal_id" value={animal.id} />
      {[1, 2, 2.5, 3, 3.5, 4, 4.5, 5].map(bcs => (
        <Button key={bcs} type="submit" name="bcs" value={bcs}
                variant={bcs === 3 ? 'default' : 'outline'}
                className="min-w-[64px] min-h-[44px]">
          {bcs}
        </Button>
      ))}
    </form>
  </CardContent>
</Card>
```

### 2. Snooze alertes 24h sur `/alertes`

Ajouter localStorage-based snooze (pas de DB) :

```tsx
// Dans alertes-list.tsx (composant client)
'use client'
import { useState, useEffect } from 'react'

const SNOOZE_KEY = 'sf-snoozed-alertes'

function isSnoozed(alerteId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(SNOOZE_KEY)
    if (!raw) return false
    const map = JSON.parse(raw) as Record<string, number>
    const ts = map[alerteId]
    return ts ? Date.now() < ts : false
  } catch { return false }
}

function snoozeAlerte(alerteId: string, hours = 24) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(SNOOZE_KEY) || '{}'
    const map = JSON.parse(raw) as Record<string, number>
    map[alerteId] = Date.now() + hours * 3600_000
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(map))
    // Nettoie les anciens
    const cleaned = Object.fromEntries(
      Object.entries(map).filter(([_, ts]) => ts > Date.now())
    )
    localStorage.setItem(SNOOZE_KEY, JSON.stringify(cleaned))
  } catch {}
}
```

Et dans la liste :
```tsx
const [snoozedRefresh, setSnoozedRefresh] = useState(0)
const visibles = alertes.filter(a => !isSnoozed(a.cible_id + a.regle_id))

// Sur chaque ligne : bouton "Snooze 24h"
<Button onClick={() => { snoozeAlerte(a.cible_id + a.regle_id); setSnoozedRefresh(r => r+1) }}>
  Snooze 24h
</Button>
```

Ajoute aussi un toggle "Afficher snoozed" en haut pour les voir si besoin.

### 3. Bouton "Marquer fait" étendu — calendrier global

Sur `/sanitaire/calendrier`, le bouton "Marquer fait" existe pour les actes porcelets. **Étendre** aux événements `evenements_prevus` (tous types : vermifuges, vaccins truie, transits...).

Au-dessus du tableau actes porcelets, ajouter une section "Tous mes événements à venir" :

```tsx
const { data: aFaire } = await sb
  .from('evenements_prevus')
  .select('*, animal:animal_id(tag), bande:bande_id(code)')
  .eq('statut', 'planifie')
  .gte('date_prevue', new Date(Date.now() - 7*86400000).toISOString().slice(0,10))
  .lte('date_prevue', new Date(Date.now() + 30*86400000).toISOString().slice(0,10))
  .order('date_prevue')
```

```tsx
{aFaire.map(e => (
  <li key={e.id} className="border rounded p-3 flex items-center justify-between">
    <div>
      <Badge variant={e.date_prevue < today ? 'danger' : 'secondary'}>
        {e.date_prevue < today ? `J+${daysOverdue(e.date_prevue)} retard` : 'À venir'}
      </Badge>
      <div>{e.type_evenement.replace(/_/g, ' ')}</div>
      <div className="text-xs">{e.animal?.tag ?? e.bande?.code ?? '—'} · {new Date(e.date_prevue).toLocaleDateString('fr-FR')}</div>
    </div>
    <form action={marquerEvenementFait}>
      <input type="hidden" name="event_id" value={e.id} />
      <Button type="submit" size="sm" className="min-h-[44px]">Marquer fait</Button>
    </form>
  </li>
))}
```

Server action :
```ts
export async function marquerEvenementFait(formData: FormData) {
  const event_id = String(formData.get('event_id') ?? '')
  if (!event_id) return
  const sb = await createClient()
  await sb.from('evenements_prevus')
    .update({ statut: 'realise', date_realisation: new Date().toISOString().slice(0,10) })
    .eq('id', event_id)
  revalidatePath('/sanitaire/calendrier')
  revalidatePath('/dashboard')
}
```

### 4. Export PDF KPI mensuel

Sur `/kpi`, ajouter bouton "Exporter PDF mensuel".

Utiliser **`weasyprint`** côté serveur (déjà installé selon CONTEXT.md sur le VPS) :

```ts
// src/app/(app)/kpi/_actions.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, readFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import path from 'path'

const execAsync = promisify(exec)

export async function exportKpiPDF() {
  const sb = await createClient()
  const { data: kpi } = await sb.from('v_kpi_techniques_ferme').select('*').single()
  const { data: alertes } = await sb.from('v_alertes_actives').select('*').limit(20)

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body{font-family:'Helvetica',sans-serif;padding:30px;color:#1a1a1a}
h1{color:#2D4A1F;font-size:24px}
h2{color:#5C5346;font-size:16px;margin-top:24px;border-bottom:1px solid #ccc;padding-bottom:4px}
table{border-collapse:collapse;width:100%;margin-top:12px}
th{background:#FAF7F0;text-align:left;padding:8px;border:1px solid #ddd}
td{padding:8px;border:1px solid #eee}
.kpi{display:inline-block;background:#FAF7F0;padding:12px 16px;border-radius:8px;margin:4px 8px 4px 0}
.kpi-label{font-size:11px;color:#5C5346;text-transform:uppercase}
.kpi-value{font-size:20px;font-weight:bold;color:#2D4A1F}
</style></head>
<body>
<h1>Smart Farm — Rapport KPI mensuel</h1>
<p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>

<h2>Performance reproduction</h2>
<div class="kpi"><div class="kpi-label">Truies actives</div><div class="kpi-value">${kpi?.truies_actives ?? 0}</div></div>
<div class="kpi"><div class="kpi-label">Nés vivants/portée</div><div class="kpi-value">${kpi?.nes_vivants_par_portee_moyen?.toFixed(1) ?? '—'}</div></div>
<div class="kpi"><div class="kpi-label">Sevrés/portée</div><div class="kpi-value">${kpi?.sevres_par_portee_moyen?.toFixed(1) ?? '—'}</div></div>
<div class="kpi"><div class="kpi-label">ISSF (jours)</div><div class="kpi-value">${kpi?.issf_moyen?.toFixed(1) ?? '—'}</div></div>
<div class="kpi"><div class="kpi-label">TMM (%)</div><div class="kpi-value">${kpi?.tmm_moyen_pct?.toFixed(2) ?? '—'}</div></div>
<div class="kpi"><div class="kpi-label">Productivité num.</div><div class="kpi-value">${kpi?.productivite_moyenne?.toFixed(1) ?? '—'}</div></div>

<h2>Alertes actives (${alertes?.length ?? 0})</h2>
<table>
<tr><th>Règle</th><th>Cible</th><th>Gravité</th><th>Titre</th></tr>
${(alertes ?? []).map(a => `<tr><td>${a.regle_id}</td><td>${a.cible_label}</td><td>${a.gravite}</td><td>${a.titre}</td></tr>`).join('')}
</table>

<p style="margin-top:40px;font-size:10px;color:#5C5346">Smart Farm — Yamoussoukro — Côte d'Ivoire</p>
</body></html>`

  const tmpPath = path.join(tmpdir(), `kpi-${randomUUID()}.html`)
  const pdfPath = tmpPath.replace('.html', '.pdf')

  await writeFile(tmpPath, html)
  try {
    await execAsync(`weasyprint "${tmpPath}" "${pdfPath}"`)
    const pdfBuffer = await readFile(pdfPath)
    return {
      filename: `kpi-smartfarm-${new Date().toISOString().slice(0,7)}.pdf`,
      base64: pdfBuffer.toString('base64'),
    }
  } finally {
    try { await unlink(tmpPath) } catch {}
    try { await unlink(pdfPath) } catch {}
  }
}
```

Côté UI (client component) :
```tsx
'use client'
function BoutonExportPDF() {
  const [loading, setLoading] = useState(false)
  async function handleExport() {
    setLoading(true)
    try {
      const result = await exportKpiPDF()
      const blob = new Blob([Uint8Array.from(atob(result.base64), c => c.charCodeAt(0))], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.filename
      a.click()
      URL.revokeObjectURL(url)
    } finally { setLoading(false) }
  }
  return <Button onClick={handleExport} disabled={loading}>{loading ? 'Génération…' : 'Exporter PDF'}</Button>
}
```

Vérifie que `weasyprint` est installé sur le VPS :
```bash
which weasyprint || echo "à installer : apt install weasyprint -y"
```

### 5. Composant barcode-scanner — brancher sur fiche animal

Le composant `<barcode-scanner>` existe déjà selon CONTEXT.md. Vérifie son interface :
```bash
cat /root/projects/smartfarm/app/src/components/barcode-scanner.tsx | head -30
```

Sur la fiche `/cheptel/[id]`, ajouter une mini-section :
```tsx
<Card>
  <CardHeader><CardTitle>Identification rapide</CardTitle></CardHeader>
  <CardContent>
    <p className="text-xs text-muted">Scanner cette boucle d'oreille pour identifier cet animal lors d'une intervention</p>
    {/* Affiche un QR code statique avec animal.tag — utiliser une lib légère type qrcode.react SI déjà installée, sinon laisser placeholder */}
    <code className="font-mono text-lg block mt-2">{animal.tag}</code>
  </CardContent>
</Card>
```

Si `qrcode.react` n'est pas installé, **laisser un placeholder texte** uniquement (pas d'installation de paquet pour ce sprint).

## Vérif

```bash
# Routes principales fonctionnelles
for r in /cheptel /alertes /sanitaire/calendrier /kpi; do
  echo "$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3000$r")  $r"
done

# TypeScript
export PATH=/root/.hermes/node/bin:$PATH
cd /root/projects/smartfarm/app
npx tsc --noEmit 2>&1 | tail -5
```

## Livrable
1. BCS 1-tap sur fiche cheptel
2. Snooze alertes 24h localStorage
3. Bouton "Marquer fait" pour evenements_prevus sur calendrier
4. Export PDF KPI
5. (optionnel) QR/barcode affiché sur fiche animal
6. Rapport `/root/projects/smartfarm/agents/V2-PROD/RAPPORT_PROD_B.md` ≤ 80 lignes

## Anti-pièges
- Ne casse pas le wrapper `createClient` existant — utilise-le tel quel
- Si weasyprint pas installé, signale-le dans le rapport sans bloquer (l'app reste fonctionnelle, juste sans PDF)
- localStorage uniquement côté client — pas dans Server Component
- Bouton 1-tap = `min-h-[44px]` WCAG 2.5.5
- Pas de modification DB (sauf table observations_bcs si vraiment nécessaire — préfère utiliser table existante)
