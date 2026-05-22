# BRIEF C1 — Responsive Airbnb-style

**Mission globale** : transformer Smart Farm en app responsive *Airbnb-grade* — desktop ET mobile sentent pareil, sans différence de qualité perçue. Navigation fluide, tap targets confortables, dialogs en bottom-sheet sur mobile.

**Pourquoi** : l'app sera utilisée majoritairement sur téléphone par des éleveurs en bâtiment, gants ou doigts sales. UX desktop actuelle est correcte ; UX mobile inexistante.

---

## Stack contexte (rappels rapides)

- Next.js 16 (App Router) + React 19 + Tailwind v4 + Radix Dialog/Select/DropdownMenu
- Repo : `/root/projects/smartfarm/app`
- Build : `npm run build` puis copier `.next/static` vers `.next/standalone/projects/smartfarm/app/.next/static`
- Serveur : déjà en cours port 3000, ne pas relancer (l'orchestrateur le fera après ton commit)
- DS "Carnet d'élevage" : tokens `--sf-*`, palette vert ferme #2D4A1F + terre cuite #B8703D + crème #FAF7F0
- Typo : `--sf-font-display` (Big Shoulders Display) + Instrument Sans corps
- **Pas de gradients, pas de scale au hover, pas de shadow flottante** (DS strict)

---

## Périmètres EXCLUSIFS par agent

> 🚨 **RÈGLE NSA-LEVEL** : chaque agent ne touche QUE ses fichiers. Toucher hors périmètre = bug garanti (merge conflit). Si tu vois un fichier listé dans un autre périmètre, ne le touche pas, même si "ça serait logique".

### Agent A1 — Navigation
**Fichiers** :
- `src/components/sidebar.tsx` (MODIFIER : collapsible desktop, hidden mobile)
- `src/components/bottom-nav.tsx` (CRÉER)
- `src/components/mobile-drawer.tsx` (CRÉER)
- `src/app/(app)/layout.tsx` (MODIFIER : intégrer bottom-nav + mobile-drawer)

### Agent A2 — Dialogs / Bottom-sheets
**Fichiers** :
- `src/components/ui/dialog.tsx` (MODIFIER : responsive bottom-sheet sur <768px)
- `src/components/ui/sheet.tsx` (CRÉER — wrapper Radix Dialog dédié aux bottom-sheets)
- Aucun autre fichier — surtout pas les pages métier

### Agent A3 — Atomes tactiles
**Fichiers** :
- `src/components/ui/button.tsx` (MODIFIER : tap targets, font-size mobile)
- `src/components/ui/input.tsx` (MODIFIER : font-size 16px min, padding mobile)
- `src/components/ui/select.tsx` (MODIFIER : trigger height mobile)
- `src/components/ui/card.tsx` (MODIFIER : padding mobile)
- Aucun autre fichier

---

## Spécifications fonctionnelles

### Breakpoints
```ts
// Tailwind v4 utilise les classes sm: md: lg: xl: 2xl:
// sm = 640px, md = 768px, lg = 1024px, xl = 1280px

Mobile  : < 768px (md:hidden)
Tablette: 768-1023px (md:block lg:hidden)
Desktop : >= 1024px (lg:block)
```

### Pattern Airbnb (à reproduire)

**Desktop ≥1024px**
- Sidebar fixe gauche 240px, persistante
- Header sticky top 64px (logo + recherche + profil)
- Contenu max-w-7xl mx-auto

**Tablette 768-1023px**
- Sidebar collapsible en icônes seules (64px) + tooltip au hover
- Header sticky avec hamburger qui ouvre drawer plein écran

**Mobile <768px**
- Header sticky 56px (logo compact + hamburger)
- **Bottom nav fixed bottom 64px** (z-50, safe-area-inset-bottom)
- Drawer plein écran depuis hamburger pour pages secondaires
- FAB central dans bottom nav = bouton "+" élevé, ouvre menu actions

---

## Agent A1 — Spec détaillée

### sidebar.tsx — Refonte responsive
Le sidebar actuel s'affiche en `<aside>` plein desktop. Le rendre :
- `hidden md:flex lg:flex` (caché en mobile)
- En tablette (md sans lg) : largeur 72px, icônes seules, label en tooltip Radix au hover
- En desktop (lg) : largeur 240px, comme actuellement

Préserver toute la logique métier existante (les `menuItems`, les groupes "Pilotage / Élevage / Production / Santé / Logistique / Analyses / Système").

### bottom-nav.tsx — Nouveau
5 slots fixes :
```
[Accueil] [Cheptel] [+ FAB] [Reproduction] [Plus]
```

- `Accueil` → `/dashboard` (icône LayoutDashboard)
- `Cheptel` → `/cheptel` (icône PiggyBank)
- `+` central : bouton élevé (-translate-y-2), 56x56px, fond `--sf-primary`, ombre douce, ouvre un menu radial / sheet bas avec 6 actions rapides :
  - Nouvelle saillie → /reproduction (avec query ?action=new pour auto-open dialog)
  - Nouvelle mise bas → /mises-bas?action=new
  - Nouvelle pesée → /pesees?action=new
  - Nouveau soin → /sanitaire?action=new
  - Nouvel animal → /cheptel?action=new
  - Scanner code → /cheptel?action=scan
- `Reproduction` → `/reproduction` (icône Heart)
- `Plus` → ouvre `mobile-drawer.tsx` (avec tout le sidebar)

Visible uniquement `<md:flex md:hidden` (mobile only).

`fixed bottom-0 inset-x-0 h-16 bg-[var(--sf-cream)] border-t border-[var(--sf-line,rgba(0,0,0,0.08))] z-40 flex items-center justify-around safe-area-inset-bottom`

Active state : icône + label en `--sf-primary`.

### mobile-drawer.tsx — Nouveau
Wrapper sur Radix Dialog en mode plein écran, slide depuis la gauche.
Contenu = la liste complète des `menuItems` du sidebar avec groupes.
Trigger : bouton hamburger dans le header mobile + bouton "Plus" du bottom-nav.
Fermeture : tap sur backdrop, bouton X, ou tap sur un item de navigation.

### layout.tsx — Intégration
```tsx
<div className="min-h-screen flex">
  <Sidebar /> {/* hidden sur mobile via classes */}
  <div className="flex-1 flex flex-col">
    <Header /> {/* déjà existant, à conserver */}
    <main className="flex-1 pb-20 md:pb-0"> {/* pb-20 pour space bottom-nav */}
      {children}
    </main>
  </div>
  <BottomNav /> {/* md:hidden */}
  <MobileDrawer /> {/* contrôlé par useState dans le client component du layout */}
</div>
```

**ATTENTION** : layout.tsx est server component. Le state pour le drawer doit être dans un sous-composant client. Cf. pattern `'use client'` sur un wrapper `<AppShell>` qui englobe le BottomNav et le MobileDrawer.

---

## Agent A2 — Spec détaillée

### dialog.tsx — Responsive
Le `DialogContent` actuel est centré desktop (`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`).

Le rendre conditionnel via classes Tailwind responsive :

```tsx
className={cn(
  // Mobile : bottom-sheet plein écran
  "fixed inset-x-0 bottom-0 z-50",
  "max-h-[90vh] overflow-y-auto",
  "rounded-t-2xl rounded-b-none",
  "p-5 pt-6",
  "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom data-[state=closed]:animate-out data-[state=closed]:slide-out-to-bottom",
  // Tablette/desktop ≥768px : modal centré comme avant
  "md:fixed md:top-1/2 md:left-1/2 md:bottom-auto md:inset-x-auto",
  "md:-translate-x-1/2 md:-translate-y-1/2",
  "md:max-w-md md:max-h-[85vh]",
  "md:rounded-xl",
  "md:data-[state=open]:zoom-in-95 md:data-[state=closed]:zoom-out-95 md:data-[state=open]:fade-in-0",
  className
)}
```

Ajouter un **handle visuel** en haut du bottom-sheet (barre 40px × 4px arrondie, centrée, en `--sf-muted/30`), seulement sur mobile :
```tsx
<div className="md:hidden mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--sf-muted)]/30" />
```

Ne PAS implémenter le swipe-to-dismiss (gestion gestures = trop fragile + Radix le fait pas natif → reportée à plus tard, on a déjà le bouton X et le backdrop tap).

### sheet.tsx — Nouveau (wrapper)
Pour les cas où on veut un bottom-sheet **systématique** (pas seulement sur mobile) : ex. menu actions rapides du FAB, drawer mobile. Export `Sheet`, `SheetContent`, `SheetTrigger` basés sur Radix Dialog mais avec slide-from-bottom toujours.

```tsx
// Sheet est juste un Dialog stylé bottom-sheet partout
// API quasi-identique à Dialog pour cohérence
```

---

## Agent A3 — Spec détaillée

### button.tsx
Le composant existant utilise `cva` avec variantes. Ajuster :

- Variante `size="default"` : passer `h-10` → `h-12` (48px partout)
- Variante `size="sm"` : passer `h-8` → `h-10` (40px, encore tactile)
- Variante `size="lg"` : `h-12` → `h-14` (56px)
- Sur mobile (<768px) : tous les boutons text-base au lieu de text-sm → `text-sm md:text-sm` reste, mais variantes par défaut en `text-base`
- États `active:translate-y-px` déjà OK, garder

### input.tsx
- `h-9` → `h-12` (48px mobile = touch comfortable)
- **font-size 16px obligatoire mobile** (sinon iOS Safari fait zoom auto) → `text-base` (Tailwind = 16px). Ne PAS utiliser text-sm.
- Padding : `px-3` → `px-4`
- Border radius : `rounded-md` OK

### select.tsx
- SelectTrigger : `h-11` → `h-12`
- Padding interne `py-2 pl-3 pr-2` → `py-3 pl-4 pr-3`
- SelectItem : `py-2 pl-3` → `py-3 pl-4` (touch height ≥40px par item)

### card.tsx
- Padding par défaut : `p-4` → `p-5 md:p-6`
- Inutile de toucher le border-radius

---

## Critères de DONE (vérifs déterministes)

À la fin de ta mission :

1. **Build vert**
   ```bash
   cd /root/projects/smartfarm/app && npm run build 2>&1 | tail -10
   # → doit afficher "✓ Compiled successfully"
   ```

2. **TypeScript sans erreur**
   ```bash
   cd /root/projects/smartfarm/app && npx tsc --noEmit 2>&1 | tail -5
   # → 0 erreur
   ```

3. **Aucun import cassé** (vérifier que les nouveaux composants exportent bien ce que les autres importent)

4. **Rapport écrit** dans `/tmp/rapport-c1-agent<X>.md` avec :
   - Liste des fichiers modifiés
   - Liste des fichiers créés
   - Décisions techniques notables
   - Anything qui pourrait casser les autres agents (chevauchement non prévu, dépendance...)

---

## Anti-patterns à éviter

- ❌ Toucher à un fichier hors de ton périmètre (même un import "logique") → casse les autres agents
- ❌ Ajouter une dépendance npm sans la dire dans le rapport (on doit consolider après)
- ❌ Casser une variante Tailwind existante par overwrite → utiliser `cn()` pour merger
- ❌ Hardcoder des couleurs (`#2D4A1F`) → toujours utiliser `var(--sf-primary)` etc.
- ❌ `useState` dans un Server Component (layout.tsx) → utiliser un wrapper client `<AppShell>`
- ❌ Faire le build/restart toi-même → laisser l'orchestrateur le faire à la fin (sinon collision avec les autres agents)
- ❌ Modifier d'autres fichiers .tsx que ceux listés dans ton périmètre, même si "ça paraît évident"

---

## Données utiles

- Composants UI déjà migrés Radix : Dialog, Select, DropdownMenu (mai 2026, après bug base-ui)
- `Toaster` (sonner) est déjà mounté dans le layout — utiliser `toast.success(...)` / `toast.error(...)`
- Le hook `usePathname()` de Next.js est OK pour détecter la page active dans la sidebar/bottom-nav
- Pour `safe-area-inset-bottom` (iPhone notch) : `pb-[env(safe-area-inset-bottom)]` ou `padding-bottom: calc(0.5rem + env(safe-area-inset-bottom))`

Bonne mission. Sois chirurgical.
