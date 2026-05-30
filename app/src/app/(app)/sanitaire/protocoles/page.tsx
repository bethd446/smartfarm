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
import { Syringe, ChevronLeft, RotateCcw, ShieldCheck } from 'lucide-react'
import { EmptyOnboarding } from '@/components/ui/empty-onboarding'

import { DialogProtocole, type ProtocoleRow } from './_dialog-protocole'
import {
  reinitialiserProtocolesStandards,
  basculerProtocoleActif,
  supprimerProtocole,
} from './_actions'

/* -------------------------------------------------------------------------- */
/*  Boutons « server action » (server components qui retournent un <form>)    */
/* -------------------------------------------------------------------------- */

function FormResetStandards() {
  async function action() {
    'use server'
    await reinitialiserProtocolesStandards()
  }
  return (
    <form action={action}>
      <Button type="submit" variant="outline" size="sm">
        <RotateCcw className="h-4 w-4 mr-1" />
        Réinitialiser aux standards
      </Button>
    </form>
  )
}

function FormToggleActif({ id, actif }: { id: string; actif: boolean }) {
  async function action() {
    'use server'
    await basculerProtocoleActif(id, !actif)
  }
  return (
    <form action={action}>
      <Button type="submit" variant="ghost" size="sm">
        {actif ? 'Désactiver' : 'Réactiver'}
      </Button>
    </form>
  )
}

function FormDelete({ id }: { id: string }) {
  async function action() {
    'use server'
    await supprimerProtocole(id)
  }
  return (
    <form action={action}>
      <Button
        type="submit"
        variant="ghost"
        size="sm"
        className="text-[var(--sf-danger-ink,#7A2A1F)]"
      >
        Supprimer
      </Button>
    </form>
  )
}

/* -------------------------------------------------------------------------- */
/*  Helpers d'affichage                                                       */
/* -------------------------------------------------------------------------- */

const LABEL_CATEGORIE: Record<string, string> = {
  verrat: 'Verrat',
  truie: 'Truie',
  cochette: 'Cochette',
  porcelet: 'Porcelet',
  sevrage: 'Sevrage',
  engraissement: 'Engraissement',
}

function formatAge(age: number | null) {
  if (age === null || age === undefined) return '—'
  return `J${age}`
}

function formatRappels(r: number[] | null) {
  if (!r || r.length === 0) return '—'
  return r.map((n) => `J${n}`).join(', ')
}

/* -------------------------------------------------------------------------- */
/*  PAGE                                                                      */
/* -------------------------------------------------------------------------- */

export default async function ProtocolesPage() {
  const sb = await createClient()

  // NB : la table `protocoles_vaccinaux` peut être bloquée par RLS/GRANT et/ou
  //      avoir un schéma différent selon l'environnement (cf. rapport QA :
  //      "column protocoles_vaccinaux.description does not exist"). On essaie
  //      les deux schémas connus avant de tomber sur un message générique.
  let rows: ProtocoleRow[] = []
  let loadErr: string | null = null

  const r1 = await sb
    .from('protocoles_vaccinaux')
    .select(
      'id, nom, description, categorie_cible, age_jours, produit, voie, dose_ml, rappel_jours, rappels_jours, obligatoire, actif',
    )
    .order('age_jours', { ascending: true, nullsFirst: false })
    .order('nom', { ascending: true })

  if (!r1.error && r1.data) {
    rows = r1.data as ProtocoleRow[]
  } else {
    // Tentative 2 : schéma alternatif (observations + vaccins + calendrier)
    const r2 = await sb
      .from('protocoles_vaccinaux')
      .select('id, nom, observations, vaccins, calendrier')
      .order('nom', { ascending: true })

    if (!r2.error && r2.data) {
      rows = (r2.data as Array<Record<string, unknown>>).map((p) => ({
        id: String(p.id ?? ''),
        nom: String(p.nom ?? ''),
        description: (p.observations as string | null) ?? null,
        categorie_cible: null,
        age_jours: null,
        produit: null,
        voie: null,
        dose_ml: null,
        rappel_jours: null,
        rappels_jours: null,
        obligatoire: false,
        actif: true,
      })) as ProtocoleRow[]
    } else {
      console.error(
        '[protocoles] inaccessible:',
        r1.error?.message ?? r2.error?.message,
      )
      loadErr =
        'Impossible de charger les protocoles vaccinaux — réessayez plus tard.'
    }
  }

  const total = rows.length
  const obligatoires = rows.filter((r) => r.obligatoire).length
  const actifs = rows.filter((r) => r.actif).length

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
          <h1 className="font-[family-name:var(--sf-font-display)] text-4xl font-black uppercase tracking-[0.02em] flex items-center gap-3 text-[var(--sf-ink,#1a1a1a)] mt-1">
            <Syringe className="h-9 w-9 text-[var(--sf-primary,#2D4A1F)]" />
            Protocoles vaccinaux
          </h1>
          <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
            Calendrier vétérinaire de référence par âge et catégorie d&apos;animal.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <FormResetStandards />
          <DialogProtocole mode="create" />
        </div>
      </div>

      {/* KPI ----------------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          style={{
            background: 'var(--sf-success-bg, #D6E3CC)',
            color: 'var(--sf-success-ink, #1F3B12)',
          }}
        >
          <CardContent className="p-5">
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--sf-success-ink, #1F3B12)' }}
            >
              {total}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-success-ink, #1F3B12)' }}
            >
              Protocoles enregistrés
            </div>
          </CardContent>
        </Card>
        <Card
          style={{
            background: 'var(--sf-warning-bg, #F5E0B8)',
            color: 'var(--sf-warning-ink, #5A3E0E)',
          }}
        >
          <CardContent className="p-5">
            <div
              className="text-3xl font-bold tabular-nums"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            >
              {obligatoires}
            </div>
            <div
              className="eyebrow text-[11px] mt-1"
              style={{ color: 'var(--sf-warning-ink, #5A3E0E)' }}
            >
              Obligatoires
            </div>
          </CardContent>
        </Card>
        <Card
          style={{
            background: 'var(--sf-bg, #F5F1E8)',
            color: 'var(--sf-ink, #1a1a1a)',
          }}
        >
          <CardContent className="p-5">
            <div className="text-3xl font-bold tabular-nums">{actifs}</div>
            <div className="eyebrow text-[11px] mt-1 text-[var(--sf-muted,#5C5346)]">
              Actifs
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABLE -------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Liste des protocoles</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadErr ? (
            <p className="p-6 text-sm text-[var(--sf-danger-ink,#7A2A1F)]">
              {loadErr}
            </p>
          ) : rows.length === 0 ? (
            <div className="p-6">
              <EmptyOnboarding
                icon={<ShieldCheck className="h-12 w-12" />}
                eyebrow="PROTOCOLES VACCINAUX"
                title="0 protocoles actifs"
                description="Définis tes protocoles standards (cochette pré-saillie, truie gestante, porcelet sevrage). Smart Farm les projette automatiquement sur le calendrier de chaque bande."
                cta={{
                  label: 'Créer un premier protocole',
                  href: '/sanitaire/protocoles?action=new',
                }}
                ctaSecondary={{
                  label: 'Voir les 3 standards IFIP',
                  href: '/sanitaire/protocoles?seed=ifip',
                }}
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Âge</TableHead>
                  <TableHead>Catégorie</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Voie</TableHead>
                  <TableHead className="text-right">Dose (ml)</TableHead>
                  <TableHead>Rappels</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id} className={p.actif ? '' : 'opacity-60'}>
                    <TableCell>
                      <div className="font-medium">{p.nom}</div>
                      {p.description ? (
                        <div className="text-xs text-[var(--sf-muted,#5C5346)] line-clamp-2 max-w-[28rem]">
                          {p.description.replace(/^\[STANDARD\]\s*/, '')}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatAge(p.age_jours)}
                    </TableCell>
                    <TableCell>
                      {p.categorie_cible
                        ? LABEL_CATEGORIE[p.categorie_cible] ??
                          p.categorie_cible
                        : '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.produit ?? '—'}
                    </TableCell>
                    <TableCell>{p.voie ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {p.dose_ml ?? '—'}
                    </TableCell>
                    <TableCell className="text-xs tabular-nums">
                      {formatRappels(p.rappels_jours)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 items-start">
                        {p.obligatoire ? (
                          <Badge
                            style={{
                              background: 'var(--sf-danger-bg, #F1D4CE)',
                              color: 'var(--sf-danger-ink, #7A2A1F)',
                            }}
                          >
                            Obligatoire
                          </Badge>
                        ) : (
                          <Badge variant="outline">Recommandé</Badge>
                        )}
                        {p.actif ? null : (
                          <Badge variant="outline">Inactif</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1 flex-wrap">
                        <DialogProtocole mode="edit" initial={p} />
                        <FormToggleActif id={p.id} actif={p.actif} />
                        <FormDelete id={p.id} />
                      </div>
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
