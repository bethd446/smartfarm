/**
 * Sprint 3.D — Template React-PDF pour rapport mensuel
 * Design Terrain Vivant : sahel-700 #2D4A1F, or-600 #A16207, Big Shoulders Display
 */

import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'
import type { RapportMensuelData } from './_helpers'

// ===== STYLES =====

const COLORS = {
  primary: '#2D4A1F', // sahel-700
  accent: '#A16207', // or-600
  terre: '#9A3412', // latérite-700
  ink: '#1C1917', // terre-900
  inkSecondary: '#57534E',
  muted: '#78716C',
  surface: '#FFFBEB', // mil-50
  line: '#E7E5E4',
  danger: '#7A2A1F',
  warning: '#92400E',
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 60,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: COLORS.ink,
    backgroundColor: '#FFFFFF',
  },
  // Header (répété sur toutes les pages)
  header: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
    paddingBottom: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 11,
    color: COLORS.inkSecondary,
    marginTop: 2,
  },
  headerMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    fontSize: 9,
    color: COLORS.muted,
  },
  // Sections
  section: {
    marginTop: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  // KPI cards (grille 2x2)
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    padding: 10,
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  kpiLabel: {
    fontSize: 8,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.primary,
  },
  kpiDelta: {
    fontSize: 8,
    color: COLORS.inkSecondary,
    marginTop: 2,
  },
  // Tables
  table: {
    width: '100%',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: COLORS.line,
    marginTop: 6,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: COLORS.line,
  },
  tableCell: {
    padding: 5,
    borderRightWidth: 0.5,
    borderColor: COLORS.line,
    fontSize: 9,
  },
  tableCellHeader: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: COLORS.inkSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  emptyText: {
    fontStyle: 'italic',
    color: COLORS.muted,
    fontSize: 9,
    paddingVertical: 8,
  },
  // Footer (répété)
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    fontSize: 8,
    color: COLORS.muted,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: COLORS.line,
    paddingTop: 5,
  },
  // Alertes badges
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertBadgeCritique: {
    backgroundColor: '#FEE2E2',
    color: '#7F1D1D',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginRight: 6,
  },
  alertBadgeElevee: {
    backgroundColor: '#FED7AA',
    color: COLORS.terre,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginRight: 6,
  },
  alertBadgeMoyenne: {
    backgroundColor: '#FEF3C7',
    color: COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 3,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    marginRight: 6,
  },
  alertText: {
    fontSize: 9,
    color: COLORS.ink,
    flex: 1,
  },
})

// ===== HELPERS =====

function fmt(n: number | null | undefined, decimals = 1, suffix = ''): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return `${n.toFixed(decimals)}${suffix}`
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}

// ===== COMPONENTS =====

function TableComponent({ headers, rows }: { headers: Array<{ text: string; width: string }>; rows: string[][] }) {
  if (rows.length === 0) {
    return <Text style={styles.emptyText}>Aucune donnée pour la période.</Text>
  }

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        {headers.map((h, i) => (
          <Text key={i} style={[styles.tableCell, styles.tableCellHeader, { width: h.width }]}>
            {h.text}
          </Text>
        ))}
      </View>
      {rows.map((row, i) => (
        <View key={i} style={styles.tableRow}>
          {row.map((cell, j) => (
            <Text key={j} style={[styles.tableCell, { width: headers[j].width }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

// ===== DOCUMENT =====

export function buildRapportMensuelDocument(data: RapportMensuelData) {
  const { ferme, periode, kpiSynthese, reproduction, bandes, topTruies, alertes, metaGeneration } = data

  const fermeNom = ferme?.nom ?? 'Ferme inconnue'
  const fermeLoc = ferme?.localisation ?? ''
  const moisAnnee = `${periode.mois.split('-')[1]}/${periode.annee}`
  const dateGeneration = fmtDate(metaGeneration.date)

  return (
    <Document>
      {/* ===== PAGE 1 : En-tête + KPIs synthèse ===== */}
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>🐷 Smart Farm — Rapport Mensuel</Text>
          <Text style={styles.headerSubtitle}>{fermeNom}</Text>
          <View style={styles.headerMeta}>
            <Text>
              {fermeLoc && `${fermeLoc} · `}Côte d'Ivoire
            </Text>
            <Text>Période : {moisAnnee}</Text>
          </View>
        </View>

        {/* Section Cheptel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Cheptel reproducteur</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Truies actives</Text>
              <Text style={styles.kpiValue}>{kpiSynthese.cheptel.truies}</Text>
              {kpiSynthese.effectifPrecedent.delta !== null && (
                <Text style={styles.kpiDelta}>
                  {kpiSynthese.effectifPrecedent.delta >= 0 ? '+' : ''}
                  {kpiSynthese.effectifPrecedent.delta} vs mois précédent
                </Text>
              )}
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Verrats</Text>
              <Text style={styles.kpiValue}>{kpiSynthese.cheptel.verrats}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Gestantes</Text>
              <Text style={styles.kpiValue}>{kpiSynthese.cheptel.gestantes}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Allaitantes</Text>
              <Text style={styles.kpiValue}>{kpiSynthese.cheptel.allaitantes}</Text>
            </View>
          </View>
        </View>

        {/* Section Productivité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Productivité</Text>
          <View style={styles.kpiGrid}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Portée moyenne 12 mois</Text>
              <Text style={styles.kpiValue}>{fmt(kpiSynthese.productivite.portee_moyenne_12m, 1)} porcelets</Text>
              <Text style={styles.kpiDelta}>Nés vivants/portée</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Indice de Consommation</Text>
              <Text style={styles.kpiValue}>{fmt(kpiSynthese.productivite.ic_ferme, 2)}</Text>
              <Text style={styles.kpiDelta}>Cible : 2.6 - 2.8</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Smart Farm · {metaGeneration.version}</Text>
          <Text
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
            fixed
          />
        </View>
      </Page>

      {/* ===== PAGE 2 : Activité reproduction ===== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>🐷 Smart Farm — Rapport Mensuel</Text>
          <Text style={styles.headerSubtitle}>{fermeNom}</Text>
          <View style={styles.headerMeta}>
            <Text>
              {fermeLoc && `${fermeLoc} · `}Côte d'Ivoire
            </Text>
            <Text>Période : {moisAnnee}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Activité reproduction</Text>

          {/* Saillies */}
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 4 }}>
            Saillies du mois : {reproduction.saillies.total}
          </Text>
          {reproduction.saillies.topTruies.length > 0 ? (
            <TableComponent
              headers={[
                { text: 'Tag truie', width: '30%' },
                { text: 'Nom', width: '40%' },
                { text: 'Nb saillies', width: '30%' },
              ]}
              rows={reproduction.saillies.topTruies.map((t) => [t.tag, t.nom ?? '—', String(t.count)])}
            />
          ) : (
            <Text style={styles.emptyText}>Aucune saillie enregistrée ce mois.</Text>
          )}

          {/* Mises bas */}
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4 }}>
            Mises bas du mois : {reproduction.misesBas.total}
          </Text>
          {reproduction.misesBas.total > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={[styles.kpiCard, { width: '32%' }]}>
                <Text style={styles.kpiLabel}>Moy. nés vivants</Text>
                <Text style={[styles.kpiValue, { fontSize: 16 }]}>{fmt(reproduction.misesBas.moyNesVivants, 1)}</Text>
              </View>
              <View style={[styles.kpiCard, { width: '32%' }]}>
                <Text style={styles.kpiLabel}>Moy. mort-nés</Text>
                <Text style={[styles.kpiValue, { fontSize: 16 }]}>{fmt(reproduction.misesBas.moyMortsNes, 1)}</Text>
              </View>
              <View style={[styles.kpiCard, { width: '32%' }]}>
                <Text style={styles.kpiLabel}>Ratio viabilité</Text>
                <Text style={[styles.kpiValue, { fontSize: 16 }]}>{fmt(reproduction.misesBas.ratioViabilite, 1, '%')}</Text>
              </View>
            </View>
          )}

          {/* Sevrages */}
          <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4 }}>
            Sevrages du mois : {reproduction.sevrages.total}
          </Text>
          {reproduction.sevrages.total > 0 && (
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <View style={[styles.kpiCard, { width: '48%' }]}>
                <Text style={styles.kpiLabel}>Poids moyen portée</Text>
                <Text style={[styles.kpiValue, { fontSize: 16 }]}>{fmt(reproduction.sevrages.moyPoidsKg, 1, ' kg')}</Text>
              </View>
              <View style={[styles.kpiCard, { width: '48%' }]}>
                <Text style={styles.kpiLabel}>Taux de survie</Text>
                <Text style={[styles.kpiValue, { fontSize: 16 }]}>{fmt(reproduction.sevrages.tauxSurvie, 1, '%')}</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>Smart Farm · {metaGeneration.version}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} fixed />
        </View>
      </Page>

      {/* ===== PAGE 3 : Performance bandes ===== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>🐷 Smart Farm — Rapport Mensuel</Text>
          <Text style={styles.headerSubtitle}>{fermeNom}</Text>
          <View style={styles.headerMeta}>
            <Text>
              {fermeLoc && `${fermeLoc} · `}Côte d'Ivoire
            </Text>
            <Text>Période : {moisAnnee}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Performance des bandes</Text>
          <TableComponent
            headers={[
              { text: 'Bande', width: '25%' },
              { text: 'Effectif', width: '15%' },
              { text: 'GMQ (g/j)', width: '20%' },
              { text: 'IC', width: '15%' },
              { text: 'Mortalité', width: '25%' },
            ]}
            rows={bandes.map((b) => [
              b.bande_nom,
              String(b.effectif),
              fmt(b.gmq_moyen, 0),
              fmt(b.ic, 2),
              fmt(b.mortalite, 1, '%'),
            ])}
          />

          {bandes.length >= 3 && (
            <>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4 }}>
                Top 3 bandes (GMQ)
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {bandes.slice(0, 3).map((b, i) => (
                  <View key={i} style={[styles.kpiCard, { width: '32%' }]}>
                    <Text style={styles.kpiLabel}>#{i + 1} {b.bande_nom}</Text>
                    <Text style={[styles.kpiValue, { fontSize: 14 }]}>{fmt(b.gmq_moyen, 0)} g/j</Text>
                    <Text style={styles.kpiDelta}>IC : {fmt(b.ic, 2)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {bandes.length >= 6 && (
            <>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 12, marginBottom: 4, color: COLORS.danger }}>
                À surveiller (GMQ faible)
              </Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {bandes.slice(-3).reverse().map((b, i) => (
                  <View key={i} style={[styles.kpiCard, { width: '32%', borderLeftColor: COLORS.danger }]}>
                    <Text style={styles.kpiLabel}>{b.bande_nom}</Text>
                    <Text style={[styles.kpiValue, { fontSize: 14, color: COLORS.danger }]}>{fmt(b.gmq_moyen, 0)} g/j</Text>
                    <Text style={styles.kpiDelta}>Mortalité : {fmt(b.mortalite, 1, '%')}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>Smart Farm · {metaGeneration.version}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} fixed />
        </View>
      </Page>

      {/* ===== PAGE 4 : Top truies + Alertes ===== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>🐷 Smart Farm — Rapport Mensuel</Text>
          <Text style={styles.headerSubtitle}>{fermeNom}</Text>
          <View style={styles.headerMeta}>
            <Text>
              {fermeLoc && `${fermeLoc} · `}Côte d'Ivoire
            </Text>
            <Text>Période : {moisAnnee}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Top truies</Text>
          {topTruies.length > 0 ? (
            <TableComponent
              headers={[
                { text: 'Tag', width: '20%' },
                { text: 'Nom', width: '25%' },
                { text: 'Score', width: '15%' },
                { text: 'Portées', width: '15%' },
                { text: 'Moy/portée', width: '25%' },
              ]}
              rows={topTruies.map((t) => [
                t.tag,
                t.nom ?? '—',
                fmt(t.score_global, 1),
                String(t.nb_portees),
                fmt(t.portee_moyenne, 1),
              ])}
            />
          ) : (
            <Text style={styles.emptyText}>Aucune truie évaluée.</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Alertes du mois</Text>
          {alertes.length === 0 && <Text style={styles.emptyText}>Aucune alerte détectée — tout va bien ! 🎉</Text>}
          {alertes.map((a, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <View style={styles.alertBadge}>
                <Text
                  style={
                    a.severite === 'critique'
                      ? styles.alertBadgeCritique
                      : a.severite === 'élevée'
                      ? styles.alertBadgeElevee
                      : styles.alertBadgeMoyenne
                  }
                >
                  {a.severite.toUpperCase()}
                </Text>
                <Text style={styles.alertText}>
                  {a.count} alerte{a.count > 1 ? 's' : ''}
                </Text>
              </View>
              {a.exemples.slice(0, 2).map((ex, j) => (
                <Text key={j} style={{ fontSize: 8, color: COLORS.muted, marginLeft: 12, marginTop: 2 }}>
                  · {ex.cible} : {ex.titre}
                </Text>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Smart Farm · {metaGeneration.version}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} fixed />
        </View>
      </Page>

      {/* ===== PAGE 5 : Footer / Signature ===== */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>🐷 Smart Farm — Rapport Mensuel</Text>
          <Text style={styles.headerSubtitle}>{fermeNom}</Text>
          <View style={styles.headerMeta}>
            <Text>
              {fermeLoc && `${fermeLoc} · `}Côte d'Ivoire
            </Text>
            <Text>Période : {moisAnnee}</Text>
          </View>
        </View>

        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: COLORS.primary, marginBottom: 8 }}>
            Rapport généré automatiquement
          </Text>
          <Text style={{ fontSize: 10, color: COLORS.muted, marginBottom: 4 }}>
            Date de génération : {dateGeneration}
          </Text>
          <Text style={{ fontSize: 10, color: COLORS.muted, marginBottom: 20 }}>
            Version système : {metaGeneration.version}
          </Text>

          <View style={{ borderTopWidth: 1, borderColor: COLORS.line, paddingTop: 20, width: '70%' }}>
            <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.ink, textAlign: 'center', marginBottom: 8 }}>
              Association pour la Recherche et la Technologie en Côte d'Ivoire
            </Text>
            <Text style={{ fontSize: 9, color: COLORS.muted, textAlign: 'center', marginBottom: 2 }}>
              ARTCI — Programme Élevage Porcin
            </Text>
            <Text style={{ fontSize: 9, color: COLORS.muted, textAlign: 'center' }}>
              Yamoussoukro · République de Côte d'Ivoire
            </Text>
          </View>

          <Text style={{ fontSize: 8, color: COLORS.muted, marginTop: 30, textAlign: 'center', width: '80%' }}>
            Ce rapport est confidentiel et destiné exclusivement à l'usage interne de l'élevage.
            {'\n'}Toute reproduction, diffusion ou utilisation sans autorisation est interdite.
          </Text>
        </View>

        <View style={styles.footer} fixed>
          <Text>Smart Farm · {metaGeneration.version}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} fixed />
        </View>
      </Page>
    </Document>
  )
}
