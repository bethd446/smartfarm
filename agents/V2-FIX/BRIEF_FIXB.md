# Brief FIX-B — Corrections UI/UX critiques

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : 4 fix UI/UX P0 identifiés par l'audit V2 Round 2

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `app/src/app/(app)/mises-bas/page.tsx` (ajouter liste + empty state)
2. `app/src/app/(app)/assistant/` (masquer erreur API technique)
3. `app/src/app/(app)/sanitaire/calendrier/_actions-porcelets.ts` ou `page.tsx` (fix bouton "Marquer fait")
4. `app/src/app/globals.css` + composants typo (hiérarchie H2)
5. Composants ayant des cibles tactiles <44px

NE TOUCHE PAS : sidebar, bottom-nav, alertes-regles, migrations, autres pages métier.

---

## FIX #1 — Page `/mises-bas` quasi-vide

### Bug actuel
Le code source de `/mises-bas/page.tsx` charge bien les données (mb avec sevrages embedded) MAIS **ne les rend pas dans un tableau**. La page affiche juste le H1 et les boutons.

### Vérif
Lire le fichier en entier :
```bash
cat app/src/app/\(app\)/mises-bas/page.tsx
```

### Fix
Ajouter une section "Historique des mises-bas" après les boutons existants :

```tsx
{(mb ?? []).length === 0 ? (
  <EmptyState
    icon={Baby}
    title="Aucune mise-bas enregistrée"
    description="Les mises-bas apparaîtront ici après saisie. Cliquez sur 'Nouvelle mise bas' pour démarrer."
  />
) : (
  <Card>
    <CardHeader>
      <CardTitle>Historique des mises-bas ({mb.length})</CardTitle>
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left p-3 font-medium">Truie</th>
              <th className="text-left p-3 font-medium">Date MB</th>
              <th className="text-right p-3 font-medium">Total nés</th>
              <th className="text-right p-3 font-medium">Vivants</th>
              <th className="text-right p-3 font-medium">Mort-nés</th>
              <th className="text-right p-3 font-medium">Momifiés</th>
              <th className="text-right p-3 font-medium">Écrasés</th>
              <th className="text-right p-3 font-medium">Sevrage</th>
            </tr>
          </thead>
          <tbody>
            {mb.map((m: any) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-muted/20">
                <td className="p-3 font-mono">{m.truie?.tag ?? '—'} {m.truie?.nom && <span className="text-muted-foreground">({m.truie.nom})</span>}</td>
                <td className="p-3">{new Date(m.date_mise_bas).toLocaleDateString('fr-FR')}</td>
                <td className="p-3 text-right">{m.nes_totaux}</td>
                <td className="p-3 text-right font-medium">{m.nes_vivants}</td>
                <td className="p-3 text-right text-red-700">{m.nes_morts ?? 0}</td>
                <td className="p-3 text-right text-red-700">{m.momifies ?? 0}</td>
                <td className="p-3 text-right text-red-700">{m.ecrases ?? 0}</td>
                <td className="p-3 text-right">
                  {m.sevrages?.[0] ? (
                    <Badge variant="success">{m.sevrages[0].nb_sevres} sevrés</Badge>
                  ) : (
                    <Badge variant="secondary">En cours</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CardContent>
  </Card>
)}
```

Place cette section sous le header. Conserve les boutons Export/Sevrage/Nouvelle MB.

---

## FIX #2 — Bouton "Marquer fait" calendrier sanitaire qui crashe

### Diagnostic préalable
Audit a vu : `Failed to find Server Action "x"`. Cause probable : Server Action référencée dans formAction mais bundle servi pas synchronisé. Le fichier `_actions-porcelets.ts` existe et exporte bien `marquerActePorceletFait`.

### Fix
Vérifier le binding dans la page :
```bash
grep -n "marquerActePorceletFait\|formAction\|<form" app/src/app/\(app\)/sanitaire/calendrier/page.tsx | head -20
```

Si le binding est correct, le bug vient probablement du fait que le serveur **standalone** est démarré sans les action IDs alignés (références orphelines après rebuild). La solution propre :

**Approche A — Server Action via formData explicite** (plus robuste) :

Dans `_actions-porcelets.ts`, s'assurer que la fonction accepte un FormData unique :
```ts
'use server'
export async function marquerActePorceletFait(formData: FormData) {
  const mise_bas_id = String(formData.get('mise_bas_id') ?? '')
  const acte = String(formData.get('acte') ?? '')
  const type = String(formData.get('type') ?? '')
  // ... validations + INSERT
  revalidatePath('/sanitaire/calendrier')
}
```

Dans `page.tsx`, le formulaire :
```tsx
<form action={marquerActePorceletFait}>
  <input type="hidden" name="mise_bas_id" value={acte.mise_bas_id} />
  <input type="hidden" name="acte" value={acte.acte} />
  <input type="hidden" name="type" value={acte.type_acte} />
  <Button type="submit" size="sm" variant="outline">
    Marquer fait
  </Button>
</form>
```

Si tout est déjà comme ça, le bug est dans le **build/déploiement**. Documente-le dans le rapport : "Bug Server Action orphelin — sera résolu par rebuild propre côté orchestrateur".

Vérifie aussi qu'**il n'y a pas d'erreur runtime côté server-action** (NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY définis dans `.env.local`) :
```bash
grep -c "SUPABASE_SERVICE_ROLE_KEY" /root/projects/smartfarm/app/.env.local
```

---

## FIX #3 — Fuite d'erreur API technique dans le chatbot

### Bug
Le chatbot affiche dans la bulle IA : `Erreur API (401) : {"er…`. Détail technique qui ne devrait jamais arriver à l'utilisateur.

### Fix
Localiser le composant chatbot :
```bash
find app/src -name "*chat*" -o -name "*assistant*" -o -name "message-bubble*"  2>&1 | head -5
```

Dans la logique d'erreur (probablement `app/src/app/(app)/assistant/_components/` ou similaire), capturer les erreurs technique et afficher un message simple :

```tsx
catch (e) {
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: "Je n'ai pas pu répondre — merci de réessayer dans un instant.",
  }])
  console.error('Chatbot error:', e)  // visible en console pour debug, pas pour user
}
```

Remplace les `setMessages(... e.message)` ou équivalents.

---

## FIX #4 — Hiérarchie H2 cassée + Cibles tactiles <44px

### Diagnostic
- H1 = 30px → H2 affiché 11px (diff de 3×) — ressemble à un eyebrow plus qu'un titre de section
- 12 cibles tactiles inférieures à 44px (norme WCAG 2.5.5)

### Fix typo H2 dans `globals.css`
Ajoute (ou modifie) :
```css
h2 {
  font-size: 1.25rem; /* 20px — entre H1 30px et body 14px */
  line-height: 1.3;
  font-weight: 600;
  font-family: var(--sf-font-display, 'Big Shoulders Display', sans-serif);
  letter-spacing: 0.01em;
  color: var(--sf-ink);
}

h3 {
  font-size: 1.05rem; /* 16.8px */
  line-height: 1.4;
  font-weight: 600;
}
```

### Fix cibles tactiles
Ajoute dans `globals.css` :
```css
/* WCAG 2.5.5 — toutes les cibles tactiles ≥ 44×44 px sur mobile */
@media (pointer: coarse) {
  button, a[role="button"], [role="button"],
  .clickable, .nav-link {
    min-height: 44px;
    min-width: 44px;
  }
  input[type="checkbox"], input[type="radio"] {
    min-width: 24px;
    min-height: 24px;
  }
}
```

Ne corrige pas individuellement chaque composant — la règle CSS globale ciblée mobile fait le job.

---

## PROCÉDURE

1. Lis les fichiers concernés AVANT modif
2. Applique les 4 fixes
3. Vérif TypeScript :
   ```bash
   export PATH=/root/.hermes/node/bin:$PATH
   cd /root/projects/smartfarm/app
   npx tsc --noEmit 2>&1 | tail -20
   ```
4. ⚠️ NE LANCE PAS `npm run build` — orchestrateur

---

## LIVRABLES

1. `/mises-bas/page.tsx` avec tableau + empty state
2. Chatbot avec messages d'erreur génériques
3. `globals.css` avec H2 fixé + cibles tactiles 44px
4. Diagnostic Server Action (fix possible ou rapport "rebuild requis")
5. Rapport `/root/projects/smartfarm/agents/V2-FIX/RAPPORT_FIXB.md`

## ANTI-PIÈGES
- Pas de migration SQL
- Pas de modif sidebar/bottom-nav (FIX-C s'en charge)
- TypeScript STRICT — pas de `any` sans cast contrôlé
- L'EmptyState et Card existent déjà : `@/components/ui/empty-state`, `@/components/ui/card`
