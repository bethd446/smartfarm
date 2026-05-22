# Brief V2-A — Fix P0 bugs métier (R01 + stocks démo + vérif fiche animal)

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : Fixer 3 bugs P0 détectés à l'audit V2

---

## PÉRIMÈTRE EXCLUSIF

Tu travailles UNIQUEMENT sur :
1. `supabase/migrations/` — créer une nouvelle migration `2026XXXXXXXXXX_fix_v2s1_p0_bugs.sql`
2. Tu ne touches PAS au code frontend (`app/src/**`)
3. Tu ne touches PAS aux autres vues SQL en dehors de `v_alertes_actives`

---

## CONTEXTE PROJET

- App : `/root/projects/smartfarm/app` (Next.js 16 standalone, déjà déployé en prod sur :3000)
- DB : Supabase local Docker, port `54322`, user `postgres`, pass `postgres`, base `postgres`
- Connexion : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`
- Migrations : `/root/projects/smartfarm/supabase/migrations/` (38 existantes)
- Une migration = un fichier `YYYYMMDDHHMMSS_description.sql`. Pour appliquer : `psql ... -f migration.sql`

---

## BUG #1 — R01 faux positif sur truie en lactation

### Symptôme
La vue `v_alertes_actives` retourne :
```
R01-truie-vide-prolongee | Truie T-001 vide depuis 8 jours
```
Or, T-001 a eu une **mise-bas le 2026-05-13** (donc en lactation avec ses porcelets, pas "vide").
Aujourd'hui = 2026-05-21 → mise-bas il y a 8 jours = TRUIE EN LACTATION, pas vide.

### Vérification SQL
```sql
SELECT a.tag, a.statut, MAX(m.date_mise_bas) AS derniere_mb
FROM animaux a LEFT JOIN mises_bas m ON m.truie_id=a.id
WHERE a.tag='T-001' GROUP BY a.id, a.tag, a.statut;
-- T-001 | actif | 2026-05-13
```

### Cause racine
La condition WHERE de la branche R01 dans la vue `v_alertes_actives` détecte la truie comme "vide" parce que `dernier_sevrage IS NULL` et `derniere_mb > 45 jours` est faux, MAIS la condition `derniere_saillie IS NULL OR > 45 jours` matche. Bug logique : une truie qui vient de mettre bas (derniere_mb < 28 jours = durée lactation standard) NE DOIT PAS être considérée comme vide.

### Fix attendu
Recréer la vue `v_alertes_actives` (CREATE OR REPLACE VIEW … SECURITY INVOKER=true) avec la règle R01 corrigée :

**Nouvelle règle R01** : Truie considérée "vide-prolongée" SI :
- ET (`dernière_saillie IS NULL OR (today - dernière_saillie) > 45j`)
- ET (`dernière_mise_bas IS NULL OR (today - dernière_mise_bas) > 35j` — sortie de lactation = sevrage standard ~28j + marge 7j)
- ET (`dernier_sevrage IS NULL OR (today - dernier_sevrage) > 14j` — au-delà de l'IPO normal 5-7j)
- ET sur les premiers 240j après entrée si jamais saillie/MB/sevrage

Pour récupérer la définition complète actuelle de la vue (les autres règles R02 à R10 ne doivent pas être modifiées) :
```bash
PGPASSWORD=postgres pg_dump -h 127.0.0.1 -p 54322 -U postgres -d postgres --schema-only --table=v_alertes_actives 2>/dev/null || \
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c "SELECT pg_get_viewdef('v_alertes_actives'::regclass, true);" -At
```

⚠️ Important : conserver `security_invoker=true` et le `GRANT SELECT … TO anon` (V1 demo sans auth).

---

## BUG #2 — 31 stocks de matières premières à 0 kg (noise)

### Symptôme
```sql
SELECT COUNT(*) FROM matieres_premieres WHERE stock_actuel = 0 AND deleted_at IS NULL;
-- 31 / 36
```
→ Génère 31 alertes R10-stock-critique inutiles pour la démo (noise).

### Fix attendu
UPDATE des 31 matières à stock 0 pour leur attribuer un **stock cohérent avec leur `seuil_alerte`** :
- Stock confortable : `stock_actuel = seuil_alerte * 3` (ex: seuil 50 → stock 150)
- **GARDER 3 matières en stock critique pour la démo** : sélectionner Maïs, Tourteau de soja, et un complément (premix) → `stock_actuel = seuil_alerte * 0.4` (≈ 40% du seuil)

Ainsi on passe de 31 alertes R10 → 3 alertes R10 (réalistes pour démo).

### SQL conseillé
```sql
-- 1. Tout remettre confortable
UPDATE matieres_premieres
SET stock_actuel = COALESCE(seuil_alerte, 100) * 3
WHERE stock_actuel = 0 AND deleted_at IS NULL;

-- 2. Repasser 3 matières en critique (démo réaliste)
UPDATE matieres_premieres
SET stock_actuel = ROUND(COALESCE(seuil_alerte, 100) * 0.4, 0)
WHERE deleted_at IS NULL
  AND nom IN ('Maïs grain jaune', 'Tourteau de soja 48%', 'Prémix porc croissance');
```
(Vérifie d'abord les noms exacts avec `SELECT nom FROM matieres_premieres WHERE deleted_at IS NULL ORDER BY nom;` — adapte si besoin.)

---

## BUG #3 — Vérifier fiche animal `/cheptel/[id]`

### Symptôme audit
L'audit métier a reporté un 404 sur `/cheptel/[id]`. **Probablement faux positif** dû au bundle JS manquant (audit lancé sur état dégradé du serveur). Tu dois **vérifier** que la route SSR fonctionne maintenant.

### Vérif HTTP
Récupère l'UUID de T-001 :
```bash
TRUIE_ID=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c "SELECT id FROM animaux WHERE tag='T-001';")
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:3000/cheptel/$TRUIE_ID"
```
Attendu : **200**.

Si **404** : signale-le (sans fixer — c'est un autre chantier).
Si **200** : noter dans le rapport "route fiche animal OK, audit faux positif".

Tu ne fais **AUCUNE modification frontend** sur cette route.

---

## LIVRABLES ATTENDUS

1. Fichier `/root/projects/smartfarm/supabase/migrations/2026XXXXXXXXXX_fix_v2s1_p0_bugs.sql` créé et appliqué
2. Migration appliquée avec succès (`psql ... -f`)
3. Vérification post-fix :
   ```sql
   SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id;
   ```
   Attendu : `R01-truie-vide-prolongee | 0` (ou 1-2 si vraie truie vide) et `R10-stock-critique | 3`.
4. Rapport markdown `/root/projects/smartfarm/agents/V2-S1/RAPPORT_V2A.md` avec :
   - Diff de la règle R01 (avant/après condition WHERE)
   - Liste des matières premières actualisées
   - Code HTTP fiche animal `/cheptel/T-001`
   - Total alertes avant/après

## ANTI-PIÈGES
- N'invente pas de noms de matières premières — utilise ceux qui existent réellement
- Si la vue contient un `GRANT … TO anon`, conserve-le
- N'oublie pas `WITH (security_invoker=true)` sur la vue (sécurité multi-tenant)
- Si la migration échoue, lis l'erreur et corrige avant de réessayer (3 tentatives max)
