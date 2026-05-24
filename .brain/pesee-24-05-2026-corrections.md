# Pesée 24/05/2026 — Corrections post-vérification photos

## 🎯 Synthèse des corrections appliquées

### 1️⃣ Pesées fantômes supprimées (24/05)
- **B45-F : 11 kg en Bât2-L6** → SUPPRIMÉE (n'existait pas sur photo carnet)
- **B55-F : 9 kg en Bât2-L6** → SUPPRIMÉE (n'existait pas sur photo carnet)
- Conséquence : `B45-F` repassée en `statut_boucle = 'perdue'`

### 2️⃣ Inversion B25-M ↔ B24-M (Bât1-L4)
- **Saisie texte** : "B25-M : 13 kg"
- **Photo carnet** : "B24-M : 13 kg" (vérité)
- **B25-M** redevient `statut_boucle = 'perdue'` (poids 02/05 = 11 kg)
- **B24-M** récupère la pesée 13 kg en Bât1-L4 (statut `ok`)

### 3️⃣ Sexe SB-Bât2-L6 (10 kg) confirmé F
- Photo carnet : "10 KG B(00) F" → boucle illisible mais sexe F clair
- Tag DB renommé : `SB-X-Bât2-L6-1` → `SB-F-Bât2-L6-1`
- Sexe : `INCONNU` → `F`, couleur `VERT`

### 4️⃣ 5 écarts corrigés sur pesées 02/05

| Tag | Carnet | DB avant | DB après |
|---|---:|---:|---:|
| B21-F | 18 kg | 13 kg | **18 kg** |
| B45-F | 9,5 kg | 4,1 kg | **9,5 kg** (inversion) |
| B45-F-bis | 4,1 kg | 9,5 kg | **4,1 kg** (inversion) |
| B45-M | 4,7 kg | 4,1 kg | **4,7 kg** |
| B54-F | 3,7 kg | 3,9 kg | **3,7 kg** |

## 📊 Bilan post-correction

### Effectifs finaux
| Métrique | Valeur |
|---|---:|
| Pesées 24/05 en DB | **109** |
| Pesées 02/05 en DB | 117 |
| Animaux Démarrage 2 actifs | 95 |
| Animaux Croissance actifs | 34 |
| Animaux statut boucle 'ok' | 88 |
| Animaux statut 'a_reboucler' (SB) | 17 |
| Animaux statut 'perdue' | 23 |
| Animaux statut 'nouvelle' (B53-F) | 1 |

### GMQ moyen 02/05 → 24/05 (22 jours)
- **88 animaux** avec 2 pesées consécutives
- **GMQ moyen : 449 g/j** (norme Démarrage 2 = 250-350 g/j → **EXCELLENT**)
- GMQ min : 182 g/j (B51-F, B24-M)
- GMQ max : 795 g/j (B19-M, B15-M)
- **76 animaux ≥ 300 g/j** (bon)
- **31 animaux ≥ 500 g/j** (excellent)

### GMQ moyen par loge actuelle
| Loge | Nb | GMQ moy | Min | Max |
|---|---:|---:|---:|---:|
| Bât1-L1 | 6 | 387 | 273 | 455 |
| Bât1-L3 | 6 | 390 | 341 | 455 |
| Bât1-L4 | 8 | 381 | 182 | 477 |
| Bât2-L1 | 6 | 417 | 318 | 455 |
| Bât2-L3 | 6 | 375 | 295 | 432 |
| Bât2-L4 | 8 | 420 | 341 | 477 |
| Bât2-L5 | 11 | 398 | 250 | 545 |
| Bât2-L6 | 8 | 226 | 182 | 286 |
| Croissance (transférés) | 29 | 603 | 500 | 795 |

## 🆕 Vue créée

`v_historique_pesees_animal` :
- Une ligne par pesée
- Calcul automatique de l'intervalle (jours) et GMQ (g/jour) avec la pesée précédente
- Utilisable dans l'UI `/cheptel/[id]` pour afficher l'historique

```sql
-- Exemple : tous les GMQ d'un animal
SELECT date_pesee, poids_kg, intervalle_jours, gmq_g_jour
FROM v_historique_pesees_animal
WHERE animal_id = '<uuid>'
ORDER BY date_pesee;
```

## 🎯 Top 10 animaux à surveiller (GMQ < 270 g/j)

| Tag | Sexe | Loge | 02/05 | 24/05 | GMQ |
|---|---|---|---:|---:|---:|
| B51-F | F | Bât2-L6 | 5,0 | 9,0 | 182 |
| B24-M | M | Bât1-L4 | 9,0 | 13,0 | 182 |
| B47-M | M | Bât2-L6 | 3,9 | 8,0 | 186 |
| B60-F | F | Bât2-L6 | 4,9 | 9,0 | 186 |
| B43-M | M | Bât2-L6 | 5,5 | 10,0 | 205 |
| B54-F | F | Bât2-L6 | 3,7 | 9,0 | 241 |
| B42-M | M | Bât2-L6 | 3,5 | 9,0 | 250 |
| B52-F | F | Bât2-L5 | 6,5 | 12,0 | 250 |
| B57-F | F | Bât2-L6 | 4,1 | 10,0 | 268 |

→ **Bât2-L6 surreprésentée** : c'est la loge des plus jeunes, GMQ faibles normaux à cet âge.

## 📁 Fichiers livrés

- `supabase/migrations/20260525000000_v_historique_pesees_animal.sql`
- `.brain/pesee-24-05-2026-corrections.md` (ce fichier)
