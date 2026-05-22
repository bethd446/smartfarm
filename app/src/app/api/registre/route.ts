import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Document, Page, Text, View, StyleSheet, Font, renderToBuffer } from '@react-pdf/renderer'
import React from 'react'

// R7-P1 V1 : token guard supprimé. Le NEXT_PUBLIC_DEMO_API_TOKEN était exposé au browser
// donc le check timingSafeEqual côté serveur ne protégeait rien. Phase 2 = auth middleware
// applicatif protégera cette route via session cookie.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 60,
    paddingHorizontal: 40,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#1a1a1a',
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#333',
    paddingBottom: 10,
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Times-Bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 2,
    color: '#444',
  },
  meta: {
    fontSize: 9,
    textAlign: 'center',
    color: '#666',
    marginTop: 4,
  },
  section: {
    marginTop: 14,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Times-Bold',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: '#666',
  },
  table: {
    width: '100%',
    borderTopWidth: 0.5,
    borderLeftWidth: 0.5,
    borderColor: '#999',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: '#999',
  },
  tableHeader: {
    backgroundColor: '#eee',
    fontFamily: 'Times-Bold',
  },
  tableCell: {
    padding: 4,
    borderRightWidth: 0.5,
    borderColor: '#999',
    fontSize: 9,
  },
  emptyText: {
    fontStyle: 'italic',
    color: '#777',
    fontSize: 9,
    paddingVertical: 6,
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    right: 40,
    fontSize: 8,
    color: '#666',
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#999',
    paddingTop: 6,
  },
})

type Cell = { text: string; flex: number }

function Row({ cells, header = false }: { cells: Cell[]; header?: boolean }) {
  return React.createElement(
    View,
    { style: [styles.tableRow, header ? styles.tableHeader : {}] },
    cells.map((c, i) =>
      React.createElement(
        Text,
        { key: i, style: [styles.tableCell, { flex: c.flex }] },
        c.text,
      ),
    ),
  )
}

function Table({ headers, rows }: { headers: Cell[]; rows: Cell[][] }) {
  if (rows.length === 0) {
    return React.createElement(Text, { style: styles.emptyText }, 'Aucune donnée pour la période.')
  }
  return React.createElement(
    View,
    { style: styles.table },
    React.createElement(Row, { cells: headers, header: true, key: 'h' }),
    ...rows.map((r, i) => React.createElement(Row, { cells: r, key: i })),
  )
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—'
  try {
    return new Date(d).toLocaleDateString('fr-FR')
  } catch {
    return String(d)
  }
}

interface RegistreData {
  ferme: { nom: string; code: string; localisation: string } | null
  periode: { debut: string; fin: string }
  entrees: Array<{ date_entree: string | null; tag: string; nom: string | null; sexe: string; categorie: string }>
  sorties: Array<{ date_depart: string; tag: string; motif: string; acheteur: string | null }>
  mortalites: Array<{ date_mort: string; tag: string; cause: string | null }>
  saillies: Array<{ date_saillie: string; truie: string; verrat: string; methode: string }>
  misesBas: Array<{ date_mise_bas: string; truie: string; nes_vivants: number; nes_totaux: number }>
  sevrages: Array<{ date_sevrage: string; truie: string; nb_sevres: number; poids: number | null }>
  vaccinations: Array<{ date_vaccination: string; animal: string; produit: string; dose: number | null }>
  traitements: Array<{ date_debut: string; animal: string; produit: string; motif: string | null }>
}

function buildDocument(d: RegistreData) {
  const editedAt = new Date().toLocaleDateString('fr-FR')

  const entreesRows: Cell[][] = d.entrees.map(e => [
    { text: fmtDate(e.date_entree), flex: 2 },
    { text: e.tag, flex: 2 },
    { text: e.nom ?? '—', flex: 3 },
    { text: e.sexe === 'M' ? 'Mâle' : 'Femelle', flex: 2 },
    { text: e.categorie, flex: 3 },
  ])

  const sortiesRows: Cell[][] = d.sorties.map(s => [
    { text: fmtDate(s.date_depart), flex: 2 },
    { text: s.tag, flex: 2 },
    { text: s.motif, flex: 3 },
    { text: s.acheteur ?? '—', flex: 4 },
  ])

  const mortRows: Cell[][] = d.mortalites.map(m => [
    { text: fmtDate(m.date_mort), flex: 2 },
    { text: m.tag, flex: 2 },
    { text: m.cause ?? '—', flex: 6 },
  ])

  const sailliesRows: Cell[][] = d.saillies.map(s => [
    { text: fmtDate(s.date_saillie), flex: 2 },
    { text: s.truie, flex: 3 },
    { text: s.verrat, flex: 3 },
    { text: s.methode, flex: 2 },
  ])

  const mbRows: Cell[][] = d.misesBas.map(m => [
    { text: fmtDate(m.date_mise_bas), flex: 2 },
    { text: m.truie, flex: 3 },
    { text: String(m.nes_vivants), flex: 2 },
    { text: String(m.nes_totaux), flex: 2 },
  ])

  const sevRows: Cell[][] = d.sevrages.map(s => [
    { text: fmtDate(s.date_sevrage), flex: 2 },
    { text: s.truie, flex: 3 },
    { text: String(s.nb_sevres), flex: 2 },
    { text: s.poids != null ? `${s.poids} kg` : '—', flex: 2 },
  ])

  const vacRows: Cell[][] = d.vaccinations.map(v => [
    { text: fmtDate(v.date_vaccination), flex: 2 },
    { text: v.animal, flex: 3 },
    { text: v.produit, flex: 3 },
    { text: v.dose != null ? `${v.dose} ml` : '—', flex: 2 },
  ])

  const trtRows: Cell[][] = d.traitements.map(t => [
    { text: fmtDate(t.date_debut), flex: 2 },
    { text: t.animal, flex: 3 },
    { text: t.produit, flex: 3 },
    { text: t.motif ?? '—', flex: 3 },
  ])

  const fermeNom = d.ferme?.nom ?? 'Ferme inconnue'
  const fermeCode = d.ferme?.code ?? ''
  const fermeLoc = d.ferme?.localisation ?? ''

  return React.createElement(
    Document,
    {},
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header, fixed: true },
        React.createElement(Text, { style: styles.title }, "Registre d'Élevage"),
        React.createElement(Text, { style: styles.subtitle }, fermeNom),
        React.createElement(
          Text,
          { style: styles.meta },
          `${fermeCode}${fermeCode && fermeLoc ? ' · ' : ''}${fermeLoc}`,
        ),
        React.createElement(
          Text,
          { style: styles.meta },
          `Période : du ${fmtDate(d.periode.debut)} au ${fmtDate(d.periode.fin)}`,
        ),
      ),

      // Mouvements de cheptel
      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, '1. Mouvements de cheptel — Entrées'),
        React.createElement(Table, {
          headers: [
            { text: 'Date', flex: 2 },
            { text: 'Tag', flex: 2 },
            { text: 'Nom', flex: 3 },
            { text: 'Sexe', flex: 2 },
            { text: 'Catégorie', flex: 3 },
          ],
          rows: entreesRows,
        }),
      ),

      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, '2. Mouvements de cheptel — Sorties / Départs'),
        React.createElement(Table, {
          headers: [
            { text: 'Date', flex: 2 },
            { text: 'Tag', flex: 2 },
            { text: 'Motif', flex: 3 },
            { text: 'Destination', flex: 4 },
          ],
          rows: sortiesRows,
        }),
      ),

      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, '3. Mortalités'),
        React.createElement(Table, {
          headers: [
            { text: 'Date', flex: 2 },
            { text: 'Tag', flex: 2 },
            { text: 'Cause', flex: 6 },
          ],
          rows: mortRows,
        }),
      ),

      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, '4. Reproduction — Saillies'),
        React.createElement(Table, {
          headers: [
            { text: 'Date', flex: 2 },
            { text: 'Truie', flex: 3 },
            { text: 'Verrat', flex: 3 },
            { text: 'Méthode', flex: 2 },
          ],
          rows: sailliesRows,
        }),
      ),

      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, '5. Reproduction — Mises-bas'),
        React.createElement(Table, {
          headers: [
            { text: 'Date', flex: 2 },
            { text: 'Truie', flex: 3 },
            { text: 'Nés vivants', flex: 2 },
            { text: 'Nés totaux', flex: 2 },
          ],
          rows: mbRows,
        }),
      ),

      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, '6. Reproduction — Sevrages'),
        React.createElement(Table, {
          headers: [
            { text: 'Date', flex: 2 },
            { text: 'Truie', flex: 3 },
            { text: 'Sevrés', flex: 2 },
            { text: 'Poids total', flex: 2 },
          ],
          rows: sevRows,
        }),
      ),

      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, '7. Sanitaire — Vaccinations'),
        React.createElement(Table, {
          headers: [
            { text: 'Date', flex: 2 },
            { text: 'Animal', flex: 3 },
            { text: 'Produit', flex: 3 },
            { text: 'Dose', flex: 2 },
          ],
          rows: vacRows,
        }),
      ),

      React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, '8. Sanitaire — Traitements'),
        React.createElement(Table, {
          headers: [
            { text: 'Date', flex: 2 },
            { text: 'Animal', flex: 3 },
            { text: 'Produit', flex: 3 },
            { text: 'Motif', flex: 3 },
          ],
          rows: trtRows,
        }),
      ),

      // Footer
      React.createElement(
        View,
        { style: styles.footer, fixed: true },
        React.createElement(Text, {}, `Édité le ${editedAt}`),
        React.createElement(Text, {
          render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
            `Page ${pageNumber} / ${totalPages}`,
        }),
      ),
    ),
  )
}

function nomAnimal(a: { tag?: string | null; nom?: string | null } | null | undefined): string {
  if (!a) return '—'
  if (a.nom && a.tag) return `${a.nom} (${a.tag})`
  return a.nom ?? a.tag ?? '—'
}

export async function GET(req: Request) {
  void req // route same-origin ; auth Phase 2 via middleware

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'Configuration Supabase manquante' }, { status: 500 })
  }

  const sb = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const now = new Date()
  const debut = new Date(now.getFullYear(), now.getMonth(), 1)
  const debutISO = debut.toISOString().slice(0, 10)
  const finISO = now.toISOString().slice(0, 10)

  const { data: fermes } = await sb.from('fermes').select('nom,code,localisation').limit(1)
  const ferme = fermes?.[0] ?? null

  const [
    { data: animaux },
    { data: departs },
    { data: mortalites },
    { data: saillies },
    { data: misesBas },
    { data: sevrages },
    { data: vaccinations },
    { data: traitements },
  ] = await Promise.all([
    sb
      .from('animaux')
      .select('date_entree,tag,nom,sexe,categorie')
      .gte('date_entree', debutISO)
      .lte('date_entree', finISO)
      .order('date_entree'),
    sb
      .from('departs')
      .select('date_depart,motif,acheteur,animal:animal_id(tag)')
      .gte('date_depart', debutISO)
      .lte('date_depart', finISO)
      .order('date_depart'),
    sb
      .from('mortalites')
      .select('date_mort,cause,animal:animal_id(tag)')
      .gte('date_mort', debutISO)
      .lte('date_mort', finISO)
      .order('date_mort'),
    sb
      .from('saillies')
      .select('date_saillie,methode,truie:truie_id(tag,nom),verrat:verrat_id(tag,nom)')
      .gte('date_saillie', debutISO)
      .lte('date_saillie', finISO)
      .order('date_saillie'),
    sb
      .from('mises_bas')
      .select('date_mise_bas,nes_vivants,nes_totaux,truie:truie_id(tag,nom)')
      .gte('date_mise_bas', debutISO)
      .lte('date_mise_bas', finISO)
      .order('date_mise_bas'),
    sb
      .from('sevrages')
      .select('date_sevrage,nb_sevres,poids_total_kg,mise_bas:mise_bas_id(truie:truie_id(tag,nom))')
      .gte('date_sevrage', debutISO)
      .lte('date_sevrage', finISO)
      .order('date_sevrage'),
    sb
      .from('vaccinations')
      .select('date_vaccination,produit,dose_ml,animal:animal_id(tag,nom)')
      .gte('date_vaccination', debutISO)
      .lte('date_vaccination', finISO)
      .order('date_vaccination'),
    sb
      .from('traitements')
      .select('date_debut,produit,motif,animal:animal_id(tag,nom)')
      .gte('date_debut', debutISO)
      .lte('date_debut', finISO)
      .order('date_debut'),
  ])

  type AnimRef = { tag?: string | null; nom?: string | null } | null

  const data: RegistreData = {
    ferme,
    periode: { debut: debutISO, fin: finISO },
    entrees: (animaux ?? []) as RegistreData['entrees'],
    sorties: (departs ?? []).map((d: { date_depart: string; motif: string; acheteur: string | null; animal: AnimRef | AnimRef[] }) => {
      const an = Array.isArray(d.animal) ? d.animal[0] : d.animal
      return {
        date_depart: d.date_depart,
        tag: an?.tag ?? '—',
        motif: d.motif,
        acheteur: d.acheteur,
      }
    }),
    mortalites: (mortalites ?? []).map((m: { date_mort: string; cause: string | null; animal: AnimRef | AnimRef[] }) => {
      const an = Array.isArray(m.animal) ? m.animal[0] : m.animal
      return { date_mort: m.date_mort, tag: an?.tag ?? '—', cause: m.cause }
    }),
    saillies: (saillies ?? []).map((s: { date_saillie: string; methode: string; truie: AnimRef | AnimRef[]; verrat: AnimRef | AnimRef[] }) => {
      const t = Array.isArray(s.truie) ? s.truie[0] : s.truie
      const v = Array.isArray(s.verrat) ? s.verrat[0] : s.verrat
      return {
        date_saillie: s.date_saillie,
        truie: nomAnimal(t),
        verrat: nomAnimal(v),
        methode: s.methode,
      }
    }),
    misesBas: (misesBas ?? []).map((m: { date_mise_bas: string; nes_vivants: number; nes_totaux: number; truie: AnimRef | AnimRef[] }) => {
      const t = Array.isArray(m.truie) ? m.truie[0] : m.truie
      return {
        date_mise_bas: m.date_mise_bas,
        truie: nomAnimal(t),
        nes_vivants: m.nes_vivants,
        nes_totaux: m.nes_totaux,
      }
    }),
    sevrages: (sevrages ?? []).map((s: { date_sevrage: string; nb_sevres: number; poids_total_kg: number | null; mise_bas: { truie: AnimRef | AnimRef[] } | { truie: AnimRef | AnimRef[] }[] | null }) => {
      const mb = Array.isArray(s.mise_bas) ? s.mise_bas[0] : s.mise_bas
      const t = mb ? (Array.isArray(mb.truie) ? mb.truie[0] : mb.truie) : null
      return {
        date_sevrage: s.date_sevrage,
        truie: nomAnimal(t),
        nb_sevres: s.nb_sevres,
        poids: s.poids_total_kg,
      }
    }),
    vaccinations: (vaccinations ?? []).map((v: { date_vaccination: string; produit: string; dose_ml: number | null; animal: AnimRef | AnimRef[] }) => {
      const an = Array.isArray(v.animal) ? v.animal[0] : v.animal
      return {
        date_vaccination: v.date_vaccination,
        animal: nomAnimal(an),
        produit: v.produit,
        dose: v.dose_ml,
      }
    }),
    traitements: (traitements ?? []).map((t: { date_debut: string; produit: string; motif: string | null; animal: AnimRef | AnimRef[] }) => {
      const an = Array.isArray(t.animal) ? t.animal[0] : t.animal
      return {
        date_debut: t.date_debut,
        animal: nomAnimal(an),
        produit: t.produit,
        motif: t.motif,
      }
    }),
  }

  const pdfBuffer = await renderToBuffer(buildDocument(data))

  const filename = `registre_${ferme?.code ?? 'ferme'}_${finISO}.pdf`
  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
