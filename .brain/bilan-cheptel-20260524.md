# BILAN CHEPTEL — SMART FARM CI
**Date** : 2026-05-24
**Ferme** : Smart Farm (SF-CI-01) — fdba3bb2-85dd-4ac1-9ab3-713c750980dc
**Source** : Snapshot Supabase via Hermes PAT
**Owner** : Christophe Liegeois

## Effectif (129 animaux actifs)
| Stade | Sexe | Nb | Pesés | Poids moy | Range |
|---|---|---|---|---|---|
| demarrage_2 | M | 53 | 53 | 10.4 kg | 3.5–22.5 |
| demarrage_2 | F | 57 | 57 | 11.3 kg | 3.9–21.5 |
| truie_vide | F | 5 | 0 | — | — |
| truie_gestante | F | 10 | 0 | — | — |
| truie_allaitante | F | 2 | 0 | — | — |
| verrat | M | 2 | 0 | — | — |

## Bâtiments
| Bâtiment | Type | Occupation |
|---|---|---|
| Verraterie | verraterie | 2/8 |
| Gestation | gestation | 16/60 |
| Maternité (9 loges) | maternite | 1/9 |
| Démarrage 1 | demarrage | 0/100 |
| Démarrage 2 | demarrage | 110/300 |
| Croissance | croissance | 0/200 |
| Finition | finition | 0/200 |

## Pesées
- **02/05/2026** : 117 pesées (110 porcelets démarrage_2 + 7 autres ?), moyenne 10.4 kg
- Aucune autre pesée enregistrée depuis cette date

## Portées
| Code | Naissance | Effectif | Sevrage | Poids sev |
|---|---|---|---|---|
| P-202605-001 | 05/05/2026 | 12 → 12 | non sevrée | — |
| P-202604-001 | 01/04/2026 | 13 → 13 | non sevrée | — |
| P-202603-003 | 31/03/2026 | 12 → 13 | non sevrée | — |
| P-202603-002 | 28/03/2026 | 0 → 0 | non sevrée | — |
| P-202603-001 | 20/03/2026 | 0 → 0 | non sevrée | — |
| P-202602-001 | 28/02/2026 | 0 → 0 | non sevrée | — |

## Alertes actives (à traiter)
- **6 colostrum_check** [critical]
- **6 sevrage_a_effectuer** [alert]
- **11 diag_gestation_echo** [warning]
- **11 retour_chaleurs_surveillance** [warning]
- **6 soins_porcelets_j3** [warning]
- **5 sevrage** [warning]
- **2 manuelle_zootechnie** [warning]
- **6 chaleurs_post_sevrage** [info]
- **6 sevrage_planifier** [info]
- **5 transition_stade** [info]

## Anomalies détectées (pour clarification user)
1. **Portées P-202603-001/002 et P-202602-001 avec effectif 0** → données zombies à nettoyer
2. **Aucune truie allaitante en cohérence** avec les portées récentes (1 truie / 3 portées non sevrées)
3. **0 porcelet en démarrage_1** alors que tous en démarrage_2
4. **Pesées datées du 02/05** mais snapshot 24/05 → 22 jours sans pesée, normal d'avoir alertes "porcelets_non_peses" si codée
5. **Truies vides = 5** sans diag echo → cohérent avec les 11 alertes diag_gestation_echo

## Pistes Phase 4.B
- R28 : Truies vides ≥ 8 jours post-sevrage sans diag de chaleur
- R29 : Portées avec effectif = 0 (zombie)
- R30 : Bâtiment Croissance vide depuis ≥ 7 jours alors que porcelets ≥ 22 kg en démarrage_2 (alerte anticipée)
