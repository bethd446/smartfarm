/**
 * Sprint 3.D — Helpers data fetching pour rapport mensuel PDF
 * Agrège données depuis 6+ vues BDD pour une ferme + mois donnés
 */

import { createClient } from '../../../../lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ===== TYPES =====

export type RapportMensuelData = {
  ferme: FermeInfo | null
  periode: { mois: string; annee: number; debut: string; fin: string }
  kpiSynthese: KpiSynthese
  reproduction: ReproductionData
  bandes: BandeKpi[]
  topTruies: TopTruie[]
  alertes: AlerteGroupee[]
  metaGeneration: { date: string; version: string }
}

type FermeInfo = {
  nom: string
  code: string
  localisation: string
}

type KpiSynthese = {
  cheptel: {
    truies: number
    verrats: number
    gestantes: number
    allaitantes: number
  }
  productivite: {
    portee_moyenne_12m: number | null
    ic_ferme: number | null
  }
  effectifPrecedent: {
    truies: number | null
    delta: number | null
  }
}

export type ReproductionData = {
  saillies: {
    total: number
    topTruies: Array<{ tag: string; nom: string | null; count: number }>
  }
  misesBas: {
    total: number
    moyNesVivants: number | null
    moyMortsNes: number | null
    ratioViabilite: number | null
  }
  sevrages: {
    total: number
    moyPoidsKg: number | null
    tauxSurvie: number | null
  }
}

export type BandeKpi = {
  bande_nom: string
  effectif: number
  gmq_moyen: number | null
  ic: number | null
  mortalite: number | null
}

type TopTruie = {
  tag: string
  nom: string | null
  score_global: number | null
  nb_portees: number
  portee_moyenne: number | null
  classe: string
}

type AlerteGroupee = {
  severite: 'critique' | 'élevée' | 'moyenne'
  count: number
  exemples: Array<{ titre: string; cible: string }>
}

// ===== FETCHERS =====

/**
 * Fetch toutes les données pour le rapport mensuel
 */
export async function fetchRapportMensuelData(
  ferme_id: string,
  mois: string, // YYYY-MM
): Promise<RapportMensuelData> {
  const sb = await createClient()

  // Parse mois
  const [annee, moisNum] = mois.split('-').map(Number)
  if (!annee || !moisNum || moisNum < 1 || moisNum > 12) {
    throw new Error(`Format mois invalide : ${mois}. Attendu YYYY-MM`)
  }

  const debut = `${mois}-01`
  const fin = new Date(annee, moisNum, 0).toISOString().slice(0, 10) // dernier jour du mois

  // Fetch parallèle
  const [ferme, kpi, repro, bandes, truies, alertes, precedent] = await Promise.all([
    fetchFermeInfo(sb, ferme_id),
    fetchKpiSynthese(sb, ferme_id),
    fetchReproductionData(sb, ferme_id, debut, fin),
    fetchBandesKpi(sb, ferme_id),
    fetchTopTruies(sb, ferme_id),
    fetchAlertesGroupees(sb, ferme_id, debut, fin),
    fetchEffectifPrecedent(sb, ferme_id, annee, moisNum),
  ])

  // Calculer delta effectif
  const deltaTruies =
    precedent.truies !== null && kpi.cheptel.truies
      ? kpi.cheptel.truies - precedent.truies
      : null

  return {
    ferme,
    periode: { mois, annee, debut, fin },
    kpiSynthese: {
      cheptel: kpi.cheptel,
      productivite: kpi.productivite,
      effectifPrecedent: {
        truies: precedent.truies,
        delta: deltaTruies,
      },
    },
    reproduction: repro,
    bandes,
    topTruies: truies.slice(0, 5), // top 5
    alertes,
    metaGeneration: {
      date: new Date().toISOString(),
      version: 'v1.0.0',
    },
  }
}

async function fetchFermeInfo(sb: SupabaseClient, ferme_id: string): Promise<FermeInfo | null> {
  const { data } = await sb
    .from('fermes')
    .select('nom,code,localisation')
    .eq('id', ferme_id)
    .maybeSingle()
  return data
}

async function fetchKpiSynthese(sb: SupabaseClient, ferme_id: string): Promise<{ cheptel: KpiSynthese['cheptel']; productivite: KpiSynthese['productivite'] }> {
  const [{ data: kpiTech }, { data: kpiIc }] = await Promise.all([
    sb.from('v_kpi_techniques_ferme').select('*').eq('ferme_id', ferme_id).maybeSingle(),
    sb.from('v_kpi_ic_ferme').select('*').eq('ferme_id', ferme_id).maybeSingle(),
  ])

  return {
    cheptel: {
      truies: kpiTech?.nb_truies ?? 0,
      verrats: kpiTech?.nb_verrats ?? 0,
      gestantes: kpiTech?.nb_gestantes ?? 0,
      allaitantes: kpiTech?.nb_allaitantes ?? 0,
    },
    productivite: {
      portee_moyenne_12m: kpiTech?.portee_moyenne_12m ?? null,
      ic_ferme: kpiIc?.ic ?? null,
    },
  }
}

async function fetchEffectifPrecedent(
  sb: SupabaseClient,
  ferme_id: string,
  annee: number,
  mois: number,
): Promise<{ truies: number | null; delta: number | null }> {
  // Mois précédent
  const moisPrec = mois === 1 ? 12 : mois - 1
  const anneePrec = mois === 1 ? annee - 1 : annee
  const debutPrec = `${anneePrec}-${String(moisPrec).padStart(2, '0')}-01`
  const finPrec = new Date(anneePrec, moisPrec, 0).toISOString().slice(0, 10)

  // Compter truies actives à la fin du mois précédent
  const { count } = await sb
    .from('animaux')
    .select('id', { count: 'exact', head: true })
    .eq('ferme_id', ferme_id)
    .eq('sexe', 'F')
    .eq('espece', 'Porc')
    .in('categorie', ['Truie', 'Cochette'])
    .lte('date_entree', finPrec)
    .or(`date_depart.is.null,date_depart.gt.${finPrec}`)

  return { truies: count, delta: null } // delta calculé dans le template
}

async function fetchReproductionData(
  sb: SupabaseClient,
  ferme_id: string,
  debut: string,
  fin: string,
): Promise<ReproductionData> {
  const [{ data: saillies }, { data: misesBas }, { data: sevrages }] = await Promise.all([
    sb
      .from('saillies')
      .select('truie_id, truie:truie_id(tag,nom)')
      .eq('ferme_id', ferme_id)
      .gte('date_saillie', debut)
      .lte('date_saillie', fin),
    sb
      .from('mises_bas')
      .select('nes_vivants,nes_totaux')
      .eq('ferme_id', ferme_id)
      .gte('date_mise_bas', debut)
      .lte('date_mise_bas', fin),
    sb
      .from('sevrages')
      .select('nb_sevres,poids_total_kg,mise_bas:mise_bas_id(nes_vivants)')
      .eq('ferme_id', ferme_id)
      .gte('date_sevrage', debut)
      .lte('date_sevrage', fin),
  ])

  // Top 5 truies par nb saillies
  type TruieRef = { tag: string; nom: string | null } | { tag: string; nom: string | null }[] | null
  const saillieMap = new Map<string, { tag: string; nom: string | null; count: number }>()
  
  for (const s of saillies ?? []) {
    const truie = (Array.isArray(s.truie) ? s.truie[0] : s.truie) as TruieRef
    if (!truie || Array.isArray(truie)) continue
    const key = truie.tag
    const existing = saillieMap.get(key)
    if (existing) {
      existing.count++
    } else {
      saillieMap.set(key, { tag: truie.tag, nom: truie.nom, count: 1 })
    }
  }
  
  const topTruiesSaillies = Array.from(saillieMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Mises bas stats
  const mbTotal = misesBas?.length ?? 0
  const mbMoyNesVivants =
    mbTotal > 0
      ? (misesBas ?? []).reduce((sum, m) => sum + (m.nes_vivants ?? 0), 0) / mbTotal
      : null
  const mbMoyMortsNes =
    mbTotal > 0
      ? (misesBas ?? []).reduce((sum, m) => sum + ((m.nes_totaux ?? 0) - (m.nes_vivants ?? 0)), 0) / mbTotal
      : null
  const mbRatioViabilite =
    mbMoyNesVivants && mbMoyMortsNes !== null ? (mbMoyNesVivants / (mbMoyNesVivants + mbMoyMortsNes)) * 100 : null

  // Sevrages stats
  const sevTotal = sevrages?.length ?? 0
  const sevMoyPoids =
    sevTotal > 0
      ? (sevrages ?? []).reduce((sum, s) => sum + (s.poids_total_kg ?? 0), 0) / sevTotal
      : null
  
  // Taux survie sevrage = nb_sevres / nes_vivants
  type MbNested = { nes_vivants: number } | { nes_vivants: number }[] | null
  const sevSurvieData = (sevrages ?? [])
    .map((s) => {
      const mb = (Array.isArray(s.mise_bas) ? s.mise_bas[0] : s.mise_bas) as MbNested
      const nesVivants = mb && !Array.isArray(mb) ? mb.nes_vivants : 0
      return { sevres: s.nb_sevres, nes: nesVivants }
    })
    .filter((d) => d.nes > 0)

  const sevTauxSurvie =
    sevSurvieData.length > 0
      ? (sevSurvieData.reduce((sum, d) => sum + d.sevres, 0) /
          sevSurvieData.reduce((sum, d) => sum + d.nes, 0)) *
        100
      : null

  return {
    saillies: {
      total: saillies?.length ?? 0,
      topTruies: topTruiesSaillies,
    },
    misesBas: {
      total: mbTotal,
      moyNesVivants: mbMoyNesVivants,
      moyMortsNes: mbMoyMortsNes,
      ratioViabilite: mbRatioViabilite,
    },
    sevrages: {
      total: sevTotal,
      moyPoidsKg: sevMoyPoids,
      tauxSurvie: sevTauxSurvie,
    },
  }
}

async function fetchBandesKpi(sb: SupabaseClient, ferme_id: string): Promise<BandeKpi[]> {
  const { data } = await sb
    .from('mv_kpi_bande')
    .select('bande_nom,effectif,gmq_moyen,ic,taux_mortalite')
    .eq('ferme_id', ferme_id)
    .order('gmq_moyen', { ascending: false })
    .limit(10)

  return (
    (data ?? []).map((b) => ({
      bande_nom: b.bande_nom,
      effectif: b.effectif ?? 0,
      gmq_moyen: b.gmq_moyen,
      ic: b.ic,
      mortalite: b.taux_mortalite,
    })) ?? []
  )
}

async function fetchTopTruies(sb: SupabaseClient, ferme_id: string): Promise<TopTruie[]> {
  const { data } = await sb
    .from('v_score_truie')
    .select('tag,nom,score_global,nb_portees,portee_moyenne,classe')
    .eq('ferme_id', ferme_id)
    .order('score_global', { ascending: false })
    .limit(5)

  return data ?? []
}

async function fetchAlertesGroupees(
  sb: SupabaseClient,
  ferme_id: string,
  debut: string,
  fin: string,
): Promise<AlerteGroupee[]> {
  const { data } = await sb
    .from('alertes')
    .select('gravite,titre,cible_label')
    .eq('ferme_id', ferme_id)
    .eq('active', true)
    .gte('date_detection', debut)
    .lte('date_detection', fin)

  if (!data || data.length === 0) return []

  // Grouper par sévérité
  const grouped = new Map<string, { count: number; exemples: Array<{ titre: string; cible: string }> }>()

  for (const a of data) {
    const sev = (a.gravite ?? 'moyenne').toLowerCase()
    const existing = grouped.get(sev)
    const exemple = { titre: a.titre ?? 'Sans titre', cible: a.cible_label ?? '—' }

    if (existing) {
      existing.count++
      if (existing.exemples.length < 3) existing.exemples.push(exemple)
    } else {
      grouped.set(sev, { count: 1, exemples: [exemple] })
    }
  }

  return Array.from(grouped.entries()).map(([sev, data]) => ({
    severite: sev as 'critique' | 'élevée' | 'moyenne',
    count: data.count,
    exemples: data.exemples,
  }))
}

// ===== AUTH HELPERS =====

/**
 * Vérifie que l'utilisateur authentifié a accès à la ferme via user_farms
 */
export async function validateUserFermeAccess(ferme_id: string): Promise<{ ok: boolean; error?: string }> {
  const sb = await createClient()

  const {
    data: { user },
  } = await sb.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Non authentifié' }
  }

  const { data, error } = await sb
    .from('user_farms')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('ferme_id', ferme_id)
    .maybeSingle()

  if (error || !data) {
    return { ok: false, error: 'Accès refusé à cette ferme' }
  }

  return { ok: true }
}
