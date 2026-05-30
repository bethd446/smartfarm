import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PiggyBank, ArrowLeft, Scale, Heart, Stethoscope, ArrowRightLeft, Clock, Zap, Skull, Target, GitBranch, Trophy } from 'lucide-react'
import Link from 'next/link'
import { AnimalTabs } from './_tabs'
import { saisirBcsRapide, uploadPhotoAnimal } from './_actions'
import { DialogChangerStade } from './_dialog-changer-stade'
import { AnimalPhotoUpload } from '@/components/animal-photo-upload'
import { QrCode } from 'lucide-react'
import {
  KpiTechCard,
  toneIssf,
  toneProductivite,
  toneTmm,
  toneNesVivants,
} from '@/components/kpi/kpi-tech-card'
import { EmptyState } from '@/components/ui/empty-state'
import { FormattedDateTime } from '@/components/ui/formatted-date'
import { HistoriquePoids } from './_historique-poids'

/**
 * Page fiche détail d'un animal.
 * Structure :
 *  - Header : tag, nom, race, sexe, âge, catégorie, statut
 *  - KPIs : poids actuel, GMQ, nb portées (si truie), date dernière saillie/mise-bas
 *  - 4 Onglets : Pesées, Reproduction (si femelle), Santé, Mouvements
 *  - Actions rapides en haut : Peser, Vacciner, Soigner, Marquer mort
 */

function computeAge(dateNaissance: string | null): string {
  if (!dateNaissance) return '—'
  const d = new Date(dateNaissance)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (days < 60) return `${days}j`
  const weeks = Math.floor(days / 7)
  if (weeks < 52) return `${weeks}sem`
  const years = Math.floor(days / 365.25)
  const restWeeks = Math.floor((days % 365.25) / 7)
  return restWeeks > 0 ? `${years}an ${restWeeks}sem` : `${years}an`
}

export default async function AnimalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const sb = await createClient()
  const { id: animalId } = await params

  // === Fetch animal + race ===
  const { data: animal, error } = await sb
    .from('animaux')
    .select('*, races(nom)')
    .eq('id', animalId)
    .maybeSingle()

  if (error || !animal) {
    return notFound()
  }

  // === Fetch stade reproducteur (vue v_animaux_stade_repro, fallback graceful si absente) ===
  let stadeRepro: { stade_repro: string; jours_stade: number | null } | null = null
  {
    const { data: stadeRow, error: stadeErr } = await sb
      .from('v_animaux_stade_repro')
      .select('stade_repro, jours_stade')
      .eq('id', animalId)
      .maybeSingle()
    if (!stadeErr && stadeRow) {
      stadeRepro = stadeRow as { stade_repro: string; jours_stade: number | null }
    }
  }

  // === Fetch last pesée + nb pesées ===
  // Note: avec { count: 'exact', head: true }, supabase-js renvoie { data: null, count: <n> }
  // donc on déstructure 'count' (pas 'data') sur la 2e requête.
  const [{ data: pesees }, { count: peseeCount }] = await Promise.all([
    sb.from('pesees').select('*').eq('animal_id', animalId).order('date_pesee', { ascending: false }).limit(1),
    sb.from('pesees').select('*', { count: 'exact', head: true }).eq('animal_id', animalId),
  ])
  const dernierePesee = pesees?.[0] ?? null
  const nbPesees: number = peseeCount ?? 0

  // === GMQ (si ≥2 pesées) ===
  let gmq: number | null = null
  if (nbPesees >= 2) {
    const { data: premierePesee } = await sb
      .from('pesees')
      .select('*')
      .eq('animal_id', animalId)
      .order('date_pesee', { ascending: true })
      .limit(1)
    if (premierePesee && premierePesee[0] && dernierePesee) {
      const p1 = premierePesee[0]
      const p2 = dernierePesee
      const deltaKg = p2.poids_kg - p1.poids_kg
      const d1 = new Date(p1.date_pesee)
      const d2 = new Date(p2.date_pesee)
      const deltaJours = Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24))
      if (deltaJours > 0) {
        gmq = Math.round((deltaKg / deltaJours) * 1000) / 1000
      }
    }
  }

  // === Reproduction (truie) : nb portées, dernière saillie, dernière mise-bas ===
  let nbPortees: number | null = null
  let derniereSaillie: any = null
  let derniereMiseBas: any = null
  let historiquePortees: any[] = []
  let bcsHistorique: Array<{
    date_obs: string
    bcs_truie: number
    evenement: string
  }> = []
  const isFemelle = animal.sexe === 'F' && (animal.categorie === 'truie' || animal.categorie === 'cochette')
  if (isFemelle) {
    const [
      { count: portees },
      { data: saillies },
      { data: misesBas },
      { data: portees_decomp },
      { data: bcs },
    ] = await Promise.all([
      sb.from('mises_bas').select('*', { count: 'exact', head: true }).eq('truie_id', animalId),
      sb
        .from('saillies')
        .select('*, verrat:verrat_id(tag,nom)')
        .eq('truie_id', animalId)
        .order('date_saillie', { ascending: false })
        .limit(1),
      sb
        .from('mises_bas')
        .select('*')
        .eq('truie_id', animalId)
        .order('date_mise_bas', { ascending: false })
        .limit(1),
      sb
        .from('mises_bas')
        .select(
          'id, date_mise_bas, nes_vivants, nes_morts, momifies, ecrases, poids_portee_kg, bcs_truie'
        )
        .eq('truie_id', animalId)
        .order('date_mise_bas', { ascending: false })
        .limit(10),
      sb
        .from('v_bcs_historique_truie')
        .select('date_obs, bcs_truie, evenement')
        .eq('truie_id', animalId)
        .order('date_obs', { ascending: false })
        .limit(20),
    ])
    nbPortees = portees ?? 0
    derniereSaillie = saillies?.[0] ?? null
    derniereMiseBas = misesBas?.[0] ?? null
    historiquePortees = portees_decomp ?? []
    bcsHistorique = (bcs ?? []) as any[]
  }

  // === V2-E : KPI techniques métier (truie uniquement) ===
  type KpiTechniques = {
    nb_mises_bas: number
    nb_sevrages: number
    nb_cycles_issf: number
    nes_totaux_moyen: number | null
    nes_vivants_moyen: number | null
    sevres_moyen: number | null
    issf_jours: number | null
    tmm_pct: number | null
    productivite_numerique: number | null
    pertes_lactation_pct: number | null
  }
  let kpiTech: KpiTechniques | null = null
  if (isFemelle) {
    const { data: kpiRows } = await sb
      .from('v_kpi_techniques_truie')
      .select(
        'nb_mises_bas, nb_sevrages, nb_cycles_issf, nes_totaux_moyen, nes_vivants_moyen, sevres_moyen, issf_jours, tmm_pct, productivite_numerique, pertes_lactation_pct',
      )
      .eq('truie_id', animalId)
      .maybeSingle()
    kpiTech = (kpiRows as unknown as KpiTechniques | null) ?? null
  }

  // === Vaccinations count ===
  const { count: nbVaccinations } = await sb
    .from('vaccinations')
    .select('*', { count: 'exact', head: true })
    .eq('animal_id', animalId)

  // === Traitements count ===
  const { count: nbTraitements } = await sb
    .from('traitements')
    .select('*', { count: 'exact', head: true })
    .eq('animal_id', animalId)

  // === F3 : Bâtiments ferme + mouvements de l'animal + bâtiment courant ===
  const [{ data: batiments }, { data: mouvements }, { data: batimentCourant }] =
    await Promise.all([
      sb
        .from('batiments')
        .select('id, nom, type')
        .is('deleted_at', null)
        .order('nom'),
      sb
        .from('mouvements')
        .select(
          'id, type, date_mouvement, batiment_source_id, batiment_dest_id, motif, effectif'
        )
        .eq('animal_id', animalId)
        .order('date_mouvement', { ascending: false })
        .limit(50),
      animal.batiment_id
        ? sb
            .from('batiments')
            .select('id, nom')
            .eq('id', animal.batiment_id)
            .maybeSingle()
        : Promise.resolve({ data: null as any }),
    ])
  const batimentSourceNom: string | null = (batimentCourant as any)?.nom ?? null

  // === H1 : Score reproducteur composite (truie active) ===
  type ScoreRow = {
    score_global: number | null
    classement: number | null
    total_truies_ferme: number | null
    nes_vivants_moyen: number | null
    vitalite: number | null
    surv_hors_ecrases: number | null
    issf_jours: number | null
    nb_portees: number | null
    sub_nv: number | null
    sub_vitalite: number | null
    sub_survie: number | null
    sub_issf: number | null
    sub_longevite: number | null
  }
  let scoreTruie: ScoreRow | null = null
  if (isFemelle && animal.categorie === 'truie' && animal.statut === 'actif') {
    const { data: scoreRow } = await sb
      .from('v_score_truie')
      .select(
        'score_global, classement, total_truies_ferme, nes_vivants_moyen, vitalite, surv_hors_ecrases, issf_jours, nb_portees, sub_nv, sub_vitalite, sub_survie, sub_issf, sub_longevite',
      )
      .eq('truie_id', animalId)
      .maybeSingle()
    scoreTruie = (scoreRow as ScoreRow | null) ?? null
  }

  const age = computeAge(animal.date_naissance)
  const raceNom = (animal.races as any)?.nom ?? '—'

  // Stade repro → variante Badge + texte (cf vue v_animaux_stade_repro).
  // Fallback : si vue absente OU stade inconnu OU animal non-truie → badge statut classique.
  const STADE_REPRO_CFG: Record<
    string,
    { variant: 'success' | 'warning' | 'outline' | 'secondary'; label: string; withJours: boolean }
  > = {
    gestante: { variant: 'success', label: 'GESTANTE', withJours: true },
    allaitante: { variant: 'warning', label: 'ALLAITANTE', withJours: true },
    vide: { variant: 'outline', label: 'VIDE', withJours: false },
    'pré-saillie': { variant: 'secondary', label: 'PRÉ-SAILLIE', withJours: false },
  }
  const stadeReproBadge = (() => {
    if (!isFemelle || !stadeRepro) return null
    const cfg = STADE_REPRO_CFG[stadeRepro.stade_repro]
    if (!cfg) return null
    const txt = cfg.withJours && stadeRepro.jours_stade != null
      ? `${cfg.label} J${stadeRepro.jours_stade}`
      : cfg.label
    return { variant: cfg.variant, text: txt }
  })()

  const eyebrowCls =
    "font-[family-name:var(--sf-font-display)] uppercase text-[11px] tracking-[0.18em] text-[var(--sf-muted)] font-bold"

  const displayKPI = (label: string, value: string | number, unit?: string) => (
    <div>
      <div className={eyebrowCls}>{label}</div>
      <div
        className="text-2xl font-bold tabular-nums text-[var(--sf-primary)]"
        style={{ fontFamily: 'var(--sf-font-display)' }}
      >
        {value}
        {unit ? <span className="text-base text-[var(--sf-muted)] ml-1">{unit}</span> : null}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 pb-12">
      {/* === HEADER : Breadcrumb + Titre === */}
      <div>
        <div className="mb-2">
          <Link
            href="/cheptel"
            className="inline-flex items-center gap-2 text-sm text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour au cheptel
          </Link>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4 flex-wrap">
            {/* H1 — Photo + upload (truie / cochette / verrat affichés, upload partout) */}
            <AnimalPhotoUpload
              animalId={animal.id}
              currentUrl={animal.photo_url ?? null}
              uploadAction={uploadPhotoAnimal}
            />
            <div>
            <h1
              className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)]"
              style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
            >
              <PiggyBank className="h-8 w-8 text-[var(--sf-primary)]" />
              {animal.tag}
            </h1>
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {animal.nom ? (
                <p className="text-lg text-[var(--sf-ink)]">{animal.nom}</p>
              ) : null}
              <Badge variant={animal.sexe === 'M' ? 'outline' : 'secondary'}>
                {animal.sexe === 'M' ? '♂ Mâle' : '♀ Femelle'}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {animal.categorie}
              </Badge>
              {stadeReproBadge ? (
                <Badge variant={stadeReproBadge.variant}>{stadeReproBadge.text}</Badge>
              ) : (
                <Badge variant={animal.statut === 'actif' ? 'success' : 'secondary'}>
                  {animal.statut}
                </Badge>
              )}
              {scoreTruie && scoreTruie.classement ? (
                <Link
                  href="/cheptel/classement-truies"
                  title="Voir le classement complet"
                >
                  <Badge variant="success" className="font-mono tabular-nums">
                    <Trophy className="h-3 w-3 mr-1" aria-hidden />#{scoreTruie.classement}
                    {scoreTruie.total_truies_ferme
                      ? ` / ${scoreTruie.total_truies_ferme}`
                      : ''}{' '}
                    truies
                  </Badge>
                </Link>
              ) : null}
            </div>
            <p className="text-sm text-[var(--sf-muted)] mt-1">
              {raceNom} · {age}
            </p>
            </div>
          </div>
          {/* Actions rapides */}
          <div className="flex gap-2 flex-wrap">
            <DialogChangerStade
              animalId={animalId}
              categorie={String(animal.categorie ?? '')}
              stadeActuel={String(animal.stade ?? '')}
            />
            {isFemelle ? (
              <Link href={`/cheptel/${animalId}/genealogie`}>
                <Button variant="outline" size="sm">
                  <GitBranch className="h-4 w-4 mr-2" />
                  Généalogie
                </Button>
              </Link>
            ) : null}
            <Link href={`/pesees?action=new&animal_id=${animalId}`}>
              <Button variant="outline" size="sm">
                <Scale className="h-4 w-4 mr-2" />
                Peser
              </Button>
            </Link>
            <Link href={`/sanitaire?action=vacciner&animal_id=${animalId}`}>
              <Button variant="outline" size="sm">
                <Heart className="h-4 w-4 mr-2" />
                Vacciner
              </Button>
            </Link>
            <Link href={`/sanitaire?action=soigner&animal_id=${animalId}`}>
              <Button variant="outline" size="sm">
                <Stethoscope className="h-4 w-4 mr-2" />
                Soigner
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* === KPIs CARDS === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            {displayKPI('Poids actuel', dernierePesee?.poids_kg ?? '—', dernierePesee ? 'kg' : '')}
          </CardContent>
        </Card>
        {gmq !== null ? (
          <Card>
            <CardContent className="p-5">{displayKPI('GMQ', gmq.toFixed(3), 'kg/j')}</CardContent>
          </Card>
        ) : null}
        {isFemelle && nbPortees !== null ? (
          <Card>
            <CardContent className="p-5">
              {displayKPI('Portées', nbPortees, nbPortees > 1 ? 'portées' : 'portée')}
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardContent className="p-5">
            {displayKPI('Pesées', nbPesees, nbPesees > 1 ? 'pesées' : 'pesée')}
          </CardContent>
        </Card>
      </div>

      {/* === HISTORIQUE PESÉES (Phase 4.D) === */}
      <HistoriquePoids animalId={animalId} animalTag={animal.tag} />

      {/* === REPRODUCTION SUMMARY (truie) === */}
      {isFemelle ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {derniereSaillie ? (
            <Card>
              <CardHeader>
                <div className={eyebrowCls}>Dernière saillie</div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--sf-ink)]">
                  <FormattedDateTime date={derniereSaillie.date_saillie} format="date" /> · {derniereSaillie.methode}
                </p>
                {derniereSaillie.verrat ? (
                  <p className="text-xs text-[var(--sf-muted)] mt-1">
                    Verrat : {derniereSaillie.verrat.nom ?? derniereSaillie.verrat.tag}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
          {derniereMiseBas ? (
            <Card>
              <CardHeader>
                <div className={eyebrowCls}>Dernière mise-bas</div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[var(--sf-ink)]">
                  <FormattedDateTime date={derniereMiseBas.date_mise_bas} format="date" /> · {derniereMiseBas.nes_vivants}{' '}
                  vivants / {derniereMiseBas.nes_totaux} totaux
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {/* === V2-E : PERFORMANCES TECHNIQUES MÉTIER (truie) === */}
      {isFemelle ? (
        <section className="space-y-3">
          <h2 className={eyebrowCls}>Performances techniques</h2>
          {kpiTech && (kpiTech.nb_mises_bas > 0 || kpiTech.nb_sevrages > 0) ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiTechCard
                  icon={Clock}
                  label="ISSF"
                  sub="sevrage → saillie fécondante"
                  value={kpiTech.issf_jours}
                  unit="j"
                  target={
                    kpiTech.nb_cycles_issf > 0
                      ? `sur ${kpiTech.nb_cycles_issf} cycle${kpiTech.nb_cycles_issf > 1 ? 's' : ''}`
                      : 'Pas assez de cycles'
                  }
                  tone={toneIssf(kpiTech.issf_jours)}
                  digits={1}
                />
                <KpiTechCard
                  icon={Zap}
                  label="Productivité num."
                  sub="porc. sevrés / an"
                  value={kpiTech.productivite_numerique}
                  unit=""
                  target="cible ≥ 22"
                  tone={toneProductivite(kpiTech.productivite_numerique)}
                  digits={1}
                />
                <KpiTechCard
                  icon={Skull}
                  label="TMM"
                  sub="mortalité maternité"
                  value={kpiTech.tmm_pct}
                  unit="%"
                  target="cible ≤ 8 %"
                  tone={toneTmm(kpiTech.tmm_pct)}
                  digits={1}
                />
                <KpiTechCard
                  icon={Target}
                  label="Nés vivants / portée"
                  sub={`${kpiTech.nb_mises_bas} mise${kpiTech.nb_mises_bas > 1 ? 's' : ''}-bas`}
                  value={kpiTech.nes_vivants_moyen}
                  unit=""
                  target="cible ≥ 12"
                  tone={toneNesVivants(kpiTech.nes_vivants_moyen)}
                  digits={1}
                />
              </div>
              {/* Détails complémentaires */}
              {(kpiTech.sevres_moyen !== null || kpiTech.pertes_lactation_pct !== null) ? (
                <Card>
                  <CardContent className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <div className={eyebrowCls}>Sevrés / portée</div>
                      <div className="text-xl font-bold tabular-nums text-[var(--sf-ink)]">
                        {kpiTech.sevres_moyen !== null ? Number(kpiTech.sevres_moyen).toFixed(1) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className={eyebrowCls}>Nés totaux / portée</div>
                      <div className="text-xl font-bold tabular-nums text-[var(--sf-ink)]">
                        {kpiTech.nes_totaux_moyen !== null ? Number(kpiTech.nes_totaux_moyen).toFixed(1) : '—'}
                      </div>
                    </div>
                    <div>
                      <div className={eyebrowCls}>Pertes en lactation</div>
                      <div className="text-xl font-bold tabular-nums text-[var(--sf-ink)]">
                        {kpiTech.pertes_lactation_pct !== null
                          ? `${Number(kpiTech.pertes_lactation_pct).toFixed(1)} %`
                          : '—'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <EmptyState
              icon={Target}
              title="Pas assez de cycles"
              description="Cette truie n'a pas encore assez de mise-bas / sevrages pour calculer ses KPI techniques."
            />
          )}
        </section>
      ) : null}

      {/* === H1 : Score reproducteur composite (truie active uniquement) === */}
      {scoreTruie ? (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-2 flex-wrap">
            <h2 className={eyebrowCls}>Score reproducteur (IFIP composite)</h2>
            <Link
              href="/cheptel/classement-truies"
              className="text-xs text-[var(--sf-primary)] hover:underline inline-flex items-center gap-1"
            >
              <Trophy className="h-3 w-3" aria-hidden />
              Voir le classement complet
            </Link>
          </div>
          <Card>
            <CardContent className="p-5 grid grid-cols-2 md:grid-cols-6 gap-4 items-center">
              <div className="md:col-span-2">
                <div className={eyebrowCls}>Score global</div>
                <div
                  className="text-5xl font-bold tabular-nums text-[var(--sf-primary)]"
                  style={{ fontFamily: 'var(--sf-font-display)' }}
                >
                  {scoreTruie.score_global !== null ? Number(scoreTruie.score_global).toFixed(1) : '—'}
                  <span className="text-xl text-[var(--sf-muted)] ml-1">/ 100</span>
                </div>
                {scoreTruie.classement ? (
                  <p className="text-xs text-[var(--sf-muted)] mt-1">
                    Classement&nbsp;: <strong className="text-[var(--sf-ink)]">#{scoreTruie.classement}</strong>
                    {scoreTruie.total_truies_ferme
                      ? ` sur ${scoreTruie.total_truies_ferme} truies actives`
                      : ''}
                  </p>
                ) : null}
              </div>
              <div>
                <div className={eyebrowCls}>NV / portée</div>
                <div className="text-xl font-bold tabular-nums text-[var(--sf-ink)]">
                  {scoreTruie.nes_vivants_moyen !== null
                    ? Number(scoreTruie.nes_vivants_moyen).toFixed(1)
                    : '—'}
                </div>
                <p className="text-[10px] text-[var(--sf-muted)]">
                  {scoreTruie.sub_nv !== null ? `${Number(scoreTruie.sub_nv).toFixed(1)} / 30 pts` : '—'}
                </p>
              </div>
              <div>
                <div className={eyebrowCls}>Vitalité</div>
                <div className="text-xl font-bold tabular-nums text-[var(--sf-ink)]">
                  {scoreTruie.vitalite !== null ? Number(scoreTruie.vitalite).toFixed(1) : '—'}
                </div>
                <p className="text-[10px] text-[var(--sf-muted)]">
                  {scoreTruie.sub_vitalite !== null ? `${Number(scoreTruie.sub_vitalite).toFixed(1)} / 20 pts` : '—'}
                </p>
              </div>
              <div>
                <div className={eyebrowCls}>Survie h. écr.</div>
                <div className="text-xl font-bold tabular-nums text-[var(--sf-ink)]">
                  {scoreTruie.surv_hors_ecrases !== null
                    ? `${(Number(scoreTruie.surv_hors_ecrases) * 100).toFixed(0)} %`
                    : '—'}
                </div>
                <p className="text-[10px] text-[var(--sf-muted)]">
                  {scoreTruie.sub_survie !== null ? `${Number(scoreTruie.sub_survie).toFixed(1)} / 25 pts` : '—'}
                </p>
              </div>
              <div>
                <div className={eyebrowCls}>Portées</div>
                <div className="text-xl font-bold tabular-nums text-[var(--sf-ink)]">
                  {scoreTruie.nb_portees ?? 0}
                </div>
                <p className="text-[10px] text-[var(--sf-muted)]">
                  ISSF&nbsp;:{' '}
                  {scoreTruie.issf_jours !== null ? `${Number(scoreTruie.issf_jours).toFixed(1)} j` : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : null}

      {/* === V2-D : Évolution BCS truie + Historique portées décomposé === */}
      {isFemelle ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Carte BCS */}
          <Card>
            <CardHeader>
              <div className={eyebrowCls}>BCS (Body Condition Score)</div>
            </CardHeader>
            <CardContent>
              {bcsHistorique.length === 0 ? (
                <p className="text-sm text-[var(--sf-muted)]">
                  Aucune évaluation BCS enregistrée. Renseigne le BCS lors des
                  saillies, mises-bas et sevrages.
                </p>
              ) : (
                <ul className="space-y-2">
                  {bcsHistorique.map((b, i) => (
                    <li
                      key={`${b.date_obs}-${b.evenement}-${i}`}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="font-mono tabular-nums font-bold text-[var(--sf-primary)]">
                        {Number(b.bcs_truie).toFixed(1)} / 5
                      </span>
                      <Badge variant="outline" className="capitalize">
                        {b.evenement.replace('_', ' ')}
                      </Badge>
                      <span className="text-xs text-[var(--sf-muted)] tabular-nums">
                        <FormattedDateTime date={b.date_obs} format="date" />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Carte Historique portées décomposé */}
          <Card>
            <CardHeader>
              <div className={eyebrowCls}>Historique des portées</div>
            </CardHeader>
            <CardContent>
              {historiquePortees.length === 0 ? (
                <p className="text-sm text-[var(--sf-muted)]">
                  Aucune portée enregistrée.
                </p>
              ) : (
                <ul className="space-y-3">
                  {historiquePortees.map((p) => (
                    <li
                      key={p.id}
                      className="text-xs border-b border-[var(--sf-line)] pb-2 last:border-0"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono tabular-nums text-[var(--sf-ink)]">
                          <FormattedDateTime date={p.date_mise_bas} format="date" />
                        </span>
                        {p.bcs_truie != null ? (
                          <Badge variant="secondary">
                            BCS {Number(p.bcs_truie).toFixed(1)}
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 tabular-nums text-[var(--sf-muted)]">
                        <span>
                          Vivants:{' '}
                          <span className="text-[var(--sf-success-ink,#1F3414)] font-semibold">
                            {p.nes_vivants ?? 0}
                          </span>
                        </span>
                        <span>
                          Mort-nés:{' '}
                          <span className="text-[var(--sf-danger-ink,#7A2A1F)] font-semibold">
                            {p.nes_morts ?? 0}
                          </span>
                        </span>
                        <span>
                          Momifiés:{' '}
                          <span className="text-[var(--sf-warning-ink,#5C4416)] font-semibold">
                            {p.momifies ?? 0}
                          </span>
                        </span>
                        <span>
                          Écrasés:{' '}
                          <span className="text-[var(--sf-danger-ink,#7A2A1F)] font-semibold">
                            {p.ecrases ?? 0}
                          </span>
                        </span>
                        {p.poids_portee_kg != null ? (
                          <span>
                            Poids:{' '}
                            <span className="text-[var(--sf-ink)] font-semibold">
                              {Number(p.poids_portee_kg).toFixed(1)} kg
                            </span>
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* === PROD-B : BCS 1-tap (truie/cochette uniquement) === */}
      {isFemelle ? (
        <Card>
          <CardHeader>
            <div className={eyebrowCls}>BCS du jour — saisie rapide</div>
          </CardHeader>
          <CardContent>
            <form action={saisirBcsRapide} className="flex gap-2 flex-wrap">
              <input type="hidden" name="animal_id" value={animal.id} />
              {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((bcs) => (
                <Button
                  key={bcs}
                  type="submit"
                  name="bcs"
                  value={String(bcs)}
                  variant={bcs === 3 ? 'default' : 'outline'}
                  className="min-w-[56px] min-h-[44px] text-base font-mono tabular-nums"
                >
                  {bcs.toFixed(1)}
                </Button>
              ))}
            </form>
            <p className="text-xs text-[var(--sf-muted)] mt-2">
              Touche le score observé — cible 3,0 (gestation) / 3,5 (mise-bas).
              Enregistré sous <code className="font-mono">observations_bcs</code>.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {/* === PROD-B : Identification rapide (QR / code-barres) === */}
      <Card>
        <CardHeader>
          <div className={eyebrowCls}>Identification rapide</div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="shrink-0 border-2 border-[var(--sf-ink)] rounded-md p-4 bg-[var(--sf-surface-2)] flex flex-col items-center"
              style={{ minWidth: 120 }}
            >
              <QrCode className="h-12 w-12 text-[var(--sf-primary)]" />
              <code className="font-mono text-base block mt-2 tabular-nums font-bold text-[var(--sf-ink)]">
                {animal.tag}
              </code>
            </div>
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-[var(--sf-muted)]">
                Scanner cette boucle d&apos;oreille avec un lecteur code-barres
                (ou QR) pour identifier l&apos;animal lors d&apos;une
                intervention terrain et ouvrir cette fiche automatiquement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* === ONGLETS : Pesées, Reproduction, Santé, Mouvements === */}
      <AnimalTabs
        animalId={animalId}
        animalTag={animal.tag}
        isFemelle={isFemelle}
        nbVaccinations={nbVaccinations ?? 0}
        nbTraitements={nbTraitements ?? 0}
        batimentSourceId={animal.batiment_id ?? null}
        batimentSourceNom={batimentSourceNom}
        batiments={(batiments ?? []) as any}
        mouvements={(mouvements ?? []) as any}
      />
    </div>
  )
}
