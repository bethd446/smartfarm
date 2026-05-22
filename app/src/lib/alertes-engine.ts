/**
 * Smart Farm — Moteur d'alertes (C3-A)
 * -------------------------------------------------------------------------
 * Façade TypeScript au-dessus de la view SQL `v_alertes_actives` (cf.
 * migration `20260521000001_alertes_views.sql`). Les alertes ne sont pas
 * stockées : à chaque appel, la view est re-évaluée et on récupère la
 * photo actuelle.
 *
 * Toutes les fonctions ici sont pures (sauf `getAlertesActives` qui fait
 * un round-trip Postgres). Les helpers de regroupement / tri / comptage
 * sont synchrones et peuvent être appelés en Client ou Server Component.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  REGLES_ALERTES,
  ORDRE_GRAVITE as ORDRE_GRAVITE_REGLES,
  type CategorieAlerte,
} from './alertes-regles'

// ---------------------------------------------------------------------------
// Types publics
// ---------------------------------------------------------------------------

export type GraviteAlerte = 'info' | 'moyenne' | 'élevée' | 'critique'

export type CibleType =
  | 'truie'
  | 'verrat'
  | 'animal'
  | 'bande'
  | 'ferme'
  | 'matiere'

/** Alias historique (compat avec d'éventuels imports antérieurs). */
export type CibleTypeAlerte = CibleType

/**
 * Une alerte active telle que retournée par `getAlertesActives()`.
 *
 * Forme alignée 1:1 sur la view SQL `v_alertes_actives` — toute évolution
 * du shape de la view doit être propagée ici.
 */
export type Alerte = {
  regle_id: string
  cible_type: CibleType
  cible_id: string
  cible_label: string
  gravite: GraviteAlerte
  titre: string
  description: string
  lien_suggere: string
  detecte_le: Date
  ferme_id?: string
}

// ---------------------------------------------------------------------------
// Ordre / constantes
// ---------------------------------------------------------------------------

/** Ordre canonique pour le tri décroissant (critique → info). */
export const ORDRE_GRAVITE: Record<GraviteAlerte, number> = ORDRE_GRAVITE_REGLES

// ---------------------------------------------------------------------------
// Forme brute renvoyée par la view (avant parsing dates)
// ---------------------------------------------------------------------------

type AlerteRow = {
  regle_id: string
  cible_type: string
  cible_id: string
  cible_label: string | null
  gravite: string
  titre: string | null
  description: string | null
  lien_suggere: string | null
  detecte_le: string | null
  ferme_id?: string | null
}

// ---------------------------------------------------------------------------
// Récupération depuis Postgres
// ---------------------------------------------------------------------------

/**
 * Récupère toutes les alertes actives depuis la view `v_alertes_actives`.
 *
 * @param supabase Client Supabase (typiquement `createClient()` côté server).
 * @param options.fermeId Si fourni, filtre côté DB sur `ferme_id`.
 * @param options.limit  Limite optionnelle (sinon : toutes).
 *
 * En cas d'erreur (view absente, droits manquants, …) on journalise et on
 * retourne un tableau vide plutôt que de faire crasher l'appelant. Les
 * widgets ont leur propre `try/catch` autour — ceci est une seconde ligne
 * de défense pour ne jamais sortir une exception au rendering.
 */
export async function getAlertesActives(
  // Le shape Database<…> n'est pas câblé dans l'app — on accepte le
  // SupabaseClient générique. Côté call site on a déjà le client typé.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  options?: { fermeId?: string; limit?: number },
): Promise<Alerte[]> {
  let query = supabase.from('v_alertes_actives').select('*')

  if (options?.fermeId) {
    query = query.eq('ferme_id', options.fermeId)
  }
  if (typeof options?.limit === 'number' && options.limit > 0) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query

  if (error) {
    // En dev on veut voir le message ; en prod ce sera silencieux côté UI.
    // eslint-disable-next-line no-console
    console.warn('[alertes-engine] getAlertesActives:', error.message)
    return []
  }
  if (!data) return []

  const rows = data as AlerteRow[]
  return rows.map(normaliserAlerte)
}

/** Normalise une row SQL en `Alerte` typée (parse date, defaults). */
function normaliserAlerte(r: AlerteRow): Alerte {
  return {
    regle_id: r.regle_id,
    cible_type: (r.cible_type as CibleType) ?? 'animal',
    cible_id: r.cible_id,
    cible_label: r.cible_label ?? '',
    gravite: (r.gravite as GraviteAlerte) ?? 'info',
    titre: r.titre ?? '',
    description: r.description ?? '',
    lien_suggere: r.lien_suggere ?? '#',
    detecte_le: r.detecte_le ? new Date(r.detecte_le) : new Date(),
    ferme_id: r.ferme_id ?? undefined,
  }
}

// ---------------------------------------------------------------------------
// Helpers UI : comptage / regroupement / tri
// ---------------------------------------------------------------------------

/** Compte le nombre d'alertes par niveau de gravité. */
export function compteParGravite(
  alertes: Alerte[],
): Record<GraviteAlerte, number> {
  const acc: Record<GraviteAlerte, number> = {
    info: 0,
    moyenne: 0,
    'élevée': 0,
    critique: 0,
  }
  for (const a of alertes) {
    if (a.gravite in acc) acc[a.gravite]++
  }
  return acc
}

/** Groupe les alertes par `regle_id`. */
export function groupParRegle(alertes: Alerte[]): Map<string, Alerte[]> {
  const m = new Map<string, Alerte[]>()
  for (const a of alertes) {
    const arr = m.get(a.regle_id) ?? []
    arr.push(a)
    m.set(a.regle_id, arr)
  }
  return m
}

/**
 * Groupe les alertes par catégorie fonctionnelle
 * (reproduction / sanitaire / nutrition / pertes / stock).
 *
 * Les alertes dont la `regle_id` n'est pas connue dans `REGLES_ALERTES`
 * sont silencieusement ignorées : on préfère ne rien afficher plutôt que
 * de polluer le grouping avec un bucket "autre".
 */
export function groupParCategorie(
  alertes: Alerte[],
): Map<CategorieAlerte, Alerte[]> {
  const m = new Map<CategorieAlerte, Alerte[]>()
  for (const a of alertes) {
    const meta = REGLES_ALERTES[a.regle_id]
    if (!meta) continue
    const arr = m.get(meta.categorie) ?? []
    arr.push(a)
    m.set(meta.categorie, arr)
  }
  return m
}

/**
 * Tri par gravité décroissante (critique > élevée > moyenne > info),
 * puis par date de détection (la plus récente d'abord).
 * Ne mute pas le tableau d'entrée.
 */
export function trierParGraviteDecroissante(alertes: Alerte[]): Alerte[] {
  return [...alertes].sort((a, b) => {
    const dg = ORDRE_GRAVITE[a.gravite] - ORDRE_GRAVITE[b.gravite]
    if (dg !== 0) return dg
    const da = a.detecte_le instanceof Date ? a.detecte_le.getTime() : 0
    const db = b.detecte_le instanceof Date ? b.detecte_le.getTime() : 0
    return db - da
  })
}
