'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const sb = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'

// ============================================================================
// Types des payloads
// ============================================================================

export type EntreeStockData = {
  matiere_id: string
  date_mvt: string
  quantite: number
  cout_unitaire?: number | null
  fournisseur_id?: string | null
  reference?: string | null
  observations?: string | null
}

export type SortieStockData = {
  matiere_id: string
  date_mvt: string
  quantite: number
  bande_id?: string | null
  reference?: string | null
  observations?: string | null
}

export type NouvelleMatiereData = {
  nom: string
  type:
    | 'matiere_premiere'
    | 'aliment_fini'
    | 'vaccin'
    | 'medicament'
    | 'desinfectant'
    | 'consommable'
    | 'autre'
  unite: string
  seuil_alerte?: number | null
  cout_moyen_unite?: number | null
  stock_actuel?: number | null
  observations?: string | null
}

// ============================================================================
// 1) ENTRÉE STOCK
// ============================================================================

export async function creerEntreeStock(data: EntreeStockData) {
  const supabase = sb()

  const qte = Number(data.quantite)
  const cu = data.cout_unitaire != null ? Number(data.cout_unitaire) : null

  // 1) INSERT mouvement
  const { error: e1 } = await supabase.from('mouvements_stock').insert({
    matiere_id: data.matiere_id,
    type: 'entree',
    date_mvt: data.date_mvt,
    quantite: qte,
    cout_unitaire: cu,
    cout_total: cu != null ? cu * qte : null,
    fournisseur_id: data.fournisseur_id || null,
    reference: data.reference || null,
    observations: data.observations || null,
  })
  if (e1) return { ok: false, error: e1.message }

  // 2) UPDATE stock_actuel manuel (SELECT + UPDATE — pas de trigger auto)
  const { data: mat, error: eRead } = await supabase
    .from('matieres_premieres')
    .select('stock_actuel')
    .eq('id', data.matiere_id)
    .single()
  if (eRead) return { ok: false, error: eRead.message }

  const nouveauStock = Number(mat?.stock_actuel ?? 0) + qte
  const { error: eUpd } = await supabase
    .from('matieres_premieres')
    .update({ stock_actuel: nouveauStock })
    .eq('id', data.matiere_id)
  if (eUpd) return { ok: false, error: eUpd.message }

  revalidatePath('/stock')
  revalidatePath('/dashboard')
  return { ok: true }
}

// ============================================================================
// 2) SORTIE STOCK
// ============================================================================

export async function creerSortieStock(data: SortieStockData) {
  const supabase = sb()

  const qte = Number(data.quantite)
  if (!(qte > 0)) return { ok: false, error: 'Quantité invalide' }

  // 1) Vérifier stock disponible
  const { data: mat, error: eRead } = await supabase
    .from('matieres_premieres')
    .select('stock_actuel')
    .eq('id', data.matiere_id)
    .single()
  if (eRead) return { ok: false, error: eRead.message }

  const stockActuel = Number(mat?.stock_actuel ?? 0)
  if (stockActuel < qte) {
    return { ok: false, error: 'Stock insuffisant' }
  }

  // 2) INSERT mouvement (quantité négative côté mouvement pour bilan, valeur absolue pour la table cf. check ≠ 0)
  // On stocke quantite positive et type='sortie' (lecture standard du dataset)
  const { error: e1 } = await supabase.from('mouvements_stock').insert({
    matiere_id: data.matiere_id,
    type: 'sortie',
    date_mvt: data.date_mvt,
    quantite: qte,
    bande_id: data.bande_id || null,
    reference: data.reference || null,
    observations: data.observations || null,
  })
  if (e1) return { ok: false, error: e1.message }

  // 3) UPDATE stock_actuel manuel
  const { error: eUpd } = await supabase
    .from('matieres_premieres')
    .update({ stock_actuel: stockActuel - qte })
    .eq('id', data.matiere_id)
  if (eUpd) return { ok: false, error: eUpd.message }

  revalidatePath('/stock')
  revalidatePath('/dashboard')
  return { ok: true }
}

// ============================================================================
// 3) NOUVELLE MATIÈRE (article stock)
// ============================================================================

export async function creerMatiere(data: NouvelleMatiereData) {
  const supabase = sb()

  const { error } = await supabase.from('matieres_premieres').insert({
    ferme_id: DEMO_FERME_ID,
    nom: data.nom,
    type: data.type,
    unite: data.unite || 'kg',
    seuil_alerte: data.seuil_alerte ?? null,
    cout_moyen_unite: data.cout_moyen_unite ?? null,
    stock_actuel: data.stock_actuel ?? 0,
    observations: data.observations || null,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/stock')
  revalidatePath('/dashboard')
  return { ok: true }
}
