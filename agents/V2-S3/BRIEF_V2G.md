# Brief V2-G — Refonte sidebar 8→5 sections + Bottom-nav avec Alertes

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : Simplifier la nav (sidebar et bottom-nav mobile) + intégrer Alertes en bottom-nav

⚠️ CHANTIER FRONT UNIQUEMENT — aucune DB ni server action

---

## PÉRIMÈTRE EXCLUSIF

1. `app/src/components/sidebar.tsx`
2. `app/src/components/bottom-nav.tsx`
3. `app/src/components/mobile-drawer.tsx` (drawer "Plus de pages")
4. Optionnellement `app-shell.tsx` si nécessaire
5. **NE TOUCHE PAS** : pages métier, schémas, server actions, migrations, autres composants UI

---

## CONTEXTE

- App Next.js 16 standalone sur :3000
- PATH Node : `export PATH=/root/.hermes/node/bin:$PATH`
- Sidebar actuelle : 17 liens en **8 groupes** (Pilotage, Intelligence, Élevage, Production, Santé, Logistique, Analyses, Système)
- V2-F ajoute potentiellement 3 nouvelles pages sous Santé : `/sanitaire/biosecurite`, `/sanitaire/eau`, `/sanitaire/mycotoxines`. Vérifie leur existence avant d'ajouter les liens

Lis d'abord :
```bash
cat app/src/components/sidebar.tsx
cat app/src/components/bottom-nav.tsx
ls app/src/app/\(app\)/sanitaire/ 2>&1
```

---

## OBJECTIF — Sidebar 5 sections

| Nouveau groupe | Liens (label → href) |
|---|---|
| **Pilotage** | Tableau de bord `/dashboard` • Alertes `/alertes` • Actions rapides `/actions-rapides` |
| **Élevage** | Cheptel `/cheptel` • Bandes `/bandes` • Bâtiments `/batiments` • Reproduction `/reproduction` • Mises bas `/mises-bas` • Pesées `/pesees` • Calendrier `/calendrier` |
| **Santé** | Sanitaire `/sanitaire` • Calendrier sanitaire `/sanitaire/calendrier` • Biosécurité `/sanitaire/biosecurite` (si existe) • Eau `/sanitaire/eau` (si existe) • Mycotoxines `/sanitaire/mycotoxines` (si existe) |
| **Logistique & Nutrition** | Alimentation `/alimentation` • Stock `/stock` • Performances `/kpi` |
| **Intelligence & Système** | Assistant `/assistant` • Conseiller `/conseiller` • Paramètres `/parametres` |

→ De 8 groupes à **5 groupes**.

**Conserve** :
- Le système responsive (tablette icônes seules, desktop labels complets)
- Le système d'item actif
- Les icônes Lucide existantes
- Les tooltips

### Detail technique

Le fichier actuel a un array `items` avec `group:` strings. Réécris l'array en respectant l'ordre du tableau ci-dessus, et **conditionne** les 3 nouvelles routes :

```tsx
const items: Item[] = [
  // ...
  { href: '/sanitaire',         label: 'Sanitaire',         icon: Stethoscope, group: 'Santé' },
  { href: '/sanitaire/calendrier', label: 'Calendrier sanitaire', icon: CalendarClock, group: 'Santé' },
  // Les 3 suivantes : conditionner par existence de la route (vérifier via build-time check ou simplement les inclure si V2-F est passé)
]
```

Tu n'as pas de mécanisme dynamique simple pour vérifier l'existence d'une route Next.js côté composant. **Décision pragmatique** : inclus les 3 liens (`/sanitaire/biosecurite`, `/eau`, `/mycotoxines`). Si V2-F n'est pas passé, ils donneront un 404 — c'est documenté et sera fixé par V2-F.

---

## OBJECTIF — Bottom-nav mobile

Actuellement 3 slots principaux : Accueil / Cheptel / Reproduction (+ FAB "Actions rapides" + "Plus de pages")

### Nouvelle structure 5 slots

| Position | Icône | Label | Route |
|---|---|---|---|
| 1 | LayoutDashboard | Accueil | `/dashboard` |
| 2 | PiggyBank | Cheptel | `/cheptel` |
| 3 | Heart | Reproduction | `/reproduction` |
| 4 | **Bell** (avec badge alertes) | **Alertes** | `/alertes` |
| 5 | Menu (drawer) | Plus | (drawer) |

### Badge alertes

Sur le slot Alertes, affiche le **nombre d'alertes actives** en badge rouge en haut à droite de l'icône.

Implémentation :
- Server Component parent (`app-shell.tsx` ou `layout.tsx`) fait un fetch SSR : `SELECT COUNT(*) FROM v_alertes_actives` (utilise le helper Supabase existant)
- Passe `alertesCount` en prop à `<BottomNav alertesCount={...}/>`
- Dans bottom-nav :
  ```tsx
  {slot.href === '/alertes' && alertesCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5 min-w-[18px] text-center">
      {alertesCount > 99 ? '99+' : alertesCount}
    </span>
  )}
  ```

Le FAB "Actions rapides" reste en milieu mais devient secondaire (réfléchis si tu le gardes en surcouche centrale ou s'il glisse dans le drawer "Plus").

### Drawer "Plus"
Adapte les entrées : doit refléter les nouveaux groupes de sidebar (Logistique & Nutrition, Intelligence & Système, autres routes non en bottom slots).

---

## PROCÉDURE

1. Lis et comprends le code actuel des 3 composants
2. Refactor sidebar (array items + nouveaux groupes)
3. Refactor bottom-nav (5 slots + badge)
4. Adapte drawer
5. Adapte le parent pour passer `alertesCount` (ajouter une query Supabase)
6. Rebuild + redeploy static + RESTART serveur (Server Component modifié, restart conseillé) :
   ```bash
   export PATH=/root/.hermes/node/bin:$PATH
   cd /root/projects/smartfarm/app
   npm run build
   cp -rT .next/static .next/standalone/projects/smartfarm/app/.next/static
   cp -rT public .next/standalone/projects/smartfarm/app/public 2>/dev/null || true
   ```
   **Ne tue PAS le serveur Node** — l'orchestrateur (moi) le fera proprement après réception du rapport.
7. Tests HTTP :
   ```bash
   for r in / /dashboard /alertes /cheptel /reproduction /sanitaire /sanitaire/biosecurite; do
     curl -s -o /dev/null -w "%{http_code}  $r\n" "http://127.0.0.1:3000$r"
   done
   ```

---

## LIVRABLES

1. Sidebar refactorisée en 5 groupes
2. Bottom-nav 5 slots avec badge Alertes
3. Drawer "Plus" mis à jour
4. Rapport `/root/projects/smartfarm/agents/V2-S3/RAPPORT_V2G.md` :
   - Listing avant/après des liens sidebar
   - Liste des slots bottom-nav
   - Codes HTTP des routes testées
   - Note : "Restart serveur requis avant validation visuelle navigation" si applicable

## ANTI-PIÈGES

- **NE TOUCHE PAS** au pattern de routing existant (App Router, params dynamiques, etc.)
- Conserve les `aria-label`, `title`, `aria-current` existants (accessibilité)
- Le badge doit être lisible : contraste, position, fonctionnement responsive
- Si tu ajoutes un Server Component fetch dans `app-shell.tsx`, **vérifie qu'il ne casse pas le rendu**. Tu peux fallback `alertesCount=0` si la query échoue.
- Le badge ne doit PAS bloquer le tap (z-index OK + `pointer-events-none`)
