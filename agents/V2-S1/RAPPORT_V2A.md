# Rapport V2-A — Fix P0 bugs Sprint 1 V2

**Date** : 2026-05-21
**Producteur** : Sonnet 4.5 (V2-A)
**Périmètre** : SQL only — `supabase/migrations/`
**Migration livrée** : `supabase/migrations/20260521194753_fix_v2s1_p0_bugs.sql`
**Statut migration** : ✅ appliquée avec succès (BEGIN / COMMIT, 0 rollback)

---

## Résumé exécutif

| Bug | Avant | Après | Statut |
|---|---|---|---|
| #1 R01 faux positifs truies en lactation | 3 alertes (T-001, T-002, T-003) | 1 alerte (T-003 seule, légitime, 116j) | ✅ Fix |
| #2 R10 stocks à 0 kg (noise démo) | 31 alertes | 3 alertes (démo réaliste) | ✅ Fix |
| #3 Route `/cheptel/[id]` (T-001) | (audit reportait 404) | **HTTP 200** | ✅ Vérifié — faux positif d'audit |
| **Total alertes** | **34** | **4** | **-30** |

---

## BUG #1 — R01 faux positif truie en lactation

### Cause racine
La clause `WHERE` de la branche R01 dans `v_alertes_actives` avait une expression
logique cassée (mélange `AND`/`OR` non parenthésé) qui matchait toute truie dont
la dernière saillie remonte à plus de 45j, **sans exclure le cas d'une mise-bas
récente** (lactation). Conséquence : T-001 (mise-bas 2026-05-13, soit 8j de
lactation) et T-002 (mise-bas 2026-05-15, 6j) étaient signalées comme "vides".

### Diff de la règle R01 (extrait condition WHERE)

**AVANT** (expression buguée, priorité opérateurs non maîtrisée) :
```sql
WHERE (dsa.derniere_saillie IS NULL OR (CURRENT_DATE - dsa.derniere_saillie) > 45)
  AND (
       ds.dernier_sevrage IS NOT NULL AND (CURRENT_DATE - ds.dernier_sevrage) > 30
    OR dmb.derniere_mb     IS NOT NULL AND (CURRENT_DATE - dmb.derniere_mb)     > 45
       AND ds.dernier_sevrage IS NULL
    OR dsa.derniere_saillie IS NOT NULL AND (CURRENT_DATE - dsa.derniere_saillie) > 45
    OR dsa.derniere_saillie IS NULL AND ds.dernier_sevrage IS NULL AND dmb.derniere_mb IS NULL
       AND COALESCE(t.date_entree, t.date_naissance) IS NOT NULL
       AND (CURRENT_DATE - COALESCE(t.date_entree, t.date_naissance)) > 240
  )
```

**APRÈS** (4 conditions claires, toutes AND, toutes parenthésées) :
```sql
WHERE
  -- (1) pas de saillie récente
  (dsa.derniere_saillie IS NULL OR (CURRENT_DATE - dsa.derniere_saillie) > 45)
  -- (2) pas en lactation (mise-bas > 35j ou aucune)
  AND (dmb.derniere_mb     IS NULL OR (CURRENT_DATE - dmb.derniere_mb)     > 35)
  -- (3) IPO dépassé (sevrage > 14j ou aucun)
  AND (ds.dernier_sevrage  IS NULL OR (CURRENT_DATE - ds.dernier_sevrage)  > 14)
  -- (4) si aucun événement repro : truie installée depuis >240j
  AND (
        dsa.derniere_saillie IS NOT NULL
     OR dmb.derniere_mb       IS NOT NULL
     OR ds.dernier_sevrage    IS NOT NULL
     OR (
           COALESCE(t.date_entree, t.date_naissance) IS NOT NULL
       AND (CURRENT_DATE - COALESCE(t.date_entree, t.date_naissance)) > 240
        )
      )
```

### Sémantique
Une truie est "vide-prolongée" SSI **les 4 conditions sont vraies simultanément** :
1. Aucune saillie ou dernière saillie > 45j (cycle dépassé)
2. Aucune mise-bas ou dernière mise-bas > 35j (sortie de lactation : 28j + 7j marge)
3. Aucun sevrage ou dernier sevrage > 14j (IPO normal 5-7j, marge 7j)
4. Si jamais aucun événement repro tracé : attendre 240j après date_entree

### Données truies au 2026-05-21
| Tag | Dernière saillie | Dernière MB | Dernier sevrage | Statut métier | Alerte R01 avant | Alerte R01 après |
|---|---|---|---|---|---|---|
| T-001 | 2026-01-20 (121j) | 2026-05-13 (8j) | — | **En lactation** | ❌ FP | ✅ pas d'alerte |
| T-002 | 2026-01-22 (119j) | 2026-05-15 (6j) | — | **En lactation** | ❌ FP | ✅ pas d'alerte |
| T-003 | 2026-01-25 (116j) | — | — | **Vide prolongée** (saillie échouée, jamais MB) | ✅ vraie | ✅ vraie |

### Vérif post-fix
```text
 cible_label |               titre
-------------+-----------------------------------
 T-003       | Truie T-003 vide depuis 116 jours
(1 row)
```

### Notes sécurité vue
- ✅ `WITH (security_invoker = true)` conservé (RLS multi-tenant respectée)
- ✅ `GRANT SELECT TO anon, authenticated, service_role` (re-appliqués explicitement)
- ✅ Règles R02 à R12 **identiques au bit près** (recopie de `pg_get_viewdef`)

---

## BUG #2 — 31 stocks matières premières à 0 kg

### Symptôme initial
```text
SELECT COUNT(*) FROM matieres_premieres WHERE stock_actuel = 0 AND deleted_at IS NULL;
-- 31 / 36
```
→ 31 alertes R10-stock-critique noise (toutes les matières sauf 5 traceurs).

### Stratégie de fix
1. UPDATE n°1 : toutes les matières à `stock_actuel = 0` → `seuil_alerte × 3` (stock confortable, ≈3× le seuil)
2. UPDATE n°2 : 3 matières repassées en critique pour démo réaliste → `seuil_alerte × 0,4` (≈40 % du seuil)

### Matières repassées en critique (vérifiées avec noms réels en DB)
| Nom | Seuil | Stock après | % seuil | Rôle métier |
|---|---|---|---|---|
| Maïs grain | 100 kg | 40 kg | 40 % | Céréale base ration |
| Tourteau de soja 48 % | 100 kg | 40 kg | 40 % | Protéine clé |
| Prémix vit-min porc croissance | 20 kg | 8 kg | 40 % | Additif clé |

> ℹ️ Noms du brief ajustés à la réalité de la base : `Maïs grain jaune` → `Maïs grain` ; `Prémix porc croissance` → `Prémix vit-min porc croissance`.

### Vérif post-fix
```text
 R10-stock-critique | 3
```

### Liste complète des 31 matières actualisées (stock_actuel : 0 → seuil×3)
| Nom | Seuil | Stock après |
|---|---|---|
| Carbonate de calcium (coquilles) | 50 | 150 |
| De Heus Finisher | 30 | 90 |
| De Heus Grower | 30 | 90 |
| De Heus Pre-Starter | 30 | 90 |
| De Heus Starter | 30 | 90 |
| DL-Méthionine | 20 | 60 |
| Drêches de brasserie sèches | 100 | 300 |
| Farine de poisson 60 % | 50 | 150 |
| Huile de palme | 50 | 150 |
| IVOGRAIN Porc Croissance | 50 | 150 |
| IVOGRAIN Porc Finition | 50 | 150 |
| IVOGRAIN Porcelet 1er âge | 50 | 150 |
| IVOGRAIN Truie Allaitante | 50 | 150 |
| IVOGRAIN Truie Gestante | 50 | 150 |
| Koudijs Porc Croissance | 30 | 90 |
| L-Lysine HCl | 20 | 60 |
| **Maïs grain** | 100 | **40** *(critique)* |
| Manioc séché | 100 | 300 |
| Patate douce séchée | 100 | 300 |
| Phosphate bicalcique | 50 | 150 |
| **Prémix vit-min porc croissance** | 20 | **8** *(critique)* |
| Prémix vit-min truie gestante/allaitante | 20 | 60 |
| Sel marin | 50 | 150 |
| Son de blé | 100 | 300 |
| Son de riz | 100 | 300 |
| Sorgho grain | 100 | 300 |
| Tourteau d'arachide | 100 | 300 |
| Tourteau de coton | 100 | 300 |
| Tourteau de palmiste | 100 | 300 |
| **Tourteau de soja 48 %** | 100 | **40** *(critique)* |
| Vitalac Porc Croissance | 30 | 90 |

(5 matières inchangées car stock déjà non-nul avant migration : Crésyl désinfectant, Iverin antiparasitaire, Prémix vitamines, Tourteau soja, Vaccin Mycoplasme.)

---

## BUG #3 — Vérification route `/cheptel/[id]`

### Commande exécutée
```bash
TRUIE_ID=$(PGPASSWORD=postgres psql … -At -c "SELECT id FROM animaux WHERE tag='T-001';")
# 33333333-0000-0000-0000-000000000001
curl -s -o /tmp/cheptel.html -w "%{http_code}\n" "http://127.0.0.1:3000/cheptel/$TRUIE_ID"
```

### Résultat
```text
HTTP=200  size=70769 bytes
```

✅ **Route fiche animal OK** — l'audit V2 a reporté un faux positif (404)
probablement lié au bundle JS manquant pendant la dégradation serveur. Aucune
action frontend nécessaire. Pas de modif `app/src/**`.

---

## Vérification finale — total alertes

```sql
SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id ORDER BY regle_id;
```

| Avant migration | Après migration |
|---|---|
| `R01-truie-vide-prolongee \| 3` | `R01-truie-vide-prolongee \| 1` |
| `R10-stock-critique       \| 31` | `R10-stock-critique       \| 3` |
| **TOTAL : 34** | **TOTAL : 4** |

(R11 reste à 0 — pas de consommation_aliment sur 30j dans la démo.)

---

## Livrables

| Fichier | État |
|---|---|
| `supabase/migrations/20260521194753_fix_v2s1_p0_bugs.sql` | ✅ créé (~18 KB), appliqué |
| `agents/V2-S1/RAPPORT_V2A.md` | ✅ ce document |

## Anti-pièges respectés
- ✅ Aucun nom de matière inventé (vérifié contre la base avant UPDATE)
- ✅ `GRANT SELECT TO anon` conservé (V1 demo sans auth)
- ✅ `WITH (security_invoker=true)` conservé (RLS multi-tenant)
- ✅ Règles R02 à R12 **inchangées** (copy/paste depuis `pg_get_viewdef`)
- ✅ Aucun fichier `app/src/**` modifié
- ✅ Migration en transaction (BEGIN/COMMIT) — atomique
