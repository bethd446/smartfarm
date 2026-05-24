# AUDIT SMART FARM — DESKTOP + MOBILE + TABLET
**Date** : 24 mai 2026
**URL** : https://smartfarm.group
**Méthodo** : Playwright headless, 3 viewports (desktop 1440px / mobile 390px Pixel 5 / tablet 768px), 16 routes, 48 screenshots, mesures DOM (touch targets, overflow, FAB, bottom-nav, PWA SW, console errors)
**Auditeur** : Hermes (auto-audit, regard senior)

---

## 🎯 VERDICT GLOBAL : **15 / 20**

**Pro, pas amateur.** Identité visuelle Terrain Vivant CI cohérente (palette ocre/vert, eyebrow majuscule, glyph SF, drapeau CI). Stack et UX livrent. Mais **3 bugs réels** mineurs et 1 oubli sur la couverture FAB minent une perception de finition complète.

| Critère | Note | Commentaire |
|---|---|---|
| Identité visuelle | 17/20 | Palette + typo + glyph + eyebrows pro. Vibe carnet d'éleveur CI. |
| Mobile UX | 14/20 | Bottom-nav + PWA + cards OK. FAB incomplet, dashboard "voir tout" trop petit. |
| Desktop UX | 16/20 | Lisible, sticky header, tables OK. |
| Stabilité technique | 18/20 | 16/16 routes en 200, 0 console error, 0 network 4xx/5xx, 0 overflow horizontal. |
| Performance | 17/20 | Load 1.2-1.6s constant tous viewports, pas de pic. |
| Vocabulaire métier | 18/20 | "Truies / Verrats / Porcelets / Portées" — vocab pro zootech, pas folklorique. |

---

## 📊 TABLEAU SYNTHÈSE PAR VIEWPORT

| Viewport | Routes en 200 | Console err | Overflow H | Touch <44px (avg) |
|---|---|---|---|---|
| Desktop 1440 | 16/16 ✅ | 0 | 0 | n/a (non mesuré >=md) |
| Mobile 390   | 16/16 ✅ | 0 | 0 | quelques liens texte 16px |
| Tablet 768   | 16/16 ✅ | 0 | 0 | 0 |

**Toutes les routes répondent en 200. Aucune erreur JS. Aucune requête en échec. Aucun overflow horizontal.**

---

## 🐛 TOP 5 BUGS RÉELS

### B1 — FAB /cheptel ne s'affiche pas (silencieux, prop ignorée)
- **Sévérité** : 🟠 Moyenne (feature livrée commit `44f604a` mais non visible en prod)
- **Cause** : `_fab.tsx` passe `trigger={<button FAB rond>}` au composant `DialogNouvelAnimal`, mais ce dernier utilise une prop `render` interne (Radix `DialogTrigger`) qui **ignore la prop `trigger`** et rend SON propre bouton rectangulaire "Nouvel animal" en haut de page.
- **Fix** : Soit faire consommer `trigger` dans `DialogNouvelAnimal` (`<DialogTrigger render={trigger} />`), soit changer `_fab.tsx` pour wrapper directement le `DialogTrigger`. ~10 lignes.
- **Fichier** : `src/app/(app)/cheptel/_dialog-nouvel-animal.tsx` L109-119

### B2 — FAB /sanitaire et /kpi : absents (jamais importés)
- **Sévérité** : 🟡 Mineure (scope Phase 2 = 5 routes, /sanitaire et /kpi pas dedans — mais l'utilisateur pourrait penser le contraire)
- **Cause** : Pas d'`_fab.tsx` créé, pas d'import dans les pages.
- **Fix** : Décision produit. Si /sanitaire (créer protocole) et /kpi (filtre rapide) doivent avoir un FAB, en ajouter un.

### B3 — Dashboard mobile : liens "Voir toutes →" font 16px de haut
- **Sévérité** : 🟠 Moyenne (5 occurrences, accessibilité doigt épais en plein soleil compromise)
- **Cause** : Texte inline simple sans padding vertical.
- **Fix** : Wrapper en `<a class="block py-3 ...">` ou ajouter `min-h-[44px] inline-flex items-center`. ~5 minutes.
- **Fichier** : `src/app/(app)/dashboard/page.tsx`

### B4 — Cheptel mobile : cards stats 43px (1px sous WCAG 44px)
- **Sévérité** : 🟢 Très mineure (faux positif quasi-négligeable)
- **Fix** : `min-h-[44px]` sur les 4 tuiles `Truies/Verrats/Porcelets/Portées`.

### B5 — Aucun bouton "Connexion démo" sur /connexion
- **Sévérité** : 🟡 Mineure (UX présentation à des collaborateurs)
- **Cause** : Lien `/inscription` au lieu d'un bouton démo direct. L'utilisateur a documenté `demo@smartfarm.group/Demo6734N0xUHH1I` dans le RUNBOOK mais aucun collaborateur ne le devinera.
- **Fix** : Ajouter sous le formulaire un bouton secondaire "Tester en démo →" qui pré-remplit + submit. ~15 min.

---

## ⚠️ TOP 5 ISSUES UX

### U1 — Page screenshots full-page très longues (jusqu'à 14 686 px sur /cheptel mobile)
La page cheptel mobile a une hauteur de **14 686 pixels**, soit ~17 viewports empilés. Sans recherche/filtres/pagination en haut **sticky**, l'éleveur scroll à l'infini pour retrouver une truie. Une recherche par numéro de boucle (B.20, B.22…) sticky en haut sur mobile = quick win majeur.

### U2 — Lecture plein soleil non testée explicitement
La palette Terrain Vivant (ocre `#A16207` sur fond crème) est belle mais le contraste **ocre/blanc** peut être faible. Tester avec un simulateur de luminosité forte (Chrome DevTools → Rendering → Vision deficiencies / Increase luminance).

### U3 — Header sticky 56px + bottom-nav 64px = 120px perdus en permanence sur mobile (390×844)
Soit 14% de hauteur écran utilisable réduite. Acceptable mais à surveiller — possibilité de header qui se cache au scroll vers le bas.

### U4 — Liste cheptel : pas de tri visible
Tu as 17 truies réelles. Tu veux savoir lesquelles vêlent demain. Le tri par date prochaine MB / dernière saillie n'est probablement pas exposé dans l'UI mobile.

### U5 — Pas de mode "carnet hors ligne" visible
Le SW est enregistré (PWA OK) mais pas de bannière "Mode hors ligne actif" / queue de mutations / sync. Quand le 4G coupe en plein vaccin, l'éleveur perd sa saisie.

---

## ⚡ 3 QUICK WINS (impact maximal, effort minimal)

1. **Fix B1 + B3** (FAB cheptel + liens dashboard 44px) = **30 minutes** de code, gain perception ÉNORME.
2. **Bouton "Tester en démo" sur /connexion** = **15 minutes**, débloque toute démo aux collaborateurs sans donner le password.
3. **Sticky search bar sur /cheptel mobile** ("Rechercher B.20…") = **45 minutes**, économie de scroll considérable pour 17+ truies.

---

## ✅ CE QUI MARCHE BIEN (3 points positifs)

1. **Stabilité béton** : 48/48 captures en 200, 0 erreur console, 0 requête 4xx/5xx. Build prod solide.
2. **Identité Terrain Vivant** : palette + typo + glyph SF + drapeau CI + vocab "Pilotage · Cheptel · Saillie" = ça parle d'éleveur CI, pas d'app SaaS générique.
3. **PWA opérationnelle** : Service Worker actif sur toutes les routes protégées, manifest présent, installation native possible.

---

## 🎯 RECOMMANDATIONS PHASE 3

### Prio 1 — Polish bugs Phase 2 (1 demi-journée)
- Fix B1 (FAB cheptel)
- Fix B3 (dashboard touch targets)
- Décider B2 (FAB /sanitaire /kpi : in or out ?)
- Fix B5 (bouton démo)

### Prio 2 — Recherche/tri/filtre cheptel mobile (1 journée)
- Sticky search bar mobile
- Tri par "prochaine MB" / "dernière saillie"

### Prio 3 — Mode hors ligne explicite (1-2 jours)
- Bannière "mode terrain"
- Queue mutations Supabase
- Indicateur sync

### Prio 4 — Analytics IFIP (déjà planifié 10j)
- GTTT, GTE, IC, marge brute XOF — comme prévu.

---

## 📁 Annexes

- Screenshots full-page : `/root/projects/smartfarm/.audits/20260524-1230/{desktop,mobile,tablet}/*.png` (48 fichiers)
- Vignettes 1er viewport : `/root/projects/smartfarm/.audits/20260524-1230/thumbs/` (48 JPG)
- Données brutes : `/root/projects/smartfarm/.audits/20260524-1230/summary.json`
- Scripts audit : `/tmp/audit-smartfarm.js` + `/tmp/audit-fab-bottomnav.js` + `/tmp/audit-touchsmall.js`
