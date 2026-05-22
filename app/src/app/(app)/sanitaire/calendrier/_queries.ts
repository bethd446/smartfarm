import { createClient } from '@/lib/supabase/server'

/**
 * Calendrier sanitaire — calcul des actes prévus / en retard / à venir
 * sur un horizon de ~30 jours, par croisement entre :
 *   - animaux vivants + bandes actives (date_naissance / date_debut)
 *   - protocoles_vaccinaux (actif=true) matchant la catégorie
 *   - vaccinations déjà enregistrées (déduplication par produit + cible)
 *
 * Statuts produits :
 *   - 'retard'      : âge ∈ [age_jours-30, age_jours-3] sans vaccin matchant
 *   - 'aujourdhui'  : âge ∈ [age_jours-2, age_jours+2] sans vaccin matchant
 *   - 'avenir'      : âge ∈ [age_jours+3, age_jours+30] sans vaccin matchant
 */

export type ActeStatut = 'retard' | 'aujourdhui' | 'avenir'

export type ActeSanitaire = {
  id: string
  cibleType: 'animal' | 'bande'
  cibleId: string
  cibleLabel: string
  cibleSousLabel: string | null
  protocoleId: string
  protocoleNom: string
  produit: string | null
  voie: string | null
  doseMl: number | null
  ageJoursAttendu: number
  ageJoursActuel: number
  datePrevue: Date
  statut: ActeStatut
  obligatoire: boolean
}

export type CalendrierData = {
  retards: ActeSanitaire[]
  aujourdhui: ActeSanitaire[]
  avenir: ActeSanitaire[]
  protocolesCount: number
  animauxVivantsCount: number
  bandesActivesCount: number
}

type Protocole = {
  id: string
  nom: string
  categorie_cible: string | null
  age_jours: number | null
  produit: string | null
  voie: string | null
  dose_ml: number | null
  obligatoire?: boolean | null
  actif: boolean | null
}

type AnimalRow = {
  id: string
  tag: string
  nom: string | null
  categorie: string | null
  date_naissance: string | null
  statut: string | null
}

type BandeRow = {
  id: string
  code: string | null
  nom: string | null
  date_debut: string | null
  statut: string | null
}

type VaccinRow = {
  id: string
  animal_id: string | null
  bande_id: string | null
  produit: string | null
  protocole_id: string | null
  date_vaccination: string
}

function diffJours(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function classify(ecart: number): ActeStatut | null {
  // ecart = ageActuel - ageAttendu
  // = 0 => pile aujourd'hui ; > 0 => en retard ; < 0 => à venir
  if (ecart >= -2 && ecart <= 2) return 'aujourdhui'
  if (ecart > 2 && ecart <= 30) return 'retard'
  if (ecart < -2 && ecart >= -30) return 'avenir'
  return null
}

function normalize(s: string | null | undefined): string {
  return (s ?? '').trim().toLowerCase()
}

export async function getCalendrierSanitaire(): Promise<CalendrierData> {
  const sb = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    { data: protocolesRaw },
    { data: animauxRaw },
    { data: bandesRaw },
    { data: vaccinsRaw },
  ] = await Promise.all([
    sb.from('protocoles_vaccinaux')
      .select('id, nom, categorie_cible, age_jours, produit, voie, dose_ml, obligatoire, actif')
      .eq('actif', true),
    sb.from('animaux')
      .select('id, tag, nom, categorie, date_naissance, statut')
      .neq('statut', 'mort'),
    sb.from('bandes')
      .select('id, code, nom, date_debut, statut'),
    sb.from('vaccinations')
      .select('id, animal_id, bande_id, produit, protocole_id, date_vaccination'),
  ])

  const protocoles = (protocolesRaw ?? []) as Protocole[]
  const animaux = (animauxRaw ?? []).filter(
    (a: AnimalRow) => !!a.date_naissance,
  ) as AnimalRow[]
  const bandes = (bandesRaw ?? []).filter(
    (b: BandeRow) =>
      !!b.date_debut &&
      b.statut !== 'finie',
  ) as BandeRow[]
  const vaccins = (vaccinsRaw ?? []) as VaccinRow[]

  // Index vaccinations par cible (animal | bande) pour déduplication rapide
  const vaccinsParAnimal = new Map<string, VaccinRow[]>()
  const vaccinsParBande = new Map<string, VaccinRow[]>()
  for (const v of vaccins) {
    if (v.animal_id) {
      const arr = vaccinsParAnimal.get(v.animal_id) ?? []
      arr.push(v)
      vaccinsParAnimal.set(v.animal_id, arr)
    }
    if (v.bande_id) {
      const arr = vaccinsParBande.get(v.bande_id) ?? []
      arr.push(v)
      vaccinsParBande.set(v.bande_id, arr)
    }
  }

  function dejaFait(
    cibleType: 'animal' | 'bande',
    cibleId: string,
    proto: Protocole,
  ): boolean {
    const liste =
      cibleType === 'animal'
        ? vaccinsParAnimal.get(cibleId) ?? []
        : vaccinsParBande.get(cibleId) ?? []
    return liste.some(
      (v) =>
        v.protocole_id === proto.id ||
        (proto.produit && normalize(v.produit) === normalize(proto.produit)),
    )
  }

  const actes: ActeSanitaire[] = []

  // --- Animaux individuels -------------------------------------------------
  for (const a of animaux) {
    const dn = new Date(a.date_naissance as string)
    if (Number.isNaN(dn.getTime())) continue
    const ageActuel = diffJours(dn, today)
    if (ageActuel < 0) continue

    for (const proto of protocoles) {
      if (proto.age_jours == null) continue
      // Si protocole vise une catégorie précise, filtrer
      if (
        proto.categorie_cible &&
        normalize(proto.categorie_cible) !== normalize(a.categorie)
      ) {
        continue
      }
      const ecart = ageActuel - proto.age_jours
      const statut = classify(ecart)
      if (!statut) continue
      if (dejaFait('animal', a.id, proto)) continue

      const datePrevue = new Date(dn)
      datePrevue.setDate(datePrevue.getDate() + proto.age_jours)

      actes.push({
        id: `a:${a.id}:${proto.id}`,
        cibleType: 'animal',
        cibleId: a.id,
        cibleLabel: a.nom || a.tag,
        cibleSousLabel: a.nom ? a.tag : null,
        protocoleId: proto.id,
        protocoleNom: proto.nom,
        produit: proto.produit,
        voie: proto.voie,
        doseMl: proto.dose_ml,
        ageJoursAttendu: proto.age_jours,
        ageJoursActuel: ageActuel,
        datePrevue,
        statut,
        obligatoire: !!proto.obligatoire,
      })
    }
  }

  // --- Bandes (lots) --------------------------------------------------------
  for (const b of bandes) {
    const dd = new Date(b.date_debut as string)
    if (Number.isNaN(dd.getTime())) continue
    const ageActuel = diffJours(dd, today)
    if (ageActuel < 0) continue

    for (const proto of protocoles) {
      if (proto.age_jours == null) continue
      // Protocoles ciblant une catégorie précise = niveau animal seulement
      if (proto.categorie_cible) continue

      const ecart = ageActuel - proto.age_jours
      const statut = classify(ecart)
      if (!statut) continue
      if (dejaFait('bande', b.id, proto)) continue

      const datePrevue = new Date(dd)
      datePrevue.setDate(datePrevue.getDate() + proto.age_jours)

      actes.push({
        id: `b:${b.id}:${proto.id}`,
        cibleType: 'bande',
        cibleId: b.id,
        cibleLabel: b.nom || b.code || 'Bande',
        cibleSousLabel: b.code && b.nom ? b.code : null,
        protocoleId: proto.id,
        protocoleNom: proto.nom,
        produit: proto.produit,
        voie: proto.voie,
        doseMl: proto.dose_ml,
        ageJoursAttendu: proto.age_jours,
        ageJoursActuel: ageActuel,
        datePrevue,
        statut,
        obligatoire: !!proto.obligatoire,
      })
    }
  }

  const retards = actes
    .filter((x) => x.statut === 'retard')
    .sort((a, b) => b.ageJoursActuel - a.ageJoursActuel)
  const aujourdhui = actes
    .filter((x) => x.statut === 'aujourdhui')
    .sort((a, b) => a.datePrevue.getTime() - b.datePrevue.getTime())
  const avenir = actes
    .filter((x) => x.statut === 'avenir')
    .sort((a, b) => a.datePrevue.getTime() - b.datePrevue.getTime())

  return {
    retards,
    aujourdhui,
    avenir,
    protocolesCount: protocoles.length,
    animauxVivantsCount: animaux.length,
    bandesActivesCount: bandes.length,
  }
}

/* -------------------------------------------------------------------------- */
/*  V2-B — ACTES PORCELETS (vue v_calendrier_sanitaire_porcelets)             */
/* -------------------------------------------------------------------------- */

export type StatutTemporelPorcelet =
  | 'retard'
  | 'aujourd_hui'
  | 'semaine'
  | 'mois'
  | 'lointain'

export type ActePorcelet = {
  acteId: string
  miseBasId: string
  bandeId: string | null
  truieId: string
  truieTag: string
  dateMiseBas: string
  nesVivants: number
  acte: string
  typeActe: 'vaccination' | 'traitement'
  jourOffset: number
  datePrevue: string
  gravite: string
  statutTemporel: StatutTemporelPorcelet
}

export type ActesPorceletsGrouped = {
  retard: ActePorcelet[]
  aujourd_hui: ActePorcelet[]
  semaine: ActePorcelet[]
  mois: ActePorcelet[]
  total: number
}

export async function getActesPorcelets(): Promise<ActesPorceletsGrouped> {
  const sb = await createClient()
  const { data, error } = await sb
    .from('v_calendrier_sanitaire_porcelets')
    .select(
      'acte_id, mise_bas_id, bande_id, truie_id, truie_tag, date_mise_bas, nes_vivants, acte, type_acte, jour_offset, date_prevue, gravite, statut_temporel',
    )
    .order('date_prevue', { ascending: true })

  if (error || !data) {
    return { retard: [], aujourd_hui: [], semaine: [], mois: [], total: 0 }
  }

  const grouped: ActesPorceletsGrouped = {
    retard: [],
    aujourd_hui: [],
    semaine: [],
    mois: [],
    total: 0,
  }

  for (const r of data as Array<Record<string, unknown>>) {
    const item: ActePorcelet = {
      acteId: String(r.acte_id),
      miseBasId: String(r.mise_bas_id),
      bandeId: (r.bande_id as string | null) ?? null,
      truieId: String(r.truie_id),
      truieTag: String(r.truie_tag),
      dateMiseBas: String(r.date_mise_bas),
      nesVivants: Number(r.nes_vivants ?? 0),
      acte: String(r.acte),
      typeActe: (r.type_acte as 'vaccination' | 'traitement') ?? 'traitement',
      jourOffset: Number(r.jour_offset ?? 0),
      datePrevue: String(r.date_prevue),
      gravite: String(r.gravite ?? ''),
      statutTemporel:
        (r.statut_temporel as StatutTemporelPorcelet) ?? 'lointain',
    }
    if (item.statutTemporel === 'retard') grouped.retard.push(item)
    else if (item.statutTemporel === 'aujourd_hui')
      grouped.aujourd_hui.push(item)
    else if (item.statutTemporel === 'semaine') grouped.semaine.push(item)
    else if (item.statutTemporel === 'mois') grouped.mois.push(item)
    // 'lointain' ignoré côté UI (déjà filtré par la vue mais robustesse)
  }
  grouped.total =
    grouped.retard.length +
    grouped.aujourd_hui.length +
    grouped.semaine.length +
    grouped.mois.length
  return grouped
}

/* -------------------------------------------------------------------------- */
/*  STATS DASHBOARD SANITAIRE                                                 */
/* -------------------------------------------------------------------------- */

export type SanitaireStatsData = {
  couvertureVaccinalePct: number | null
  couvertureLabel: string
  tauxMortalite30jPct: number | null
  morts30j: number
  effectifMoyen: number
  actesEnRetard: number
  topCauseMortalite: string | null
  topCauseMortaliteCount: number
}

export async function getSanitaireStats(): Promise<SanitaireStatsData> {
  const sb = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dans30j = new Date(today)
  dans30j.setDate(dans30j.getDate() + 30)
  const ilYa30j = new Date(today)
  ilYa30j.setDate(ilYa30j.getDate() - 30)
  const ilYa90j = new Date(today)
  ilYa90j.setDate(ilYa90j.getDate() - 90)

  const isoIlYa30 = ilYa30j.toISOString().slice(0, 10)
  const isoIlYa90 = ilYa90j.toISOString().slice(0, 10)
  const isoToday = today.toISOString().slice(0, 10)

  // Calendrier pour actes en retard + base "attendues"
  const calendrierP = getCalendrierSanitaire()

  const [
    { data: vac30 },
    { data: morts90 },
    { count: effectifVivant },
    { count: morts30jCount },
    calendrier,
  ] = await Promise.all([
    sb.from('vaccinations')
      .select('id, date_vaccination')
      .gte('date_vaccination', isoIlYa30)
      .lte('date_vaccination', isoToday),
    sb.from('mortalites')
      .select('cause')
      .gte('date_mort', isoIlYa90)
      .lte('date_mort', isoToday),
    sb.from('animaux')
      .select('id', { count: 'exact', head: true })
      .neq('statut', 'mort'),
    sb.from('mortalites')
      .select('id', { count: 'exact', head: true })
      .gte('date_mort', isoIlYa30)
      .lte('date_mort', isoToday),
    calendrierP,
  ])

  const actesAttendus30j =
    calendrier.aujourdhui.length +
    calendrier.retards.length +
    calendrier.avenir.length +
    (vac30?.length ?? 0)

  const couvertureVaccinalePct =
    actesAttendus30j > 0
      ? Math.round(((vac30?.length ?? 0) / actesAttendus30j) * 100)
      : null

  const effectifMoyen = effectifVivant ?? 0
  const tauxMortalite30jPct =
    effectifMoyen > 0
      ? Math.round(((morts30jCount ?? 0) / effectifMoyen) * 1000) / 10
      : null

  // Top cause mortalité 90j
  const counts = new Map<string, number>()
  for (const m of morts90 ?? []) {
    const cause = (m as { cause: string | null }).cause?.trim()
    if (!cause) continue
    counts.set(cause, (counts.get(cause) ?? 0) + 1)
  }
  let topCause: string | null = null
  let topCount = 0
  for (const [cause, n] of counts) {
    if (n > topCount) {
      topCause = cause
      topCount = n
    }
  }

  return {
    couvertureVaccinalePct,
    couvertureLabel:
      couvertureVaccinalePct == null
        ? '—'
        : `${vac30?.length ?? 0} / ${actesAttendus30j}`,
    tauxMortalite30jPct,
    morts30j: morts30jCount ?? 0,
    effectifMoyen,
    actesEnRetard: calendrier.retards.length,
    topCauseMortalite: topCause,
    topCauseMortaliteCount: topCount,
  }
}
