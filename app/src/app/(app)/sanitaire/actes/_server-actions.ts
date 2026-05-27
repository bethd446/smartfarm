'use server'

/**
 * B3 — Server actions actes sanitaires.
 * - creerActeSanitaire : INSERT + revalidate + garde-fou Ucaphoscal 5j max.
 *
 * Garde-fous métier :
 *  - Cible exclusive (Zod refine)
 *  - dose > 0 (Zod)
 *  - duree_jours 1-30 (Zod) + 5 jours max si produit "Ucaphoscal" (serveur)
 *  - voie & unite_dose dans enums (Zod)
 *
 * RLS multi-tenant : ferme_id ∈ user_farms (helper getFermeId).
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { schemaActeSanitaire, type ActeSanitaireInput } from './_schemas'

export type ActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string }

export async function creerActeSanitaire(
  data: ActeSanitaireInput,
): Promise<ActionResult> {
  try {
    const parsed = schemaActeSanitaire.safeParse(data)
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Données invalides',
      }
    }

    const sb = await createClient()
    const ferme_id = await getFermeId()

    // Sécurité IDOR cross-ferme : la RLS sur actes_sanitaires valide ferme_id
    // mais PAS les FK latérales (animal_id / bande_id). Un attaquant avec 2 comptes
    // pourrait sinon créer un acte sur sa ferme A pointant un animal de ferme B.
    // → vérif d'appartenance via la RLS SELECT (qui filtre ferme_id elle-même)
    //   sur animaux/bandes : si maybeSingle() renvoie null, le FK n'appartient pas.
    if (parsed.data.animal_id) {
      const { data: animal } = await sb
        .from('animaux')
        .select('id')
        .eq('id', parsed.data.animal_id)
        .maybeSingle()
      if (!animal) {
        return { ok: false, error: 'Animal introuvable ou hors périmètre.' }
      }
    }
    if (parsed.data.bande_id) {
      const { data: bande } = await sb
        .from('bandes')
        .select('id')
        .eq('id', parsed.data.bande_id)
        .maybeSingle()
      if (!bande) {
        return { ok: false, error: 'Bande introuvable ou hors périmètre.' }
      }
    }

    // Garde-fou métier : Ucaphoscal max 5 jours (risque toxicité cuivre)
    // → on lit le nom du produit pour valider.
    const { data: produit, error: errProd } = await sb
      .from('veterinaires_standards')
      .select('id, nom, type, max_jours')
      .eq('id', parsed.data.produit_id)
      .maybeSingle()

    if (errProd) {
      return {
        ok: false,
        error: `Référentiel véto inaccessible : ${errProd.message}`,
      }
    }
    if (!produit) {
      return {
        ok: false,
        error: 'Produit introuvable dans le référentiel véto',
      }
    }

    // Max jours du référentiel (ex: Ucaphoscal = 5)
    const maxJ = (produit as { max_jours: number | null }).max_jours
    const nom = (produit as { nom: string }).nom
    if (maxJ !== null && parsed.data.duree_jours > maxJ) {
      const isUcaphoscal = nom.toLowerCase().includes('ucaphoscal')
      const raison = isUcaphoscal
        ? 'risque toxicité cuivre'
        : `limite référentiel ${nom}`
      return {
        ok: false,
        error: `Maximum ${maxJ} jours pour ${nom} — ${raison}`,
      }
    }

    // Récupération user_id pour traçabilité opérateur
    const {
      data: { user },
    } = await sb.auth.getUser()

    const payload: Record<string, unknown> = {
      ferme_id,
      animal_id: parsed.data.animal_id || null,
      bande_id: parsed.data.bande_id || null,
      produit_id: parsed.data.produit_id,
      dose: parsed.data.dose,
      unite_dose: parsed.data.unite_dose,
      voie: parsed.data.voie,
      duree_jours: parsed.data.duree_jours,
      motif: parsed.data.motif || null,
      ordonnance_url: parsed.data.ordonnance_url || null,
      operateur_user_id: user?.id ?? null,
      date_administration: parsed.data.date_administration,
    }
    if (parsed.data.delai_attente_viande_jours !== undefined) {
      payload.delai_attente_viande_jours = parsed.data.delai_attente_viande_jours
    }
    // Sinon : le trigger SQL copy_delai copiera depuis veterinaires_standards.delai_attente_j

    const { data: inserted, error } = await sb
      .from('actes_sanitaires')
      .insert(payload)
      .select('id')
      .single()

    if (error) {
      // Mapping erreurs Postgres → FR métier
      const fr =
        error.code === '23502'
          ? 'Champ obligatoire manquant.'
          : error.code === '23514'
            ? 'Données incohérentes (cible XOR ou dose).'
            : error.code === '23503'
              ? 'Référence invalide (animal/bande/produit supprimé ?).'
              : error.code === '42501'
                ? 'Accès refusé (RLS).'
                : `Erreur enregistrement : ${error.message}`
      return { ok: false, error: fr }
    }

    revalidatePath('/sanitaire/actes')
    revalidatePath('/sanitaire')
    if (parsed.data.animal_id) {
      revalidatePath(`/cheptel/${parsed.data.animal_id}`)
    }
    return { ok: true, id: (inserted as { id: string } | null)?.id }
  } catch (e) {
    console.error('[creerActeSanitaire] unexpected:', e)
    const msg = e instanceof Error ? e.message : 'Erreur inattendue'
    return { ok: false, error: msg }
  }
}
