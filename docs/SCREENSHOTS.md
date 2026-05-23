# Screenshots — Smart Farm

> Pages clés à screenshoter pour fournir à Claude Design un panorama visuel de l'état actuel.
> Hermes / Christophe screenshotera et déposera les PNG dans `docs/screenshots/` **avant** envoi à Claude Design.

---

## Convention de nommage

```
docs/screenshots/
  01-landing-desktop.png
  01-landing-mobile.png
  02-connexion-desktop.png
  02-connexion-mobile.png
  03-inscription-desktop.png
  03-magic-link-confirm.png
  04-dashboard-desktop.png
  04-dashboard-mobile.png
  05-cheptel-liste-desktop.png
  05-cheptel-fiche-truie-desktop.png
  06-reproduction-saillie-form.png
  06-reproduction-mise-bas-form.png
  07-sanitaire-calendrier-porcelets.png
  07-sanitaire-biosecurite.png
  08-alimentation-formulations.png
  09-bandes-liste.png
  10-kpi-bande-detail.png
  11-mode-dark.png
  12-mode-haut-contraste.png
```

Format : **PNG**, viewport desktop `1440×900`, viewport mobile `iPhone 14 Pro 393×852` (ou Android Pixel 7 `412×915`).

---

## Pages publiques (no auth)

| # | URL | Device | Notes |
|---|-----|--------|-------|
| 01 | `https://smartfarm.group/` | desktop + mobile | Landing publique, hero + sections |
| 02 | `https://smartfarm.group/connexion` | desktop + mobile | Magic link + password fallback |
| 03 | `https://smartfarm.group/inscription` | desktop | Formulaire création compte |
| 03b | `https://smartfarm.group/mot-de-passe-oublie` | mobile | Demande réinitialisation |

## Pages app (auth requise — Christophe les capture)

Connecter avec compte admin `13smartfarm@gmail.com` (voir `.brain/CONTEXT.md` pour creds — **ne PAS** committer le mot de passe).

| # | Route | Device | Notes |
|---|-------|--------|-------|
| 04 | `/dashboard` | desktop + mobile | Vue d'ensemble : alertes, KPI vedette, listes courtes |
| 05 | `/cheptel` | desktop | Liste truies+verrats+porcelets, filtres |
| 05b | `/cheptel/[id]` (truie active) | desktop | Fiche truie : repro, sanitaire, pesées, historique |
| 06 | `/reproduction` | desktop | Hub repro (saillies en cours, gestations, mises bas attendues) |
| 06b | `/reproduction/saillie/nouveau` | mobile | Formulaire saillie en condition terrain |
| 06c | `/mises-bas` | desktop | Liste + formulaire mise bas (nés vivants, mort-nés, momifiés) |
| 07 | `/sanitaire` | desktop | Hub sanitaire (vaccinations, traitements, mortalités) |
| 07b | `/sanitaire/calendrier-porcelets` | mobile | Calendrier J1/J5/J14/J28 |
| 07c | `/sanitaire/biosecurite` | desktop | Audit 12 items biosécurité |
| 08 | `/alimentation` | desktop | Matières premières CI, formulations, plans |
| 09 | `/bandes` | desktop | Liste bandes (cohortes) avec phase courante |
| 09b | `/bandes/[id]` | desktop | Détail bande : effectifs par bâtiment, GMQ, IC |
| 10 | `/kpi` | desktop | Dashboard KPI IFIP (MCA, IC, GMQ par stade) |
| 10b | `/performances` | desktop | Performances détaillées vue analytique |
| 11 | `/dashboard` en **mode dark** | desktop | Toggle dark depuis user menu |
| 12 | `/dashboard` en **mode haut contraste** | mobile | `?contrast=high` ou via toggle |

## Composants isolés à capturer

| # | Composant | Contexte | Pourquoi |
|---|-----------|----------|----------|
| C1 | `<Sidebar>` desktop ≥ lg | Dashboard | Hiérarchie 14 items / 5 groupes |
| C2 | `<BottomNav>` mobile | Dashboard mobile | 5 items max, icônes Lucide |
| C3 | `<QuickActionsFab>` mobile | Dashboard mobile | FAB actions rapides terrain |
| C4 | `<Alert>` critical | Page sanitaire (PPA fictif) | Hiérarchie alertes 3 niveaux |
| C5 | `<KpiCard>` | Dashboard | MCA / IC / GMQ avec tabular nums |
| C6 | Table cheptel | `/cheptel` | Densité info, badges statut |
| C7 | Form saillie | `/reproduction/saillie/nouveau` | Inputs larges 48px, mobile |
| C8 | Empty state | `/bandes` filtré sans résultat | CTA action contextuel |

## Méthode de capture rapide

Christophe / Hermes peuvent utiliser :

```bash
# Sur le VPS, via Playwright headless (déjà installé dans app/)
cd /root/projects/smartfarm/app
npx playwright codegen https://smartfarm.group/  # exploratoire
# ou script dédié : voir scripts/screenshot-all.ts (à créer si besoin)
```

Pour les pages auth, capture manuelle navigateur (Chrome DevTools → device toolbar → capture full page).

---

## État actuel (au 23/05/2026)

- ✅ Aucun screenshot n'est encore commité.
- ⏳ Christophe doit capturer les 12 écrans principaux + 8 composants avant envoi Claude Design.
- 📁 Dossier `docs/screenshots/` à créer (vide pour l'instant, ajouter `.gitkeep` si besoin).
