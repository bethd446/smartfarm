# Smart Farm — Sprint 1 (Option A) — État

**Date** : 2026-05-22 13:30 UTC
**Décision user (Christophe)** : Option A acceptée — on attaque Phase 1 + Phase 2 prochaine session

## Périmètre Sprint 1 (≈ 1.5 jour dev senior)
**Objectif** : permettre à `samotjeanmarc@gmail.com` (SF-061072) de créer SA ferme via onboarding, voir 5 bâtiments par défaut, et utiliser l'app sans fallback démo parasite.

### Phase 1 — Quick wins (3h)
- B1 — Bouton Déconnexion sidebar [1h]
- B2 — `/performances` → redirect 308 vers `/kpi` [30min]
- B5 — Détecter `!fermeId` → message "Aucune ferme" + redirect onboarding (au lieu fallback Yamoussoukro) [1h]
- B6 — Inputs date format fr-FR (jj/mm/aaaa) [1h]

### Phase 2 — Foundation (1.5j)
- F2 — Migration `seed_batiments_standards(p_ferme)` + trigger `AFTER INSERT ON fermes` [2h] ⚡
- F1 — Onboarding wizard 3 étapes + RPC `bootstrap_ferme()` + redirect dans layout [1j]

## Hors périmètre (Sprint 2+)
- B3 Bouton "Nouveau bâtiment" UI (Phase 3)
- B4 Pages vides `/alertes` `/bandes` `/mises-bas` `/parametres` (Phase 3)
- F3 Référentiel ration auto-calc (Phase 4)
- F5 Transferts auto post-MB (Phase 3)
- B7 Assistant IA (Phase 5)

## Critères validation Sprint 1
1. `samotjeanmarc` se connecte → arrive sur `/onboarding`
2. Wizard rempli → ferme créée + 5 bâtiments standards visibles
3. Bouton déconnexion opérationnel
4. `/performances` ne casse plus (308 → /kpi)
5. Dates en fr-FR partout
6. Plus de Yamoussoukro/Christophe parasites dans sidebar

## Stratégie d'exécution recommandée
- Cerveau projet `.brain/CONTEXT.md` lu en début de session par tous les agents
- 4-5 sous-agents parallèles (caveman ≤200 lignes par brief)
- Orchestrateur Hermes : centralise builds (PAS de `npm run build` sous-agents) + audits
- Toolsets restreints (terminal+file pour la plupart)
- Sprint Fix systématique fin de phase
- Audit triangulé QA+Design+Métier en fin de Sprint

## Compte test à utiliser pour valider
- Email : `samotjeanmarc@gmail.com`
- Password : `Teste2023`
- Numéro client : `SF-061072`
- État : viewer sans ferme → parfait test onboarding from scratch
