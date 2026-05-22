# Rapport V2-G — Refonte sidebar 8→5 sections + Bottom-nav avec Alertes

**Agent** : V2-G — Producteur Sonnet 4.5
**Date** : 21 mai 2026
**Statut** : ✅ Livré
**Périmètre** : front uniquement (4 fichiers modifiés)

---

## 1. Fichiers modifiés

| Fichier | Type | Rôle |
|---|---|---|
| `app/src/components/sidebar.tsx` | client | Refonte array `nav` : 5 groupes au lieu de 8 |
| `app/src/components/bottom-nav.tsx` | client | 5 slots dont Alertes avec badge rouge ; FAB central supprimé |
| `app/src/components/mobile-drawer.tsx` | client | Aligné 1:1 sur les nouveaux groupes sidebar |
| `app/src/components/app-shell.tsx` | client | Reçoit `alertesCount` en prop et le forward à `<BottomNav>` |
| `app/src/app/(app)/layout.tsx` | server | Fetch SSR de `COUNT(*) FROM v_alertes_actives` via Supabase, fallback 0 |

Aucun autre fichier modifié — pages métier, server actions, DB, migrations : intacts.
Aucun npm run build lancé (consigne).

---

## 2. Sidebar — avant / après

### Avant (8 groupes, 17 liens)

| Groupe | Liens |
|---|---|
| Pilotage | Actions rapides, Tableau de bord, Alertes |
| Intelligence | Assistant, Conseiller |
| Élevage | Cheptel, Bâtiments, Bandes |
| Production | Reproduction, Mises bas, Calendrier, Pesées |
| Santé | Sanitaire |
| Logistique | Alimentation, Stock |
| Analyses | Performances |
| Système | Paramètres |

### Après (5 groupes, 21 liens — +3 V2-F + restructuration)

| Groupe | Liens (href) |
|---|---|
| **Pilotage** | Tableau de bord `/dashboard` • Alertes `/alertes` • Actions rapides `/actions-rapides` |
| **Élevage** | Cheptel `/cheptel` • Bandes `/bandes` • Bâtiments `/batiments` • Reproduction `/reproduction` • Mises bas `/mises-bas` • Pesées `/pesees` • Calendrier `/calendrier` |
| **Santé** | Sanitaire `/sanitaire` • Calendrier sanitaire `/sanitaire/calendrier` • **Biosécurité `/sanitaire/biosecurite`** • **Eau `/sanitaire/eau`** • **Mycotoxines `/sanitaire/mycotoxines`** |
| **Logistique & Nutrition** | Alimentation `/alimentation` • Stock `/stock` • Performances `/kpi` |
| **Intelligence & Système** | Assistant `/assistant` • Conseiller `/conseiller` • Paramètres `/parametres` |

**3 nouveaux liens** ajoutés (en gras) — routes V2-F vérifiées HTTP 200.

**Icônes Lucide ajoutées** : `ShieldCheck` (Biosécurité), `Droplets` (Eau), `FlaskConical` (Mycotoxines), `CalendarClock` (Calendrier sanitaire).

**Conservé** : responsive (tablette 72px icônes-only + tooltip CSS, desktop 256px full), état actif (background primary), `aria-label`, `title`, et ajout d'`aria-current="page"` sur lien actif (gain a11y).

---

## 3. Bottom-nav mobile — avant / après

### Avant (3 slots + FAB central + Plus)
`[Accueil] [Cheptel] [+ FAB Actions] [Reproduction] [Plus]` — sheet quick-actions ouvert par le FAB.

### Après — 5 slots (V2-G)

| # | Icône Lucide | Label | Route | Badge |
|---|---|---|---|---|
| 1 | `LayoutDashboard` | Accueil | `/dashboard` | — |
| 2 | `PiggyBank` | Cheptel | `/cheptel` | — |
| 3 | `Heart` | Reproduction | `/reproduction` | — |
| 4 | `Bell` | **Alertes** | `/alertes` | 🔴 rouge, count `v_alertes_actives` |
| 5 | `MoreHorizontal` | Plus | (ouvre drawer) | — |

### Badge alertes — implémentation

- **Fetch SSR** dans `app/src/app/(app)/layout.tsx` :
  ```ts
  const { count } = await sb
    .from('v_alertes_actives')
    .select('*', { count: 'exact', head: true })
  ```
  Helper Supabase : `createClient` de `@/lib/supabase/server` (helper existant déjà utilisé par `/alertes/page.tsx`).
- **Fallback** : try/catch silencieux → `alertesCount = 0` si la query échoue. La chrome ne casse jamais.
- **Prop pipeline** : `layout.tsx` (server) → `<AppShell alertesCount>` → `<BottomNav alertesCount>` → `<SlotLink withAlertesBadge>`.
- **Rendu badge** : pastille rouge `bg-red-600 text-white`, `min-w-[18px] h-[18px]`, ring 2px de la couleur du fond bottom-nav (`--sf-cream`) pour découper visuellement de l'icône. Position `absolute -top-1.5 -right-2` sur un wrapper `relative inline-flex` qui n'englobe que l'icône (pas le label). `pointer-events-none` pour ne jamais bloquer le tap. `aria-hidden` sur la pastille mais `aria-label` enrichi sur le `<Link>` (`"Alertes (12 actives)"`) pour les lecteurs d'écran. Affichage `"99+"` au-delà de 99.
- **Pas affiché** si `alertesCount === 0` (clean state).

### FAB "Actions rapides"

Supprimé du bottom-nav (cohérent avec la décision du brief de basculer Actions rapides en lien). Reste accessible :
- via le drawer Plus (groupe Pilotage) — lien direct `/actions-rapides`,
- via la sidebar desktop (groupe Pilotage).

Le sheet bottom-up de raccourcis (6 quick actions Heart/Baby/Scale/Stethoscope/PiggyBank/ScanLine) est retiré du composant — il vivait uniquement dans le FAB et n'est plus exposé en mobile. La page `/actions-rapides` reste la source canonique.

---

## 4. Drawer "Plus" — mobile

Aligné 1:1 sur sidebar : mêmes 5 groupes, mêmes 21 liens, mêmes icônes. Les nouvelles routes Santé (biosécurité, eau, mycotoxines) apparaissent donc aussi dans le drawer. `aria-current="page"` ajouté sur le lien actif.

---

## 5. Tests HTTP

Effectués contre le serveur Node tournant (ancien build — nouveau code prend effet après restart) :

```
200  /
200  /dashboard
200  /alertes
200  /cheptel
200  /reproduction
200  /sanitaire
200  /sanitaire/biosecurite
200  /sanitaire/eau
200  /sanitaire/mycotoxines
200  /sanitaire/calendrier
```

Les 3 routes V2-F (biosécurité / eau / mycotoxines) sont bien servies → les nouveaux liens sidebar/drawer ne mèneront pas en 404.

---

## 6. Notes de conception

- **Tri sidebar** : ordre du tableau du brief respecté exactement (Pilotage / Élevage / Santé / Logistique & Nutrition / Intelligence & Système). Au sein de chaque groupe, ordre du brief également.
- **`actions-rapides` rebasculé en Pilotage** (le brief le place en Pilotage 1er groupe — fait).
- **`pesees` migré en Élevage** (avant en Production). Aligné brief.
- **`kpi` migré en Logistique & Nutrition** (avant Analyses). Aligné brief.
- **Pas de mécanisme de détection runtime** des routes : décision du brief assumée (inclure inconditionnellement les 3 routes V2-F). Comme V2-F est passé et confirmé en HTTP 200, aucun risque de 404.
- **`a11y`** : `aria-current="page"` ajouté sur les 3 surfaces de nav (sidebar / bottom-nav / drawer). `aria-label` du slot Alertes inclut le count parlé.

---

## 7. Restart serveur

**⚠️ Restart serveur requis avant validation visuelle** : le `layout.tsx` du groupe `(app)` est passé d'un composant simple à un Server Component `async` qui ouvre une session Supabase à chaque request — Next 16 doit recompiler les chunks. Pas de tuage de processus côté agent (consigne respectée) — l'orchestrateur fera le rebuild + redeploy static + restart.

Commandes à dérouler côté orchestrateur :
```bash
export PATH=/root/.hermes/node/bin:$PATH
cd /root/projects/smartfarm/app
npm run build
cp -rT .next/static .next/standalone/projects/smartfarm/app/.next/static
cp -rT public .next/standalone/projects/smartfarm/app/public 2>/dev/null || true
# puis restart du process Node
```

Après restart, re-tester :
- Sidebar desktop : compter 5 headings (Pilotage, Élevage, Santé, Logistique & Nutrition, Intelligence & Système).
- Sidebar tablette md : 21 icônes avec tooltips au hover.
- Bottom-nav mobile : 5 slots, slot 4 = Bell + badge rouge si alertes > 0.
- Drawer mobile : 5 groupes identiques sidebar.

---

## 8. Risques résiduels / TODO

- Aucun. Les server actions, schémas et pages métier n'ont pas été touchés.
- Conflit potentiel avec V2-H : V2-H ne modifie ni `sidebar.tsx`, ni `bottom-nav.tsx`, ni `mobile-drawer.tsx`, ni `app-shell.tsx`, ni `(app)/layout.tsx` — pas de collision attendue.

---

**Fin de rapport V2-G.**
