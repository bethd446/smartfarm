/**
 * B4 — Sérialiseur CSV registre MIRAH-CI (Ministère Ressources Animales CI).
 *
 * Format :
 *  - séparateur `;` (Excel FR par défaut)
 *  - encodage UTF-8 + BOM (﻿) pour ouverture directe Excel FR sans mojibake
 *  - 1 ligne header + N lignes actes
 *  - escape RFC 4180 si valeur contient `;`, `"`, `\n` ou `\r`
 *
 * Pas d'import depuis page.tsx (ActeRow non exporté) → type local strict.
 */

export type ActeRowMirah = {
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
  'Date',
  'Animal/Bande',
  'Produit',
  'Type',
  'Voie',
  'Dose',
  'Unité',
  'Durée (j)',
  'Délai attente viande (j)',
  'Motif',
  'Opérateur',
]

function csvEscape(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function serializeActesCsv(actes: ActeRowMirah[]): string {
  const BOM = '﻿' // UTF-8 BOM pour Excel FR
  const rows: string[] = [HEADER.map(csvEscape).join(';')]
  for (const a of actes) {
    const cibleId = a.animal?.tag ?? a.bande?.code ?? '—'
    const cibleNom = a.animal?.nom ?? a.bande?.nom ?? null
    const cibleLabel = cibleNom ? `${cibleId} (${cibleNom})` : cibleId
    rows.push(
      [
        a.date_administration,
        cibleLabel,
        a.produit?.nom ?? '—',
        a.produit?.type ?? '—',
        a.voie,
        String(a.dose),
        a.unite_dose,
        String(a.duree_jours),
        a.delai_attente_viande_jours != null
          ? String(a.delai_attente_viande_jours)
          : '—',
        a.motif ?? '',
        a.operateur_user_id ?? '',
      ]
        .map(csvEscape)
        .join(';'),
    )
  }
  return BOM + rows.join('\r\n')
}
