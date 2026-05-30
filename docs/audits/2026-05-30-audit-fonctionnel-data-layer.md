# Audit fonctionnel / data-layer — Smart Farm — 2026-05-30 (P5)

Audit mené par une session parallèle (originSessionId `ce58e94d`), base D2 via `fix/bug-sweep`. Complète l'audit design (UX) avec des bugs **data-layer** que l'audit UX ne voit pas (INSERT/lecture qui échouent silencieusement). Issues GitHub : #19-22 (P0), #24 (P1).

> ⚠️ Vérifier file:line sur la base courante (le code bouge ; la Phase D3 a refondu `pesees`). **Fixer sur `main` post-merge PR #14, PAS sur `fix/bug-sweep`** (qui sera obsolète).

## P0 — features cassées (issues #19-22)
- **#19 Création animal KO** — `cheptel/_schemas.ts` + `_dialog-nouvel-animal.tsx` proposent `porcelet`/`sevrage`/`engraissement`, mais l'enum DB `categorie_animal` = `truie,verrat,cochette,porcelet_lait,porcelet_sevre,porcelet_croissance,porc_engraissement,reforme` → INSERT rejeté pour tout porcelet. Fix : aligner zod + select + `CATEGORIE_LABEL` sur les vraies valeurs (source `lib/stades-animaux.ts`). Les onglets cheptel (`CAT_*`) utilisent déjà les bonnes.
- **#20 Saillie IA_double KO** — `reproduction/_dialog-faire-monter.tsx:~171` option `IA_double` absente de l'enum `methode_saillie` (`naturelle,IA`). Fix : retirer l'option+zod, ou migration `ALTER TYPE ADD VALUE` (décision Christophe).
- **#21 Pesées 100% KO** — `pesees/_server-actions.ts` n'envoie pas `ferme_id` (NOT NULL + RLS) ; colonnes `type`/`nb_animaux`/`bande_id` inexistantes. Fix : `ferme_id` via getUser→`user_farms` (pattern `declarerMortalite`) ; mapper `type`→`contexte` (enum `contexte_pesee`), retirer `nb_animaux`/`bande_id`. Recouvre la refonte D3.
- **#22 Formulation déconnectée** — le calculateur écrit la table `formulations`, mais plans+consommations LISENT `formules` (2 tables ≠). Fix : unifier sur une table (décision modèle données + migration/seed).

## P1 (issue #24)
- `reproduction/_server-actions.ts:~115` — saillie diagnostiquée négative/retour chaleur reste dans « À diagnostiquer ».
- `cheptel/_row-actions.tsx:~109` — « Marquer mort » → `?action=mort` jamais traité (cul-de-sac).
- `bandes/page.tsx:~55` — CTA empty-state → ancre morte `#nouvelle-bande`.
- `alimentation/plans/page.tsx:~550` & `stock/page.tsx:~245` — CTA empty-state `?action=new` ignoré.
- `alimentation/plans/page.tsx:~430` — lien « Anticiper production » `?formule=` mort.
- `cheptel/page.tsx:~99` — onglet Portées : tri/recherche serveur cassé.
- `alimentation/_components/nutrition-stats.tsx:~109` — KPI « Stock jours restants » calcul trompeur.
- `pesees/page.tsx:~18` — liste masque l'erreur de requête (pas d'error state).

## P2 (issue #25 commune)
11 items (marge éco présentée comme chiffres ferme, lignes cheptel non cliquables, onglets fiche animal placeholders, pagination mortalités, etc.). Rapport complet original de la session P5 : produit hors repo (`~/.claude/audits/smartfarm-mission/P5-functional-ux-findings.md`).
