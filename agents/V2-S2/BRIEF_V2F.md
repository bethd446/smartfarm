# Brief V2-F — Biosécurité + Suivi eau + Alerte mycotoxines

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : Ajouter 3 modules métier clés pour un élevage en zone tropicale (CI)

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `supabase/migrations/` — 1 migration `20260521210200_biosecurite_eau_mycotoxines.sql`
2. Crée 3 NOUVELLES pages :
   - `app/src/app/(app)/sanitaire/biosecurite/page.tsx` (+ formulaires)
   - `app/src/app/(app)/sanitaire/eau/page.tsx` (+ formulaires)
   - `app/src/app/(app)/sanitaire/mycotoxines/page.tsx` (lecture seule + alertes)
3. Etend `v_alertes_actives` avec **2 nouvelles règles** : R17 (eau qui chute) + R18 (lot maïs/arachide non analysé saison pluies)
4. Sidebar : pas de changement (V2-G s'en occupera après)
5. Ne touche **PAS** : dashboard, nutrition, cheptel, chatbot

---

## CONTEXTE

- DB : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`
- Réutiliser composants UI : `@/components/ui/card`, `button`, `dialog`, `empty-state`, `skeleton`
- Server Actions pattern : voir `app/src/app/(app)/sanitaire/calendrier/_actions-porcelets.ts` créé par V2-B
- App standalone à redeployer après modifs

---

## MODULE 1 — Biosécurité

### Schéma
```sql
-- Table : registre des visiteurs/transports entrant
CREATE TABLE IF NOT EXISTS visites_biosecurite (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  date_visite timestamptz NOT NULL DEFAULT now(),
  type_visite text NOT NULL CHECK (type_visite IN ('visiteur','veterinaire','camion_aliment','camion_animaux','livraison','technicien','autre')),
  nom_visiteur text,
  societe text,
  provenance_ferme_porcine boolean NOT NULL DEFAULT false,
  delai_depuis_derniere_visite_jours integer,
  douche_obligatoire_effectuee boolean DEFAULT false,
  changement_tenue boolean DEFAULT false,
  pediluve_utilise boolean DEFAULT false,
  observations text,
  enregistre_par uuid REFERENCES utilisateurs(id),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_visites_biosecurite_ferme_date
  ON visites_biosecurite(ferme_id, date_visite DESC);

-- Checklist statique (référentiel)
CREATE TABLE IF NOT EXISTS biosecurite_checklist (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  categorie text NOT NULL,  -- 'entrée_ferme', 'maternité', 'engraissement', 'transport'
  item text NOT NULL,
  obligatoire boolean DEFAULT true,
  ordre integer NOT NULL DEFAULT 0
);

INSERT INTO biosecurite_checklist (categorie, item, obligatoire, ordre) VALUES
  ('entree_ferme','Sas avec douche obligatoire pour tout visiteur',true,1),
  ('entree_ferme','Pédiluve fonctionnel à l''entrée du quai',true,2),
  ('entree_ferme','Tenue propre exclusive à la ferme',true,3),
  ('entree_ferme','Délai de carence de 48h pour visite venant d''une autre ferme porcine',true,4),
  ('entree_ferme','Registre des visiteurs à jour',true,5),
  ('maternite','Marche en avant strict (truies puis porcelets)',true,1),
  ('maternite','Désinfection inter-bandes des cases',true,2),
  ('maternite','Vide sanitaire ≥ 5 jours',true,3),
  ('engraissement','Rongeurs : appâts vérifiés mensuellement',true,1),
  ('engraissement','Toiles anti-moustiques sur ouvertures',true,2),
  ('transport','Quai de chargement extérieur (pas d''accès intérieur du transporteur)',true,1),
  ('transport','Lavage + désinfection avant chaque arrivée camion',true,2);

GRANT SELECT, INSERT, UPDATE ON visites_biosecurite TO anon, authenticated;
GRANT SELECT ON biosecurite_checklist TO anon, authenticated;
```

### Page `/sanitaire/biosecurite`
- En haut : **Checklist biosécurité** lue depuis `biosecurite_checklist`, groupée par catégorie, avec icônes ✅/⚠️
- Au milieu : **Registre des visiteurs** (table) avec bouton "Nouvelle visite" qui ouvre un Dialog
- Le Dialog laisse renseigner : type, nom, société, provenance ferme porcine, douche/tenue/pédiluve
- Filtres : 30 derniers jours par défaut, possibilité d'élargir
- Server Action `enregistrerVisite` qui INSERT dans `visites_biosecurite`
- Empty state si registre vide

---

## MODULE 2 — Suivi consommation eau

### Schéma
```sql
CREATE TABLE IF NOT EXISTS consommations_eau (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  bande_id uuid REFERENCES bandes(id),
  batiment_id uuid REFERENCES batiments(id),
  date date NOT NULL DEFAULT CURRENT_DATE,
  litres numeric(10,2) NOT NULL CHECK (litres >= 0),
  nb_animaux integer,
  litres_par_animal numeric(8,2) GENERATED ALWAYS AS (
    CASE WHEN nb_animaux > 0 THEN litres / nb_animaux ELSE NULL END
  ) STORED,
  source text,  -- 'compteur_global','compteur_bande','manuel'
  observations text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_eau_ferme_bande_date
  ON consommations_eau(ferme_id, COALESCE(bande_id, '00000000-0000-0000-0000-000000000000'::uuid), date);

GRANT SELECT, INSERT, UPDATE ON consommations_eau TO anon, authenticated;
```

### Page `/sanitaire/eau`
- Cards en haut :
  - Litres consommés aujourd'hui (somme journée)
  - Moyenne 7j
  - Variation J vs moyenne 7j (avec flèche ↑/↓)
- Tableau historique 30 jours
- Bouton "Saisir relevé" → Dialog avec date, litres, bande/bâtiment optionnel
- Mini graph 14 jours (Tu peux utiliser `recharts` si déjà installé, sinon une simple liste avec barres CSS)
  ```bash
  grep -r "recharts" app/package.json
  ```
- Empty state si pas de relevés

### Règle d'alerte R17 (à ajouter dans v_alertes_actives)
**Seuil** : chute >20% sur le moyenne 7j vs valeur du jour.

```sql
-- Branche UNION ALL à ajouter dans v_alertes_actives
SELECT 'R17-eau-chute-importante'::text AS regle_id,
       'ferme'::text AS cible_type,
       ferme_id::text AS cible_id,
       'Ferme'::text AS cible_label,
       'critique'::text AS gravite,
       'Consommation eau du jour en chute >20% (' || ROUND(variation_pct,1) || '%)' AS titre,
       'Chute importante de consommation eau — vérifier compteur, abreuvoirs, état sanitaire animaux.'::text AS description,
       '/sanitaire/eau'::text AS lien_suggere,
       now() AS detecte_le,
       ferme_id
FROM (
  SELECT ferme_id,
         AVG(litres) FILTER (WHERE date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE - 1) AS moy_7j,
         MAX(litres) FILTER (WHERE date = CURRENT_DATE) AS litres_today,
         ((MAX(litres) FILTER (WHERE date = CURRENT_DATE) - AVG(litres) FILTER (WHERE date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE - 1))
          / NULLIF(AVG(litres) FILTER (WHERE date BETWEEN CURRENT_DATE - 7 AND CURRENT_DATE - 1), 0) * 100) AS variation_pct
  FROM consommations_eau WHERE deleted_at IS NULL GROUP BY ferme_id
) eau
WHERE moy_7j > 0 AND litres_today < moy_7j * 0.8
```

---

## MODULE 3 — Mycotoxines (alerte saison pluies)

### Schéma
```sql
-- Lots de matières premières sensibles
CREATE TABLE IF NOT EXISTS lots_matieres_premieres (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  matiere_premiere_id uuid NOT NULL REFERENCES matieres_premieres(id),
  reference_lot text NOT NULL,
  date_reception date NOT NULL DEFAULT CURRENT_DATE,
  quantite_kg numeric(10,2) NOT NULL,
  origine text,  -- ex 'Bouaké marché', 'Coopérative ABC'
  analyse_aflatoxine_b1_ppb numeric(8,2),  -- ppb (µg/kg)
  analyse_zearalenone_ppb numeric(8,2),
  analyse_don_ppb numeric(8,2),  -- Deoxynivalenol
  date_analyse date,
  conforme boolean GENERATED ALWAYS AS (
    (analyse_aflatoxine_b1_ppb IS NULL OR analyse_aflatoxine_b1_ppb <= 20)  -- limite UE porcs
    AND (analyse_zearalenone_ppb IS NULL OR analyse_zearalenone_ppb <= 250)
    AND (analyse_don_ppb IS NULL OR analyse_don_ppb <= 900)
  ) STORED,
  observations text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON lots_matieres_premieres TO anon, authenticated;
```

### Page `/sanitaire/mycotoxines`
- En haut : encart pédagogique :
  > "Mycotoxines : aflatoxines, zéaralénone, DON. Seuils porcs (UE) : aflatoxine B1 ≤ 20 ppb, zéaralénone ≤ 250 ppb, DON ≤ 900 ppb. Saison des pluies = risque élevé sur maïs et tourteau arachide en Côte d'Ivoire."
- Tableau "Lots maïs / arachide / tourteau soja" avec colonnes : référence, date réception, quantité, analyses, statut conforme/non-conforme/non-analysé
- Bouton "Enregistrer un lot" → Dialog
- Empty state si vide

### Règle R18
```sql
-- Lots de maïs/arachide reçus depuis >7j sans analyse
SELECT 'R18-lot-non-analyse'::text AS regle_id,
       'lot'::text AS cible_type,
       l.id::text AS cible_id,
       (mp.nom || ' — lot ' || l.reference_lot) AS cible_label,
       'moyenne'::text AS gravite,
       'Lot ' || l.reference_lot || ' (' || mp.nom || ') reçu il y a ' || (CURRENT_DATE - l.date_reception) || ' j sans analyse mycotoxines' AS titre,
       'Faire analyser aflatoxine B1, zéaralénone, DON — risque sanitaire élevé en zone tropicale humide.'::text AS description,
       ('/sanitaire/mycotoxines')::text AS lien_suggere,
       now() AS detecte_le,
       l.ferme_id
FROM lots_matieres_premieres l
JOIN matieres_premieres mp ON mp.id = l.matiere_premiere_id
WHERE l.deleted_at IS NULL
  AND mp.nom ILIKE ANY (ARRAY['%maïs%', '%mais%', '%arachide%', '%soja%'])
  AND (CURRENT_DATE - l.date_reception) > 7
  AND l.analyse_aflatoxine_b1_ppb IS NULL
```

---

## PROCÉDURE

1. Crée la migration avec tables + branches d'alertes (étend `v_alertes_actives` post-V2-C : lis-la d'abord avec `pg_get_viewdef`)
2. Applique migration
3. Crée les 3 pages avec leurs dialogs et server actions
4. NE TOUCHE PAS à la sidebar (V2-G s'en occupe)
5. ⚠️ NE LANCE PAS `npm run build` — l'orchestrateur le fera à la fin de la vague
6. Insère 2-3 lignes d'exemple via psql pour avoir les pages non vides :
   ```sql
   INSERT INTO visites_biosecurite (ferme_id, type_visite, nom_visiteur, societe, provenance_ferme_porcine, douche_obligatoire_effectuee)
   SELECT id, 'veterinaire', 'Dr. Kouassi', 'Cabinet Vétos Abidjan', false, true FROM fermes LIMIT 1;

   INSERT INTO consommations_eau (ferme_id, date, litres, nb_animaux)
   SELECT id, CURRENT_DATE - 1, 1850, 320 FROM fermes LIMIT 1;
   INSERT INTO consommations_eau (ferme_id, date, litres, nb_animaux)
   SELECT id, CURRENT_DATE, 1320, 320 FROM fermes LIMIT 1;  -- chute -29% → R17 doit déclencher

   INSERT INTO lots_matieres_premieres (ferme_id, matiere_premiere_id, reference_lot, date_reception, quantite_kg, origine)
   SELECT f.id, mp.id, 'L-202605-001', CURRENT_DATE - 10, 2000, 'Marché Bouaké'
   FROM fermes f, matieres_premieres mp
   WHERE mp.nom ILIKE '%maïs%' LIMIT 1;  -- 10j sans analyse → R18 doit déclencher
   ```

⚠️ Si V2-D / V2-E redémarrent le serveur avant toi, c'est OK. Sinon, signale le besoin de restart côté Server Actions ajoutées.

---

## LIVRABLES

1. Migration + 3 tables + 2 nouvelles règles d'alertes
2. 3 pages opérationnelles avec dialogs
3. Données seed pour démo
4. Vérif `SELECT regle_id, COUNT(*) FROM v_alertes_actives WHERE regle_id IN ('R17-eau-chute-importante','R18-lot-non-analyse');` → 2 lignes
5. Rapport `/root/projects/smartfarm/agents/V2-S2/RAPPORT_V2F.md`

## ANTI-PIÈGES

- `v_alertes_actives` est étendue par 3 chantiers (V2-A, V2-C, toi V2-F). Pour ne RIEN perdre, lis `pg_get_viewdef('v_alertes_actives')` AVANT de réécrire
- `GENERATED ALWAYS AS … STORED` exige Postgres ≥ 12 — Supabase est sur 15, OK
- `litres_par_animal` est un champ généré, ne l'insère pas
- Pour la sidebar, NE LA TOUCHE PAS — V2-G va la refondre
- Insère les seeds APRÈS la création des tables (sinon échec)
