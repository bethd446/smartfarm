# Brief V2-H — Polish UX : Empty states, Skeleton loaders, Chatbot avatar, Tip du jour héro

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : Appliquer le composant `<EmptyState>` et `<Skeleton>` partout où c'est manquant + polish chatbot et tip du jour

⚠️ CHANTIER FRONT UNIQUEMENT — aucune migration ni server action lourde

---

## PÉRIMÈTRE EXCLUSIF

1. Pages avec listes potentiellement vides — ajoute `<EmptyState>` :
   - `app/src/app/(app)/dashboard/page.tsx` (sections "Dernières naissances", "Dernières saillies", "Stock qui baisse", "Tip du jour")
   - `app/src/app/(app)/alertes/page.tsx`
   - `app/src/app/(app)/cheptel/page.tsx`
   - `app/src/app/(app)/reproduction/page.tsx`
   - `app/src/app/(app)/mises-bas/page.tsx`
2. Pages avec chargement lent — ajoute `<Skeleton>` dans `loading.tsx` (Next.js convention) :
   - `app/src/app/(app)/dashboard/loading.tsx` (créer si absent)
   - `app/src/app/(app)/alertes/loading.tsx`
   - `app/src/app/(app)/cheptel/loading.tsx`
   - `app/src/app/(app)/sanitaire/calendrier/loading.tsx`
3. **Chatbot UX** (`app/src/app/(app)/assistant/page.tsx` ou équivalent) :
   - Ajoute avatar IA (utilise `public/images/ds/icons/marius-avatar.webp` si présent — sinon emoji 🐷 ou autre)
   - Bulles style WhatsApp (rebords arrondis asymétriques, fond vert pâle utilisateur / blanc IA)
4. **Tip du jour héro** : sur dashboard, le tip du jour utilise une image héro depuis `public/images/ds/icons/r1-*.webp`
5. **NE TOUCHE PAS** : DB, sidebar/bottom-nav (V2-G s'en occupe), nutrition, sanitaire pages métier

---

## CONTEXTE

- Composants existants à utiliser :
  - `app/src/components/ui/empty-state.tsx`
  - `app/src/components/ui/skeleton.tsx`
- Assets disponibles :
  ```bash
  ls app/public/images/ds/icons/
  ```
- Lis le composant `<EmptyState>` pour son API exacte :
  ```bash
  cat app/src/components/ui/empty-state.tsx
  ```

---

## TÂCHE 1 — Empty states

Pour CHAQUE liste/section qui peut être vide, remplace :

```tsx
{items.length === 0 && <p>Aucun résultat</p>}
{items.length > 0 && items.map(...)}
```

Par :

```tsx
{items.length === 0 ? (
  <EmptyState
    icon={IconAdapté}
    title="Titre adapté"
    description="Description courte expliquant pourquoi c'est vide et comment ajouter"
    action={<Button asChild><Link href="/route-pour-ajouter">Action</Link></Button>}  // optionnel
  />
) : (
  items.map(...)
)}
```

Exemples concrets :
- **Dernières naissances** : "Aucune naissance enregistrée" + action "Enregistrer mise-bas"
- **Stock qui baisse** : "Tous les stocks sont au-dessus du seuil" (positif)
- **Alertes** : "Aucune alerte active — tout va bien" (positif avec icône ✅)
- **Tip du jour** absent : "Aucun tip disponible pour aujourd'hui"

---

## TÂCHE 2 — Skeleton loaders (`loading.tsx`)

Next.js App Router : tout fichier `loading.tsx` dans un dossier est utilisé automatiquement durant le chargement de `page.tsx` du même niveau.

Crée des `loading.tsx` minimalistes :

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
```

Adapte pour chaque page (le squelette doit ressembler à la vraie page).

---

## TÂCHE 3 — Chatbot UX (bulles WhatsApp + avatar)

Localise la page chatbot :
```bash
find app/src/app -name "page.tsx" | xargs grep -l -i "assistant\|chat\|marius" | head -3
```

Pattern bulles WhatsApp :

```tsx
{messages.map(m => (
  <div className={cn(
    "flex items-end gap-2 mb-3",
    m.role === 'user' ? "justify-end" : "justify-start"
  )}>
    {m.role === 'assistant' && (
      <Image src="/images/ds/icons/marius-avatar.webp" alt="Assistant"
             width={36} height={36} className="rounded-full flex-shrink-0" />
    )}
    <div className={cn(
      "max-w-[75%] px-4 py-2 shadow-sm",
      m.role === 'user'
        ? "bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl rounded-br-sm"
        : "bg-card border rounded-2xl rounded-bl-sm"
    )}>
      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
    </div>
  </div>
))}
```

Si `marius-avatar.webp` n'existe pas, utilise un avatar emoji dans un cercle de couleur (`bg-emerald-600 text-white rounded-full`).

---

## TÂCHE 4 — Tip du jour héro

Sur le dashboard, le composant qui affiche le tip du jour (probablement dans `app/src/app/(app)/dashboard/_components/`).

Recherche-le :
```bash
grep -r "tip\|Tip" app/src/app/\(app\)/dashboard/ -l
```

Refactor visuel :

```tsx
<Card className="overflow-hidden">
  <div className="grid md:grid-cols-[200px_1fr] gap-0">
    <div className="relative h-32 md:h-auto bg-gradient-to-br from-amber-100 to-orange-200">
      <Image
        src="/images/ds/icons/r1-conseil.webp"  // ou autre icône thématique
        alt=""
        fill
        className="object-contain p-4"
      />
    </div>
    <div className="p-4">
      <Badge className="mb-2">💡 Tip du jour</Badge>
      <h3 className="font-semibold text-lg mb-1">{tip.titre}</h3>
      <p className="text-sm text-muted-foreground">{tip.contenu}</p>
    </div>
  </div>
</Card>
```

⚠️ Vérifie d'abord quelles images r1-*.webp existent dans `public/images/ds/icons/` :
```bash
ls app/public/images/ds/icons/ | grep r1-
```

---

## PROCÉDURE

1. Lis les composants `<EmptyState>` et `<Skeleton>` pour leur API
2. Audit rapide des pages cibles (utilise `grep -n "items.length === 0\|map\(" page.tsx`)
3. Refactor par lots (1 page à la fois)
4. Crée les 4 `loading.tsx`
5. Refactor chatbot + tip du jour
6. Build + redeploy static (sans tuer le serveur) :
   ```bash
   export PATH=/root/.hermes/node/bin:$PATH
   cd /root/projects/smartfarm/app
   npm run build
   cp -rT .next/static .next/standalone/projects/smartfarm/app/.next/static
   cp -rT public .next/standalone/projects/smartfarm/app/public 2>/dev/null || true
   ```
7. Tests HTTP sur toutes les pages modifiées

---

## LIVRABLES

1. ≥5 pages avec `<EmptyState>` appliqué
2. ≥4 `loading.tsx` créés
3. Chatbot avec avatar + bulles WhatsApp
4. Tip du jour avec image héro
5. Rapport `/root/projects/smartfarm/agents/V2-S3/RAPPORT_V2H.md` :
   - Liste des fichiers modifiés
   - Snippets avant/après pour 1 EmptyState et 1 bulle chatbot
   - Codes HTTP

## ANTI-PIÈGES

- N'invente pas le chemin d'une image — `ls` d'abord
- Si un composant n'a PAS de cas "vide" (toujours peuplé), ne force pas l'EmptyState — passe
- Le restart serveur n'est PAS de ta responsabilité — c'est l'orchestrateur qui gère
- Conserve le typage TypeScript existant (ne casse pas les Props)
- L'avatar chatbot ne doit PAS pousser le contenu hors viewport — teste sur mobile (380px width)
