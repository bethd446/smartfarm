# Audit QA E2E + Code — Smart Farm — 2026-05-22

## TL;DR
Site en prod stable HTTP 200, auth fonctionnel, magic link fixé, mais **6 fonctionnalités cœur manquantes** qui rendent l'app inutilisable telle quelle pour un vrai éleveur :
1. Onboarding wizard (0 wizard, user atterrit dans le vide)
2. Bâtiments par défaut auto-créés
3. Référentiel ration par catégorie + auto-calcul conso
4. RPC `transferer_animal` + bouton "confirmer transfert"
5. Bouton déconnexion (BUG sécurité UX)
6. Pages vides (/alertes, /bandes, /mises-bas, /parametres, /performances → 404)

**Plus un effet secondaire critique** : un user sans ferme rattachée tombe en fallback "ferme démo" qui affiche les données de Christophe Liegeois Yamoussoukro. Pas une faille (RLS OK côté DB), juste un fallback applicatif qui doit disparaître quand F1+F2 seront livrés.

## Verdict
**PAS PRÊT pour collaborateurs réels**. Top fixes 1→5 ordonnés ci-dessous.

---

## 🔴 Bugs bloquants (à fixer en priorité)

| # | Bug | Effort | Quick win |
|---|---|---|---|
| B1 | Aucun bouton **Déconnexion** dans la sidebar/avatar | 1h | ✅ |
| B2 | `/performances` → 404 (lien sidebar cassé) | 30min | ✅ |
| B3 | Bouton "NOUVEAU BÂTIMENT" inerte sur `/batiments` | 2h | ✅ |
| B4 | Pages **vides** : `/alertes`, `/bandes`, `/mises-bas`, `/parametres` | 4h | ✅ |
| B5 | Fallback "ferme démo" quand user n'a pas de ferme → affiche Yamoussoukro+Christophe au lieu d'un état "Aucune ferme — commence par l'onboarding" | 1h | ✅ |
| B6 | Format date US (mm/dd/yyyy) sur tous les inputs date | 1h | ✅ |
| B7 | Assistant IA `/conseiller` HS (404 Gemini/clé manquante) | 1h | ✅ |

## 🟠 Features cœur manquantes (vision user)

### F1 — Onboarding wizard nouveau user [Effort: 1j]
- ❌ Aucune route `/onboarding`, aucun flag `utilisateurs.onboarded_at`
- ❌ Trigger `on_auth_user_created` crée la ligne `utilisateurs` mais **pas** de ferme ni de lien `utilisateur_fermes`
- **Fix** :
  1. Migration : colonne `utilisateurs.onboarded_at timestamptz`
  2. RPC `bootstrap_ferme(p_nom, p_effectifs jsonb, p_races text[])` qui crée `fermes`, `utilisateur_fermes`, appelle seeds existants
  3. Page `/onboarding/page.tsx` wizard 3 étapes (nom ferme + localité + effectifs/races/bâtiments)
  4. `(app)/layout.tsx` : redirect `if (session && !onboarded_at)` → `/onboarding`

### F2 — Bâtiments par défaut auto-créés [Effort: 2h, quick win]
- ❌ `seed.sql` crée 5 bâtiments **uniquement** pour ferme démo `00000000-...-0001`
- ❌ Aucune fonction `seed_batiments_standards(p_ferme uuid)` (pattern déjà existant pour matières premières + protocoles)
- **Fix** : Migration `seed_batiments_standards(p_ferme uuid)` + trigger `AFTER INSERT ON fermes` qui appelle aussi `seed_matieres_premieres_standards()`, `seed_concentres_industriels_standards()`, `seed_protocoles_standards()`.

### F3 — Ration calculée intelligemment [Effort: 1j]
- 🟠 `plans_alimentation.ration_kg_jour` saisie manuelle uniquement
- 🟠 `nutrition-engine.ts` couvre formulation (composition %) mais PAS quantité kg/animal/jour
- ❌ Pas de référentiel `ration_standards_par_categorie`
- ❌ Pas de vue `v_consommation_prevue` agrégeant `sum(ration × effectif)`
- **Fix** :
  1. Table `ref_rations_standards(categorie text, poids_min, poids_max, ration_kg_jour)` seedée NRC/IFIP (truie gestante 2.5, allaitante 6.5, porcelet 7-25kg progressif)
  2. Vue `v_consommation_prevue_ferme` = animaux × ref_rations
  3. UI : `DialogPlan._dialog-plan.tsx` pré-remplit `ration_kg_jour` selon catégorie sélectionnée

### F4 — Alertes stock auto [Effort: 0] ✅ DÉJÀ OK
- ✅ R10 stock critique (`stock_actuel < seuil_alerte`)
- ✅ R11 rupture prévue 3j (`stock_actuel / conso.moy_jour < 3`)
- ✅ R11 utilise table réelle `consommations_aliment` 30j (deviendra plus pertinent post F3)

### F5 — Transferts auto post-mise-bas + suivi évolution [Effort: 1j]
- ✅ Événements planifiés OK (trigger saillie crée `transfert_maternite J+107`, `sevrage_prevu`, etc.)
- ❌ Aucune table `mouvements_animaux`
- ❌ Aucune RPC `transferer_animal(animal_id, case_destination)`
- ❌ Bouton "Confirmer transfert" inexistant dans UI alertes
- ❌ Porcelets nés non créés automatiquement dans `animaux` (uniquement `mises_bas.nb_nes_vivants`)
- ❌ Pas d'événement `depart_engraissement` auto J+70 post-sevrage
- **Fix** :
  1. Table `mouvements_animaux(animal_id, case_src, case_dst, date, motif)`
  2. RPC `transferer_animal()` : UPDATE animaux.case_id + INSERT mouvement + marque évt source `realise`
  3. UI : bouton "Confirmer transfert" sur événements de type transfert
  4. Trigger sevrage → insert événement `depart_engraissement` J+70
  5. Trigger mise-bas → crée porcelets dans `animaux` automatiquement

---

## 🎯 Plan correctif priorisé (ordre d'attaque)

### Phase 1 — Quick wins (3h cumulé) ⚡
- B1 Bouton déconnexion (1h)
- B2 Route `/performances` (30min)
- B5 Fallback "ferme démo" → "Aucune ferme, faites l'onboarding" (1h)
- B6 Format date fr-FR (1h)

### Phase 2 — Foundation (1.5j)
- F2 Bâtiments par défaut + trigger (2h) ⚡
- F1 Onboarding wizard + bootstrap_ferme (1j)

### Phase 3 — Workflow métier (1.5j)
- B3 Bouton "Nouveau bâtiment" + modal (2h)
- B4 Pages vides /alertes /bandes /mises-bas /parametres (4h)
- F5 Transferts auto + RPC + UI (1j)

### Phase 4 — Intelligence (1j)
- F3 Référentiel ration + auto-calcul (1j)

### Phase 5 — Polish
- B7 Assistant IA (1h)
- Audit visuel responsive mobile (375px)
- Localisation textes en-caps/sentence-case cohérente

**Effort total senior dev : ≈ 3.5 jours**

---

## 📎 Notes méthodo
- Audit QA E2E par sous-agent en black-box (47 actions browser, 25 pages testées)
- Audit code par sous-agent statique (23 reads/greps ciblés migrations + src/)
- Compte test : `samotjeanmarc@gmail.com` / `Teste2023` / `SF-061072`
- État prod confirmé : HTTP 200 partout, auth-gate 307 OK, magic link fixé (cf commit `cefefca`)
