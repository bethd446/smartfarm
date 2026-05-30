import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/ui/empty-state'
import { FormattedDateTime } from '@/components/ui/formatted-date'
import {
  Shield,
  Plus,
  ChevronLeft,
  CheckCircle2,
  Users,
} from 'lucide-react'

import { DialogNouvelleVisite } from './_dialog-visite'
import { noterAuditBiosecurite } from './_actions'

export const metadata: Metadata = {
  title: 'Biosécurité',
}

type ChecklistRow = {
  id: string
  categorie: string
  item: string
  obligatoire: boolean
  ordre: number
}

type StatutAuditChecklist = 'conforme' | 'non_conforme' | 'non_evalue'

type ChecklistItemAvecEtat = ChecklistRow & {
  checklist_item_id: string
  statut: StatutAuditChecklist
  date_audit: string | null
  observations: string | null
}

type EtatActuelRow = {
  ferme_id: string
  checklist_item_id: string
  categorie: string
  item: string
  obligatoire: boolean
  ordre: number
  statut: StatutAuditChecklist
  date_audit: string | null
  observations: string | null
}

type VisiteRow = {
  id: string
  date_visite: string
  type_visite: string
  nom_visiteur: string | null
  societe: string | null
  provenance_ferme_porcine: boolean
  delai_depuis_derniere_visite_jours: number | null
  douche_obligatoire_effectuee: boolean | null
  changement_tenue: boolean | null
  pediluve_utilise: boolean | null
  observations: string | null
}

const LABEL_TYPE: Record<string, string> = {
  visiteur: 'Visiteur',
  veterinaire: 'Vétérinaire',
  camion_aliment: 'Camion aliment',
  camion_animaux: 'Camion animaux',
  livraison: 'Livraison',
  technicien: 'Technicien',
  autre: 'Autre',
}

const LABEL_CATEGORIE: Record<string, string> = {
  entree_ferme: 'Entrée ferme',
  maternite: 'Maternité',
  engraissement: 'Engraissement',
  transport: 'Transport',
}

export default async function BiosecuritePage() {
  const sb = await createClient()

  // 1. Checklist statique (référentiel) + état actuel (dernier audit par item)
  const { data: checklistData } = await sb
    .from('biosecurite_checklist')
    .select('id, categorie, item, obligatoire, ordre')
    .order('categorie', { ascending: true })
    .order('ordre', { ascending: true })

  const checklist = (checklistData ?? []) as ChecklistRow[]

  const { data: etatActuelData } = await sb
    .from('v_biosecurite_etat_actuel')
    .select(
      'ferme_id, checklist_item_id, categorie, item, obligatoire, ordre, statut, date_audit, observations',
    )

  const etatActuel = (etatActuelData ?? []) as EtatActuelRow[]
  const etatByItemId = new Map<string, EtatActuelRow>()
  for (const row of etatActuel) {
    // Premier hit gagne (la vue ne renvoie que le dernier audit par
    // (ferme, item)) ; si plusieurs fermes, on garde le premier rencontré
    // — page démo mono-ferme aujourd'hui.
    if (!etatByItemId.has(row.checklist_item_id)) {
      etatByItemId.set(row.checklist_item_id, row)
    }
  }

  const checklistAvecEtat: ChecklistItemAvecEtat[] = checklist.map((item) => {
    const audit = etatByItemId.get(item.id)
    return {
      ...item,
      checklist_item_id: item.id,
      statut: (audit?.statut ?? 'non_evalue') as StatutAuditChecklist,
      date_audit: audit?.date_audit ?? null,
      observations: audit?.observations ?? null,
    }
  })

  // Groupage par catégorie (post-fusion avec l'état d'audit)
  const checklistGrouped = checklistAvecEtat.reduce<
    Record<string, ChecklistItemAvecEtat[]>
  >((acc, row) => {
    const k = row.categorie
    if (!acc[k]) acc[k] = []
    acc[k].push(row)
    return acc
  }, {})

  // 2. Visites — 30 derniers jours
  //    NB : la table `visites_biosecurite` peut être bloquée par RLS/GRANT côté
  //    `authenticated` (cf. rapport QA — erreurs SQL exposées en prod). On essaie
  //    plusieurs formes de la requête (schéma "métier" puis schéma "réel") et on
  //    n'expose JAMAIS le message Postgres brut à l'utilisateur final.
  const since = new Date()
  since.setDate(since.getDate() - 30)

  type AnyVisite = Partial<VisiteRow> & Record<string, unknown>
  let visites: VisiteRow[] = []
  let visitesErrShown: string | null = null

  // Tentative 1 : schéma métier complet (type_visite, nom_visiteur, ...)
  const r1 = await sb
    .from('visites_biosecurite')
    .select(
      'id, date_visite, type_visite, nom_visiteur, societe, provenance_ferme_porcine, delai_depuis_derniere_visite_jours, douche_obligatoire_effectuee, changement_tenue, pediluve_utilise, observations',
    )
    .is('deleted_at', null)
    .gte('date_visite', since.toISOString())
    .order('date_visite', { ascending: false })

  if (!r1.error && r1.data) {
    visites = r1.data as VisiteRow[]
  } else {
    // Tentative 2 : schéma alternatif (raison, visiteur, douche, vetements, ...)
    //    cf. rapport QA listant les colonnes réelles.
    const r2 = await sb
      .from('visites_biosecurite')
      .select(
        'id, date_visite, raison, visiteur, vehicule, douche, vetements, observations',
      )
      .gte('date_visite', since.toISOString())
      .order('date_visite', { ascending: false })

    if (!r2.error && r2.data) {
      visites = (r2.data as AnyVisite[]).map((v) => ({
        id: String(v.id ?? ''),
        date_visite: String(v.date_visite ?? ''),
        // map "raison" → "type_visite" pour réutiliser le LABEL_TYPE existant si possible
        type_visite: String((v.raison as string) ?? 'autre'),
        nom_visiteur: (v.visiteur as string | null) ?? null,
        societe: null,
        provenance_ferme_porcine: false,
        delai_depuis_derniere_visite_jours: null,
        douche_obligatoire_effectuee:
          typeof v.douche === 'boolean' ? (v.douche as boolean) : null,
        changement_tenue:
          typeof v.vetements === 'boolean' ? (v.vetements as boolean) : null,
        pediluve_utilise: null,
        observations: (v.observations as string | null) ?? null,
      }))
    } else {
      // Échec total : log côté serveur, message générique côté UI
      console.error(
        '[biosecurite] visites_biosecurite inaccessible:',
        r1.error?.message ?? r2.error?.message,
      )
      visitesErrShown =
        'Impossible de charger le registre des visites — réessayez plus tard.'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link
            href="/sanitaire"
            className="text-xs uppercase tracking-[0.08em] text-[var(--sf-muted,#5C5346)] hover:text-[var(--sf-primary)] inline-flex items-center gap-1"
          >
            <ChevronLeft className="h-3 w-3" />
            Retour aux soins
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)] mt-1">
            <Shield className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
            Biosécurité
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Checklist des bonnes pratiques + registre des visiteurs et
            transports.
          </p>
        </div>
        <DialogNouvelleVisite
          trigger={
            <Button variant="default" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle visite
            </Button>
          }
        />
      </div>

      {/* CHECKLIST ----------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-[var(--sf-primary,#2D4A1F)]" />
            Checklist biosécurité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {Object.keys(checklistGrouped).length === 0 ? (
            <p className="text-sm text-[var(--sf-muted,#5C5346)]">
              Checklist non disponible.
            </p>
          ) : (
            Object.entries(checklistGrouped).map(([cat, items]) => (
              <div key={cat}>
                <div className="font-[family-name:var(--sf-font-display)] uppercase text-[12px] tracking-[0.14em] text-[var(--sf-muted,#5C5346)] mb-2">
                  {LABEL_CATEGORIE[cat] ?? cat}
                </div>
                <ul className="space-y-1.5">
                  {items.map((it) => {
                    const statutBadge =
                      it.statut === 'conforme'
                        ? { variant: 'success' as const, label: '✓ OK' }
                        : it.statut === 'non_conforme'
                          ? { variant: 'danger' as const, label: '✗ Non conforme' }
                          : { variant: 'secondary' as const, label: 'Non évalué' }
                    return (
                      <li
                        key={it.id}
                        className="flex flex-wrap items-center gap-2 py-2 border-b border-[var(--sf-border,rgba(0,0,0,0.08))] last:border-0 text-sm"
                      >
                        <Badge variant={statutBadge.variant}>
                          {statutBadge.label}
                        </Badge>
                        <span className="flex-1 min-w-[12rem]">
                          {it.item}
                          {it.date_audit ? (
                            <span className="ml-2 text-[10px] uppercase tracking-[0.08em] text-[var(--sf-muted,#5C5346)]">
                              audité <FormattedDateTime date={it.date_audit} format="short" />
                            </span>
                          ) : null}
                        </span>
                        {it.obligatoire ? (
                          <Badge variant="warning">Obligatoire</Badge>
                        ) : null}
                        <form action={noterAuditBiosecurite} className="inline">
                          <input
                            type="hidden"
                            name="checklist_item_id"
                            value={it.checklist_item_id}
                          />
                          <input type="hidden" name="statut" value="conforme" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            aria-label={`Marquer "${it.item}" conforme`}
                            title="Marquer conforme"
                          >
                            ✓
                          </Button>
                        </form>
                        <form action={noterAuditBiosecurite} className="inline">
                          <input
                            type="hidden"
                            name="checklist_item_id"
                            value={it.checklist_item_id}
                          />
                          <input
                            type="hidden"
                            name="statut"
                            value="non_conforme"
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            aria-label={`Marquer "${it.item}" non conforme`}
                            title="Marquer non conforme"
                          >
                            ✗
                          </Button>
                        </form>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* REGISTRE DES VISITEURS ---------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-[var(--sf-primary,#2D4A1F)]" />
            Registre des visiteurs — 30 derniers jours
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {visitesErrShown ? (
            <p className="p-6 text-sm text-[var(--sf-danger-ink,#7A2A1F)]">
              {visitesErrShown}
            </p>
          ) : visites.length === 0 ? (
            <div className="p-2">
              <EmptyState
                icon={Users}
                title="Aucune visite enregistrée"
                description="Le registre des visiteurs est vide sur les 30 derniers jours. Enregistrez chaque entrée pour assurer la traçabilité."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Visiteur</TableHead>
                  <TableHead>Société</TableHead>
                  <TableHead>Provenance porcine</TableHead>
                  <TableHead>Douche</TableHead>
                  <TableHead>Tenue</TableHead>
                  <TableHead>Pédiluve</TableHead>
                  <TableHead>Observations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visites.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="tabular-nums whitespace-nowrap">
                      <FormattedDateTime date={v.date_visite} format="short" />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {LABEL_TYPE[v.type_visite] ?? v.type_visite}
                      </Badge>
                    </TableCell>
                    <TableCell>{v.nom_visiteur ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      {v.societe ?? '—'}
                    </TableCell>
                    <TableCell>
                      {v.provenance_ferme_porcine ? (
                        <Badge
                          style={{
                            background: 'var(--sf-danger-bg, #F1D4CE)',
                            color: 'var(--sf-danger-ink, #7A2A1F)',
                          }}
                        >
                          Oui
                          {v.delai_depuis_derniere_visite_jours !== null
                            ? ` (${v.delai_depuis_derniere_visite_jours} j)`
                            : ''}
                        </Badge>
                      ) : (
                        <span className="text-xs text-[var(--sf-muted,#5C5346)]">
                          Non
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.douche_obligatoire_effectuee ? '✅' : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.changement_tenue ? '✅' : '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      {v.pediluve_utilise ? '✅' : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-[var(--sf-muted,#5C5346)] max-w-[24rem]">
                      {v.observations ?? '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
