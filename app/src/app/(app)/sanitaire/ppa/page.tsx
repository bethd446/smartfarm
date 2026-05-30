import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  AlertTriangle,
  Shield,
  Activity,
  Phone,
  ChevronLeft,
  Thermometer,
  Droplets,
} from 'lucide-react'

import { DialogObservationPPA } from './_dialog-observation'

export const metadata: Metadata = {
  title: 'PPA — Surveillance',
}

type Surveillance = {
  ferme_id: string | null
  obs_30j: number | null
  suspicions_critiques_30j: number | null
  confirmes_total: number | null
  suspicions_non_declarees: number | null
  derniere_observation: string | null
}

type Observation = {
  id: string
  date_observation: string
  nb_animaux_affectes: number
  niveau_suspicion: 'faible' | 'moyen' | 'eleve' | 'tres_eleve'
  temperature_max: number | null
  hemorragies_observees: boolean | null
  mortalite_subite: boolean | null
  prostration: boolean | null
  inappetence: boolean | null
  cyanose_oreilles: boolean | null
  vomissements_diarrhees: boolean | null
  declare_aux_autorites: boolean | null
  date_declaration: string | null
  reference_declaration: string | null
  prelevement_effectue: boolean | null
  resultat_laboratoire:
    | 'en_attente'
    | 'negatif'
    | 'positif'
    | 'indetermine'
    | null
  observations: string | null
}

const NIVEAUX_LABEL: Record<Observation['niveau_suspicion'], string> = {
  faible: 'Faible',
  moyen: 'Moyen',
  eleve: 'Élevé',
  tres_eleve: 'Très élevé',
}

const NIVEAUX_VARIANT: Record<
  Observation['niveau_suspicion'],
  'secondary' | 'warning' | 'danger'
> = {
  faible: 'secondary',
  moyen: 'secondary',
  eleve: 'warning',
  tres_eleve: 'danger',
}

const RESULTAT_LABEL: Record<NonNullable<Observation['resultat_laboratoire']>, string> = {
  en_attente: 'En attente',
  negatif: 'Négatif',
  positif: 'Positif',
  indetermine: 'Indéterminé',
}

const RESULTAT_VARIANT: Record<
  NonNullable<Observation['resultat_laboratoire']>,
  'secondary' | 'success' | 'danger' | 'warning'
> = {
  en_attente: 'warning',
  negatif: 'success',
  positif: 'danger',
  indetermine: 'secondary',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('fr-FR')
  } catch {
    return iso
  }
}

function symptomesResume(o: Observation): string {
  const arr = [
    o.hemorragies_observees && 'hémorragies',
    o.mortalite_subite && 'mort subite',
    o.prostration && 'prostration',
    o.inappetence && 'refus aliment',
    o.cyanose_oreilles && 'cyanose',
    o.vomissements_diarrhees && 'vom./diarrhée',
  ].filter(Boolean) as string[]
  return arr.length ? arr.join(', ') : '—'
}

export default async function PPAPage() {
  const sb = await createClient()

  const { data: surveillanceRows } = await sb
    .from('v_ppa_surveillance')
    .select('*')
    .limit(1)

  const surveillance: Surveillance | null =
    (surveillanceRows && surveillanceRows[0]) || null

  const { data: observations } = await sb
    .from('ppa_observations')
    .select(
      'id,date_observation,nb_animaux_affectes,niveau_suspicion,temperature_max,hemorragies_observees,mortalite_subite,prostration,inappetence,cyanose_oreilles,vomissements_diarrhees,declare_aux_autorites,date_declaration,reference_declaration,prelevement_effectue,resultat_laboratoire,observations',
    )
    .is('deleted_at', null)
    .order('date_observation', { ascending: false })
    .limit(30)

  const obs = (observations ?? []) as Observation[]

  const kpiObs30 = surveillance?.obs_30j ?? 0
  const kpiCritiques = surveillance?.suspicions_critiques_30j ?? 0
  const kpiNonDeclarees = surveillance?.suspicions_non_declarees ?? 0
  const kpiConfirmes = surveillance?.confirmes_total ?? 0

  return (
    <div className="space-y-6">
      {/* Lien retour */}
      <div>
        <Link
          href="/sanitaire"
          className="inline-flex items-center gap-1 text-sm text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-ink,#1a1a1a)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Retour Sanitaire
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1
            className="text-3xl md:text-4xl font-bold flex items-center gap-3 text-[var(--ink)]"
            style={{ fontFamily: 'var(--disp, var(--sf-font-display))' }}
          >
            <AlertTriangle className="h-7 w-7 md:h-8 md:w-8 text-[var(--bad)]" />
            PPA — Surveillance
          </h1>
          <p className="text-sm text-[var(--mut)] mt-1">
            Peste Porcine Africaine — Maladie à déclaration obligatoire
            (OIE/WOAH)
          </p>
        </div>
        <DialogObservationPPA />
      </div>

      {/* Banner PPA fort — VERGER hub contextuel */}
      <div
        className="rounded-[var(--rl,18px)] border p-4 md:p-5"
        style={{
          background: 'var(--bad-bg)',
          borderColor: 'var(--bad)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
            style={{ background: 'var(--bad)', color: '#fff' }}
          >
            <Shield className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              className="flex flex-wrap items-center gap-2 text-base md:text-lg font-bold leading-tight text-[var(--bad-d)]"
              style={{ fontFamily: 'var(--disp, var(--sf-font-display))' }}
            >
              À savoir sur la PPA
              <Badge variant="destructive">DÉCLARATION OBLIGATOIRE</Badge>
            </h2>
            <p className="text-xs mt-0.5 text-[var(--bad-d)]/80">
              Référentiel OIE/WOAH — fiche technique synthétique
            </p>
          </div>
        </div>
        <div className="text-sm space-y-2 mt-3 text-[var(--ink-soft)]">
          <p>
            <strong className="text-[var(--bad-d)]">Mortalité 100 %</strong> · Pas de vaccin · Pas de
            traitement · Transmission par contact direct, viande crue
            contaminée, tiques molles <em>Ornithodoros</em>, vecteurs
            mécaniques (mouches piqueuses, matériel souillé).
          </p>
          <p>
            <strong className="text-[var(--bad-d)]">Symptômes clés</strong> : fièvre &gt;40 °C, prostration,
            refus aliment, hémorragies sous-cutanées (oreilles, abdomen,
            flancs), cyanose des extrémités, vomissements/diarrhée souvent
            hémorragique, mortalité subite chez les jeunes.
          </p>
          <p>
            <strong className="text-[var(--bad-d)]">Obligation légale</strong> : toute suspicion =
            déclaration immédiate aux services vétérinaires officiels
            (OIE/WOAH). Confinement total ferme jusqu’à diagnostic. Aucun
            mouvement d’animaux, aliments, effluents.
          </p>
          <p className="text-[var(--bad-d)] flex items-start gap-2 font-medium">
            <Phone className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>Urgence vétérinaire :</strong> Direction des Services
              Vétérinaires (DSV) — Ministère des Ressources Animales et
              Halieutiques, Côte d’Ivoire.
            </span>
          </p>
        </div>
      </div>

      {/* KPI surveillance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="kpi">
          <div className="k">Observations 30 j</div>
          <div className="v">{kpiObs30}</div>
        </div>
        <div className="kpi">
          <div className="k">Suspicions critiques 30 j</div>
          <div
            className="v"
            style={kpiCritiques > 0 ? { color: 'var(--warn)' } : undefined}
          >
            {kpiCritiques}
          </div>
        </div>
        <div className="kpi">
          <div className="k">Non déclarées</div>
          <div
            className="v"
            style={kpiNonDeclarees > 0 ? { color: 'var(--bad-d)' } : undefined}
          >
            {kpiNonDeclarees}
          </div>
          {kpiNonDeclarees > 0 ? (
            <div className="d neg">Action OIE requise</div>
          ) : null}
        </div>
        <div className="kpi">
          <div className="k">Confirmés (cumul)</div>
          <div
            className="v"
            style={kpiConfirmes > 0 ? { color: 'var(--bad-d)' } : undefined}
          >
            {kpiConfirmes}
          </div>
        </div>
      </div>

      {/* Checklist visuelle symptômes typiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Symptômes typiques à surveiller
          </CardTitle>
          <CardDescription>
            Repères terrain — toute combinaison fièvre + abattement +
            mortalité subite doit déclencher une observation.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            <div className="flex items-start gap-2">
              <Thermometer className="h-4 w-4 mt-0.5 text-[var(--bad)] shrink-0" />
              <span>
                <strong>Fièvre élevée</strong> &gt; 40,5 °C, prostration
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Droplets className="h-4 w-4 mt-0.5 text-[var(--bad)] shrink-0" />
              <span>
                <strong>Hémorragies cutanées</strong> oreilles, abdomen,
                flancs
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-[var(--bad)] shrink-0" />
              <span>
                <strong>Mortalité subite</strong> animaux trouvés morts
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--bad)] font-bold w-4 text-center">●</span>
              <span>
                <strong>Cyanose</strong> oreilles / extrémités bleu-violet
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--bad)] font-bold w-4 text-center">●</span>
              <span>
                <strong>Refus aliment</strong> brutal sur plusieurs animaux
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-[var(--bad)] font-bold w-4 text-center">●</span>
              <span>
                <strong>Vomissements / diarrhée</strong> souvent hémorragique
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau historique observations */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des observations</CardTitle>
          <CardDescription>
            {obs.length} observation(s) enregistrée(s) · 30 dernières
          </CardDescription>
        </CardHeader>
        <CardContent>
          {obs.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Aucune observation enregistrée"
              description="Cliquer sur « Nouvelle observation suspecte » pour signaler un cas clinique évocateur de PPA."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="num">Nb</th>
                    <th>Niveau</th>
                    <th className="num">T° max</th>
                    <th>Symptômes</th>
                    <th>Déclaré</th>
                    <th>Résultat labo</th>
                  </tr>
                </thead>
                <tbody>
                  {obs.map((o) => (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap">
                        {formatDate(o.date_observation)}
                      </td>
                      <td className="num tabular-nums">
                        {o.nb_animaux_affectes}
                      </td>
                      <td>
                        <Badge variant={NIVEAUX_VARIANT[o.niveau_suspicion]}>
                          {NIVEAUX_LABEL[o.niveau_suspicion]}
                        </Badge>
                      </td>
                      <td className="num tabular-nums">
                        {o.temperature_max != null
                          ? `${o.temperature_max} °C`
                          : '—'}
                      </td>
                      <td className="text-xs max-w-[280px]">
                        {symptomesResume(o)}
                      </td>
                      <td>
                        {o.declare_aux_autorites ? (
                          <Badge variant="success">Oui</Badge>
                        ) : (
                          <Badge variant="danger">Non</Badge>
                        )}
                      </td>
                      <td>
                        {o.resultat_laboratoire ? (
                          <Badge
                            variant={
                              RESULTAT_VARIANT[o.resultat_laboratoire]
                            }
                          >
                            {RESULTAT_LABEL[o.resultat_laboratoire]}
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
