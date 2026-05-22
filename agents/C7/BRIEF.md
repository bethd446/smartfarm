# CHANTIER C7 — Chatbot LLM agritech (provider-agnostic)

## Contexte projet

Smart Farm — Next.js 16 + React 19 + Tailwind v4 + Supabase Docker local. Élevage porcin CI.
Repo `/root/projects/smartfarm/app/`. DB port 54322. DEMO_FERME_ID `'00000000-0000-0000-0000-000000000001'`.

**EXIGENCE STRATÉGIQUE — Architecture multi-provider** :
- V1 (now) : OpenRouter → Claude Sonnet 4.5 (clé déjà en `.env.local` : `OPENROUTER_API_KEY`)
- V2 (futur) : **Mistral** (Mistral Large 2, mistral-large-latest) via api.mistral.ai
- Le SWITCH se fait via UNE seule variable d'env : `CHATBOT_PROVIDER=openrouter|mistral`
- Aucun fichier métier (UI, route handler, RAG) ne doit dépendre d'un provider précis : tout passe par une **interface abstraite**

## Mission C7

Construire un assistant agritech conversationnel pour l'éleveur :
- Pose des questions en langage naturel ("Quelle ration pour mes porcs de 60 kg ?", "Truie qui ne mange plus, que faire ?")
- L'assistant a accès aux données de la ferme (animaux, alertes, protocoles, maladies, formulations)
- Conversation persistée par session (V1 : localStorage côté client, V2 : table DB)
- Streaming des réponses (UX rapide)
- Réponses ancrées sur la base de connaissances Smart Farm (15 maladies, 12 protocoles, catalogue nutrition)

## Périmètres disjoints — 3 agents parallèles

---

### AGENT C7-A — Provider abstraction + API route streaming

**Fichiers AUTORISÉS** :
- `app/src/lib/chatbot/provider.ts` (NEW) — interface `ChatProvider` + factory
- `app/src/lib/chatbot/providers/openrouter.ts` (NEW) — impl OpenRouter
- `app/src/lib/chatbot/providers/mistral.ts` (NEW) — impl Mistral (stub fonctionnel)
- `app/src/lib/chatbot/system-prompt.ts` (NEW) — system prompt agritech Smart Farm
- `app/src/lib/chatbot/rag.ts` (NEW) — récupération contexte ferme depuis DB
- `app/src/app/api/chatbot/route.ts` (NEW) — POST route streaming (Edge Runtime ou Node)

**Spec — Interface provider (CRITICAL)** :

```ts
// app/src/lib/chatbot/provider.ts

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type ChatStreamChunk = {
  delta: string  // texte ajouté
  done: boolean  // true sur dernier chunk
  usage?: { input_tokens: number, output_tokens: number }
}

export interface ChatProvider {
  readonly name: string  // 'openrouter' | 'mistral'
  readonly model: string  // 'anthropic/claude-sonnet-4.5' | 'mistral-large-latest'
  
  streamChat(
    messages: ChatMessage[],
    options?: { temperature?: number; max_tokens?: number }
  ): AsyncIterable<ChatStreamChunk>
}

// Factory
export function getChatProvider(): ChatProvider {
  const name = process.env.CHATBOT_PROVIDER ?? 'openrouter'
  switch (name) {
    case 'openrouter': return new OpenRouterProvider({
      apiKey: process.env.OPENROUTER_API_KEY!,
      model: process.env.CHATBOT_MODEL ?? 'anthropic/claude-sonnet-4.5'
    })
    case 'mistral': return new MistralProvider({
      apiKey: process.env.MISTRAL_API_KEY!,
      model: process.env.CHATBOT_MODEL ?? 'mistral-large-latest'
    })
    default: throw new Error(`Provider inconnu : ${name}`)
  }
}
```

**Spec OpenRouter provider** :
- POST `https://openrouter.ai/api/v1/chat/completions` avec `stream: true`
- Headers : `Authorization: Bearer <key>`, `Content-Type: application/json`, `HTTP-Referer: https://smartfarm.187-127-225-24.nip.io` (recommandé OpenRouter), `X-Title: Smart Farm Chatbot`
- Body : `{ model, messages, stream: true, temperature: 0.7, max_tokens: 1024 }`
- Parser le format SSE : `data: {...}\n\n`, extraire `choices[0].delta.content`, gérer `data: [DONE]`

**Spec Mistral provider (stub fonctionnel)** :
- POST `https://api.mistral.ai/v1/chat/completions` avec `stream: true`
- Headers : `Authorization: Bearer <MISTRAL_API_KEY>`, `Content-Type: application/json`
- Body identique en shape OpenAI-compatible
- Parser identique (Mistral renvoie format OpenAI SSE)
- Si `MISTRAL_API_KEY` non définie : lance une erreur explicite "MISTRAL_API_KEY manquante — ajoute la clé pour activer le provider Mistral"

**Spec System prompt agritech (`system-prompt.ts`)** :
```ts
export const SYSTEM_PROMPT = `Tu es l'assistant agritech de Smart Farm, dédié à l'élevage porcin en Côte d'Ivoire.

Mission : aider Christophe et son équipe à prendre les bonnes décisions techniques sur leur ferme.

Tu connais :
- Le cheptel actif (animaux, bandes, reproduction, mises bas, pesées) — données dynamiques fournies en contexte
- Les protocoles vaccinaux Smart Farm (12 protocoles standards J1 → J100 + truie/verrat)
- Les 15 maladies porcines majeures (PPA, PPC, rouget, parvovirose, colibacillose, salmonellose, mycoplasmose, circovirose, TGE, gale, ascaridiose, coccidiose, anémie ferriprive, MMA)
- Le catalogue nutritionnel : 20 matières premières CI (maïs, sorgho, tourteaux locaux, son, manioc, etc.) + 11 concentrés industriels (IVOGRAIN, De Heus, Koudijs, Vitalac)
- Les besoins NRC 2012 / INRA 2018 par stade (porcelet, croissance, finition, truie gestante/allaitante, verrat)
- Les alertes actives de la ferme (calculées en temps réel)

Style :
- Français pro accessible, pas folklorique
- Réponses concises et actionnables (pas de blabla introductif)
- Tableaux ou listes quand pertinent
- Devise FCFA
- Si question hors-scope agritech porcine : redirige poliment
- Si tu n'es pas sûr → dis-le et propose une vérification vétérinaire

Avertissement médical : tu n'es pas vétérinaire. Toute prescription médicamenteuse doit être validée par un vétérinaire agréé.`
```

**Spec RAG (`rag.ts`)** :
```ts
export async function getContexteFerme(supabase): Promise<string> {
  // Récupère un résumé compact de la ferme à injecter dans le system prompt
  // Format : texte structuré, max 800 tokens
  
  const [animaux, bandes, alertes, stockCritique] = await Promise.all([
    supabase.from('animaux').select('count').neq('statut', 'mort'),
    supabase.from('bandes').select('id, code, nom').eq('statut', 'active'),
    supabase.from('v_alertes_actives').select('gravite, titre').limit(10),
    supabase.from('matieres_premieres').select('nom, stock_actuel, seuil_alerte').lt('stock_actuel', 'seuil_alerte').limit(5)
  ])
  
  return `## État de la ferme (snapshot)

Cheptel : ${animaux.count} animaux actifs
Bandes actives : ${bandes.data?.map(b => b.code).join(', ') || 'aucune'}
Alertes en cours : ${alertes.data?.length || 0}
  - ${alertes.data?.slice(0, 5).map(a => `[${a.gravite}] ${a.titre}`).join('\n  - ')}
Stocks critiques : ${stockCritique.data?.map(s => `${s.nom} (${s.stock_actuel}/${s.seuil_alerte})`).join(', ') || 'aucun'}
`
}
```

**Spec API route (`/api/chatbot/route.ts`)** :
```ts
// Node runtime (pas Edge — on a besoin de Supabase server client)
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const { messages } = await req.json() as { messages: ChatMessage[] }
  
  // 1. Validation Zod
  // 2. Récup contexte ferme via RAG
  // 3. Build full messages : [system + ferme context, ...messages]
  // 4. getChatProvider().streamChat(...)
  // 5. Pipe en Response avec ReadableStream + Content-Type: text/event-stream
  
  // Format SSE simple :
  // data: {"delta":"Bonjour"}\n\n
  // data: {"delta":" Christophe"}\n\n
  // data: {"done":true}\n\n
}
```

**Définition de DONE** :
- POST `/api/chatbot` accepte `{ messages: [{role,content}] }` et retourne un stream SSE
- Test curl : `curl -N -X POST http://localhost:3000/api/chatbot -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"Bonjour"}]}'` → reçoit du texte streamé
- `getChatProvider()` retourne OpenRouter par défaut, Mistral si `CHATBOT_PROVIDER=mistral` (testable en mocking l'env)
- `npm run build` ✅

---

### AGENT C7-B — UI conversation + page /assistant

**Fichiers AUTORISÉS** :
- `app/src/app/(app)/assistant/page.tsx` (NEW) — page hub
- `app/src/app/(app)/assistant/_components/chatbot.tsx` (NEW) — composant client conversation
- `app/src/app/(app)/assistant/_components/message-bubble.tsx` (NEW) — bulle individuelle
- `app/src/app/(app)/assistant/_components/suggestions.tsx` (NEW) — prompts d'amorce
- `app/src/components/sidebar.tsx` (MODIFY chirurgical) — ajouter lien "Assistant" dans section appropriée (Pilotage ou nouvelle "INTELLIGENCE")

**Spec page `/assistant`** :
- Header avec titre "Assistant Smart Farm" + sous-titre "Conseil agritech personnalisé pour ta ferme"
- Conversation : zone scrollable avec bulles utilisateur/assistant
- Bulles : avatar + nom + message markdown rendu (utiliser `react-markdown` si déjà installé, sinon `marked` + sanitization)
- Input en bas avec textarea auto-resize + bouton Envoyer (Shift+Enter = nouvelle ligne, Enter = envoyer)
- Indicateur "L'assistant écrit..." pendant le streaming
- Persistance localStorage : `smartfarm-chatbot-history-v1` (array de ChatMessage, dernières 50 messages)
- Bouton "Nouvelle conversation" (clear history)
- 4-6 **suggestions d'amorce** affichées si conversation vide :
  - "Quelle ration pour mes porcs en croissance (30-60 kg) ?"
  - "Comment diagnostiquer une diarrhée chez les porcelets ?"
  - "Combien coûte une formule maïs-soja en ce moment ?"
  - "Quels protocoles vaccinaux pour une portée née aujourd'hui ?"
  - "Quelles sont mes alertes prioritaires ?"
  - "Comment prévenir la peste porcine africaine ?"

**Spec streaming côté client** :
```tsx
async function sendMessage(text: string) {
  const newMessages = [...messages, { role: 'user', content: text }]
  setMessages(newMessages)
  setMessages(m => [...m, { role: 'assistant', content: '' }])
  
  const res = await fetch('/api/chatbot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: newMessages })
  })
  
  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value)
    // Parser SSE "data: {...}"
    for (const line of chunk.split('\n')) {
      if (!line.startsWith('data: ')) continue
      const json = JSON.parse(line.slice(6))
      if (json.delta) {
        setMessages(m => {
          const last = m[m.length - 1]
          return [...m.slice(0, -1), { ...last, content: last.content + json.delta }]
        })
      }
    }
  }
}
```

**Spec sidebar** :
- Lien "Assistant" avec icône `Bot` (lucide-react) ou `Sparkles`
- Section : créer une nouvelle section **"INTELLIGENCE"** entre PILOTAGE et ÉLEVAGE, contenant `Assistant` (et plus tard d'autres outils IA)

**Définition de DONE** :
- Page `/assistant` HTTP 200
- Conversation fonctionnelle (envoi message → streaming réponse visible)
- Persistance localStorage
- Sidebar lien visible
- `npm run build` ✅

---

### AGENT C7-C — Tool calling (actions in-app) — STUB documenté

**Note** : Le tool calling complet (chatbot peut INSERT en DB) est complexe. V1 = stub documenté, V2 = implémentation. Mais on prépare la structure.

**Fichiers AUTORISÉS** :
- `app/src/lib/chatbot/tools/index.ts` (NEW) — registry des tools disponibles
- `app/src/lib/chatbot/tools/get-animal-by-tag.ts` (NEW) — exemple tool en lecture seule
- `app/src/lib/chatbot/tools/get-alertes.ts` (NEW) — exemple tool alertes
- `app/src/lib/chatbot/tools/types.ts` (NEW) — types Tool (compatible OpenAI/Mistral function calling)

**Spec types tools** :
```ts
export type ToolDefinition = {
  name: string
  description: string
  parameters: { /* JSON Schema */ }
}

export type ToolCall = {
  name: string
  arguments: Record<string, any>
}

export type ToolResult = {
  tool_call_id: string
  content: string  // JSON stringifié de la réponse
}

export interface Tool {
  definition: ToolDefinition
  execute(args: Record<string, any>, ctx: { supabase: SupabaseClient, fermeId: string }): Promise<unknown>
}
```

**Spec 2 tools en lecture seule (proof of concept)** :
1. `getAnimalByTag(tag: string)` → animal complet + dernière pesée + dernier acte sanitaire
2. `getAlertesActives(gravite?: 'critique'|'élevée'|'moyenne'|'info')` → liste filtrée

**Spec registry** :
```ts
export const TOOLS_REGISTRY: Record<string, Tool> = {
  get_animal_by_tag: getAnimalByTag,
  get_alertes_actives: getAlertesActives,
}

export function getToolDefinitions(): ToolDefinition[] {
  return Object.values(TOOLS_REGISTRY).map(t => t.definition)
}
```

**IMPORTANT** : L'intégration tool calling dans l'API route est OUT OF SCOPE V1. L'agent C7-C livre uniquement la structure + 2 tools tests + doc inline qui explique comment l'activer V2. Le système prompt mentionne juste que les tools existent mais ne les utilise PAS encore en V1.

**Définition de DONE** :
- 4 fichiers livrés
- Code compile (tests via `tsc --noEmit`)
- `npm run build` ✅ (les fichiers existent mais ne sont pas consommés)
- Documentation inline V2 dans `tools/index.ts`

---

## Contraintes communes

1. Français pro
2. UI : shadcn/ui + Radix
3. Server Components par défaut, Client uniquement chatbot UI
4. Pas de hardcoded hex
5. **PROVIDER ABSTRACTION OBLIGATOIRE** : aucun fichier UI ou route ne mentionne "OpenRouter" ou "Claude" directement
6. Variables d'env documentées dans un commentaire en haut de `provider.ts` :
   - `CHATBOT_PROVIDER` : `openrouter` (défaut) | `mistral`
   - `CHATBOT_MODEL` : optionnel, modèle spécifique
   - `OPENROUTER_API_KEY` : requis si provider=openrouter
   - `MISTRAL_API_KEY` : requis si provider=mistral
7. Vérif build final : `cd /root/projects/smartfarm/app && npm run build`
8. Test HTTP au moins 1 route

## Hors-périmètre — INTERDIT
- Toutes les pages existantes (cheptel, sanitaire, alimentation, etc.) : interdit toucher
- Pas de migration SQL pour C7 (V1 conversations dans localStorage)
- Pas de tool calling actif (juste structure)

## Livrable rapport
1. Fichiers livrés
2. Build OK
3. HTTP 200 test
4. Test fonctionnel : curl streaming pour A, snapshot UI pour B
5. Hypothèses

GO.
