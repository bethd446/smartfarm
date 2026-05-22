/**
 * Helpers communs aux tests E2E SmartFarm.
 * - Exécution de SQL contre la DB Postgres locale (Supabase docker).
 * - Pas d'auth (mode démo).
 *
 * On utilise psql via child_process plutôt qu'un client pg :
 * - 0 nouvelle dépendance npm
 * - cohérent avec le pattern d'orchestration (psql -h 127.0.0.1 -p 54322 ...)
 */
import { execSync } from 'node:child_process'

const PG_BASE = [
  'PGPASSWORD=postgres',
  'psql',
  '-h', '127.0.0.1',
  '-p', '54322',
  '-U', 'postgres',
  '-d', 'postgres',
  '-At',                 // unaligned, tuples only
  '-F', '\\x1f',         // unit separator entre colonnes (sûr)
].join(' ')

export function sql(query: string): string[][] {
  const cmd = `${PG_BASE} -c ${JSON.stringify(query)}`
  const out = execSync(cmd, { encoding: 'utf8' })
  return out
    .split('\n')
    .filter((l) => l.length > 0)
    .map((l) => l.split('\x1f'))
}

export function sqlScalar(query: string): string | null {
  const rows = sql(query)
  if (rows.length === 0) return null
  return rows[0][0] ?? null
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Nettoyage DB après scénario : on supprime les inserts du jour
 * faits par le test (idempotency_key non null OR observations contient TEST_E2E).
 */
export function cleanupTestRows() {
  const tag = 'TEST_E2E_G1'
  sql(`DELETE FROM sevrages WHERE observations LIKE '%${tag}%'`)
  sql(`DELETE FROM mises_bas WHERE observations LIKE '%${tag}%'`)
  sql(`DELETE FROM mortalites WHERE observations LIKE '%${tag}%'`)
  sql(`DELETE FROM saillies WHERE observations LIKE '%${tag}%'`)
}

export const TEST_TAG = 'TEST_E2E_G1'
