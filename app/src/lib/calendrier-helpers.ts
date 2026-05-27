/**
 * Smart Farm — Calendrier prévisionnel (helpers purs, sans I/O)
 * ─────────────────────────────────────────────────────────────
 * Projette les événements physiologiques attendus à partir des
 * tables saillies / mises_bas / sevrages.
 *
 * Cycles modélisés (brief C7 §CONTEXTE) :
 *  - Saillie → diag_gestation J18-J24 (retour chaleurs)
 *  - Saillie → echographie    J28-J35
 *  - Saillie → mise_bas_prevue J114 ± 3
 *  - Saillie → vaccin_coli    J85  (truie gestante)
 *  - Saillie → vaccin_parvo   J100 (rappel truie gestante)
 *  - MB      → fer_porcelet   J3
 *  - MB      → sevrage_prevu  J21 (configurable ferme, défaut 21)
 *  - Sevrage → retour_chaleurs J4-J7
 *
 * Filtrage des événements déjà résolus : on s'appuie sur les
 * tables suivantes pour suppression :
 *  - diagnostics_gestation (clé saillie_id) → masque diag_gestation + echographie
 *  - mises_bas (clé saillie_id)             → masque mise_bas_prevue
 *  - sevrages (clé mb_id)                   → masque sevrage_prevu + fer_porcelet
 *
 * Aucun import Supabase, aucun appel réseau : fonctions pures TS testables.
 */

// ─── Types métier (alignés sur schéma BDD prod) ────────────────────────────

export type SaillieRow = {
  id: string
  truie_id: string
  verrat_id: string | null
  date_saillie: string // ISO YYYY-MM-DD
  truie?: { tag: string; nom: string | null } | null
}

export type MiseBasRow = {
  id: string
  truie_id: string
  saillie_id: string | null
  date_mise_bas: string // ISO YYYY-MM-DD (lecture; physique = date_mb)
  truie?: { tag: string; nom: string | null } | null
}

export type SevrageRow = {
  id: string
  mb_id: string
  truie_id: string
  date_sevrage: string // ISO YYYY-MM-DD
  truie?: { tag: string; nom: string | null } | null
}

export type DiagnosticGestationRow = {
  saillie_id: string
  resultat: 'positif' | 'negatif' | 'doute' | string
  date_diag: string
}

// ─── Sortie : EvenementPrevu ───────────────────────────────────────────────

export type TypeEvenement =
  | 'diag_gestation'
  | 'echographie'
  | 'mise_bas_prevue'
  | 'fer_porcelet'
  | 'sevrage_prevu'
  | 'retour_chaleurs'
  | 'vaccin_coli'
  | 'vaccin_parvo'

export type EvenementPrevu = {
  id: string
  date: Date
  type: TypeEvenement
  cible: 'truie' | 'porcelets' | 'bande'
  cible_id: string
  cible_label: string
  description: string
  priorite: 'critique' | 'eleve' | 'moyen' | 'info'
  /** Négatif = à venir (J-N), positif = en retard (depuis N jours). */
  retard_jours: number
  /** Route cliquable pour aller agir. */
  href: string
}

// ─── Utils dates (UTC pour stabilité SSR/hydration) ────────────────────────

function parseIsoDate(iso: string): Date {
  // YYYY-MM-DD → minuit UTC → Date
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1))
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime())
  x.setUTCDate(x.getUTCDate() + n)
  return x
}

function diffDays(a: Date, b: Date): number {
  // jours entiers entre a (cible) et b (today) : >0 si b > a (retard)
  const MS = 86_400_000
  const da = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())
  const db = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate())
  return Math.round((db - da) / MS)
}

function labelTruie(s: { truie?: { tag: string; nom: string | null } | null }): string {
  const t = s.truie
  if (!t) return '—'
  return t.nom ? `${t.nom} ${t.tag}` : t.tag
}

// ─── Projection — Saillie ─────────────────────────────────────────────────

export function projeterEvenementsSaillie(
  s: SaillieRow,
  today: Date
): EvenementPrevu[] {
  const ref = parseIsoDate(s.date_saillie)
  const lib = labelTruie(s)
  const out: EvenementPrevu[] = []

  // J21 — Diagnostic gestation (retour chaleurs surveillance J18-J24)
  {
    const d = addDays(ref, 21)
    out.push({
      id: `saillie-${s.id}-diag`,
      date: d,
      type: 'diag_gestation',
      cible: 'truie',
      cible_id: s.truie_id,
      cible_label: lib,
      description: 'Diagnostic gestation — fenêtre J18-J24 (retour chaleurs)',
      priorite: 'eleve',
      retard_jours: diffDays(d, today),
      href: '/reproduction',
    })
  }

  // J32 — Échographie (fenêtre J28-J35)
  {
    const d = addDays(ref, 32)
    out.push({
      id: `saillie-${s.id}-echo`,
      date: d,
      type: 'echographie',
      cible: 'truie',
      cible_id: s.truie_id,
      cible_label: lib,
      description: 'Échographie possible — fenêtre J28-J35',
      priorite: 'moyen',
      retard_jours: diffDays(d, today),
      href: '/reproduction',
    })
  }

  // J85 — Vaccin Coli
  {
    const d = addDays(ref, 85)
    out.push({
      id: `saillie-${s.id}-vaccin-coli`,
      date: d,
      type: 'vaccin_coli',
      cible: 'truie',
      cible_id: s.truie_id,
      cible_label: lib,
      description: 'Vaccin Coli truie gestante (J85)',
      priorite: 'moyen',
      retard_jours: diffDays(d, today),
      href: '/sanitaire',
    })
  }

  // J100 — Rappel Coli/Clostri (rappel vaccin truie gestante)
  {
    const d = addDays(ref, 100)
    out.push({
      id: `saillie-${s.id}-vaccin-rappel`,
      date: d,
      type: 'vaccin_parvo',
      cible: 'truie',
      cible_id: s.truie_id,
      cible_label: lib,
      description: 'Rappel Coli/Clostri J100',
      priorite: 'moyen',
      retard_jours: diffDays(d, today),
      href: '/sanitaire',
    })
  }

  // J114 — Mise bas prévue (± 3 jours)
  {
    const d = addDays(ref, 114)
    out.push({
      id: `saillie-${s.id}-mb`,
      date: d,
      type: 'mise_bas_prevue',
      cible: 'truie',
      cible_id: s.truie_id,
      cible_label: lib,
      description: 'Mise bas prévue (J114 ± 3 jours)',
      priorite: 'critique',
      retard_jours: diffDays(d, today),
      href: '/mises-bas?action=new',
    })
  }

  return out
}

// ─── Projection — Mise bas ────────────────────────────────────────────────

export function projeterEvenementsMiseBas(
  mb: MiseBasRow,
  today: Date,
  ageSevrageJours = 21
): EvenementPrevu[] {
  const ref = parseIsoDate(mb.date_mise_bas)
  const lib = labelTruie(mb)
  const out: EvenementPrevu[] = []

  // J3 — Fer porcelets
  {
    const d = addDays(ref, 3)
    out.push({
      id: `mb-${mb.id}-fer`,
      date: d,
      type: 'fer_porcelet',
      cible: 'porcelets',
      cible_id: mb.id,
      cible_label: `Portée ${lib}`,
      description: 'Injection fer porcelets (J3)',
      priorite: 'eleve',
      retard_jours: diffDays(d, today),
      href: '/sanitaire',
    })
  }

  // Sevrage prévu (J21 par défaut, configurable)
  {
    const d = addDays(ref, ageSevrageJours)
    out.push({
      id: `mb-${mb.id}-sevrage`,
      date: d,
      type: 'sevrage_prevu',
      cible: 'porcelets',
      cible_id: mb.id,
      cible_label: `Portée ${lib}`,
      description: `Sevrage prévu (J${ageSevrageJours})`,
      priorite: 'critique',
      retard_jours: diffDays(d, today),
      href: '/mises-bas',
    })
  }

  return out
}

// ─── Projection — Sevrage ─────────────────────────────────────────────────

export function projeterEvenementsSevrage(
  sv: SevrageRow,
  today: Date
): EvenementPrevu[] {
  const ref = parseIsoDate(sv.date_sevrage)
  const lib = labelTruie(sv)
  const out: EvenementPrevu[] = []

  // J5 — Retour chaleurs (milieu fenêtre J4-J7)
  {
    const d = addDays(ref, 5)
    out.push({
      id: `sv-${sv.id}-chaleurs`,
      date: d,
      type: 'retour_chaleurs',
      cible: 'truie',
      cible_id: sv.truie_id,
      cible_label: lib,
      description: 'Surveillance retour chaleurs (J4-J7 post-sevrage)',
      priorite: 'eleve',
      retard_jours: diffDays(d, today),
      href: '/reproduction?action=new',
    })
  }

  return out
}

// ─── Orchestrateur : projection globale + filtrage résolus ────────────────

export function projeterTous(
  saillies: SaillieRow[],
  misesBas: MiseBasRow[],
  sevrages: SevrageRow[],
  today: Date,
  options?: {
    diagnostics?: DiagnosticGestationRow[]
    ageSevrageJours?: number
  }
): EvenementPrevu[] {
  const diagsBySaillie = new Set<string>(
    (options?.diagnostics ?? [])
      .filter((d) => d.resultat === 'positif' || d.resultat === 'negatif')
      .map((d) => d.saillie_id)
  )
  const mbBySaillie = new Set<string>(
    misesBas.map((m) => m.saillie_id).filter((id): id is string => !!id)
  )
  const sevByMb = new Set<string>(sevrages.map((s) => s.mb_id))

  const out: EvenementPrevu[] = []

  for (const s of saillies) {
    const evs = projeterEvenementsSaillie(s, today)
    for (const e of evs) {
      // Masquer diag/echo si diagnostic déjà tranché
      if (
        (e.type === 'diag_gestation' || e.type === 'echographie') &&
        diagsBySaillie.has(s.id)
      )
        continue
      // Masquer mise_bas_prevue si MB déjà enregistrée
      if (e.type === 'mise_bas_prevue' && mbBySaillie.has(s.id)) continue
      // Vaccins coli/parvo : on les supprime si la MB a déjà eu lieu
      // (gestation terminée → plus de sens d'injecter avant MB)
      if (
        (e.type === 'vaccin_coli' || e.type === 'vaccin_parvo') &&
        mbBySaillie.has(s.id)
      )
        continue
      out.push(e)
    }
  }

  for (const m of misesBas) {
    const evs = projeterEvenementsMiseBas(m, today, options?.ageSevrageJours)
    for (const e of evs) {
      // Masquer sevrage_prevu + fer si sevrage déjà enregistré
      if (
        (e.type === 'sevrage_prevu' || e.type === 'fer_porcelet') &&
        sevByMb.has(m.id)
      )
        continue
      out.push(e)
    }
  }

  for (const sv of sevrages) {
    out.push(...projeterEvenementsSevrage(sv, today))
  }

  return out
}

// ─── Buckets pour affichage UI ────────────────────────────────────────────

export type BucketEvenements = {
  enRetard: EvenementPrevu[]
  cetteSemaine: EvenementPrevu[]
  ces14Jours: EvenementPrevu[]
  apresJ14: EvenementPrevu[]
}

/**
 * Range les événements en 4 buckets selon `retard_jours`.
 *  - enRetard  : retard_jours > 0
 *  - semaine   : 0 ≤ -retard_jours ≤ 7
 *  - 14jours   : 7 < -retard_jours ≤ 14
 *  - après J14 : -retard_jours > 14 (jusqu'à 30j)
 *
 * Filtre dur : ignore tout événement plus de 30 jours dans le futur.
 */
export function bucketize(evts: EvenementPrevu[]): BucketEvenements {
  const enRetard: EvenementPrevu[] = []
  const cetteSemaine: EvenementPrevu[] = []
  const ces14Jours: EvenementPrevu[] = []
  const apresJ14: EvenementPrevu[] = []

  for (const e of evts) {
    const r = e.retard_jours
    if (r > 0) {
      enRetard.push(e)
    } else if (r >= -7) {
      cetteSemaine.push(e)
    } else if (r >= -14) {
      ces14Jours.push(e)
    } else if (r >= -30) {
      apresJ14.push(e)
    }
  }

  const priOrder: Record<EvenementPrevu['priorite'], number> = {
    critique: 0,
    eleve: 1,
    moyen: 2,
    info: 3,
  }
  const cmp = (a: EvenementPrevu, b: EvenementPrevu) =>
    priOrder[a.priorite] - priOrder[b.priorite] ||
    a.date.getTime() - b.date.getTime()

  enRetard.sort((a, b) => b.retard_jours - a.retard_jours || cmp(a, b))
  cetteSemaine.sort(cmp)
  ces14Jours.sort(cmp)
  apresJ14.sort(cmp)

  return { enRetard, cetteSemaine, ces14Jours, apresJ14 }
}

// ─── Génération iCalendar RFC 5545 ────────────────────────────────────────

const TYPE_LABEL_FR: Record<TypeEvenement, string> = {
  diag_gestation: 'Diagnostic gestation',
  echographie: 'Échographie',
  mise_bas_prevue: 'Mise bas prévue',
  fer_porcelet: 'Fer porcelets',
  sevrage_prevu: 'Sevrage prévu',
  retour_chaleurs: 'Retour chaleurs',
  vaccin_coli: 'Vaccin Coli',
  vaccin_parvo: 'Rappel Coli/Clostri',
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toIcsDate(d: Date): string {
  // VALUE=DATE all-day (YYYYMMDD) — événement journée, pas d'heure
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
}

function toIcsDateTimeUtc(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(
    d.getUTCDate()
  )}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(
    d.getUTCSeconds()
  )}Z`
}

/** Echappe les caractères réservés iCal (RFC 5545 §3.3.11). */
function escIcs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n')
}

/** Plie les lignes >75 octets (RFC 5545 §3.1) — approx caractères. */
function fold(line: string): string {
  if (line.length <= 75) return line
  const parts: string[] = []
  let i = 0
  while (i < line.length) {
    if (i === 0) {
      parts.push(line.slice(0, 75))
      i = 75
    } else {
      parts.push(' ' + line.slice(i, i + 74))
      i += 74
    }
  }
  return parts.join('\r\n')
}

/**
 * Génère un flux iCalendar RFC 5545 à partir des événements prévus.
 * Format VEVENT all-day. Compatible Google Calendar / Apple / Outlook.
 */
export function genererIcal(
  evts: EvenementPrevu[],
  options?: { fermeNom?: string; now?: Date }
): string {
  const now = options?.now ?? new Date()
  const dtstamp = toIcsDateTimeUtc(now)
  const fermeNom = options?.fermeNom ?? 'Smart Farm'

  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Smart Farm//Calendrier prévisionnel//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:Smart Farm — ${escIcs(fermeNom)}`),
    'X-WR-TIMEZONE:UTC',
  ]

  const body: string[] = []
  for (const e of evts) {
    const start = toIcsDate(e.date)
    const end = toIcsDate(addDays(e.date, 1)) // DTEND exclusif
    const summary = `${TYPE_LABEL_FR[e.type]} — ${e.cible_label}`
    body.push(
      'BEGIN:VEVENT',
      fold(`UID:${e.id}@smartfarm.group`),
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${start}`,
      `DTEND;VALUE=DATE:${end}`,
      fold(`SUMMARY:${escIcs(summary)}`),
      fold(`DESCRIPTION:${escIcs(e.description)}`),
      fold(`CATEGORIES:${escIcs(e.type)}`),
      `PRIORITY:${
        e.priorite === 'critique'
          ? 1
          : e.priorite === 'eleve'
            ? 3
            : e.priorite === 'moyen'
              ? 5
              : 7
      }`,
      'END:VEVENT'
    )
  }

  const footer = ['END:VCALENDAR']
  return [...header, ...body, ...footer].join('\r\n') + '\r\n'
}

// Labels FR exportés pour usage UI
export const EVENEMENT_LABEL = TYPE_LABEL_FR
