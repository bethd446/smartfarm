# Smart Farm — Brief Claude Code V2

> **Document de référence post-audit terrain.**
> Version 2 — basée sur l’audit exhaustif du 2026-05-27 (10 sous-agents Opus 4.7 + 49 captures réelles).
> Remplace et étend le brief V1 (`smartfarm-brief.md`).
> Stack confirmée : Next.js 16 + Supabase (PG `tpzhxjzwlxwujboboyit`) + Hostinger (Passenger Node monolithe) + Tailwind v4.

-----

## 0. Contexte et état des lieux

### Ce qui existe déjà (à PRÉSERVER)

L’audit a révélé que Smart Farm est **bien plus avancé** que ce que la landing laissait croire. Voici ce qui est déjà solide et qu’il faut absolument ne pas casser :

- **Identité visuelle “Cachet B Minimal”** : palette sahel-700 / or-600 / latérite-700 / mil-50 + fonts Big Shoulders Display + Instrument Sans. Cohérence parfaite sur 9/9 écrans audités. Cette identité est défendable et différenciante.
- **Vocabulaire zootechnique FR pro irréprochable** : Saillie, Mise bas, Sevrage, Cochette, Truie {gestante|allaitante|vide}, Verrat, Échographie. Zéro anglicisme parasite.
- **Expertise tropicale CI documentée** : PPA OIE/WOAH, mycotoxines (AFLA/ZEA/DON/OTA/FUM), saison pluies, races CI (LW/Landrace/Piétrain/Duroc/Korhogo), prix matières en FCFA.
- **RLS multi-tenant robuste** : `current_farm_id()` + table `user_farms` + cron daily `tests/rls-cross-farm.sh` qui teste 7 tables et exit 2 si leak. Production-grade.
- **Stade reproductif métier exposé** : `GESTANTE J60` / `ALLAITANTE J18` / `VIDE` / `PRÉ-SAILLIE` visibles sur cheptel et fiche animal. Aucun concurrent ne fait ça.
- **Référentiel matières premières CI** : 22 entrées sourcées NRC/INRA/IFIP avec prix XOF/kg et notes contextuelles (“risque mycotoxines”, “importé via Abidjan”). Fonction `seed_matieres_premieres_standards(p_ferme)` idempotente.
- **Hubs Sanitaire et Alimentation** : 6 sous-modules sanitaires (PPA, Biosécurité, Mycotoxines, Maladies, Protocoles, Calendrier), badges contextuels (OBLIGATOIRE PPA, SAISON PLUIES mycotoxines), seuils UE chiffrés.
- **Compte test démo opérationnel** : `demo@smartfarm.group / Demo6734N0xUHH1I`, ferme isolée, 59 animaux, 22 truies prénommées, 3 cochettes, 3 verrats, 4 portées historiques.
- **PWA installable** : manifest valide, icons 192/512 maskable, theme `#2D4A1F`, scope `/`, shortcuts Dashboard/Cheptel/Alertes.

### Les 4 mensonges marketing à corriger en URGENCE

Ces 4 claims érodent la confiance dès la première session et doivent disparaître avant tout nouveau développement :

1. **“Conforme ISO 22005”** sur la landing → ❌ aucun audit cité, aucune preuve. ISO 22005 exige un audit organisme tiers (Bureau Veritas / SGS). **Risque publicité mensongère + image.**
1. **“Offline-first”** dans la metadata → ❌ PWA installable OK mais zéro queue offline, zéro indicateur online/offline, mutations silencieusement perdues en 503. La promesse marketing est cassée.
1. **“300 conseils pour gérer ton élevage”** sur `/conseiller` → ❌ table `tips_conseiller` vide en production démo. Empty state “le catalogue sera bientôt rempli”. Mensonge UX caractérisé.
1. **“1 EN ALERTE”** dashboard stock → ❌ liste 5 items sans distinction de celui qui est réellement en alerte (Tourteau coton 50 < 80). L’utilisateur ne peut pas agir.

**Action immédiate (Phase A, < 1h cumulé) :** retirer ou requalifier ces 4 claims avant tout sprint feature. Voir Phase A ci-dessous.

-----

## 1. Authentification par téléphone (objectif initial, à reprendre)

> Cette section remplace le brief V1 sections 4-5.

### 1.1. État actuel constaté par l’audit

- Inscription : 4 champs (nom, email, mot de passe, confirm) — **aucun champ téléphone**
- Connexion : champ unique “Email OU SF-XXXXXX” + mot de passe + lien magique par email + mode démo
- Twilio : compte créé et fonctionnel (vérifié par owner), Phone Auth Supabase configuré mais **non encore exposé côté UI**

### 1.2. Décision finale

**Coexistence de 2 méthodes** dans l’UI, avec priorité visuelle au téléphone :

```
┌─ Page /connexion (refonte) ────────────────────┐
│                                                │
│  [📱 Téléphone]  [✉ Email]    ← onglets       │
│  ────────────                                  │
│                                                │
│  🇨🇮 +225  [0707070707]                         │
│  [ Envoyer le code par SMS → ]                 │
│                                                │
│  ─── ou ───                                    │
│                                                │
│  [👁 Tester la démo (sans compte)]             │
│                                                │
└────────────────────────────────────────────────┘
```

L’onglet Email reste accessible pour les comptes historiques. Le numéro client SF-XXXXXX **disparaît** de l’écran de connexion (il reste dans le profil interne, généré automatiquement).

### 1.3. Régions ivoiriennes — liste corrigée

L’audit a confirmé que les 14 districts officiels sont :

```
Abidjan · Yamoussoukro · Bouaké · Korhogo · San-Pedro ·
Daloa · Man · Gagnoa · Soubré · Divo · Aboisso · Dimbokro ·
Bondoukou · Odienné
```

(Liste plus complète et plus juste que celle du brief V1.)

### 1.4. Code (voir brief V1 section 5.3)

Le code React du brief V1 reste valide. Adaptations à faire selon ce qu’on découvrira dans la codebase Next.js 16 réelle :

- Localiser `app/(auth)/connexion/page.tsx` et `app/(auth)/inscription/page.tsx`
- Ajouter les onglets `[Téléphone][Email]` en haut
- Réutiliser le système de design existant (sahel-700 boutons, Big Shoulders titles)
- Brancher sur Server Actions existantes (audit a vu `_actions.ts:137` pour password validation)

-----

## 2. Plan d’action consolidé (Phases A→D)

### 🔥 Phase A — Quick wins critiques (1 semaine, ~12h)

Ces 10 items corrigent les mensonges UX et les bugs visibles. **À faire avant tout sprint feature.**

|#  |Item                                                                                                          |Module           |Effort|Détail                                                                                       |
|---|--------------------------------------------------------------------------------------------------------------|-----------------|------|---------------------------------------------------------------------------------------------|
|A1 |**Retirer “Conforme ISO 22005”** de la landing                                                                |Landing          |15min |Remplacer par “Standards IFIP & NRC” ou retirer le badge. Risque légal sinon.                |
|A2 |**Retirer “300 conseils” sous-titre /conseiller**                                                             |Conseiller       |5min  |Remplacer par “Conseils techniques pour ton élevage” jusqu’à ce que C6 livré.                |
|A3 |**Retirer claim “offline-first”** metadata + landing                                                          |Global           |15min |Remplacer par “fonctionne en 4G” jusqu’à ce que D1 livré.                                    |
|A4 |**Fix FAB mobile Stock** (`_fab.tsx:41-42` passe `matieres=[]` `fournisseurs=[]`)                             |Stock            |1h    |Convertir page en wrapper qui charge `matieres` + `fournisseurs` et passe au FAB en props.   |
|A5 |**Centraliser `isAlerte()` stock** dans `lib/stock-helpers.ts`                                                |Stock + Dashboard|30min |Fixe le mensonge “1 EN ALERTE” du dashboard. Un seul lieu de vérité.                         |
|A6 |**Renommer “PROCHAINS ÉVÉNEMENTS”** → “ÉVÉNEMENTS EN RETARD”                                                  |Dashboard        |15min |Le contenu est 100% du passé. Sémantique inversée.                                           |
|A7 |**Normaliser casse unités stock** (`50 KG` → `50 kg`)                                                         |Stock            |30min |Virer `text-transform: uppercase` sur badge danger OU normaliser à l’insert.                 |
|A8 |**“TESTER LA DÉMO” en hero landing** + retirer 3 liens header morts (`#features`, `#metiers`, `#tarifs`)      |Landing          |1h    |Si pas le temps de créer les sections, retirer les liens.                                    |
|A9 |**Replier 4 cartes “Données insuffisantes”** dashboard en 1 bandeau                                           |Dashboard        |1.5h  |Bandeau : *“4 KPI techniques en attente — saisis 4 portées de plus pour les activer”* + lien.|
|A10|**Tab COCHETTES (3)** séparé du tab TRUIES (22)                                                               |Cheptel          |2h    |Aujourd’hui tab TRUIES (25) mélange 22 truies + 3 cochettes. Catégorie ≠ statut.             |
|A11|**Validation inline** formulaire inscription (email valide + password ≥8)                                     |Inscription      |1h    |0 feedback temps réel actuellement.                                                          |
|A12|**Page `/mentions-legales` + `/politique-confidentialite` + `/cgu`** stubs FR conformes RGPD + loi CI 2013-450|Sécu             |3h    |Contenu minimal légal, à enrichir plus tard avec avocat.                                     |

**Total Phase A : ~12h**

-----

### 🛠 Phase B — Refactor friction de saisie (2-3 semaines, ~40h)

Principe directeur appliqué dans cette phase : **toute donnée listable DOIT être une liste**. Saisie libre réservée aux poids, dates, observations textuelles.

|#  |Item                                                                             |Effort|Détail                                                                       |
|---|---------------------------------------------------------------------------------|------|-----------------------------------------------------------------------------|
|B1 |**Référentiel véto CI** : `seed_veterinaires_standards(p_ferme)` 20+ refs        |5h    |Voir section 3.2 — liste complète prête.                                     |
|B2 |**Enum unités SQL** strictes + migration + UI selects                            |4h    |Voir section 3.5 — enum complet.                                             |
|B3 |**Entité `actes_sanitaires`** : schéma + dialog “Enregistrer traitement”         |8h    |Voir section 4.1 — schéma SQL complet.                                       |
|B4 |**Carnet sanitaire MIRAH exportable** PDF + CSV depuis `actes_sanitaires`        |4h    |Format réglementaire (animal/produit/dose/voie/date/opérateur/délai attente).|
|B5 |**Traçabilité antibiotiques** : registre dédié + upload ordonnance véto          |6h    |Obligation MIRAH. Champ `ordonnance_url` → Supabase Storage.                 |
|B6 |**Bulk action porcelets** liste avec sélection multi + dialog batch              |4h    |Transitions stade D2/Croissance/Finition, pesée groupée.                     |
|B7 |**Lookup truies pré-rempli dialog DIAGNOSTIC**                                   |2h    |Pré-sélection saillie contextuelle depuis fiche animal.                      |
|B8 |**Composant `<EmptyOnboarding>`** unique appliqué 8 écrans                       |3h    |Illustration + 2 lignes + CTA “Commencer en 30s”.                            |
|B9 |**Garde-fous saisie métier** : sevrage ≥ MB, nés vivants ≥ sevrés, total nés ≤ 20|2h    |Validation Zod côté serveur.                                                 |
|B10|**Module Mortalités** avec motifs codifiés (liste section 3.3)                   |4h    |Aujourd’hui inexistant.                                                      |

**Total Phase B : ~42h**

-----

### 🌱 Phase C — Enrichissement métier (1 mois, ~80h)

|#  |Item                                                                           |Effort|Détail                                                   |
|---|-------------------------------------------------------------------------------|------|---------------------------------------------------------|
|C1 |**Module Conduite en bande** (planning 21j synchronisé)                        |24h   |Voir section 5 — cœur IFIP moderne.                      |
|C2 |**Rang de portée + parité** sur fiche truie + calculs IFIP par parité          |8h    |Champ `parite` int sur saillies/MB.                      |
|C3 |**ISSF + Taux MB + TMM par parité** inline cible IFIP                          |6h    |Badge sparkline + comparaison cible.                     |
|C4 |**GMQ + IC par stade** avec graphs recharts                                    |8h    |Porcelet 450g / Croissance 750g / Finition 850g.         |
|C5 |**Conseil contextuel** : `tips_conseiller.trigger_phase[]` + service contextuel|10h   |Voir section 6 — architecture complète.                  |
|C6 |**40 fiches MVP catalogue conseiller** co-écriture ANADER                      |16h   |Voir section 6.2 — répartition par catégorie.            |
|C7 |**Calendrier prévisionnel auto** depuis saillies + MB + cycles                 |6h    |Export iCal.                                             |
|C8 |**Tips économiques CI** : table `prix_matieres_ci` MAJ mensuelle               |4h    |Sources OCPV CI, marchés Adjamé/Bouaké/Korhogo.          |
|C9 |**Adoption / croisement portées** UI maternité                                 |4h    |Pratique quotidienne maternité actuellement absente.     |
|C10|**Photos / avatars animaux** liste cheptel (mobile + desktop)                  |6h    |Upload Supabase Storage, reconnaissance visuelle terrain.|

**Total Phase C : ~92h**

-----

### ✨ Phase D — Polish & standards 2026 (continu, ~50h)

|#  |Item                                                                                                    |Effort|Détail                                                                     |
|---|--------------------------------------------------------------------------------------------------------|------|---------------------------------------------------------------------------|
|D1 |**PWA offline-first RÉEL** : Workbox Background Sync + IndexedDB queue + hook `useOnlineStatus` + banner|12h   |Voir section 7 — architecture complète.                                    |
|D2 |**Page `/offline` dédiée** statique + fallback intelligent                                              |2h    |Aujourd’hui fallback `/dashboard` → boucle auth.                           |
|D3 |**CSP nonces** : migration `next-nonce`, retrait `unsafe-inline/eval`                                   |6h    |Next 16 supporte nativement.                                               |
|D4 |**WhatsApp push notifications** intégration Twilio (10 notifs)                                          |8h    |Voir section 6.4 — liste des 10 notifs utiles.                             |
|D5 |**Bundle splitting** : lazy-load assistant, recharts, shadcn dynamic                                    |4h    |Top chunk 370KB + 4 chunks >290KB.                                         |
|D6 |**ISR 60s** sur dashboard/KPI/cheptel + revalidateTag mutations                                         |3h    |Aujourd’hui `force-dynamic` quasi partout = round-trip Supabase chaque nav.|
|D7 |**Mobile cheptel cards compactes** 80-100px (vs 280px actuels)                                          |4h    |Voir section 8 — mockup détaillé.                                          |
|D8 |**Bottom-nav FAB résolution** (Z-index + intégrer `+` central)                                          |3h    |Pattern Instagram/Twitter.                                                 |
|D9 |**Sparkline cards** bâtiments + KPI dashboard                                                           |3h    |Visualisation tendance 30j.                                                |
|D10|**CSV `seed_veterinaires`** + reset bouton (comme matières)                                             |2h    |Idempotent, préserve saisies user.                                         |
|D11|**Politique mot de passe renforcée** (complexité + breach check)                                        |2h    |Aujourd’hui length ≥ 8 seul.                                               |
|D12|**RGPD UX complet** : `/parametres/compte` export ZIP + supprimer compte                                |3h    |Art. 17 + 20 RGPD UE + loi CI 2013-450.                                    |

**Total Phase D : ~52h**

-----

**EFFORT TOTAL CONSOLIDÉ : ~198h** (~5-6 semaines senior fullstack focus zéro distraction)

-----

## 3. Référentiels métier à intégrer

### 3.1. Matières premières CI — 12 ajouts critiques

22 déjà seedées. Ajouter ces 12 spécifiques au contexte ivoirien :

```sql
-- À ajouter dans seed_matieres_premieres_standards(p_ferme)
1.  Coque de cacao broyée       (sous-produit CEMOI/Barry-Callebaut Abidjan)
2.  Bagasse mélasse sucre       (SUCAF / SUCRIVOIRE)
3.  Mélasse de canne            (énergie liquide locale)
4.  Drêche maïs distillerie     (locale)
5.  Pulpe d'agrumes séchée
6.  Feuilles manioc séchées     (protéine locale 20% MAT)
7.  Sang séché                  (atelier abattoir Bouaké)
8.  Coquille œuf broyée         (source Ca alternative)
9.  Cendre os calcinée          (P alternative)
10. Bicarbonate sodium          (tampon ration chaleur tropicale)
11. Acide propionique           (conservateur grain humide)
12. Probiotique porcelet        (Bacillus subtilis)
```

### 3.2. Produits vétérinaires CI — 20 refs (actuellement 0)

```sql
-- Nouvelle fonction RPC : seed_veterinaires_standards(p_ferme)

-- Vitamines/Toniques (5)
'Bimestimul (B12+B1)',          type='tonique',     voie='IM'
'Certivit AD3E inj',            type='vitamine',    voie='IM'
'Sorbitonic',                   type='tonique',     voie='PO'
'Catosal B12',                  type='tonique',     voie='IM'
'Multivit AD3EK oral',          type='vitamine',    voie='PO'

-- Minéraux (2)
'Ucaphoscal (Ca-P inj)',        type='mineral',     voie='IM',  max_jours=5  -- CRITIQUE toxicité cuivre
'Calcium-Phosphore drench',     type='mineral',     voie='PO'

-- Antibiotiques (6) — délai attente viande
'Neobion (néomycine)',          type='antibiotique', delai_attente_j=14
'Oxytetracycline LA',           type='antibiotique', delai_attente_j=21
'Pénicilline G procaïne',       type='antibiotique', delai_attente_j=14
'Tylosine',                     type='antibiotique', delai_attente_j=14
'Enrofloxacine 10%',            type='antibiotique', delai_attente_j=10
'Sulfamides',                   type='antibiotique', delai_attente_j=15

-- Antiparasitaires (4)
'Ivermectine 1% inj',           type='antiparasitaire', voie='SC',  delai_attente_j=28
'Doramectine',                  type='antiparasitaire', voie='SC',  delai_attente_j=42
'Albendazole oral',             type='antiparasitaire', voie='PO',  delai_attente_j=14
'Imidocarbe',                   type='antiparasitaire', voie='IM',  delai_attente_j=90

-- Vaccins (4) — pas de délai attente
'Vaccin PPC (Peste Porcine Classique)', type='vaccin', voie='IM', obligatoire_ci=true
'Vaccin Pasteurellose',         type='vaccin',      voie='IM'
'Vaccin Mycoplasme',            type='vaccin',      voie='IM'
'Vaccin Parvovirose truie',     type='vaccin',      voie='IM'

-- Désinfectants (3) — non concernés délai attente
'Iode 10% (parage cordon)',     type='desinfectant'
'Chlorhexidine',                type='desinfectant'
'Virucide bâtiments',           type='desinfectant'
```

**Règles métier critiques à encoder** :

- `Ucaphoscal` : `max_jours = 5` (toxicité cuivre, à bloquer dans l’UI au-delà)
- `Bimestimul` + `Sorbitonic` : alerter sur dose combinée (sorbitol partagé)
- `Bimestimul` + autres sélénium : interdire combinaison

### 3.3. Motifs de mortalité (actuellement non géré)

Liste à intégrer dans une table `mortalites_motifs` + dropdown dans dialog “Déclarer mortalité” :

```
asphyxie · écrasement · hypothermie · diarrhée · malformation ·
PPA suspect · pneumonie · septicémie · cannibalisme · prédateur ·
indéterminé · autre  (← champ libre uniquement si "autre")
```

### 3.4. Races porcines CI (à seeder en liste)

```
Large White (LW) · Landrace · Piétrain · Duroc · Hampshire ·
Korhogo (race locale) · Croisé local · Yorkshire
```

### 3.5. Unités de mesure (enum SQL strict)

```sql
CREATE TYPE unite_mesure AS ENUM (
  'kg', 'g', 'tonne',
  'L', 'mL',
  'dose', 'flacon', 'seringue_pre_remplie', 'comprime', 'sachet',
  'sac_25kg', 'sac_50kg',
  'bidon_5L', 'bidon_20L',
  'unite'
);
```

Migration : altérer `stock.unite`, `consommations_aliment.unite`, `actes_sanitaires.unite_dose`.

### 3.6. Régions CI (14 districts officiels)

```
Abidjan · Yamoussoukro · Bouaké · Korhogo · San-Pedro · Daloa · Man ·
Gagnoa · Soubré · Divo · Aboisso · Dimbokro · Bondoukou · Odienné
```

-----

## 4. Module Santé — Schéma `actes_sanitaires`

### 4.1. Schéma SQL complet (Phase B item B3)

```sql
-- Table principale
CREATE TABLE actes_sanitaires (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),

  -- Cible (animal OU bande, exclusif)
  animal_id uuid REFERENCES animaux(id),
  bande_id uuid REFERENCES bandes(id),
  CONSTRAINT cible_exclusive CHECK (
    (animal_id IS NOT NULL AND bande_id IS NULL) OR
    (animal_id IS NULL AND bande_id IS NOT NULL)
  ),

  -- Produit (FK vers référentiel véto)
  produit_id uuid NOT NULL REFERENCES veterinaires_standards(id),

  -- Posologie
  dose numeric(10,3) NOT NULL,
  unite_dose unite_mesure NOT NULL,
  voie voie_administration NOT NULL, -- enum: IM/SC/IV/PO/topique
  duree_jours int DEFAULT 1,

  -- Contexte
  motif text, -- libre, optionnel
  ordonnance_url text, -- Supabase Storage path
  operateur_user_id uuid REFERENCES auth.users(id),

  -- Temporalité
  date_administration timestamptz NOT NULL DEFAULT now(),
  delai_attente_viande_jours int, -- copié depuis produit, mais surchargeable
  date_fin_delai_attente date GENERATED ALWAYS AS (
    (date_administration::date + (delai_attente_viande_jours || ' days')::interval)::date
  ) STORED,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE actes_sanitaires ENABLE ROW LEVEL SECURITY;
CREATE POLICY actes_sanitaires_ferme ON actes_sanitaires
  USING (ferme_id IN (SELECT ferme_id FROM user_farms WHERE user_id = auth.uid()));

-- Index
CREATE INDEX idx_actes_ferme_date ON actes_sanitaires(ferme_id, date_administration DESC);
CREATE INDEX idx_actes_animal ON actes_sanitaires(animal_id) WHERE animal_id IS NOT NULL;
CREATE INDEX idx_actes_bande ON actes_sanitaires(bande_id) WHERE bande_id IS NOT NULL;
CREATE INDEX idx_actes_delai ON actes_sanitaires(date_fin_delai_attente);

-- Trigger : copier delai_attente depuis produit à l'insert
CREATE OR REPLACE FUNCTION copy_delai_attente() RETURNS trigger AS $$
BEGIN
  IF NEW.delai_attente_viande_jours IS NULL THEN
    SELECT delai_attente_j INTO NEW.delai_attente_viande_jours
    FROM veterinaires_standards WHERE id = NEW.produit_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_delai_attente
  BEFORE INSERT ON actes_sanitaires
  FOR EACH ROW EXECUTE FUNCTION copy_delai_attente();
```

### 4.2. UI Dialog “Enregistrer un traitement”

```
┌─ ENREGISTRER UN TRAITEMENT ──────────────────────┐
│                                                  │
│  Cible *                                         │
│  ( ) Un animal     ( ) Une bande/portée          │
│  [▼ T01 - Adèle (Truie, ALLAITANTE J18)    ]    │
│                                                  │
│  Produit *  [▼ Bimestimul (B12+B1) - IM       ]  │
│  ⓘ Tonique vitamines · Voie IM                   │
│                                                  │
│  Dose *   [_____]  [▼ mL]   Voie * [▼ IM]        │
│                                                  │
│  Durée    [_1_] jours                            │
│                                                  │
│  Motif (optionnel)                               │
│  [________________________________________]      │
│                                                  │
│  Ordonnance véto (si ATB)                        │
│  [📎 Joindre photo ou PDF]                       │
│                                                  │
│  ⚠ Délai d'attente viande : 14 jours              │
│     (calculé automatiquement)                    │
│                                                  │
│         [ Annuler ]  [ ENREGISTRER → ]           │
└──────────────────────────────────────────────────┘
```

### 4.3. Garde-fous métier à encoder

- **Ucaphoscal** : si `produit = 'Ucaphoscal' AND duree_jours > 5` → block + message *“Maximum 5 jours — risque de toxicité cuivre”*
- **Combinaison sélénium** : si dernière injection sélénium < 7j → warn
- **Diarrhée active + Ucaphoscal** : warn (contre-indication)
- **ATB sans ordonnance** : warn (mais pas block) + lien upload

-----

## 5. Module Conduite en bande (Phase C — différenciateur IFIP)

### 5.1. Concept

La conduite en bande est **le cœur de la productivité moderne** en élevage porcin. Au lieu de gérer les truies individuellement, on synchronise les cycles : toutes les truies d’une bande sont saillies en même temps, mettent bas en même temps, sèvrent en même temps.

Avantages :

- Lots homogènes en post-sevrage et engraissement
- Vide sanitaire planifié
- Achats aliment groupés
- Vente lots calibrés

### 5.2. Schéma

```sql
CREATE TABLE bandes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  code text NOT NULL, -- ex: B22, B23, B24
  type_conduite int NOT NULL CHECK (type_conduite IN (7, 10, 21)), -- jours entre bandes
  date_saillie_prevue date NOT NULL,
  date_mb_prevue date GENERATED ALWAYS AS (date_saillie_prevue + 114) STORED,
  date_sevrage_prevu date,
  statut text DEFAULT 'planifiee', -- planifiee | en_saillie | en_gestation | en_maternite | sevree | terminee
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE bandes_animaux (
  bande_id uuid REFERENCES bandes(id) ON DELETE CASCADE,
  animal_id uuid REFERENCES animaux(id),
  PRIMARY KEY (bande_id, animal_id)
);
```

### 5.3. UI proposée

Vue Bandes : timeline horizontale 21 jours avec étapes clés (saillie / écho J28 / vaccins J60 / J85 / J100 / MB / sevrage J21), opérations batch sur bande entière.

-----

## 6. Rubrique Conseil — Architecture complète (Phase C5+C6)

### 6.1. Refonte structurelle

Fusionner les 2 routes existantes (`/conseiller` catalogue statique + `/assistant` chatbot) en un hub unique :

```
┌─ /conseil ────────────────────────────────────────┐
│                                                   │
│  CONSEIL                                          │
│  Tes conseils personnalisés selon ton élevage     │
│                                                   │
│  ┌─────────────┬─────────────┬─────────────┐      │
│  │ 📅 Du jour  │ 💬 IA       │ 📚 Catalogue│      │
│  │             │             │             │      │
│  │ 5 conseils  │ Pose ta     │ 40 fiches   │      │
│  │ contextuels │ question    │ techniques  │      │
│  │ pour TOI    │ à l'IA      │ par sujet   │      │
│  └─────────────┴─────────────┴─────────────┘      │
│                                                   │
└───────────────────────────────────────────────────┘
```

### 6.2. Catalogue 40 fiches MVP (à co-écrire avec ANADER)

```
Reproduction (8)       Sanitaire (10)         Nutrition (8)
─────────────────      ─────────────────      ─────────────────
- Détection chaleurs   - Vaccin PPC obligat.  - Eau qualité tropicale
- Saillie double       - Mycotoxines saison   - Ration truie gestante
- Échographie J28      - Diarrhée porcelet    - Ration truie allaitant
- Préparer MB J108     - Métrite post-MB      - Sevrage progressif
- Adoption porcelets   - Vermifuge biannuel   - Concentrés CI compar.
- Sevrage 21 vs 28j    - Biosécurité sas      - Drêche brasserie maxi
- Retour chaleurs J5   - Quarantaine 21j      - Coque cacao incorporer
- Réforme truie        - Carnet MIRAH         - Calcul ration auto
                       - Délai attente viande
                       - Iode parage cordon

Conduite (6)           Économique (5)         Bio/Install (3)
─────────────────      ─────────────────      ─────────────────
- Bande 21j principe   - Coût production /kg  - Ventilation chaleur
- Vide sanitaire       - Prix Adjamé matières - Pédiluve efficace
- Densité loges        - Marge sur MB         - Rongeurs lutte
- Synchroniser chaleur - Aliment vs concentré
- Lots calibrés vente  - Subvention FIRCA
- Registre élevage     - Calculer ROI bande
```

### 6.3. Conseils contextuels (le différenciateur)

Brancher `tips_conseiller.trigger_phase[]` + service `getContextualTips(animal, cycle_day)` :

|Phase                   |Conseil push auto                                                                                                        |
|------------------------|-------------------------------------------------------------------------------------------------------------------------|
|Saillie J0              |Vérif réflexe immobilité, double saillie 12-24h, noter heure                                                             |
|Gestation J18-J24       |Surveiller retours chaleurs (échec saillie probable)                                                                     |
|Gestation J28           |Échographie : créneau optimal J28-J35 + CTA scanner                                                                      |
|Gestation J60           |Vermifuge + vaccin parvovirose-rouget                                                                                    |
|Pré-MB J100-J114        |Lavage truie J108, transfert maternité J110, rappel vaccin colibacille, préparer case (T° 28°C porcelets / 18-20°C truie)|
|Maternité J0-J3         |Colostrum <6h obligatoire, coupe cordon iode, fer J3                                                                     |
|Maternité J0-J28        |Ration croissante 3→7 kg, eau 30 L/j, T° lampe 32→25°C                                                                   |
|Sevrage J21-J28         |Aliment 1er âge progressif J17, retrait porcelets matin, truie diète 24h                                                 |
|Post-sevrage J4-J7 truie|Retour chaleurs attendu, flushing aliment, préparer verrat/IA                                                            |

### 6.4. 10 notifications push utiles (Phase D4 — WhatsApp)

```
1.  Saillie J+18         → "Surveiller retours chaleurs Adèle"
2.  Gestation J+28       → "Échographie Bella possible dès demain"
3.  Gestation J+100      → "Préparer maternité Carmen (MB dans 14j)"
4.  MB J+1               → "Vérif colostrum sur portée P061-T03"
5.  MB J+3               → "Fer injectable porcelets P061"
6.  MB J+21              → "Sevrage P061 dans 7 jours"
7.  Sevrage J+5          → "Retour chaleurs attendu Diana"
8.  T° bâtiment >32°C 3h → "Alerte chaleur — augmenter ventilation maternité"
9.  Saison pluies juin   → "Surveillance mycotoxines maïs renforcée"
10. Alerte régionale PPA → "Foyer signalé région Bouaké (DSV CI)"
```

Préférences user-controlled, canal in-app + email + **WhatsApp** (canal natif éleveur CI).

-----

## 7. Mode hors-ligne réel (Phase D1 — promesse marketing à honorer)

### 7.1. Architecture cible

```
┌─ Utilisateur saisit une pesée en mode dégradé ──┐
│                                                 │
│  [Composant React]                              │
│    ↓                                            │
│  useOnlineStatus() → false                      │
│    ↓                                            │
│  Au lieu d'appeler Supabase :                   │
│  → Push dans IndexedDB queue (lib `idb`)        │
│  → Optimistic UI : "Pesée enregistrée (hors-    │
│    ligne) — sera synchronisée à la reconnexion" │
│    ↓                                            │
│  Banner sticky top : "🔴 Hors-ligne · 3 saisies │
│  en attente de synchronisation"                 │
│                                                 │
│  Au retour du réseau :                          │
│  → Workbox Background Sync API                  │
│  → Drainer la queue vers Supabase               │
│  → Toast : "✅ 3 saisies synchronisées"         │
└─────────────────────────────────────────────────┘
```

### 7.2. Stack technique

- **IndexedDB wrapper** : `idb` (4 KB, MIT)
- **Background Sync** : Workbox `workbox-background-sync`
- **Hook React** : `useOnlineStatus` custom basé sur `navigator.onLine` + listeners
- **Banner global** : composant `<OfflineBanner>` dans layout root
- **Page `/offline`** statique avec message + bouton “Réessayer”

### 7.3. Mutations à mettre en queue

- Pesées
- Saisies sanitaires (`actes_sanitaires`)
- Mortalités
- Mouvements stock (entrée/sortie)
- Mises bas / Saillies / Sevrages
- Photos animaux

Les **consultations** (lecture) restent network-first avec cache fallback (déjà OK via SW).

-----

## 8. Mobile cheptel — refonte cards (Phase D7)

### 8.1. Avant (audit constaté)

Chaque animal occupe ~280px sur 8 lignes verticales :

```
NOM       Wanda
SEXE      ♀ FEMELLE
CATÉGORIE Cochette
RACE      —
NAISSANCE —
STADE     PRÉ-SAILLIE
ACTIONS   [⋯]
```

→ 28 reproducteurs = ~170 lignes de scroll. Inacceptable.

### 8.2. Après (mockup proposé)

```
┌─────────────────────────────────────────┐
│ ┌──┐  C01  Wanda          [PRÉ-SAILLIE] │  ← 80px
│ │🐷│  ♀ Cochette · LW                  │
│ └──┘  [▼ Détails] [⋯ Actions]           │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│ ┌──┐  T01  Adèle         [GESTANTE J60] │
│ │🐷│  ♀ Truie · LW · Parité 3           │
│ └──┘  [▼ Détails] [⋯ Actions]           │
└─────────────────────────────────────────┘
```

Tag + Nom en gras = identification immédiate. Stade en badge couleur à droite = scan visuel. Accordéon pour le reste. **Gain : 3.5× plus d’animaux visibles par écran.**

### 8.3. Actions contextuelles selon stade

Le menu `⋯` propose des actions **différentes selon le stade** :

|Stade           |Actions proposées                        |
|----------------|-----------------------------------------|
|PRÉ-SAILLIE     |Saillir · Noter chaleurs · Réformer      |
|GESTANTE J<28   |Surveiller retour chaleurs · Échographier|
|GESTANTE J28-100|Vacciner · Vermifuger · Peser            |
|GESTANTE J100+  |Préparer MB · Transférer maternité       |
|ALLAITANTE      |Enregistrer MB · Adoption · Sevrer       |
|VIDE            |Saillir · Réformer · Réformer (vente)    |

Contre 1 menu uniforme actuellement.

-----

## 9. Sécurité & RGPD — Phase A/D

### 9.1. CSP à durcir (Phase D3)

Aujourd’hui :

```typescript
"script-src 'self' 'unsafe-inline' 'unsafe-eval'"
"style-src 'self' 'unsafe-inline'"
```

Cible (Next 16 supporte `next-nonce`) :

```typescript
"script-src 'self' 'nonce-{NONCE}' 'strict-dynamic'"
"style-src 'self' 'nonce-{NONCE}'"
```

### 9.2. RGPD / Loi CI 2013-450

Pages stubs à créer (Phase A12) :

- `/mentions-legales` : éditeur, hébergeur, contact, n° ARTCI
- `/politique-confidentialite` : finalités, base légale, durée, droits, contact DPO
- `/cgu` : conditions générales d’utilisation

Section `/parametres/compte` (Phase D12) :

- Bouton **“Exporter toutes mes données (ZIP)”** → CSV de toutes les tables liées au user (art. 20 RGPD)
- Bouton **“Supprimer mon compte”** → suppression cascade + confirmation 2 étapes (art. 17 RGPD)

-----

## 10. Ordre d’exécution recommandé pour Claude Code

> Si tu lis ce document pour exécuter les tâches, voici l’ordre optimal.

### Sprint 1 (Semaine 1) — Phase A complète

1. Cloner le repo et explorer la structure
1. Identifier le commit `8d19f4f` (référence audit)
1. Exécuter A1 → A12 dans l’ordre
1. Tests visuels après chaque item (mode démo `demo@smartfarm.group`)
1. Commit séparé par item (revertabilité)

### Sprint 2-3 (Semaines 2-4) — Phase B

1. **B1 + B2** d’abord (référentiels véto + unités) — fondations
1. **B3** ensuite (`actes_sanitaires` schéma + dialog) — utilise B1+B2
1. **B4 + B5** (exports + ATB) — utilise B3
1. **B6 → B10** en parallèle

### Sprint 4-7 (Semaines 5-8) — Phase C

Ordre conseillé :

1. **C5 + C6** (conseil contextuel + 40 fiches MVP) — le différenciateur
1. **C1 + C9** (conduite en bande + adoption) — IFIP moderne
1. **C2 + C3 + C4** (KPI IFIP enrichis) — montre la valeur
1. **C7 + C8 + C10** finalisation

### Sprint 8+ (continu) — Phase D

D1 (offline réel) en priorité absolue. Tout le reste en fonction des retours utilisateurs réels.

-----

## 11. Mode démo — accès pour les tests

Pour valider chaque livraison :

```
URL    : http://localhost:3000 (dev) ou https://smartfarm.group (prod)
Email  : demo@smartfarm.group
Mot de passe : Demo6734N0xUHH1I

Données démo :
- 59 animaux total
- 22 truies T01-T22 (Adèle...Vita)
- 3 cochettes C01-C03
- 3 verrats V01-V03
- 4 portées historiques nov-déc 2025
- 8 articles stock seedés
- 0 acte sanitaire, 0 mortalité, 0 conseil
```

⚠️ **Ne pas casser les données démo** : créer les éléments de test avec préfixe `TEST-AUDIT-` ou utiliser une autre ferme isolée pour les tests destructifs.

-----

## 12. Métriques de succès post-livraison

Pour chaque phase, valider avec ces critères mesurables :

### Phase A — Quick wins

- [ ] 0 lien mort dans la nav et footer
- [ ] 0 claim non vérifiable (ISO 22005, 300 conseils, offline-first)
- [ ] FAB mobile Stock fonctionnel (test : créer une entrée stock en mobile)
- [ ] Dashboard scannable en 3 secondes (test 5 utilisateurs)
- [ ] Page mentions/CGU/conf RGPD accessibles depuis footer

### Phase B — Friction de saisie

- [ ] **Enregistrer un traitement Bimestimul en mobile = 5 taps max** (vs 20+ aujourd’hui via texte libre)
- [ ] Carnet sanitaire exportable PDF avec format MIRAH
- [ ] 0 produit véto en texte libre (100% via sélection liste)
- [ ] 0 unité en texte libre (100% enum)
- [ ] Mortalité enregistrable avec motif codifié

### Phase C — Enrichissement

- [ ] 40 fiches conseil réellement présentes (pas placeholder)
- [ ] **Conseil contextuel** : 1 saillie → conseil J+18 push automatique
- [ ] Calendrier prévisionnel auto-généré depuis saillies
- [ ] KPI IFIP affichent comparaison cible inline
- [ ] Module bande utilisable de A à Z

### Phase D — Standards 2026

- [ ] Offline test : couper réseau, saisir 3 actions, reconnecter → tout sync
- [ ] Lighthouse Performance ≥ 80 (mobile, 4G simulé)
- [ ] CSP sans `unsafe-inline`/`unsafe-eval`
- [ ] WhatsApp push opérationnel sur au moins 3 events
- [ ] Suppression compte + export complet RGPD

-----

## 13. Hors-scope explicite (à ne PAS faire)

Pour rester focalisé sur ce qui compte :

- ❌ **Dark mode** : low priority (cible terrain plein soleil)
- ❌ **App native iOS/Android** : PWA suffit dans un premier temps
- ❌ **Internationalisation** : FR seulement (CI 100% francophone)
- ❌ **Refonte design system complet** : l’identité actuelle est bonne, on polit, on ne refond pas
- ❌ **Migration de stack** : Next.js + Supabase + Hostinger reste, pas de bascule Vercel/AWS
- ❌ **Module RH / paie** : hors-scope élevage technique
- ❌ **E-commerce** : pas de vente directe dans Smart Farm
- ❌ **Comptabilité complète** : on garde des KPI éco, pas une compta

-----

## 14. Communication avec l’owner

L’owner ([Christophe / utilisateur]) tient à :

- **Discours qui inspire confiance, pas qui effraie** : pas de jargon technique inutile dans l’UI éleveur
- **Saisie facile en priorité** : “dès qu’une donnée peut être proposée dans une liste, elle DOIT l’être”
- **Rubrique conseil enrichie** : c’est SON différenciateur perçu
- **Web app digne de 2026** : standards modernes, pas Excel++
- **Insertion progressive dans la vie de l’éleveur** : devenir indispensable, pas imposant

Toute décision UX qui s’écarte de ces principes doit être justifiée explicitement.

-----

## Annexes

### A. Liens de référence audit V1

- `smartfarm-brief.md` — brief V1 (auth téléphone détaillée)
- `prompt-claude-chrome.md` — prompt audit Chrome MCP
- `smartfarm-audit-terrain.md` — rapport audit complet (697 lignes, 49 screenshots)

### B. Stack confirmée

- Frontend : Next.js 16 (App Router)
- Backend : Supabase Cloud `tpzhxjzwlxwujboboyit`
- Hosting : Hostinger (Passenger Node monolithe — pas d’edge runtime)
- CSS : Tailwind v4
- Fonts : Big Shoulders Display + Instrument Sans
- Couleur primaire : `#2D4A1F` (sahel-700)
- Auth : Supabase Auth (email/password actuel + Phone OTP Twilio à activer)
- Stockage : Supabase Storage (pour ordonnances véto, photos animaux)

### C. Sources métier

- **IFIP** Institut du Porc — standards GTTT/GTE
- **NRC 2012** Nutrient Requirements of Swine, 11th Edition
- **INRA 2018** Tables INRA-AFZ valeurs nutritionnelles porc
- **WOAH** World Organisation for Animal Health (ex-OIE)
- **MIRAH** Ministère CI des Ressources Animales et Halieutiques
- **DSV** Direction des Services Vétérinaires CI
- **ANPDP** Autorité Nationale de Protection des Données Personnelles CI (loi 2013-450)
- **ARTCI** Autorité de Régulation des Télécommunications/TIC CI

-----

**Fin du brief V2 — 2026-05-27**

Document généré après synthèse de l’audit Chrome MCP par 10 sous-agents Opus 4.7.
Toutes les recommandations sont actionnables, chiffrées, et hiérarchisées P0/P1.