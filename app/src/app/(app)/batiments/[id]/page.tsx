import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Building2, ArrowLeft, Boxes, Utensils, AlertTriangle } from 'lucide-react'
import type { Metadata } from 'next'
import { DialogEditRation } from './_dialog-edit-ration'
import { FormattedDateTime } from '@/components/ui/formatted-date'

/**
 * Page détail d'un bâtiment.
 *
 * FIX 404 (2026-05-24) :
 *   - Cause root : la query nested `cases(... salle_id ...)` référençait une
 *     colonne `salle_id` qui n'existe pas → PostgREST renvoyait `data=null`
 *     → `notFound()` côté Next.
 *   - Fix : 3 queries séparées (batiment + cases + animaux), aucune nested
 *     join sur des colonnes inexistantes. Logging console.error si la query
 *     batiment échoue (auth / RLS / réseau). Redirect /connexion si pas de
 *     session (cas anon + flag démo désactivé).
 *
 * FEATURE NUTRITION (2026-05-24) :
 *   - Section "Nutrition" : ration_kg_jour_par_sujet (éditable) + formule
 *     affectée + composants + projection stock (jours restants / date épuis).
 */
export default async function BatimentDetail({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const sb = await createClient()

  // === 1. Auth check ===
  const {
    data: { user: authUser },
  } = await sb.auth.getUser()
  if (!authUser) {
    // En mode démo sans session, le middleware laisse passer ; mais comme la
    // ferme est multi-tenant via RLS, sans session on ne voit RIEN.
    // Plutôt qu'un 404 trompeur, on redirige vers /connexion avec `next`.
    redirect(`/connexion?next=/batiments/${id}`)
  }

  // === 2. Bâtiment (sans nested join — fix 404) ===
  const { data: batiment, error: errBat } = await sb
    .from('batiments')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()

  if (errBat) {
    console.error('[batiments/[id]] SELECT batiment failed', {
      id,
      code: errBat.code,
      message: errBat.message,
      hint: errBat.hint,
    })
  }
  if (!batiment) {
    console.error('[batiments/[id]] batiment introuvable', { id, userId: authUser.id })
    notFound()
  }

  // === 3. Cases + Animaux (queries séparées, pattern V2 fbc033f) ===
  const [{ data: casesData }, { data: animauxData }] = await Promise.all([
    sb
      .from('cases')
      .select('id, numero, capacite, type, batiment_id')
      .eq('batiment_id', id)
      .is('deleted_at', null),
    sb
      .from('animaux')
      .select('id, tag, nom, sexe, categorie, statut, date_naissance, race_id, batiment_id, case_id')
      .eq('batiment_id', id)
      .eq('statut', 'actif')
      .is('deleted_at', null),
  ])

  // Charger les races référencées (en parallèle léger)
  const raceIds = Array.from(
    new Set(
      (animauxData ?? [])
        .map((a: any) => a.race_id)
        .filter((x: unknown): x is string => typeof x === 'string'),
    ),
  )
  let racesMap: Record<string, string> = {}
  if (raceIds.length > 0) {
    const { data: racesData } = await sb
      .from('races')
      .select('id, nom')
      .in('id', raceIds)
    racesMap = Object.fromEntries((racesData ?? []).map((r: any) => [r.id, r.nom]))
  }

  // Group animaux by case
  const animauxParCase = new Map<string | null, any[]>()
  for (const a of animauxData ?? []) {
    const k = (a as any).case_id ?? null
    if (!animauxParCase.has(k)) animauxParCase.set(k, [])
    animauxParCase.get(k)!.push({ ...a, races: { nom: racesMap[(a as any).race_id] ?? null } })
  }

  // Cases triées + injection animaux
  const cases = ((casesData ?? []) as any[])
    .slice()
    .sort((a, b) => {
      const na = String(a.numero ?? '')
      const nb = String(b.numero ?? '')
      return na.localeCompare(nb, undefined, { numeric: true })
    })
    .map((c: any) => ({ ...c, animaux: animauxParCase.get(c.id) ?? [] }))

  // Animaux sans case (cas verraterie, démarrage = case_id null)
  const animauxSansCase = animauxParCase.get(null) ?? []
  const totalAnimaux = animauxData ?? []

  const tauxOccupation = batiment.capacite
    ? Math.round((totalAnimaux.length / batiment.capacite) * 100)
    : 0

  let tauxVariant: 'success' | 'warning' | 'danger' = 'success'
  if (tauxOccupation >= 90) tauxVariant = 'danger'
  else if (tauxOccupation >= 70) tauxVariant = 'warning'

  // === 4. NUTRITION : formule + composants + projection ===
  let formule: { id: string; nom: string; stade: string | null } | null = null
  let composants: Array<{ nom: string; pct: number; stock_actuel: number | null }> = []
  let projection: {
    conso_quotidienne_kg: number
    stock_kg_actuel: number
    jours_restants: number | null
    date_epuisement: string | null
  } | null = null

  if (batiment.aliment_id) {
    const { data: f } = await sb
      .from('formules')
      .select('id, nom, stade')
      .eq('id', batiment.aliment_id)
      .is('deleted_at', null)
      .maybeSingle()
    if (f) {
      formule = f as any
      const { data: comps } = await sb
        .from('formules_composants')
        .select('pct, ordre, matiere:matiere_id(nom, stock_actuel)')
        .eq('formule_id', f.id)
        .order('ordre', { ascending: true })
      composants = ((comps ?? []) as any[]).map((c) => ({
        nom: c.matiere?.nom ?? '—',
        pct: Number(c.pct ?? 0),
        stock_actuel: c.matiere?.stock_actuel ?? null,
      }))

      const { data: proj } = await sb
        .from('v_stock_projection_ferme')
        .select('conso_quotidienne_kg, stock_kg_actuel, jours_restants, date_epuisement')
        .eq('formule_id', f.id)
        .maybeSingle()
      if (proj) {
        projection = {
          conso_quotidienne_kg: Number(proj.conso_quotidienne_kg ?? 0),
          stock_kg_actuel: Number(proj.stock_kg_actuel ?? 0),
          jours_restants:
            proj.jours_restants !== null && proj.jours_restants !== undefined
              ? Number(proj.jours_restants)
              : null,
          date_epuisement: proj.date_epuisement ?? null,
        }
      }
    }
  }

  const ration: number | null =
    batiment.ration_kg_jour_par_sujet !== null && batiment.ration_kg_jour_par_sujet !== undefined
      ? Number(batiment.ration_kg_jour_par_sujet)
      : null
  const consoLive = ration !== null ? ration * totalAnimaux.length : null

  // Variant alerte projection
  let projVariant: 'success' | 'warning' | 'danger' | 'secondary' = 'secondary'
  if (projection?.jours_restants !== null && projection?.jours_restants !== undefined) {
    if (projection.jours_restants < 7) projVariant = 'danger'
    else if (projection.jours_restants < 14) projVariant = 'warning'
    else projVariant = 'success'
  }

  return (
    <div className="space-y-6">
      {/* === Retour === */}
      <div>
        <Link
          href="/batiments"
          className="inline-flex items-center gap-1 text-sm text-[var(--sf-muted)] hover:text-[var(--sf-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Tous les bâtiments
        </Link>
      </div>

      {/* === Header === */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1
            className="text-4xl font-bold flex items-center gap-3 tracking-[0.01em] text-[var(--sf-ink)]"
            style={{ fontFamily: "var(--sf-font-display, 'Big Shoulders Display', sans-serif)" }}
          >
            <Building2 className="h-8 w-8 text-[var(--sf-primary)]" />
            {batiment.nom}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-[var(--sf-muted)] flex-wrap">
            <Badge variant="outline" className="capitalize">
              {batiment.type}
            </Badge>
            <span>Capacité {batiment.capacite ?? '—'}</span>
            <span>·</span>
            <span>{batiment.surface_m2 ?? '—'} m²</span>
            <span>·</span>
            <span>{totalAnimaux.length} animaux présents</span>
          </div>
        </div>
      </div>

      {/* === 4 KPI cards (gabarit VERGER .kpi) === */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kpi">
          <div className="k">Animaux présents</div>
          <div className="v tabular-nums">{totalAnimaux.length}</div>
        </div>
        <div className="kpi">
          <div className="k">Capacité totale</div>
          <div className="v tabular-nums">{batiment.capacite ?? '—'}</div>
        </div>
        <div className="kpi">
          <div className="k">Taux occupation</div>
          <div className="flex items-center gap-2">
            <div className="v tabular-nums">{tauxOccupation}%</div>
            <Badge variant={tauxVariant}>
              {tauxOccupation < 70 ? 'OK' : tauxOccupation < 90 ? 'Élevé' : 'Saturé'}
            </Badge>
          </div>
        </div>
        <div className="kpi">
          <div className="k">Cases</div>
          <div className="v tabular-nums" style={{ color: 'var(--sage-d)' }}>{cases.length}</div>
        </div>
      </div>

      {/* === Section NUTRITION === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Utensils className="h-5 w-5 text-[var(--sf-primary)]" />
            Nutrition
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ration */}
            <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card)] p-4">
              <div className="text-xs uppercase tracking-[0.1em] text-[var(--mut)] font-[family-name:var(--sf-font-display)] mb-1">
                Ration journalière par sujet
              </div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-bold font-mono tabular-nums text-[var(--sf-ink)]">
                    {ration !== null ? `${ration.toFixed(2)}` : '—'}
                    <span className="text-base font-normal text-[var(--sf-muted)] ml-1">kg/jour</span>
                  </div>
                  {consoLive !== null && (
                    <div className="text-xs text-[var(--sf-muted)] mt-1">
                      <span className="font-mono tabular-nums">{totalAnimaux.length}</span> sujets ×{' '}
                      <span className="font-mono tabular-nums">{ration!.toFixed(2)}</span> kg ={' '}
                      <span className="font-mono tabular-nums font-semibold text-[var(--sf-ink)]">
                        {consoLive.toFixed(2)} kg/j
                      </span>
                    </div>
                  )}
                </div>
                <DialogEditRation
                  batimentId={batiment.id}
                  batimentNom={batiment.nom}
                  rationActuelle={ration}
                />
              </div>
            </div>

            {/* Formule */}
            <div className="rounded-[14px] border border-[var(--line)] bg-[var(--card)] p-4">
              <div className="text-xs uppercase tracking-[0.1em] text-[var(--mut)] font-[family-name:var(--sf-font-display)] mb-1">
                Formule affectée
              </div>
              {formule ? (
                <>
                  <div className="font-semibold text-[var(--sf-ink)]">{formule.nom}</div>
                  {formule.stade && (
                    <Badge variant="outline" className="mt-1 capitalize">
                      {formule.stade.replace('_', ' ')}
                    </Badge>
                  )}
                  {composants.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {composants.map((c, i) => (
                        <li key={i} className="flex justify-between">
                          <span className="text-[var(--sf-ink)]">{c.nom}</span>
                          <span className="font-mono tabular-nums text-[var(--sf-muted)]">
                            {c.pct.toFixed(0)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-[var(--sf-muted)] italic">Aucune formule affectée</p>
              )}
            </div>
          </div>

          {/* Projection */}
          {projection && (
            <div
              className="rounded-[14px] p-4 flex items-start gap-3 flex-wrap"
              style={{
                background:
                  projVariant === 'danger'
                    ? 'var(--sf-danger-bg, #F5D9D2)'
                    : projVariant === 'warning'
                      ? 'var(--sf-warning-bg, #F5E0B8)'
                      : 'var(--sf-success-bg, #D6E3CC)',
                color:
                  projVariant === 'danger'
                    ? 'var(--sf-danger-ink, #7A2A1F)'
                    : projVariant === 'warning'
                      ? 'var(--sf-warning-ink, #5A3E0E)'
                      : 'var(--sf-success-ink, #1F3B12)',
              }}
            >
              {projVariant === 'danger' && <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-[200px]">
                <div className="text-xs uppercase tracking-[0.1em] font-[family-name:var(--sf-font-display)]">
                  Projection stock
                </div>
                <div className="mt-1 text-sm">
                  Stock dispo :{' '}
                  <span className="font-mono tabular-nums font-bold">
                    {projection.stock_kg_actuel.toFixed(0)} kg
                  </span>
                  {' · '}
                  Conso :{' '}
                  <span className="font-mono tabular-nums font-bold">
                    {projection.conso_quotidienne_kg.toFixed(2)} kg/j
                  </span>
                </div>
                <div className="mt-1 text-base font-semibold">
                  {projection.jours_restants !== null && projection.date_epuisement ? (
                    <>
                      Épuisement le{' '}
                      <span className="tabular-nums">
                        <FormattedDateTime date={projection.date_epuisement} format="date" />
                      </span>{' '}
                      <span className="tabular-nums">({projection.jours_restants} jours)</span>
                    </>
                  ) : (
                    <span className="italic">Conso nulle — projection indisponible</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* === Liste cases + animaux === */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="h-5 w-5 text-[var(--sf-primary)]" />
            Cases ({cases.length})
            {animauxSansCase.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                +{animauxSansCase.length} hors case
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cases.length === 0 && animauxSansCase.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="Aucune case configurée"
              description="Ajouter des cases pour ce bâtiment depuis les paramètres."
            />
          ) : (
            <>
              {cases.map((c: any) => {
                const animauxCase = (c.animaux ?? []) as any[]
                const capCase = c.capacite ?? 0
                const surcharge = capCase > 0 && animauxCase.length > capCase

                return (
                  <div
                    key={c.id}
                    className="rounded-[14px] border border-[var(--line)] bg-[var(--card)] p-3"
                  >
                    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                      <div
                        className="flex items-center gap-2 text-[var(--ink-soft)] font-semibold"
                        style={{ fontFamily: 'var(--disp)' }}
                      >
                        <span className="bi bi-v inline-grid place-items-center" style={{ width: 30, height: 30, borderRadius: 9 }}>
                          <Boxes className="h-4 w-4" />
                        </span>
                        <span className="text-[var(--ink)]">
                          Case {c.numero}
                          {c.type && (
                            <span className="text-sm text-[var(--mut)] font-normal ml-2">
                              ({c.type})
                            </span>
                          )}
                        </span>
                      </div>
                      <Badge variant={surcharge ? 'danger' : 'secondary'}>
                        {animauxCase.length} / {capCase || '?'}
                      </Badge>
                    </div>
                    {animauxCase.length === 0 ? (
                      <p className="text-xs text-[var(--mut)] italic">Case vide</p>
                    ) : (
                      <AnimauxList animaux={animauxCase} />
                    )}
                  </div>
                )
              })}
              {animauxSansCase.length > 0 && (
                <div className="rounded-[14px] border border-dashed border-[var(--line2)] bg-[var(--card)] p-3">
                  <div className="font-semibold text-[var(--ink)] mb-2" style={{ fontFamily: 'var(--disp)' }}>
                    Animaux du bâtiment (hors case)
                    <Badge variant="secondary" className="ml-2">
                      {animauxSansCase.length}
                    </Badge>
                  </div>
                  <AnimauxList animaux={animauxSansCase} />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function AnimauxList({ animaux }: { animaux: any[] }) {
  return (
    <ul className="text-sm space-y-1">
      {animaux.map((a: any) => (
        <li key={a.id} className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/cheptel/${a.id}`}
            className="font-mono hover:underline text-[var(--sf-primary)] font-semibold"
          >
            {a.tag}
          </Link>
          {a.nom && <span className="text-[var(--sf-muted)]">{a.nom}</span>}
          <Badge variant="secondary">{a.sexe}</Badge>
          <Badge variant="outline" className="capitalize">
            {a.categorie}
          </Badge>
          {a.races?.nom && (
            <span className="text-xs text-[var(--sf-muted)]">{a.races.nom}</span>
          )}
        </li>
      ))}
    </ul>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const sb = await createClient()
  const { data } = await sb.from('batiments').select('nom').eq('id', id).maybeSingle()
  return {
    title: data?.nom ? `${data.nom} — Bâtiment — Smart Farm` : 'Bâtiment',
  }
}
