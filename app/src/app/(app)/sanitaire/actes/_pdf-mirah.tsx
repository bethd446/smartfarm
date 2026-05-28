/**
 * B4 — Composant PDF registre MIRAH-CI (A4 paysage, monospace).
 *
 * Document de traçabilité véto neutre (pas de branding Smart Farm).
 * Conforme au registre obligatoire MIRAH-CI tenu par chaque éleveur.
 *
 * Rendu côté serveur via renderToStream (cf route.ts).
 */

import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 28, fontFamily: 'Courier', fontSize: 8 },
  header: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
  subheader: { fontSize: 9, textAlign: 'center', marginBottom: 10, color: '#444' },
  table: { width: '100%', borderTop: 1, borderLeft: 1, borderColor: '#000' },
  row: {
    flexDirection: 'row',
    borderBottom: 1,
    borderColor: '#000',
    minHeight: 18,
  },
  cellHead: {
    padding: 3,
    borderRight: 1,
    borderColor: '#000',
    fontWeight: 'bold',
    backgroundColor: '#eeeeee',
  },
  cell: { padding: 3, borderRight: 1, borderColor: '#000' },
  footer: {
    position: 'absolute',
    bottom: 12,
    left: 28,
    right: 28,
    fontSize: 7,
    textAlign: 'center',
    color: '#666',
  },
})

// Largeurs colonnes (% — total 100)
const W = {
  date: 8,
  cible: 14,
  produit: 14,
  type: 8,
  voie: 6,
  dose: 6,
  unite: 8,
  duree: 6,
  delai: 8,
  motif: 14,
  op: 8,
}

export type MirahActe = {
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

type Props = {
  actes: MirahActe[]
  ferme: { nom: string }
  periode: { from: string; to: string }
}

export function MirahDocument({ actes, ferme, periode }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.header}>
          REGISTRE DE TRAITEMENTS SANITAIRES — MIRAH-CI
        </Text>
        <Text style={styles.subheader}>
          Ferme : {ferme.nom} · Période : {periode.from} → {periode.to} ·
          Imprimé le {today}
        </Text>

        <View style={styles.table}>
          <View style={styles.row} fixed>
            <Text style={[styles.cellHead, { width: `${W.date}%` }]}>Date</Text>
            <Text style={[styles.cellHead, { width: `${W.cible}%` }]}>
              Animal/Bande
            </Text>
            <Text style={[styles.cellHead, { width: `${W.produit}%` }]}>
              Produit
            </Text>
            <Text style={[styles.cellHead, { width: `${W.type}%` }]}>Type</Text>
            <Text style={[styles.cellHead, { width: `${W.voie}%` }]}>Voie</Text>
            <Text style={[styles.cellHead, { width: `${W.dose}%` }]}>Dose</Text>
            <Text style={[styles.cellHead, { width: `${W.unite}%` }]}>Unité</Text>
            <Text style={[styles.cellHead, { width: `${W.duree}%` }]}>
              Durée (j)
            </Text>
            <Text style={[styles.cellHead, { width: `${W.delai}%` }]}>
              Délai viande (j)
            </Text>
            <Text style={[styles.cellHead, { width: `${W.motif}%` }]}>Motif</Text>
            <Text style={[styles.cellHead, { width: `${W.op}%` }]}>
              Opérateur
            </Text>
          </View>
          {actes.map((a, i) => {
            const cibleId = a.animal?.tag ?? a.bande?.code ?? '—'
            return (
              <View key={i} style={styles.row} wrap={false}>
                <Text style={[styles.cell, { width: `${W.date}%` }]}>
                  {a.date_administration}
                </Text>
                <Text style={[styles.cell, { width: `${W.cible}%` }]}>
                  {cibleId}
                </Text>
                <Text style={[styles.cell, { width: `${W.produit}%` }]}>
                  {a.produit?.nom ?? '—'}
                </Text>
                <Text style={[styles.cell, { width: `${W.type}%` }]}>
                  {a.produit?.type ?? '—'}
                </Text>
                <Text style={[styles.cell, { width: `${W.voie}%` }]}>
                  {a.voie}
                </Text>
                <Text style={[styles.cell, { width: `${W.dose}%` }]}>
                  {String(a.dose)}
                </Text>
                <Text style={[styles.cell, { width: `${W.unite}%` }]}>
                  {a.unite_dose}
                </Text>
                <Text style={[styles.cell, { width: `${W.duree}%` }]}>
                  {String(a.duree_jours)}
                </Text>
                <Text style={[styles.cell, { width: `${W.delai}%` }]}>
                  {a.delai_attente_viande_jours != null
                    ? String(a.delai_attente_viande_jours)
                    : '—'}
                </Text>
                <Text style={[styles.cell, { width: `${W.motif}%` }]}>
                  {a.motif ?? '—'}
                </Text>
                <Text style={[styles.cell, { width: `${W.op}%` }]}>
                  {a.operateur_user_id?.slice(0, 8) ?? '—'}
                </Text>
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
