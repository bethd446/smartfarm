# Brief AUDIT-METIER-FULL — Inventaire règles métier par module

## Tu es : Reviewer SENIOR ÉLEVAGE PORCIN — contexte vierge

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md` AVANT.

App : `http://127.0.0.1:3000` (local). DB : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`.

Tu n'as PAS construit l'app — tu auditesimpitoyablement.

## Mission
Pour CHAQUE module de l'app (15 modules listés ci-dessous), tu identifies :
- ✅ Règles métier **DÉJÀ EN PLACE** (synthèse courte)
- ⚠️ Règles métier **MANQUANTES** ou **INCORRECTES** (P0/P1/P2)
- 💡 **Améliorations** intelligence/automatisation possibles

## Modules à auditer (15)

1. **Dashboard** `/dashboard`
2. **Alertes** `/alertes` (22 règles R01-R22 actuelles)
3. **KPI** `/kpi`
4. **Cheptel** `/cheptel` + fiche `/cheptel/[id]`
5. **Reproduction** `/reproduction` (saillies, diagnostic, retour chaleur)
6. **Mises-bas** `/mises-bas` + check J+1
7. **Bandes** `/bandes` + détail `/bandes/[id]` (sexage, transit)
8. **Bâtiments** `/batiments` + détail `/batiments/[id]`
9. **Pesées** `/pesees`
10. **Sanitaire** `/sanitaire` + sous-pages (calendrier, biosécurité, eau, mycotoxines, maladies, protocoles)
11. **Alimentation** `/alimentation` (matières premières, formulations, plans, concentrés)
12. **Stock** `/stock`
13. **Calendrier** `/calendrier` (global repro)
14. **Assistant** `/assistant` (chatbot agritech)
15. **Conseiller** `/conseiller`

## Référentiels à mobiliser
- **IFIP** (Institut Français du Porc) — KPI GTTT
- **INRAE** — nutrition NRC 2012, BCS
- **OIE/WOAH** — protocoles sanitaires
- **CIRAD** — élevage tropical CI
- **FAO** — biosécurité
- Pratiques terrain Côte d'Ivoire (climat tropical, matières premières locales)

## CONSIGNE BUDGET — MAX 25 tool calls
- Mix `psql` (catalogue tables/vues/règles) + `grep` (libellés, server actions) + `curl` HTTP + `browser_navigate` (1-2 max)
- Rapport écrit AU PLUS TARD au 23ème call
- Pas de modification, juste audit

## Méthode efficace
- **1 requête psql** pour récupérer toutes les règles d'alertes en clair
- **1 requête psql** par module pour vérifier les tables associées
- **grep** pour libellés clés et présence Server Actions
- Croise avec ton expertise métier

## Livrable
Rapport à `/root/projects/smartfarm/agents/V2-AUDIT-METIER/RAPPORT.md`

Format :
```md
# Audit Métier Exhaustif — SmartFarm

## Score global métier : X/10

## Synthèse top P0 (≤8 améliorations critiques toutes catégories)
1. ...
2. ...

---

## Module 1 — Dashboard
✅ En place : ...
⚠️ Manquant : ...
💡 Améliorations : ...

## Module 2 — Alertes
...
(et ainsi de suite pour les 15 modules)

---

## Plan de bataille suggéré (3-5 sprints prioritaires)

### Sprint A (Critique — sécurité bête/éleveur)
- ...

### Sprint B (Important — productivité)
- ...

### Sprint C (Polish UX / automatisation)
- ...

---

## Points forts à conserver
- ...

## Verdict
GO / NO-GO / GO AVEC FIXES
```

## Anti-pièges
- Pas de modifs code
- Format télégraphique, pas de prose
- Mentionne référentiel quand tu cites une règle (ex: "Vermifuge truie J-14 pré-MB (INRAE)")
- Si une règle est OK mais le **libellé** ou **dose** est faux, signale-le précisément
- Évite les redondances — chaque amélioration listée UNE fois
