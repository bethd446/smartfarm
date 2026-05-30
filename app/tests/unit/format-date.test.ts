import assert from 'node:assert/strict'
import { formatDateCivile } from '../../src/lib/format/dates.ts'

/**
 * Régression D2 : la date de saillie (événement figé) doit s'afficher en
 * format civil JJ/MM/AAAA, pas en durée relative ("il y a X").
 * Helper pur, déterministe — midi UTC pour neutraliser le fuseau du runner.
 */
assert.equal(formatDateCivile('2026-03-15T12:00:00Z'), '15/03/2026')
assert.equal(formatDateCivile(new Date('2026-12-01T12:00:00Z')), '01/12/2026')
assert.equal(formatDateCivile('2026-01-05T12:00:00Z'), '05/01/2026')

console.log('PASS formatDateCivile')
