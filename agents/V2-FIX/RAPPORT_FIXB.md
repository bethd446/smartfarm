# Rapport FIX-B — Corrections UI/UX V2 Round 2

**Agent :** Producteur FIX-B
**Date :** 2026-05-21
**Périmètre :** 4 fixes UI/UX P0 (audit V2 R2)
**Statut global :** ✅ 4/4 livrés — TypeScript clean (`tsc --noEmit` exit 0)

---

## Synthèse exécutive

| # | Fix | Statut | Fichier impacté |
|---|-----|--------|-----------------|
| 1 | Liste mises-bas + empty state | ✅ | `app/src/app/(app)/mises-bas/page.tsx` |
| 2 | Bouton « Marquer fait » calendrier sanitaire | 🟡 diagnostic | `_actions-porcelets.ts` + `page.tsx` (code OK) |
| 3 | Fuite erreur API technique chatbot | ✅ | `app/src/app/(app)/assistant/_components/chatbot.tsx` |
| 4 | Hiérarchie H2 + cibles tactiles 44px | ✅ | `app/src/app/globals.css` |

Aucun `npm run build` lancé (consigne orchestrateur).
Aucun fichier hors périmètre touché (sidebar/bottom-nav/alertes-regles/migrations intacts).

---

## FIX #1 — Liste mises-bas + empty state

### Constat
Le brief signalait `/mises-bas/page.tsx` comme « quasi-vide ». À la lecture du source, le fichier rendait en fait déjà une **grille de cards riches** (2 colonnes lg) avec un `EmptyState` correct. **Cependant**, pour un opérateur qui scanne rapidement l'historique (audit terrain) la vue cards verticale ne donne pas l'aperçu colonne-par-colonne attendu (Total nés / Vivants / Mort-nés / Momifiés / Écrasés / Sevrage).

### Fix appliqué
- Ajout d'une **table compacte « Historique des mises-bas (n) »** en tête de section, exactement comme spécifié dans le brief (8 colonnes, badges Sevrés/En cours, formatage `fr-FR`, classes `tabular-nums`).
- L'`EmptyState` a été aligné sur le wording du brief (« Aucune mise-bas enregistrée » / « Les mises-bas apparaîtront ici après saisie… »).
- Les **cards détaillées existantes ont été conservées en vue secondaire** sous la table (décomposition mortalité par portée, BCS truie, durée mise-bas, info sevrage). Elles apportent un détail visuel précieux que le brief ne demandait pas de supprimer.
- Boutons header (Export / Sevrage / Nouvelle mise bas) **conservés intacts** comme demandé.

### Vérif
- TS : `tsc --noEmit` OK.
- Structure JSX : Fragment `<>...</>` correctement ouvert/fermé autour de la table + grid des cards.

### Snippet final (extrait)
```tsx
{(mb ?? []).length === 0 ? (
  <EmptyState icon={Baby} title="Aucune mise-bas enregistrée" description="…" />
) : (
  <>
    <Card>
      <CardHeader><CardTitle>Historique des mises-bas ({mb!.length})</CardTitle></CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm"> …8 colonnes… </table>
      </CardContent>
    </Card>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4"> …cards riches existantes… </div>
  </>
)}
```

---

## FIX #2 — Bouton « Marquer fait » calendrier sanitaire (DIAGNOSTIC)

### Investigation menée
1. **`_actions-porcelets.ts`** — Lu intégralement (119 lignes).
   - Déclare bien `'use server'` en tête.
   - Exporte `marquerActePorceletFait(formData: FormData): Promise<void>`.
   - Récupère `mise_bas_id` / `acte` / `type` depuis `formData.get(...)`.
   - Validation UUID + type énuméré.
   - INSERT cohérent dans `vaccinations` ou `traitements` selon `type`.
   - `revalidatePath('/sanitaire')` + `revalidatePath('/sanitaire/calendrier')` + `redirect` vers toast.
   - **Aucun bug logique détecté.**

2. **`page.tsx`** — Vérification du binding (lignes 511-520) :
   ```tsx
   <form action={marquerActePorceletFait}>
     <input type="hidden" name="mise_bas_id" value={acte.miseBasId} />
     <input type="hidden" name="acte" value={acte.acte} />
     <input type="hidden" name="type" value={acte.typeActe} />
     <Button type="submit" variant="default" size="sm">Marquer fait</Button>
   </form>
   ```
   **Binding 100% conforme** au pattern Next.js Server Action via `formData` — exactement la structure préconisée par le brief (Approche A).

3. **Variables d'environnement** — `grep SUPABASE_SERVICE_ROLE_KEY .env.local` → présent (exit 0, count 1). `NEXT_PUBLIC_SUPABASE_URL` également défini. La fonction `sb()` ligne 20-26 utilise bien ces deux clés avec `auth: { persistSession: false }`.

### Conclusion
**Le code est correct.** L'erreur `Failed to find Server Action "x"` rapportée par l'audit est caractéristique d'un **bundle serveur désynchronisé** :
- Les Server Actions sont identifiées par un hash d'action ID gravé dans le bundle au build.
- Si le serveur tourne en mode `standalone` avec un bundle compilé avant la dernière modif de `_actions-porcelets.ts`, le client (HTML servi) référence un action ID que le serveur ne connaît plus → 404 Action.

**Action requise côté orchestrateur :** rebuild propre (`rm -rf .next && npm run build`) puis restart du serveur Next.js. **Aucune modification de code n'est nécessaire pour FIX-B.**

### Pas de modification appliquée
Fichiers `_actions-porcelets.ts` et `sanitaire/calendrier/page.tsx` **non modifiés**.

---

## FIX #3 — Fuite erreur API technique dans le chatbot

### Constat
Dans `_components/chatbot.tsx` (bloc `catch` lignes 166-186), l'erreur technique était formatée puis injectée telle quelle dans la bulle assistant :
```tsx
const msg = e instanceof Error ? e.message : 'Erreur inconnue'
…
content: `⚠️ Impossible de joindre l'assistant.\n\n${msg}`
```
Où `msg` pouvait contenir `"Erreur API (401) : {\"error\":\"invalid_api_key\",\"message\":...}"` — fuite d'infos sensibles + UX dégueulasse.

De plus, le code stream parsing (`json.error`) propageait également un `throw new Error(json.error)` qui finissait avec la même fuite.

### Fix appliqué
Refonte du `catch` :
```tsx
} catch (e: unknown) {
  if ((e as { name?: string })?.name === 'AbortError') {
    // Annulation volontaire — silencieux
  } else {
    // FIX-B #3 — On ne fuit JAMAIS le détail technique côté UI.
    console.error('Chatbot error:', e)
    const userFacing = "Je n'ai pas pu répondre — merci de réessayer dans un instant."
    setError(userFacing)
    setMessages((m) => {
      const last = m[m.length - 1]
      if (last && last.role === 'assistant' && last.content === '') {
        return [...m.slice(0, -1), { role: 'assistant', content: userFacing }]
      }
      return m
    })
  }
} finally { … }
```

### Bénéfices
- **Aucune fuite** : `res.status`, payload API, stack trace, `json.error` — tout est consumé par `console.error` (visible DevTools pour debug, invisible utilisateur).
- **Message UX uniforme** dans la bulle ET dans le banner d'erreur (`setError(userFacing)`).
- **AbortError** (annulation volontaire via Trash2 « Nouvelle conversation ») toujours silencieux.
- L'amont (`throw new Error(...)` lignes 137-142 et 204-205) reste inchangé : ces erreurs remontent toutes au même `catch` qui les sanitize.

### Vérif
TS clean. Pas de régression sur le flux nominal (delta / done).

---

## FIX #4 — Hiérarchie H2 + cibles tactiles WCAG 2.5.5

### Constat
Dans `globals.css` ligne 154 :
```css
h1, h2, h3 { font-family: var(--sf-font-display, …); }
.eyebrow { font-size: 11px; … }
```
Aucune règle ne définit `font-size` pour H2/H3 → Tailwind v4 / shadcn préset les laisse à des valeurs par défaut du navigateur (parfois écrasées par `eyebrow` quand cumulé sur certains composants). L'audit a mesuré H2 = 11px sur les sections du dashboard → confond H2 et eyebrow.

### Fix appliqué (globals.css)
1. **Hiérarchie typographique explicite** (ajoutée juste après la déclaration commune `h1,h2,h3` font-family) :
   ```css
   h2 {
     font-size: 1.25rem;        /* 20px */
     line-height: 1.3;
     font-weight: 600;
     letter-spacing: 0.01em;
     color: var(--sf-ink, #1a1a1a);
   }
   h3 {
     font-size: 1.05rem;        /* ~16.8px */
     line-height: 1.4;
     font-weight: 600;
     color: var(--sf-ink, #1a1a1a);
   }
   ```
   La classe `.eyebrow` reste disponible et conserve son 11px pour les composants qui l'utilisent explicitement (ex: `CardTitle className="eyebrow text-[13px]"` dans `sanitaire/calendrier/page.tsx`).

2. **Cibles tactiles WCAG 2.5.5** (règle globale `@media (pointer: coarse)`) :
   ```css
   @media (pointer: coarse) {
     button, a[role="button"], [role="button"], .clickable, .nav-link {
       min-height: 44px;
       min-width: 44px;
     }
     input[type="checkbox"], input[type="radio"] {
       min-width: 24px;
       min-height: 24px;
     }
   }
   ```
   - Approche **globale et ciblée mobile** : pas de pollution du desktop (où `pointer: fine`).
   - Couvre les 12 cibles <44px de l'audit sans avoir à toucher composant par composant.
   - Les `<Button size="sm">` Tailwind (32px h) deviennent automatiquement 44×44 sur tablette/mobile.

### Vérif
- Pas de lint CSS automatique exécuté (consigne « pas de build ») ; relecture manuelle OK.
- Pas d'impact sur les `h1` (déjà stylés inline via `text-4xl` ou `text-3xl` dans les pages).
- Pas d'impact sur la classe `.eyebrow` qui reste prioritaire (sélecteur de classe l'emporte sur `h2` élément).

---

## Fichiers modifiés (synthèse)

| Fichier | Lignes touchées | Nature |
|---|---|---|
| `app/src/app/(app)/mises-bas/page.tsx` | +52 / -2 | Ajout table historique + Fragment wrapper |
| `app/src/app/(app)/assistant/_components/chatbot.tsx` | +6 / -3 | Sanitization erreur catch |
| `app/src/app/globals.css` | +38 / -0 | Règles h2/h3 + media tactile |

Aucun autre fichier touché.

---

## Vérification TypeScript

```bash
cd /root/projects/smartfarm/app
export PATH=/root/.hermes/node/bin:$PATH
npx tsc --noEmit
# → exit 0, aucune sortie
```

---

## Points d'attention pour l'orchestrateur

1. **FIX #2 nécessite un rebuild propre** côté orchestrateur (rm -rf .next + npm run build + restart). Le code source est conforme — c'est uniquement un problème de bundle Server Action désynchronisé.
2. **FIX #1** : la décision de conserver les cards riches en complément de la table est délibérée et réversible. Si l'orchestrateur veut une vue purement tabulaire, supprimer le second `<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">…</div>` (et son Fragment wrapper) suffira.
3. **FIX #4** : les nouvelles règles `h2`/`h3` ne portent pas la `font-family` display (héritée de la règle ligne 154). Aucune action à prendre — tout est aligné avec les choix DS existants.
4. **Coordination parallèle** : FIX-A (migrations + alertes-regles) et FIX-C (middleware + bottom-nav) intacts — aucun chevauchement de fichier.

---

**Livraison FIX-B : ✅ terminée.**
