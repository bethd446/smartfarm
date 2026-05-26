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
            className="text-3xl md:text-4xl font-bold flex items-center gap-3"
            style={{ fontFamily: 'var(--sf-font-display)' }}
          >
            <AlertTriangle className="h-7 w-7 md:h-8 md:w-8 text-red-600" />
            PPA — Surveillance
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Peste Porcine Africaine — Maladie à déclaration obligatoire
            (OIE/WOAH)
          </p>
        </div>
        <DialogObservationPPA />
      </div>

      {/* Encart pédagogique */}
      <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
            <Shield className="h-5 w-5" />À savoir sur la PPA
          </CardTitle>
          <CardDescription className="text-red-800/80 dark:text-red-200/80">
            Référentiel OIE/WOAH — fiche technique synthétique
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            <strong>Mortalité 100 %</strong> · Pas de vaccin · Pas de
            traitement · Transmission par contact direct, viande crue
            contaminée, tiques molles <em>Ornithodoros</em>, vecteurs
            mécaniques (mouches piqueuses, matériel souillé).
          </p>
          <p>
            <strong>Symptômes clés</strong> : fièvre &gt;40 °C, prostration,
            refus aliment, hémorragies sous-cutanées (oreilles, abdomen,
            flancs), cyanose des extrémités, vomissements/diarrhée souvent
            hémorragique, mortalité subite chez les jeunes.
          </p>
          <p>
            <strong>Obligation légale</strong> : toute suspicion =
            déclaration immédiate aux services vétérinaires officiels
            (OIE/WOAH). Confinement total ferme jusqu’à diagnostic. Aucun
            mouvement d’animaux, aliments, effluents.
          </p>
          <p className="text-red-700 dark:text-red-300 flex items-start gap-2">
            <Phone className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              <strong>Urgence vétérinaire :</strong> Direction des Services
              Vétérinaires (DSV) — Ministère des Ressources Animales et
              Halieutiques, Côte d’Ivoire.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* KPI surveillance */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--sf-muted,#5C5346)] uppercase tracking-wider">
              Observations 30 j
            </div>
            <div className="text-3xl font-bold mt-1">{kpiObs30}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--sf-muted,#5C5346)] uppercase tracking-wider">
              Suspicions critiques 30 j
            </div>
            <div
              className={`text-3xl font-bold mt-1 ${
                kpiCritiques > 0
                  ? 'text-[var(--sf-warning-ink,#5A3E0E)]'
                  : ''
              }`}
            >
              {kpiCritiques}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--sf-muted,#5C5346)] uppercase tracking-wider">
              Non déclarées
            </div>
            <div
              className={`text-3xl font-bold mt-1 ${
                kpiNonDeclarees > 0
                  ? 'text-[var(--sf-danger-ink,#7A2A1F)]'
                  : ''
              }`}
            >
              {kpiNonDeclarees}
            </div>
            {kpiNonDeclarees > 0 ? (
              <div className="text-[10px] text-[var(--sf-danger-ink,#7A2A1F)] mt-1 uppercase tracking-wider font-semibold">
                Action OIE requise
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-[var(--sf-muted,#5C5346)] uppercase tracking-wider">
              Confirmés (cumul)
            </div>
            <div
              className={`text-3xl font-bold mt-1 ${
                kpiConfirmes > 0
                  ? 'text-[var(--sf-danger-ink,#7A2A1F)]'
                  : ''
              }`}
            >
              {kpiConfirmes}
            </div>
          </CardContent>
        </Card>
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
              <Thermometer className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
              <span>
                <strong>Fièvre élevée</strong> &gt; 40,5 °C, prostration
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Droplets className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
              <span>
                <strong>Hémorragies cutanées</strong> oreilles, abdomen,
                flancs
              </span>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 shrink-0" />
              <span>
                <strong>Mortalité subite</strong> animaux trouvés morts
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold w-4 text-center">●</span>
              <span>
                <strong>Cyanose</strong> oreilles / extrémités bleu-violet
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold w-4 text-center">●</span>
              <span>
                <strong>Refus aliment</strong> brutal sur plusieurs animaux
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-red-600 font-bold w-4 text-center">●</span>
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
              <table className="w-full text-sm">
                <thead className="bg-[var(--sf-surface-1,rgba(0,0,0,0.04))] border-b">
                  <tr>
                    <th className="text-left p-2 font-semibold">Date</th>
                    <th className="text-left p-2 font-semibold">Nb</th>
                    <th className="text-left p-2 font-semibold">Niveau</th>
                    <th className="text-left p-2 font-semibold">T° max</th>
                    <th className="text-left p-2 font-semibold">Symptômes</th>
                    <th className="text-left p-2 font-semibold">Déclaré</th>
                    <th className="text-left p-2 font-semibold">
                      Résultat labo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {obs.map((o) => (
                    <tr
                      key={o.id}
                      className="border-b border-[var(--sf-border,#e5e5e5)]"
                    >
                      <td className="p-2 whitespace-nowrap">
                        {formatDate(o.date_observation)}
                      </td>
                      <td className="p-2 font-mono">
                        {o.nb_animaux_affectes}
                      </td>
                      <td className="p-2">
                        <Badge variant={NIVEAUX_VARIANT[o.niveau_suspicion]}>
                          {NIVEAUX_LABEL[o.niveau_suspicion]}
                        </Badge>
                      </td>
                      <td className="p-2 font-mono">
                        {o.temperature_max != null
                          ? `${o.temperature_max} °C`
                          : '—'}
                      </td>
                      <td className="p-2 text-xs max-w-[280px]">
                        {symptomesResume(o)}
                      </td>
                      <td className="p-2">
                        {o.declare_aux_autorites ? (
                          <Badge variant="success">Oui</Badge>
                        ) : (
                          <Badge variant="danger">Non</Badge>
                        )}
                      </td>
                      <td className="p-2">
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
