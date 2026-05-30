# Session 2026-05-30 — Fix P0 fonctionnels #19-21 + double-merge main

**Branche** : `fix/19-functional-p0` (worktree `../sf-19-functional-p0`, depuis `origin/main` @ 475352c)
**Issues** : #19, #20, #21 (réservées @me). #22 commenté (décision requise).

## Fait
- **Double-merge → main** : #14 (fix/bug-sweep : hydration #10, #9, sécu auth fail-closed, NaN/routing, economique, D1/D2) + #26 (cleanup repo + protocole §15). `deploy` + `ci` + `rls-monitor` + **`smoke-prod` (e2e desktop+mobile) = SUCCESS**. Prod = 475352c, validée.
- **#19** création animal : enum `categorie` aligné sur `categorie_animal` réel (truie/cochette/verrat/porcelet_lait/porcelet_sevre/porcelet_croissance/porc_engraissement). Fichiers : cheptel/_schemas.ts, _dialog-nouvel-animal.tsx, lib/terrain-labels.ts.
- **#20** saillie : option + z.enum `IA_double` retirés (enum `methode_saillie` = naturelle,IA). Fichiers : reproduction/_dialog-faire-monter.tsx, _schemas.ts.
- **#21** pesées : `ferme_id` ajouté (pattern user_farms), payload aligné schéma réel (animal_id/poids_kg/date_pesee/observations, contexte=DEFAULT), embed `bande:bande_id` retiré + error state. Fichiers : pesees/_server-actions.ts, page.tsx.
- Vérif : `tsc --noEmit` = 0, `next build` = OK.

## Reste / suivi
- **#21 bande** : la pesée PAR BANDE n'est pas supportée (table `pesees` sans colonne `bande_id` ; CHECK animal_id OU portee_id). Erreur explicite renvoyée. → migration `bande_id`/`portee_id` requise (décision + migration Christophe).
- **#22 formulation** : `formulation/_actions.ts` écrit `formulations`, plans/consommations lisent `formules` (2 tables ≠). Décision modèle de données requise (unifier) — commenté sur l'issue, NON codé.
- **Validation runtime** : soumission réelle des formulaires (compte démo) recommandée AVANT merge de la PR (CI valide tsc+lint+build ; le smoke e2e ne couvre pas ces forms).

## Garde-fous respectés
Worktree dédié (jamais ~/smartfarm partagé), issues réservées avant code, pas de migration en autonomie, pas de mutation ferme réelle.
