/* Hallmark · macrostructure: 06-conversational-faq · screen: /assistant · tone: terrain-vivant · theme: Terre & Mil (DESIGN.md) · pre-emit: P5 H5 E4 S4 R5 V4 */
import type { Metadata } from 'next'
import { Chatbot } from './_components/chatbot'
import { signSessionToken } from '@/lib/chatbot/session-token'

export const metadata: Metadata = {
  title: 'Conseil',
}

/**
 * Smart Farm — Page /assistant, refonte macrostructure 06 (Conversational FAQ).
 *
 * Carnet de conseil terrain en Q/R : questions fréquentes d'élevage en tête
 * (registre FAQ), puis fil de conseil streaming (POST /api/chatbot, persistance
 * localStorage 50 messages). Aucune signature chatbot-IA : ni Sparkles, ni
 * « Assistant Smart Farm », ni avatar.
 *
 * Server Component minimal : pose l'en-tête sémantique, délègue le runtime au
 * client component `_components/chatbot.tsx`.
 */

export const dynamic = 'force-dynamic'

export default function AssistantPage() {
  // Token de session signé HMAC, injecté dans le client component pour
  // authentifier les appels POST /api/chatbot (V1 single-tenant, pas d'auth).
  const sessionToken = signSessionToken()

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
      <header className="shrink-0 border-b border-[var(--sf-line)] pb-3">
        <div className="font-[family-name:var(--sf-font-display)] uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--sf-accent)]">
          Conseil — élevage porcin tropical
        </div>
        <h1 className="text-3xl font-bold text-[var(--sf-ink)] mt-1 font-[family-name:var(--sf-font-display)]">
          Quelle est votre question&nbsp;?
        </h1>
        <p className="text-[14px] text-[var(--sf-muted)] mt-1.5 font-[family-name:var(--sf-font-body)] max-w-[64ch]">
          Ration, sanitaire, reproduction, biosécurité&nbsp;: posez la question
          du jour, ou ouvrez une des questions qui reviennent le plus.
        </p>
      </header>

      <Chatbot sessionToken={sessionToken} />
    </div>
  )
}
