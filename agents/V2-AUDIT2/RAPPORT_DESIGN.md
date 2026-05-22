# RAPPORT AUDIT DESIGN/UX — Smart Farm V2 (Round 2)

**Date** : 21 mai 2026 · **Auditeur** : Hermes subagent · **Périmètre** : design system "Terrain Vivant", desktop 1280px + mobile 380px (par inspection code), pages visitées : `/`, `/dashboard`, `/alertes`, `/cheptel`, `/sanitaire/eau`, `/assistant`.

## Score global : **7.4 / 10**

Le design system "Terrain Vivant" est **réellement implémenté** (variables CSS `--sf-*`, polices Big Shoulders Display + Instrument Sans chargées, palette emerald/lime/amber/red, dark mode `prefers-color-scheme`, mode haut contraste manuel). L'architecture responsive est solide (`AppShell` + `Sidebar` + `BottomNav` + `MobileDrawer`, breakpoints `md:` cohérents). Le chatbot est de qualité production. Quelques angles morts notables sur l'accessibilité fine, la hiérarchie typographique des H2, et les tailles tactiles secondaires.

### Détail par axe

| Axe | Score | Constat |
|---|---|---|
| Cohérence visuelle | 8/10 | Tokens `--sf-*` partout, palette stable, pas de gradients parasites. |
| Hiérarchie typographique | **6/10** | H1 30px/900 puis H2 en 11px/700 → H2 ressemblent à des eyebrows, pas à des titres. Saut de 3× trop brutal. |
| Contraste WCAG AA | 7.5/10 | 7/111 échantillons sous 4.5:1 (gris `#8A7E6E` sur blanc = 3.97). Bouton haut-contraste atténue. |
| Responsive mobile 380px | 8/10 | `md:hidden` header + drawer + bottom-nav 5 slots + `pb-20`. **0 occurrence `sm:`** → pas de calage 380↔600px. |
| Micro-interactions | 6.5/10 | `hover:bg-black/5`, `focus-visible:outline-2` sur 21 composants. Pas de transitions explicites, pas de feedback "loading" sur boutons formulaires. |
| Feedback utilisateur | 7/10 | `sonner` toasts présents. Mais erreur API assistant affichée brute (`Erreur API (401) : {"er…`) → fuite technique. |
| Empty states | 8.5/10 | Composant `EmptyState` dédié, variantes `default`/`good` (bonne nouvelle = vert), icône + titre + CTA. Sérieux. |
| Loading states | 9/10 | `loading.tsx` par route (dashboard, alertes, cheptel, sanitaire/calendrier), `Skeleton` shimmer qui reflète la vraie structure. **Best-in-class.** |
| Chatbot bulles WhatsApp | 8.5/10 | `max-w-[75%]`, `bg-emerald-100` user / `bg-white border` assistant, `border-radius` asymétrique (`18px 18px 6px 18px`), avatar 🐷 rond emerald-600. Manque indicateur "typing". |
| KPI cards | 7.5/10 | Grid asymétrique 2fr/1fr (hero + stack 3), `KpiTechCard` réutilisable avec `tone`, `digits`, `cible`. Valeur "—" pour null = bon. Mais "CIBLE 5-7 J" en petit gris peu lisible. |
| Tableaux | 6.5/10 | TH 11px/600, padding 12/16px, lignes 61px hautes. Pas de tri visible, pas de pagination, pas de version "cards" en mobile (table reste table → scroll horizontal probable à 380px). |

---

## Propositions priorisées

### 🔴 P0 — À corriger sous 48 h (impact UX direct)

1. **Hiérarchie H2 cassée** — actuellement `text-[11px] font-bold uppercase tracking` = c'est un *eyebrow*, pas un H2. Sur dashboard 6 H2 alignés visuellement comme des étiquettes. **Fix** : créer un niveau intermédiaire `h2 { font-size: 18-20px; font-weight: 800; case mixte }` et déplacer les "ALERTES ACTIVES / TIP DU JOUR" actuels vers un composant `<SectionEyebrow>` (sémantique = `div` ou `p`, pas heading).
2. **12 cibles tactiles < 44×44 px** sur dashboard (liens "Voir tous →" à 16-20px de haut, liens d'alertes à 20px). Viole WCAG 2.5.5 et rend la navigation mobile pénible. **Fix** : `min-h-[44px] inline-flex items-center` sur tous les `Link` cliquables, ou padding vertical 12px minimum.
3. **Fuite d'erreur technique dans le chatbot** — message « ⚠️ Impossible de joindre l'assistant. Erreur API (401) : {"er… » est servi à l'éleveur. **Fix** : message neutre style « Le conseiller est temporairement indisponible. Réessaie dans un instant. » + bouton retry + log technique côté Sentry/console uniquement.
4. **Texte gris `#8A7E6E` sur blanc = 3.97:1** (échec AA pour texte 12px) — utilisé pour les sous-titres truies « · Adjoa (T-001) ». **Fix** : passer à `#6B6155` (ratio ≈ 5.5:1) ou augmenter à 13px.

### 🟠 P1 — À corriger sous 2 semaines (qualité perçue)

5. **Indicateur "typing" du chatbot manquant** — l'utilisateur ne sait pas si l'assistant réfléchit ou est mort. **Fix** : 3 dots animés dans une bulle assistant pendant le `fetch` (réutiliser `animate-pulse` déjà présent dans `message-bubble.tsx`).
6. **Tableaux non responsifs** — `<table>` avec 8 colonnes sur `/cheptel`, 6 colonnes sur `/sanitaire/eau`. À 380px → soit overflow horizontal, soit colonnes écrasées. **Fix** : pattern "cards stack" en `md:hidden` (chaque ligne devient une carte avec libellés inline) + table classique en `md:block`.
7. **Aucun breakpoint Tailwind `sm:` utilisé** (0/102 fichiers) → la zone 380-600px n'a pas de calage spécifique. **Fix** : ajouter `sm:` sur les grids critiques (KPI 2 col à 380px → 4 col à 600px aujourd'hui ça saute brutalement à 768px `md:`).
8. **Feedback "loading" sur boutons d'action absent** — boutons `SAISIR RELEVÉ`, `NOUVEL ANIMAL`, `ENVOYER` n'ont pas d'état `disabled + spinner` visible pendant la mutation. Risque double-clic. **Fix** : prop `loading` sur `Button` UI avec spinner Lucide `Loader2` + `animate-spin` et `aria-busy`.
9. **Tableaux : aucun tri / aucune pagination** — `/cheptel` (5 lignes ok), mais `/sanitaire/eau` historique 30 jours sans tri colonne ni filtre. **Fix** : headers cliquables avec icône chevron (`@tanstack/react-table` déjà présent ? sinon `lucide` `ChevronsUpDown`).
10. **Tooltips cibles KPI peu lisibles** — "CIBLE 5-7 J" en petit gris sous la valeur. Sur ISSF à `—`, la cible reste affichée mais sans contexte. **Fix** : composant `<KpiTarget>` avec badge pill discret bg-emerald-50/text-emerald-700, et helper `Tooltip` au survol expliquant la métrique.

### 🟡 P2 — À traiter dans le cycle suivant (polish)

11. **Sidebar à 256px fixe sur tablette 768-1024px** — prend 1/3 de l'écran utile. **Fix** : variante `lg:w-64 md:w-16` (icons-only) ou collapse toggle persistant.
12. **Transitions CSS absentes** — aucune `transition` détectée sur hover/focus. Fix global dans `globals.css` : `* { transition: color 150ms, background-color 150ms, border-color 150ms }` (hors mode reduced-motion).
13. **Avatar utilisateur "CL" en sidebar** — initiales sur fond neutre, pas de menu déroulant logout/profil. **Fix** : dropdown Radix avec photo + nom + lien Paramètres + Déconnexion.
14. **Empty state du dashboard "Dernières naissances" / "Stock qui baisse"** — sections affichent juste le titre sans CTA visible (pas d'icône, pas de message). **Fix** : utiliser le composant `EmptyState` existant avec `tone="default"` + CTA `/mises-bas` / `/stock`.
15. **Pas de page de chargement skeleton sur `/assistant`** — passage chat → réponse provoque un blink. **Fix** : skeleton bulle assistant pendant fetch.
16. **Mode haut contraste** : bouton présent mais aucune indication visuelle qu'il est *actif* (toggle sans état `aria-pressed` visible). **Fix** : `aria-pressed={true}` + fond emerald-100 quand actif.
17. **Polices : 2 familles chargées (Big Shoulders Display + Instrument Sans)** — vérifier que `font-display: swap` est utilisé et préload sur fonts critiques (impact CLS mobile 3G en Côte d'Ivoire).
18. **Calendrier sanitaire** : pas re-testé (P0 QA crash), mais à refaire après fix bouton "Marquer fait" — vérifier feedback success/error toast.

---

## Points forts à conserver

- **Architecture responsive sérieuse** : `AppShell` propre, `BottomNav` 5 slots avec badge alertes rouge, drawer Radix-Sheet, header mobile sticky.
- **Loading states excellents** : `loading.tsx` Next.js par route, skeletons fidèles à la structure réelle (pas générique).
- **`EmptyState` avec variante sémantique `good`** (bonne nouvelle = vert) = idée subtile et juste pour un carnet d'élevage.
- **Tokens CSS variables** (`--sf-cream`, `--sf-paper`, `--sf-ink`, `--sf-leaf`, `--sf-line`, `--sf-primary`) → dark mode / haut contraste / tuning sans toucher au code composant.
- **Chatbot WhatsApp-like** : bulles asymétriques, max-width 75%, avatar circulaire 🐷 → registre familier adapté au public cible.
- **Aucun gradient ni shadow exubérant** = cohérent avec le brief "carnet d'élevage", pas de SaaS générique.

---

## Conclusion

Smart Farm V2 a une base design **mature et opinionée** (7.4/10). Les corrections P0 sont **toutes mécaniques** (4 fixes CSS/composants), pas de refonte. Une fois les P0 P1 traités, le produit passe à **≈ 8.5/10** sans effort supplémentaire de design. La priorité absolue reste la hiérarchie H2 (impact perception immédiate) et les cibles tactiles (impact terrain Côte d'Ivoire où mobile = device principal).
