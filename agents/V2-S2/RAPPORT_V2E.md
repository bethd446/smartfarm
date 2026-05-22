# Rapport V2-E — KPI techniques métier (ISSF + Productivité numérique + TMM)

**Agent** : Producteur Sonnet 4.5 (V2-E)
**Date** : 2026-05-21
**Statut** : ✅ Livré

## 1. Périmètre livré

### Migration SQL
- `supabase/migrations/20260521210100_kpi_techniques.sql` — **appliquée** ✅
- 2 nouvelles vues créées avec `security_invoker=true` :
  - `v_kpi_techniques_truie` — KPI individuels par truie
  - `v_kpi_techniques_ferme` — agrégat par ferme (1 row par ferme)
- `GRANT SELECT ... TO anon, authenticated`

### Colonne `mises_bas.ecrases`
Vérification au démarrage : ❌ **absente** (V2-D pas encore passé).
Vérification après création de la vue : ✅ **présente** (V2-D a livré entre-temps).
La vue utilise donc `COALESCE(ecrases, 0)` (version finale appliquée — la stratégie `0::integer` de fallback est documentée en commentaire).

### Frontend
| Fichier | Changement |
|---|---|
| `app/src/components/kpi/kpi-tech-card.tsx` | **NEW** — composant card + helpers de coloration sémantique (toneIssf, toneProductivite, toneTmm, toneNesVivants) |
| `app/src/app/(app)/kpi/_kpi-tech-ranking.tsx` | **NEW** — tableau classement client (tri par chaque KPI, NULL → "Pas assez de cycles") |
| `app/src/app/(app)/dashboard/page.tsx` | +4 cards KPI métier (ISSF · Productivité · TMM · Nés vivants/portée) lues depuis `v_kpi_techniques_ferme` |
| `app/src/app/(app)/cheptel/[id]/page.tsx` | Section "Performances techniques" (4 cards + détails) pour truies/cochettes ; `<EmptyState>` si pas de cycles |
| `app/src/app/(app)/kpi/page.tsx` | Bloc "KPI techniques métier" (4 cards ferme + tableau classement triable) en haut de page |

## 2. Définitions métier appliquées

- **ISSF** = `AVG(date_saillie_fécondante - date_sevrage_précédent)` (jours), saillie fécondante = celle qui a abouti à une mise-bas confirmée.
- **Productivité numérique** = `sevrés_moyen × (365 / (115 + 28 + COALESCE(ISSF, 7)))` (porc. sevrés / truie / an).
- **TMM** = `(SUM(nes_morts + momifies + COALESCE(ecrases, 0)) / SUM(nes_totaux)) × 100`.
- **Pertes lactation** = `(SUM(nes_vivants) - SUM(nb_sevres)) / SUM(nes_vivants) × 100`.

### Seuils de coloration (helpers `toneXxx`)
| KPI | vert | orange | rouge |
|---|---|---|---|
| ISSF | 5-7 j | 4 ou 8-10 | <4 ou >10 |
| Productivité | ≥22 | 18-22 | <18 |
| TMM | ≤8 % | 8-12 % | >12 % |
| Nés vivants/portée | ≥12 | 10-12 | <10 |

Anti-piège du brief respecté : ISSF < 4 j → **orange** (pas vert agressif).

## 3. Données actuelles (élevage démo)

### `SELECT * FROM v_kpi_techniques_ferme;`
```
ferme_id                             | truies_actives | truies_avec_mb | nes_totaux/portée | nes_vivants/portée | sevres/portée | issf_moyen | tmm_moyen_pct | productivite_moyenne | pertes_lact_moyenne_pct
00000000-0000-0000-0000-000000000001 |              3 |              2 |             12.00 |              11.50 |        (NULL) |     (NULL) |          3.85 |               (NULL) |                  (NULL)
```

### `SELECT … FROM v_kpi_techniques_truie ORDER BY tag;` (3 lignes)
```
 tag  | nb_mb | nb_sevrages | nb_cycles_issf | nes_vivants_moyen | sevres_moyen | issf_jours | tmm_pct | productivite_numerique
 T-001|    1  |      0      |        0       |       12.00       |   (NULL)     |   (NULL)   |   7.69  |       (NULL)
 T-002|    1  |      0      |        0       |       11.00       |   (NULL)     |   (NULL)   |   0.00  |       (NULL)
 T-003|    0  |      0      |        0       |      (NULL)       |   (NULL)     |   (NULL)   | (NULL)  |       (NULL)
```

**Interprétation** :
- 2 mises-bas seulement (T-001, T-002) — pas encore de sevrages → ISSF / Productivité / Pertes lactation **NULL** (`<EmptyState>` affiché côté front pour T-001/2 sur les blocs concernés, T-003 → "Pas assez de cycles").
- TMM calculable car uniquement basé sur les MB : T-001 = 1/13 = 7.69 % (vert), T-002 = 0 % (vert).
- Nés vivants moyens / portée ferme : **11.5** (orange, en dessous de la cible ≥12).

## 4. Smoke tests HTTP

```
GET /dashboard                                          → 200
GET /kpi                                                → 200
GET /cheptel/33333333-0000-0000-0000-000000000001       → 200 (T-001)
```

## 5. TypeScript
`npx tsc --noEmit` → **0 erreur** (vérifié après chaque édition).

## 6. Anti-pièges respectés
- ✅ Vues existantes `v_kpi_truie` et `v_kpi_bande` **non touchées** (création de NOUVELLES vues).
- ✅ Divisions castées en `::numeric` partout pour éviter integer division.
- ✅ `<EmptyState>` utilisé sur fiche truie + page /kpi quand aucune donnée.
- ✅ Tableau classement : truie sans cycles → cellule "Pas assez de cycles".
- ✅ Pas de touche à : sanitaire, nutrition, alertes, reproduction forms, sidebar.
- ✅ `npm run build` **non exécuté** (laissé à l'orchestrateur).

## 7. Notes pour les agents en aval
- La vue `v_kpi_techniques_ferme` ne contient pas encore de productivité numérique parce qu'il n'y a aucun sevrage en base. Dès que des sevrages seront seedés, les 4 cards dashboard s'animeront automatiquement.
- L'ISSF nécessite **au moins 1 sevrage suivi d'une saillie fécondante** par truie — donc un cycle complet.
- Les sparklines 6 mois mentionnées en option dans le brief n'ont **pas été implémentées** (peu de données disponibles, pas critique pour V2-E ; sera ajouté quand l'historique sera suffisant).
