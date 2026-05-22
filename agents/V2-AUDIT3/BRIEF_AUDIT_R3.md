# Brief AUDIT-R3 — Audit V2 Round 3 (post-FIX + POLISH)

## Tu es : Reviewer senior contexte vierge — audit fonctionnel + métier consolidé

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md` AVANT d'agir.

App : `http://127.0.0.1:3000` (local) ou `https://smartfarm.187-127-225-24.nip.io` (HTTPS).
DB : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`.

## Historique
- **R2** : score 6.5/10 (3 audits : QA 5.5, Design 7.4, Métier 6.5)
- **FIX V2** : 10/11 P0 résolus
- **POLISH V2** : 13 P1 résolus
- **Attendu R3** : ≥8.5/10 (sinon liste des trous)

## Mission
Tu joues **3 rôles consolidés** en 1 audit (économie tokens) :
1. **QA fonctionnel** : routes, formulaires, server actions, calendrier "Marquer fait"
2. **Design/UX** : sidebar, hiérarchie, empty states, skeleton, chatbot, badges
3. **Métier porcin** : doses vaccins, calendrier J14/J28, KPI ISSF/TMM, alertes R01-R20

## Vérifications ciblées (15-20 tests max)

| Sujet | Vérif | Attendu |
|---|---|---|
| Routes | curl 18 routes principales | 18× HTTP 200 |
| Redirects | curl `/biosecurite` | 308 → /sanitaire/biosecurite |
| Calendrier porcelets | `SELECT acte FROM v_calendrier_sanitaire_porcelets GROUP BY acte` | Mycoplasma J14 et J28 (pas J7/J21) |
| TMM IFIP | `SELECT tmm_pct FROM v_kpi_techniques_truie WHERE tag='T-001'` | 7.69% (sans écrasés) |
| 20 règles | `SELECT regle_id FROM v_alertes_actives` | R01-R20 toutes présentes en SQL |
| Mapping UI | `grep -c "^  'R" src/lib/alertes-regles.ts` | 20 |
| Mycotoxines | `\d lots_matieres_premieres` | 5 toxines (afla, ZEA, DON, OTA, FUM) |
| Voie IM | `SELECT DISTINCT voie FROM protocoles_vaccinaux` | "IM (encolure)" présent |
| Cochettes | `SELECT nom FROM protocoles_vaccinaux WHERE categorie_cible='cochette'` | 4 protocoles |
| BCS | `\d saillies` `\d mises_bas` `\d sevrages` | colonne `bcs_truie` présente partout |
| Bouton "Marquer fait" | curl POST /sanitaire/calendrier avec action | 303 + revalidate |
| Sidebar | browser /dashboard, snapshot | 5 groupes (Pilotage/Élevage/Santé/Logistique/Intelligence), Performances dans Pilotage |
| H1 Reproduction | curl /reproduction \| grep h1 | "Reproduction" (pas "Nouvelle saillie") |
| Metadata title | curl /alertes \| grep -i "<title>" | "Alertes — Smart Farm" |
| Biosécurité checklist persistante | `SELECT count(*) FROM biosecurite_audits` | table existe + Server Action `noterAuditBiosecurite` codé |
| Heat stress lib | `grep AJUSTEMENT_HEAT_STRESS src/lib/nutrition-engine.ts` | trouvé |
| Cibles BCS | `grep CIBLES_BCS src/lib/repro-cibles.ts` | trouvé |
| R20 ISS | `grep R20-iss-trop-long src/lib/alertes-regles.ts` | trouvé |

## CONSIGNE BUDGET — MAX 20 tool calls
- Écris ton rapport AU PLUS TARD au 18ème call
- Privilégie psql + grep + curl (pas browser intensif)
- 1 seul browser_navigate sur /dashboard pour visuel sidebar

## Livrable
Rapport à `/root/projects/smartfarm/agents/V2-AUDIT3/RAPPORT_AUDIT_R3.md`

Format :
```md
# Audit V2 Round 3

## Score consolidé : X/10

## Détail
- QA fonctionnel : X/10
- Design/UX : X/10
- Métier porcin : X/10

## Validations OK (≤10 bullets)
- 20 règles alertes mappées DB+UI ✓
- Calendrier Mycoplasma J14+J28 ✓
- ...

## P0 bugs restants (≤5 bullets, courts)
- ...

## P1 (≤5 bullets)
- ...

## P2 polish (≤5 bullets)
- ...

## Comparaison R2 → R3
| Auditeur | R2 | R3 |
|---|---|---|
| QA | 5.5 | ? |
| Design | 7.4 | ? |
| Métier | 6.5 | ? |
| Global | 6.5 | ? |

## Verdict pilote terrain
GO / NO-GO / GO AVEC FIXES
```

## Anti-pièges
- Pas de modification code
- Si une vérif SQL retourne 0 ligne, c'est peut-être normal (données démo) — vérifie le SCHÉMA d'abord
- N'inonde pas le rapport — télégraphique, factuel
