# RAPPORT HARM-B — Mycotoxines : produits anti-mycotoxines + rappels

## ✅ Livrables

### 1. Migration SQL
**Fichier** : `supabase/migrations/20260522080000_anti_mycotoxines.sql`
**Statut** : appliquée (`BEGIN…COMMIT` propre, 0 erreur).

Objets créés :
- `produits_anti_mycotoxines` (référentiel, GRANT SELECT anon/auth) — 6 lignes seedées (insert idempotent via NOT EXISTS).
- `protocoles_anti_mycotoxines` (par ferme, FK fermes/produits/matieres, GRANT SELECT/INSERT/UPDATE) + index partiel `(ferme_id, actif) WHERE deleted_at IS NULL`.
- Vue `v_recommandations_anti_mycotoxines` (`security_invoker=true`, GRANT SELECT anon/auth) — classement `eleve / modere / faible / non_analyse` selon seuils d'action (Afla≥15, ZEA≥200, DON≥700, OTA≥40, FUM≥4000 pour "élevé"; ½ pour "modéré").

### 2. Seed 6 produits
```
Biotox        Cargill   combiné  2.0 kg/t  1 900 FCFA/kg
Detoxa Plus   Anpario   combiné  1.0 kg/t  1 650 FCFA/kg
Mycofix Plus  Biomin    combiné  2.5 kg/t  2 100 FCFA/kg
Mycoprotect   Vitalac   combiné  2.0 kg/t  1 850 FCFA/kg
Mycosorb A+   Alltech   liant    1.0 kg/t  2 200 FCFA/kg
Toxy-Nil Plus Nutriad   combiné  1.5 kg/t  1 700 FCFA/kg
```

### 3. Refonte page `/sanitaire/mycotoxines`
**Fichier** : `app/src/app/(app)/sanitaire/mycotoxines/page.tsx`

Sections existantes conservées : header + dialog enregistrement lot, encart pédagogique seuils UE, 3 KPI, table lots détaillée.

**3 nouvelles cards ajoutées** (avant la table des lots) :
1. **Catalogue produits anti-mycotoxines** (icône `Sparkles`, fond ambre) — table responsive : nom + description, fabricant, type (badge), spectre, dose kg/t, coût FCFA/kg. Source : `produits_anti_mycotoxines` (actif=true, order nom).
2. **Rappels saisonniers (Côte d'Ivoire)** (icône `CloudRain`, fond orange) — 5 puces : saison pluies, stockage <14 % H, incorporation systématique 1,5–2 kg/t, T° eau <28 °C, animaux sensibles (truies gestantes / porcelets sevrage).
3. **Lots à risque — recommandations** (filtre `eleve`+`modere` uniquement, tri prioritaire) — liste avec bordure latérale colorée par niveau, badge sémantique, et message d'action contextuel (Mycoprotect/Mycofix 2,5 kg/t si élevé, Toxy-Nil/Detoxa 1,5 kg/t si modéré). EmptyState `ShieldCheck` si aucun. Source : `v_recommandations_anti_mycotoxines`.

## ✅ Vérifications
- `SELECT COUNT(*) FROM produits_anti_mycotoxines` → **6** ✓
- `SELECT niveau_risque, COUNT(*) FROM v_recommandations_anti_mycotoxines GROUP BY niveau_risque` → eleve=1, modere=1, non_analyse=1 (3 lots existants) ✓
- `npx tsc --noEmit` sur tout le projet → **0 erreur** ✓
- `curl /sanitaire/mycotoxines` → 200 (ancien bundle standalone — build orchestrateur attendu)

## ⚠️ Notes
- Aucun fichier hors périmètre touché : pas de sidebar, pas d'alertes-regles, pas de `v_alertes_actives`.
- Imports Lucide ajoutés : `Sparkles, CloudRain, ShieldCheck` (déjà disponibles dans le pack).
- Pas de Server Action : les 3 cards sont purement lecture. La table `protocoles_anti_mycotoxines` est créée + GRANTée mais sans UI dédiée (réservé à un sprint futur — non demandé ici).
- Pas de `npm run build` (réservé à l'orchestrateur en fin de vague).

## 📂 Fichiers modifiés/créés
- ✏️ `supabase/migrations/20260522080000_anti_mycotoxines.sql` (créé)
- ✏️ `app/src/app/(app)/sanitaire/mycotoxines/page.tsx` (refonte + 3 cards)
