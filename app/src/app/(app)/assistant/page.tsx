import type { Metadata } from 'next'
import { Sparkles } from 'lucide-react'
import { Chatbot } from './_components/chatbot'
import { signSessionToken } from '@/lib/chatbot/session-token'

export const metadata: Metadata = {
  title: 'Assistant — Smart Farm',
}

/**
 * Smart Farm — Page hub /assistant (C7-B)
 *
 * Assistant agritech conversationnel pour l'éleveur :
 *   - Conversation streaming (POST /api/chatbot)
 *   - Persistance localStorage (50 derniers messages)
 *   - Suggestions d'amorce si conversation vide
 *
 * L'UI complète vit dans `_components/chatbot.tsx` (client component).
 * Cette page est volontairement un Server Component minimal : elle pose
 * uniquement le header sémantique et délègue tout le runtime au client.
 */

export const dynamic = 'force-dynamic'

export default function AssistantPage() {
  // Token de session signé HMAC, injecté dans le client component pour
  // authentifier les appels POST /api/chatbot (V1 single-tenant, pas d'auth).
  const sessionToken = signSessionToken()

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] gap-4">
      <header className="shrink-0">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-[var(--sf-ink,#1a1a1a)]">
          <Sparkles className="h-7 w-7 text-[var(--sf-primary,#2D4A1F)]" />
          Assistant Smart Farm
        </h1>
        <p className="text-sm text-[var(--sf-muted,#5C5346)] mt-1">
          Conseil agritech personnalisé pour ta ferme — nutrition, sanitaire,
          reproduction, protocoles vaccinaux.
        </p>
      </header>

      <Chatbot sessionToken={sessionToken} />
    </div>
  )
}
