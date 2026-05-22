/**
 * Smart Farm — Moteur de calcul nutritionnel (porc)
 * --------------------------------------------------
 * Fonctions PURES, sans dépendance React / Next / Supabase.
 * Testable directement (Node, vitest, jest, REPL...).
 *
 * Sources :
 *   - NRC 2012 « Nutrient Requirements of Swine » (National Academies Press)
 *   - INRA 2018 « Alimentation des animaux monogastriques : porc, lapin,
 *     volailles » (Quae)
 *   - IFIP « Mémento de l'éleveur de porc » (2013)
 *   - FAO Feedipedia (composition matières premières tropicales)
 *
 * Unités :
 *   - pourcentages : % matière brute (sauf indication)
 *   - énergie : kcal d'Énergie Métabolisable porc / kg MS
 *   - prix : FCFA (XOF) / kg
 */

/* -------------------------------------------------------------------------- */
/*  Types publics                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Stades physiologiques porc — réexportés depuis `nutrition-data.ts` qui est
 * la SEULE source de vérité (besoins, libellés, ration).
 */
export { STADES_PORC, LABEL_STADE, BESOINS_NUTRITIONNELS } from './nutrition-data'
export type { StadePorc, BesoinNutritionnel } from './nutrition-data'

import { BESOINS_NUTRITIONNELS, type StadePorc } from './nutrition-data'

/**
 * Ingrédient d'une formule.
 * `pourcentage` est exprimé en % de la formule totale (0–100).
 * Les autres valeurs sont la composition de la matière première PURE
 * (avant pondération).
 *
 * Tous les nutriments sont optionnels pour rester compatible avec le seed
 * en cours de chargement (colonnes peut-être absentes pendant C6-A).
 */
export type Ingredient = {
  id: string
  nom: string
  pourcentage: number
  mat_pct?: number | null
  em_porc_kcal_kg?: number | null
  lysine_pct?: number | null
  methionine_pct?: number | null
  threonine_pct?: number | null
  tryptophane_pct?: number | null
  cystine_pct?: number | null
  calcium_pct?: number | null
  phosphore_pct?: number | null
  fibre_pct?: number | null
  prix_xof_kg?: number | null
}

/**
 * Résultat d'un calcul de mix.
 * Toutes les valeurs sont déjà pondérées (somme(pourcentage_i × valeur_i) / 100).
 */
export type MixNutrition = {
  totalPct: number
  mat_pct: number
  em_kcal_kg: number
  lysine_pct: number
  methionine_pct: number
  threonine_pct: number
  tryptophane_pct: number
  cystine_pct: number
  calcium_pct: number
  phosphore_pct: number
  fibre_pct: number
  cout_kg_xof: number
}

/**
 * Comparaison du mix calculé avec les besoins du stade cible.
 */
export type EcartNutriment = {
  nutrient: string
  valeur: number
  cible: number
  statut: 'ok' | 'sous' | 'sur'
  ecart_pct: number // (valeur - cible) / cible × 100
}

export type Conformite = {
  ok: boolean
  ecarts: EcartNutriment[]
}

/* -------------------------------------------------------------------------- */
/*  Besoins nutritionnels par stade                                           */
/* -------------------------------------------------------------------------- */

/**
 * Les besoins par stade sont définis dans `nutrition-data.ts` (source unique,
 * alignée NRC 2012 tables 17-1 / 17-7). On ne duplique plus ici.
 *
 * Les seuils Ca et P sont des minima absolus. Le ratio Ca/P doit rester
 * dans la fenêtre 1.1 – 1.4 pour une absorption optimale.
 */

/* -------------------------------------------------------------------------- */
/*  Helpers internes                                                          */
/* -------------------------------------------------------------------------- */

function n(v: number | null | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : 0
}

/** Arrondi 2 décimales en valeur stable. */
function r2(x: number): number {
  return Math.round(x * 100) / 100
}

/* -------------------------------------------------------------------------- */
/*  computeMixNutrition                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Calcule la composition nutritionnelle pondérée d'un mix.
 *
 * Formule : valeur_mix = Σ (pourcentage_i × valeur_i) / 100
 *
 * Exemple de référence (test d'intégration) :
 *   60% maïs (MAT 8%) + 30% tourteau soja (MAT 47%) + 10% prémix (MAT 0%)
 *   → MAT mix = 0.6×8 + 0.3×47 + 0.1×0 = 4.8 + 14.1 + 0 = 18.9 %
 */
export function computeMixNutrition(ingredients: Ingredient[]): MixNutrition {
  let totalPct = 0
  let mat = 0
  let em = 0
  let lys = 0
  let met = 0
  let thr = 0
  let trp = 0
  let cys = 0
  let ca = 0
  let p = 0
  let fib = 0
  let cout = 0

  for (const ing of ingredients) {
    const pct = n(ing.pourcentage)
    if (pct <= 0) continue
    totalPct += pct
    mat  += pct * n(ing.mat_pct)
    em   += pct * n(ing.em_porc_kcal_kg)
    lys  += pct * n(ing.lysine_pct)
    met  += pct * n(ing.methionine_pct)
    thr  += pct * n(ing.threonine_pct)
    trp  += pct * n(ing.tryptophane_pct)
    cys  += pct * n(ing.cystine_pct)
    ca   += pct * n(ing.calcium_pct)
    p    += pct * n(ing.phosphore_pct)
    fib  += pct * n(ing.fibre_pct)
    cout += pct * n(ing.prix_xof_kg)
  }

  return {
    totalPct: r2(totalPct),
    mat_pct:         r2(mat  / 100),
    em_kcal_kg:      Math.round(em / 100),
    lysine_pct:      r2(lys  / 100),
    methionine_pct:  r2(met  / 100),
    threonine_pct:   r2(thr  / 100),
    tryptophane_pct: r2(trp  / 100),
    cystine_pct:     r2(cys  / 100),
    calcium_pct:     r2(ca   / 100),
    phosphore_pct:   r2(p    / 100),
    fibre_pct:       r2(fib  / 100),
    cout_kg_xof:     r2(cout / 100),
  }
}

/* -------------------------------------------------------------------------- */
/*  compareWithRequirements                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Compare la composition d'un mix aux besoins minimaux du stade.
 *
 * Statut par nutriment (minima → mat, em, lys, met, ca, p) :
 *   - 'sous' : valeur < cible × 0.95 (déficit > 5%)
 *   - 'ok'   : valeur dans la fenêtre [cible × 0.95, cible × 1.10]
 *   - 'sur'  : valeur > cible × 1.10 (surdosage > 10%)
 *
 * Cas particuliers :
 *   - Ratio Ca/P : 'sous' si <1.1, 'sur' si >1.4, sinon 'ok' (fenêtre
 *     physiologique d'absorption optimale, NRC 2012).
 *   - Fibre : seuil MAXIMUM `fibre_max_pct`. 'sur' si valeur > max, sinon 'ok'.
 *
 * `ok` global = aucun nutriment en statut 'sous' ni 'sur' déséquilibrant
 *  (Ca/P et fibre contribuent au verdict global).
 */
export function compareWithRequirements(
  mix: MixNutrition,
  stade: StadePorc,
): Conformite {
  const b = BESOINS_NUTRITIONNELS[stade]

  const rows: Array<{ key: string; label: string; val: number; cible: number }> = [
    { key: 'mat',   label: 'MAT (protéine)',  val: mix.mat_pct,        cible: b.mat_min_pct        },
    { key: 'em',    label: 'Énergie EM',      val: mix.em_kcal_kg,     cible: b.em_min_kcal_kg     },
    { key: 'lys',   label: 'Lysine SID',      val: mix.lysine_pct,     cible: b.lysine_min_pct     },
    { key: 'met',   label: 'Méthionine SID',  val: mix.methionine_pct, cible: b.methionine_min_pct },
    { key: 'ca',    label: 'Calcium',         val: mix.calcium_pct,    cible: b.calcium_min_pct    },
    { key: 'p',     label: 'Phosphore',       val: mix.phosphore_pct,  cible: b.phosphore_min_pct  },
  ]

  const ecarts: EcartNutriment[] = rows.map((row) => {
    const ecart_pct = row.cible > 0
      ? ((row.val - row.cible) / row.cible) * 100
      : 0
    let statut: EcartNutriment['statut']
    if (row.val < row.cible * 0.95) statut = 'sous'
    else if (row.val > row.cible * 1.10) statut = 'sur'
    else statut = 'ok'
    return {
      nutrient: row.label,
      valeur: r2(row.val),
      cible: r2(row.cible),
      statut,
      ecart_pct: r2(ecart_pct),
    }
  })

  /* ----- Ratio Ca/P (fenêtre 1.1 – 1.4) ----- */
  const ratioCaP = mix.phosphore_pct > 0
    ? mix.calcium_pct / mix.phosphore_pct
    : 0
  const cibleCaP = 1.25 // milieu de fenêtre 1.1–1.4
  let statutCaP: EcartNutriment['statut']
  if (ratioCaP > 0 && ratioCaP < 1.1) statutCaP = 'sous'
  else if (ratioCaP > 1.4) statutCaP = 'sur'
  else statutCaP = 'ok'
  ecarts.push({
    nutrient: 'Ratio Ca/P',
    valeur: r2(ratioCaP),
    cible: cibleCaP,
    statut: statutCaP,
    ecart_pct: cibleCaP > 0 ? r2(((ratioCaP - cibleCaP) / cibleCaP) * 100) : 0,
  })

  /* ----- Fibre (cellulose brute, plafond `fibre_max_pct`) ----- */
  const fibreMax = b.fibre_max_pct
  const statutFibre: EcartNutriment['statut'] =
    mix.fibre_pct > fibreMax ? 'sur' : 'ok'
  ecarts.push({
    nutrient: 'Fibre (max)',
    valeur: r2(mix.fibre_pct),
    cible: r2(fibreMax),
    statut: statutFibre,
    ecart_pct: fibreMax > 0 ? r2(((mix.fibre_pct - fibreMax) / fibreMax) * 100) : 0,
  })

  // Verdict global : aucun déficit (sous) ET aucun déséquilibre Ca/P ou
  // dépassement de fibre (sur). Les 'sur' sur les minima nutritionnels restent
  // tolérés car ils ne sont pas bloquants pour l'animal.
  const ok = ecarts.every((e) => {
    if (e.statut === 'sous') return false
    if (e.statut === 'sur' && (e.nutrient === 'Ratio Ca/P' || e.nutrient === 'Fibre (max)')) return false
    return true
  })
  return { ok, ecarts }
}

/* -------------------------------------------------------------------------- */
/*  Préréglages « formules type » (4 mix de départ)                           */
/* -------------------------------------------------------------------------- */

/**
 * Tokens textuels pour retrouver les matières premières dans le catalogue
 * de la ferme — case-insensitive, recherchés via `nom.toLowerCase().includes`.
 * On reste tolérant : si le catalogue local n'a pas l'item, on ignore.
 */
export type PresetIngredient = { match: string; pct: number }
export type PresetFormule = {
  key: string
  label: string
  description: string
  stade: StadePorc
  ingredients: PresetIngredient[]
}

export const PRESETS_FORMULES: PresetFormule[] = [
  {
    key: 'porcelet_1er_age',
    label: 'Porcelet 1er âge type',
    description: '80% concentré industriel + 20% maïs',
    stade: 'porcelet_1',
    ingredients: [
      { match: 'concentré', pct: 80 },
      { match: 'maïs',      pct: 20 },
    ],
  },
  {
    key: 'croissance_mais_soja',
    label: 'Croissance maïs/soja/son',
    description: '60% maïs + 22% tourteau soja + 15% son blé + 3% prémix/CaCO3',
    stade: 'croissance',
    ingredients: [
      { match: 'maïs',       pct: 60 },
      { match: 'soja',       pct: 22 },
      { match: 'son de blé', pct: 15 },
      { match: 'prémix',     pct: 3  },
    ],
  },
  {
    key: 'finition_manioc',
    label: 'Finition manioc/tourteau',
    description: '50% maïs + 20% manioc + 20% tourteau soja + 10% son',
    stade: 'finition',
    ingredients: [
      { match: 'maïs',    pct: 50 },
      { match: 'manioc',  pct: 20 },
      { match: 'soja',    pct: 20 },
      { match: 'son',     pct: 10 },
    ],
  },
  {
    key: 'truie_allaitante',
    label: 'Truie allaitante',
    description: '50% maïs + 25% tourteau soja + 15% son blé + 5% farine poisson + 5% prémix',
    stade: 'allaitante',
    ingredients: [
      { match: 'maïs',           pct: 50 },
      { match: 'soja',           pct: 25 },
      { match: 'son de blé',     pct: 15 },
      { match: 'farine de poisson', pct: 5 },
      { match: 'prémix',         pct: 5 },
    ],
  },
]

/* -------------------------------------------------------------------------- */
/*  Ratios acides aminés idéaux (NRC 2012)                                    */
/* -------------------------------------------------------------------------- */

/**
 * Stade cible pour l'évaluation des ratios AA (mapping plus pédagogique que
 * `StadePorc` brut — un stade `StadePorc` peut donner plusieurs cibles AA selon
 * la phase physiologique).
 */
export type StadeRatioAA = 'croissance' | 'finition' | 'gestation' | 'lactation'

/**
 * Fenêtres cibles « ratios AA idéaux » (NRC 2012, Tables 17-1 / 17-7).
 *   - Thr / Lys SID : 65-67 % gestation, 62-65 % croissance/lactation
 *   - Trp / Lys SID : 18-22 %
 *   - (Met+Cys) / Lys SID : 55-60 %
 *   - Lys / EM (g/Mcal) : 2.8 - 3.5 selon stade
 *
 * Format : `[min, max]` en pourcentage (sauf `lys_sur_em` en g/Mcal).
 */
export const CIBLES_RATIOS_AA: Record<
  StadeRatioAA,
  {
    thr_sur_lys:     readonly [number, number]
    trp_sur_lys:     readonly [number, number]
    met_cys_sur_lys: readonly [number, number]
    lys_sur_em:      readonly [number, number]
  }
> = {
  croissance: { thr_sur_lys: [62, 65], trp_sur_lys: [18, 22], met_cys_sur_lys: [55, 60], lys_sur_em: [3.0, 3.5] },
  finition:   { thr_sur_lys: [65, 67], trp_sur_lys: [18, 22], met_cys_sur_lys: [55, 60], lys_sur_em: [2.8, 3.2] },
  gestation:  { thr_sur_lys: [65, 67], trp_sur_lys: [19, 22], met_cys_sur_lys: [55, 60], lys_sur_em: [2.8, 3.0] },
  lactation:  { thr_sur_lys: [62, 65], trp_sur_lys: [18, 20], met_cys_sur_lys: [55, 58], lys_sur_em: [3.2, 3.5] },
}

/** Résultat du calcul des ratios AA d'une formulation. */
export type RatiosAA = {
  /** Thréonine / Lysine en %. `null` si lysine ou thréonine manquante. */
  thr_sur_lys_pct:        number | null
  /** Tryptophane / Lysine en %. */
  trp_sur_lys_pct:        number | null
  /** (Méthionine + Cystine) / Lysine en %. */
  met_cys_sur_lys_pct:    number | null
  /** Lysine / EM en g / Mcal. */
  lys_sur_em_g_par_mcal:  number | null
}

/**
 * Source partielle pour les ratios AA : `MixNutrition` (résultat de
 * `computeMixNutrition`) OU directement une formulation calculée stockée en
 * base avec les mêmes clés. Toutes les valeurs sont optionnelles pour rester
 * tolérant aux seeds incomplets (Thr/Trp/Cys NULL sur arachide / coton…).
 */
export type FormulationCalculee = {
  lysine_pct?:      number | null
  methionine_pct?:  number | null
  threonine_pct?:   number | null
  tryptophane_pct?: number | null
  cystine_pct?:     number | null
  em_porc_kcal_kg?: number | null
  em_kcal_kg?:      number | null // alias accepté
}

/**
 * Calcule les ratios AA idéaux d'une formulation (NRC 2012).
 *
 * Convention : si la lysine est nulle / manquante, ou si l'AA comparé est
 * manquant, le ratio correspondant est `null` (et NON 0 — l'UI doit afficher
 * "—" plutôt qu'un 0 trompeur).
 *
 * Formules :
 *   - thr_sur_lys_pct     = Thr / Lys × 100
 *   - trp_sur_lys_pct     = Trp / Lys × 100
 *   - met_cys_sur_lys_pct = (Met + Cys) / Lys × 100
 *   - lys_sur_em (g/Mcal) = (Lys% × 10) / (EM kcal/kg ÷ 1000)
 *                         = Lys% × 10 000 / EM kcal/kg
 */
export function calculerRatiosAA(formulation: FormulationCalculee): RatiosAA {
  const lys = formulation.lysine_pct
  const thr = formulation.threonine_pct
  const trp = formulation.tryptophane_pct
  const met = formulation.methionine_pct
  const cys = formulation.cystine_pct
  const em  = formulation.em_porc_kcal_kg ?? formulation.em_kcal_kg

  const lysOk = typeof lys === 'number' && lys > 0

  return {
    thr_sur_lys_pct:
      lysOk && typeof thr === 'number'
        ? r2((thr / (lys as number)) * 100)
        : null,
    trp_sur_lys_pct:
      lysOk && typeof trp === 'number'
        ? r2((trp / (lys as number)) * 100)
        : null,
    met_cys_sur_lys_pct:
      lysOk && typeof met === 'number' && typeof cys === 'number'
        ? r2(((met + cys) / (lys as number)) * 100)
        : null,
    lys_sur_em_g_par_mcal:
      lysOk && typeof em === 'number' && em > 0
        ? r2(((lys as number) * 10) / (em / 1000))
        : null,
  }
}

/* -------------------------------------------------------------------------- */
/*  Heat stress tropical (CI saison chaude, T > 27°C)                         */
/* -------------------------------------------------------------------------- */

/**
 * Ajustements nutritionnels saison chaude tropicale (NRC 2012 + recommandations
 * IFIP zones tropicales). À appliquer comme multiplicateur sur les besoins de
 * base lorsque T° ambiante > 27 °C.
 *
 * - Truies en lactation : -15 % d'ingéré (compensé par densification),
 *                          +50 % de besoin en eau
 * - Truies en gestation : -8 % d'ingéré, +30 % de besoin en eau
 * - Densités recommandées en chaud : EM ≥ 3 200 kcal/kg, Lys SID ≥ 1.10 %
 *   (vs 3 000 kcal/kg et 0.95 % en conditions tempérées)
 */
export const AJUSTEMENT_HEAT_STRESS = {
  /** Multiplicateur sur l'ingéré truie allaitante en saison chaude (−15 %). */
  ingestion_aliment_truie_lactation: 0.85,
  /** Multiplicateur sur l'ingéré truie gestante (−8 %). */
  ingestion_aliment_truie_gestation: 0.92,
  /** Multiplicateur sur le besoin eau truie allaitante (+50 %). */
  besoin_eau_truie_lactation: 1.50,
  /** Multiplicateur sur le besoin eau truie gestante (+30 %). */
  besoin_eau_truie_gestation: 1.30,
  /** Densité énergétique recommandée saison chaude (vs 3 000 standard). */
  densite_em_recommandee_kcal_kg: 3200,
  /** Densité Lys SID recommandée saison chaude en % (vs 0.95 standard). */
  densite_lys_sid_recommandee_pct: 1.10,
} as const

/**
 * Recommandations terrain — format clé / message — pour la conduite en saison
 * chaude (≥ 27 °C ambiant). Affichables tel quel dans une carte « conseils ».
 */
export const RECOMMANDATIONS_HEAT_STRESS: readonly string[] = [
  'Distribuer 2/3 de la ration tôt le matin (4h-7h) et 1/3 le soir (18h-20h)',
  'Vérifier débit abreuvoir : ≥ 4 L/min pour truies en lactation',
  'Densifier ration : EM ≥ 3200 kcal/kg, Lys SID ≥ 1.1 %',
  'Surveiller T° truies en lactation : alerte si T°>39.5°C, urgence si >40°C',
  'Brumisateurs + ventilateurs en maternité dès T°>30°C',
] as const

