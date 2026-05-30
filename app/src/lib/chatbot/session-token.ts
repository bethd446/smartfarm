import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Smart Farm — Token de session signé pour /api/chatbot
 *
 * V1 single-tenant : on n'a pas encore d'auth utilisateur. Pour empêcher
 * la route /api/chatbot d'être appelée par n'importe qui (et donc de cramer
 * le crédit OpenRouter), on signe un token côté serveur (Server Component
 * /assistant) qu'on injecte dans le client. La route POST refuse toute
 * requête sans token valide.
 *
 *   - Format : `${ts}.${nonce_hex}.${sig_hex}` (sig = HMAC-SHA256 tronqué)
 *   - TTL    : 24h
 *   - Secret : process.env.CHATBOT_SESSION_SECRET (fallback random au boot,
 *              les tokens ne survivent alors pas à un restart — acceptable
 *              pour le dev, mais en prod on DOIT setter la var d'env).
 */

const SECRET = process.env.CHATBOT_SESSION_SECRET ?? randomBytes(32).toString('hex')

const MAX_AGE_MS = 24 * 3600 * 1000

export function signSessionToken(): string {
  const payload = `${Date.now()}.${randomBytes(8).toString('hex')}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('hex').slice(0, 16)
  return `${payload}.${sig}`
}

export function verifySessionToken(token: string): { valid: boolean; age_ms?: number } {
  if (!token || typeof token !== 'string') return { valid: false }
  const parts = token.split('.')
  if (parts.length !== 3) return { valid: false }
  const [ts, nonce, sig] = parts
  if (!/^\d+$/.test(ts) || !/^[a-f0-9]+$/i.test(nonce) || !/^[a-f0-9]+$/i.test(sig)) {
    return { valid: false }
  }
  const expected = createHmac('sha256', SECRET).update(`${ts}.${nonce}`).digest('hex').slice(0, 16)
  const sigBuf = Buffer.from(sig)
  const expectedBuf = Buffer.from(expected)
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false }
  }
  const age_ms = Date.now() - Number(ts)
  if (age_ms < 0 || age_ms > MAX_AGE_MS) return { valid: false }
  return { valid: true, age_ms }
}
