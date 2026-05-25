# LANE 2 — Cheptel UI Smart Farm — RAPPORT

Mode caveman. Sprint S5. Date : 2026-05-25.

---

## FAIT

2 fichiers modifiés.

### 1. `app/src/app/(app)/cheptel/page.tsx` (+58 / -8)
- Ajout `const stadeReproById = new Map<...>()`.
- Query séparée `sb.from('v_animaux_stade_repro').select('id, stade_repro, jours_stade').in('id', ids)` après chargement `animaux`, uniquement onglet `truies`.
- Try/catch implicite via `error` Supabase → fallback Map vide si vue absente.
- Ajout `STADE_REPRO_MAP` const en module (mapping `gestante`/`allaitante`/`vide`/`pré-saillie` → variant Badge + label + flag `withJours`).
- Signature `AnimauxTable` : ajout prop `stadeReproById: Map<...>`.
- Colonne `STATUT` :
  - `label` dynamique : `'STADE REPRO'` si onglet truies, sinon `'STATUT'`.
  - `render` : si onglet truies + stade trouvé + mappé → `<Badge variant={cfg.variant}>STADE_LABEL Jxxx</Badge>` ; sinon fallback badge statut classique (tone toneTruie/TONE_TO_VARIANT).

### 2. `app/src/app/(app)/cheptel/[id]/page.tsx` (+30 / -10)
- **Fix #2** : query séparée `v_animaux_stade_repro` par animalId → `stadeRepro` (nullable). Const `STADE_REPRO_CFG` + IIFE `stadeReproBadge` calculé. Le badge ACTIF (3e badge après FEMELLE/Truie) remplacé par `<Badge variant={stadeReproBadge.variant}>{stadeReproBadge.text}</Badge>` si dispo, sinon fallback badge statut original. Les badges FEMELLE + Truie (catégorie) intacts.
- **Fix #3** : virer `<code> &lt;BarcodeScanner&gt; </code>` du texte de la section IDENTIFICATION RAPIDE. Reformulé en : `"... pour identifier l'animal lors d'une intervention terrain et ouvrir cette fiche automatiquement."`
- **Fix #4** : virer la ligne `<p>Tag&nbsp;: <code>{animal.tag}</code></p>` (redondante avec le tag déjà affiché en gros dans la card QR juste à gauche, à 4px d'écart). Le tag reste visible **2x** : H1 (en haut) + dans la card QR (à côté). La 3e répétition était la ligne supprimée.

---

## VÉRIFS

### tsc --noEmit
**KO — non exécuté** : sandbox bash bloque `npx tsc` et `cd app && npx tsc` (Permission denied sur Bash). Vérification manuelle par relecture des diffs effectuée :
- Imports OK (Badge déjà importé, pas de nouveau symbole externe).
- Types : `Map<string, { stade_repro: string; jours_stade: number | null }>` cohérent.
- Variants Badge utilisés (`success`/`warning`/`outline`/`secondary`) existent tous dans `components/ui/badge.tsx` (cf cva variants ligne 30-53).
- `tab === 'truies'` narrow type OK (TabKey union).
- Pas de `any` ajouté hors ce qui existait déjà (cast `as Array<...>` typé explicite).
- IIFE `stadeReproBadge` retourne `null | { variant, text }` → ternaire JSX safe.
- ResponsiveTable colonne `label: string` → expression `tab === 'truies' ? 'STADE REPRO' : 'STATUT'` accepte string.

**TODO orchestrateur** : lancer `cd app && npx tsc --noEmit` côté lui pour confirmer 0 erreur.

### Lint / runtime
- Pas de `console.log`.
- Pas de `@ts-ignore`.
- Pas de `formatDistanceToNow` ni `toLocaleString` JSX server ajouté (les `toLocaleDateString` existants laissés inchangés — pas dans le périmètre).
- Pas de `'use client'` ajouté — Server Components purs.

---

## DIVERGENCE BRIEF — Fallback vue absente

Si `v_animaux_stade_repro` n'existe pas encore (Lane 1 pas mergée) :

- **page.tsx** : `error` non null sur la query, `stadeReproById` reste Map vide. Colonne affiche `'STADE REPRO'` (label) MAIS le render tombe en fallback → badge statut `actif` (vert). **Visuel cohérent**, juste pas l'info stade repro.
- **[id]/page.tsx** : `stadeRepro` reste `null`, `stadeReproBadge` est `null`, ternaire affiche le badge statut classique `ACTIF` (vert).

**Pas de crash, pas d'erreur 500.** Graceful degradation OK.

---

## TODO ORCHESTRATEUR

1. **Appliquer migration Lane 1** (création vue `v_animaux_stade_repro`) AVANT validation visuelle, sinon impossible de voir le badge `GESTANTE J45` / `ALLAITANTE J12` / etc.
2. Lancer `cd app && npx tsc --noEmit -p tsconfig.json` pour valider 0 erreur TS (non exécutable depuis cette lane).
3. Test E2E manuel :
   - Page `/cheptel?tab=truies` → colonne header `STADE REPRO` + badges colorés selon stade.
   - Page `/cheptel/{id-truie-gestante}` → 3e badge = `GESTANTE Jxxx` vert.
   - Page `/cheptel/{id-verrat}` → garde badge `actif` vert (pas femelle, stadeReproBadge null).
   - Section IDENTIFICATION RAPIDE : plus de `<BarcodeScanner>` exposé, plus de doublon `Tag: B.xx`.

---

## NOTES

- **Label dynamique colonne** : choix de mettre `'STADE REPRO'` pour truies UNIQUEMENT. Sur onglets `verrats`/`porcelets`, le label reste `'STATUT'` et le render fallback (badge statut classique) joue.
- **Mode caveman respecté** : 2 fichiers UI, pas touché `components/ui/*`, pas touché `proxy.ts` / `next.config.ts` / `globals.css` / autres routes. Pas d'install deps. Pas de `npm run build` ni restart serveur.
- **Pas de console.log, pas d'any non justifié, pas de @ts-ignore.**
