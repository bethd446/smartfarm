import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

import { Button } from '@/components/ui/button'
import { ChevronLeft, Calculator } from 'lucide-react'

import {
  FormulationCalculator,
  type MatierePremiereCatalog,
} from '../_calculator'

export const dynamic = 'force-dynamic'

/**
 * Page éditeur calculateur de formule.
 * Server Component : précharge le catalogue de matières premières puis
 * délègue toute l'interactivité au composant client `<FormulationCalculator>`.
 *
 * Tolérant à l'état du seed C6-A : `select('*')` + champs nutritionnels
 * optionnels côté client si les colonnes n'existent pas encore.
 */
export default async function NouvelleFormulationPage() {
  const sb = await createClient()

  // select('*') : on prend tout, le composant client se débrouille avec les
  // colonnes nutritionnelles si elles sont absentes (cf. C6-A en cours).
  const { data, error } = await sb
    .from('matieres_premieres')
    .select('*')
    .is('deleted_at', null)
    .order('nom')

  const catalog: MatierePremiereCatalog[] = (data ?? []).map((m: any) => ({
    id: m.id,
    nom: m.nom,
    categorie_nutritionnelle: m.categorie_nutritionnelle ?? null,
    mat_pct: m.mat_pct ?? null,
    em_porc_kcal_kg: m.em_porc_kcal_kg ?? null,
    lysine_pct: m.lysine_pct ?? null,
    methionine_pct: m.methionine_pct ?? null,
    calcium_pct: m.calcium_pct ?? null,
    phosphore_pct: m.phosphore_pct ?? null,
    fibre_pct: m.fibre_pct ?? null,
    prix_indicatif_xof_kg: m.prix_indicatif_xof_kg ?? null,
    cout_moyen_unite: m.cout_moyen_unite ?? null,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/alimentation/formulation"
            className="text-xs text-[var(--sf-muted,#5C5346)] inline-flex items-center gap-1 mb-1 hover:underline"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Formulations
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calculator className="h-7 w-7 text-[var(--sf-accent-warm,#A16207)]" />
            Nouvelle formulation
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Calculateur live · besoins NRC 2012 / INRA 2018 · devise FCFA
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-[var(--sf-danger-border,#E29A92)] bg-[var(--sf-danger-bg,#F4CCC8)] p-4 text-sm text-[var(--sf-danger-ink,#5A1F19)]">
          Erreur de chargement du catalogue : {error.message}
        </div>
      ) : null}

      {catalog.length === 0 ? (
        <div className="rounded-lg border border-[var(--sf-line,#E7E5E4)] bg-[var(--sf-surface-1)] p-4 text-sm text-[var(--sf-ink-secondary,#44403C)]">
          Aucune matière première dans le catalogue. Ajoute-en depuis{' '}
          <Link
            href="/alimentation/matieres"
            className="font-medium text-[var(--sf-accent-warm,#A16207)] hover:underline"
          >
            /alimentation/matieres
          </Link>{' '}
          puis reviens ici.
        </div>
      ) : (
        <FormulationCalculator catalog={catalog} />
      )}
    </div>
  )
}
