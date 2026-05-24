# Pesée 24/05/2026 — Démarrage 2 / 13smart

## 📊 Résumé exécutif

- **111 pesées** réalisées (vs 117 effectif théorique)
- **107 animaux** physiquement présents répartis en 10 loges
- **22 boucles disparues** depuis pesée du 02/05
- **17 sans-boucle** (boucles perdues, animaux toujours là)
- **34 porcelets ≥ 24 kg** transférés en Croissance le 24/05

## 🏗️ Structure bâtiment Démarrage 2

### Effectifs par loge (post-transfert Croissance)

| Loge | Effectif | Poids moy | Date naiss. | Âge | Sexes |
|---|---:|---:|---|---:|---|
| Bât2-L1 (F) | 7 (-7) | 18,5 kg | 06/03 | 79j | Femelles |
| Bât2-L2 (F) | 0 (-10) | — | 26/02 | 87j | Femelles |
| Bât2-L3 (F) | 11 (-1) | 19,8 kg | 20/03 | 65j | Femelles |
| Bât2-L4 (F) | 9 | 19,0 kg | 28/03 | 57j | Femelles |
| Bât2-L5 (Mixte) | 13 | 15,5 kg | 31/03 | 54j | M+F |
| Bât2-L6 (Mixte) | 11 | 9,4 kg | 01/04 | 53j | M+F |
| Bât1-L1 (M) | 7 (-5) | 19,3 kg | 10/03 | 75j | Mâles |
| Bât1-L2 (M) | 0 (-10) | — | 26/02 | 87j | Mâles |
| Bât1-L3 (M) | 8 | 19,5 kg | 20/03 | 65j | Mâles |
| Bât1-L4 (M) | 8 | 17,5 kg | 28/03 | 57j | Mâles |
| **TOTAL** | **73** | **17,4 kg** | | | |

⚠️ Bât2-L2 et Bât1-L2 vidées (toute la loge ≥ 24kg → Croissance)

## 🐷 Bâtiment Croissance (post-transfert)

- **34 porcelets** (poids moy 28,5 kg)
- **Stock KPC Croissance** : 1000 kg
- **Conso quotidienne** : 64,6 kg/j
- **Autonomie** : ~15 jours

## ⚠️ Anomalies signalées

### Doublons de pesée (Option A : 2 pesées conservées, animal unique)
| Boucle | Loges en conflit | Action |
|---|---|---|
| B7-F | Bât2-L1 (27kg) + Bât2-L2 (26kg) | À vérifier physiquement |
| B12-F | Bât2-L1 (28kg) + Bât2-L3 (20kg) | À vérifier physiquement |
| B48-F | Bât2-L3 (18kg) + Bât2-L4 (19kg) | À vérifier physiquement |
| B55-F | Bât2-L5 (12kg) + Bât2-L6 (9kg) | À vérifier physiquement |

### Nouvelles boucles posées (depuis 02/05)
| Boucle | Loge | Poids | Notes |
|---|---|---:|---|
| B53-F | Bât2-L6 | 8 kg | Créée en DB, statut_boucle=nouvelle |
| B60-F | Bât2-L6 | 9 kg | Réactivée (était statut=malade) |

### Sans-boucle à reboucler (statut_boucle = 'a_reboucler')
- Bât2-L1 : 1 SB (F, 20kg)
- Bât2-L3 : 5 SB (F : 17, 19, 19, 22, 25kg)
- Bât2-L4 : 1 SB (F, 19kg)
- Bât2-L5 : 2 SB (M, 16+17kg)
- Bât2-L6 : 1 SB (sexe non précisé, 10kg)
- Bât1-L1 : 3 SB (M : 19, 25, 27kg)
- Bât1-L2 : 2 SB (M : 26, 31kg) → ils sont en Croissance maintenant
- Bât1-L3 : 2 SB (M : 20, 21kg)

### Boucles disparues (22) — statut_boucle = 'perdue'
- Animaux non pesés le 24/05, à investiguer (mort, sorti, boucle changée)
- Liste : B1-F, B8-F, B27-F, B27-M, B29-F, B30-F, B42-F, B44-F, B45-F-bis, B45-M, B46-F, B50-M, B51-M, B53-M-bis, B3-M, B12-M, B16-M, B20-M, B22-M, B23-M, B24-M, B40-M

## 🎯 Recommandations

1. **Commander 1 tonne KPC Croissance** d'ici 10 jours (autonomie actuelle 15j, mais d'autres porcelets vont atteindre 24kg semaine prochaine)
2. **Re-pesée loges Bât2-L1 et Bât1-L1** dans 7-10 jours : ces loges ont des poids 18-25kg, plusieurs vont basculer en Croissance
3. **Rebouclage physique des 17 sans-boucle** : prévoir achat boucles V/B + journée de pose
4. **Vérification physique des 4 doublons** (B7-F, B12-F, B48-F, B55-F) à la prochaine visite porcher

## 📁 Fichiers liés

- Migration SQL : `supabase/migrations/20260524230000_pesee_24_05_phase_5_boucles.sql`
- Script réconciliation : `scripts/reconcile-pesees.ts` (skeleton, à étendre)
- Vue principale : `v_porcelets_a_transferer`

## 🗂️ Tables impactées

| Table | Action | Nb lignes |
|---|---|---:|
| `animaux` | ALTER TABLE (ajout colonnes) | — |
| `animaux` | UPDATE (case_id, poids, naissance) | 90 |
| `animaux` | INSERT (B53-F, 17 SB temp) | 18 |
| `animaux` | UPDATE statut_boucle='perdue' | 22 |
| `animaux` | UPDATE batiment_id=Croissance | 34 |
| `cases` | INSERT (10 loges Démarrage 2) | 10 |
| `pesees` | INSERT pesées 24/05 | 111 |
| `mouvements` | INSERT transferts | 34 |
| `formules` | INSERT KPC Croissance | 1 |
| `mouvements_stock` | INSERT entrée 1t | 1 |
