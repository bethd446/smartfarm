# Brief FIX-DARK — Bug contraste drawer/sidebar mode sombre

## Périmètre
✅ Touche : `src/components/sidebar.tsx`, `src/components/mobile-drawer.tsx`
❌ Touche pas : autres composants, DB, migrations

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` d'abord.

## Bug

**Symptôme** (screenshot user iPhone Telegram dark mode) :
- Drawer mobile s'ouvre avec fond beige clair / crème
- Texte des items en blanc → quasi invisible
- Headers "PILOTAGE", "ÉLEVAGE", "SANTÉ" effacés
- Seul l'item actif (vert) reste visible

**Cause racine** :
`mobile-drawer.tsx:80` et `sidebar.tsx:69` utilisent :
```tsx
'bg-[var(--sf-ink,#1a1a1a)] text-white/90 …'
```

Or `--sf-ink` est **la couleur du TEXTE**, pas du fond.
- Light mode : `--sf-ink = #1a1a1a` (noir) → fond noir + texte blanc = OK
- **Dark mode** : `--sf-ink = #F6F1E5` (beige clair, c'est le texte clair) → fond beige + texte blanc = **INVISIBLE**

Vérifié dans `src/styles/smartfarm-tokens.css` lignes 64 et 224.

## Fix

Le drawer/sidebar doivent avoir un **fond foncé constant** (look "navigation contrastée") quel que soit le mode, OU s'inverser proprement.

**Décision** : drawer/sidebar gardent un fond **toujours foncé** (cohérent avec apps mobiles modernes type Notion/Linear). On utilise une couleur explicite, pas une variable qui s'inverse.

### Patch 1 — `src/components/sidebar.tsx`

Remplace les 2 occurrences :
```diff
-        'bg-[var(--sf-ink,#1a1a1a)] text-white/90 flex-col h-screen sticky top-0 shrink-0',
+        'bg-[#1a1a1a] dark:bg-[#0d0c09] text-white/90 flex-col h-screen sticky top-0 shrink-0',
```

Et pour le tooltip flottant (ligne ~128) :
```diff
-                        'whitespace-nowrap rounded-md bg-white/5 px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
+                        'whitespace-nowrap rounded-md bg-[#2a2a2a] dark:bg-[#1f1f1f] px-2.5 py-1.5 text-xs font-medium text-white shadow-md',
```

### Patch 2 — `src/components/mobile-drawer.tsx`

```diff
-            'bg-[var(--sf-ink,#1a1a1a)] text-white/90 shadow-2xl outline-none',
+            'bg-[#1a1a1a] dark:bg-[#0d0c09] text-white/90 shadow-2xl outline-none',
```

Garde le reste (bouton fermer, focus-visible) tel quel.

### Patch 3 (optionnel) — Group headers lisibilité

Dans `sidebar.tsx` et `mobile-drawer.tsx`, vérifie les headers de groupe (PILOTAGE / ÉLEVAGE / SANTÉ / etc.). Ils doivent avoir `text-white/50` ou `text-white/60` (au lieu de `text-white/30` ou `text-muted-foreground`). Recherche `class.*group|PILOTAGE|uppercase tracking` et ajuste si trop faible.

## Vérif

```bash
export PATH=/root/.hermes/node/bin:$PATH
cd /root/projects/smartfarm/app
npx tsc --noEmit 2>&1 | tail -5
```

Le browser/visuel sera vérifié par l'orchestrateur post-build.

## Livrables
1. 2-3 fichiers modifiés (sidebar.tsx, mobile-drawer.tsx, éventuellement headers)
2. TSC clean
3. Rapport `/root/projects/smartfarm/agents/V2-DARK/RAPPORT_DARK.md` (≤ 60 lignes télégraphiques) : diff exact appliqué + confirmation que `--sf-ink` n'est plus utilisé comme fond

## Anti-pièges
- Ne touche PAS aux autres usages de `--sf-ink` (text-, border-, etc. — ils restent corrects)
- Ne touche PAS au texte blanc des items actifs (vert `--sf-primary` est OK)
- Pas de rebuild — orchestrateur le fera
