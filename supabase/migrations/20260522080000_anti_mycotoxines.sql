-- HARM-B : catalogue produits anti-mycotoxines + protocoles + vue recommandations
BEGIN;

-- =========================================================================
-- 1) Référentiel produits anti-mycotoxines disponibles
-- =========================================================================
CREATE TABLE IF NOT EXISTS produits_anti_mycotoxines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom text NOT NULL,
  fabricant text NOT NULL,
  type text NOT NULL CHECK (type IN ('liant','enzymatique','combiné','antioxydant','probiotique')),
  spectre text[] NOT NULL DEFAULT '{}'::text[],   -- Afla, ZEA, DON, OTA, FUM, T2
  dose_kg_par_tonne_aliment numeric(6,3),
  cout_fcfa_par_kg numeric(8,2),
  description text,
  url_fournisseur text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT ON produits_anti_mycotoxines TO anon, authenticated;

-- Seed catalogue (produits effectivement disponibles CI / Afrique de l'Ouest)
-- Insertion conditionnelle : ne re-seed pas si déjà présent
INSERT INTO produits_anti_mycotoxines (nom, fabricant, type, spectre, dose_kg_par_tonne_aliment, cout_fcfa_par_kg, description)
SELECT * FROM (VALUES
  ('Mycoprotect',     'Vitalac',         'combiné',     ARRAY['Afla','ZEA','DON','OTA','FUM'],       2.0::numeric, 1850::numeric, 'Liant argileux + enzymatique + antioxydants. Large spectre. Référence Vitalac.'),
  ('Mycofix Plus',    'Biomin',          'combiné',     ARRAY['Afla','ZEA','DON','OTA','FUM','T2'],  2.5::numeric, 2100::numeric, 'Solution biotransformation enzymatique (BBSH) + adsorbants. Biomin (Erber).'),
  ('Toxy-Nil Plus',   'Nutriad',         'combiné',     ARRAY['Afla','ZEA','DON','OTA','FUM'],       1.5::numeric, 1700::numeric, 'Mélange aluminosilicates + extraits végétaux antioxydants.'),
  ('Mycosorb A+',     'Alltech',         'liant',       ARRAY['Afla','ZEA','DON','OTA','FUM'],       1.0::numeric, 2200::numeric, 'Polysaccharides de paroi cellulaire (yeast cell wall). Reconnu international.'),
  ('Biotox',          'Cargill',         'combiné',     ARRAY['Afla','ZEA','DON','FUM'],             2.0::numeric, 1900::numeric, 'Bentonite + parois levures + antioxydants. Cargill Provimi.'),
  ('Detoxa Plus',     'Anpario',         'combiné',     ARRAY['Afla','ZEA','DON','OTA','FUM'],       1.0::numeric, 1650::numeric, 'Liant + activateur immunitaire + protection hépatique.')
) AS v(nom, fabricant, type, spectre, dose_kg_par_tonne_aliment, cout_fcfa_par_kg, description)
WHERE NOT EXISTS (
  SELECT 1 FROM produits_anti_mycotoxines p WHERE p.nom = v.nom AND p.fabricant = v.fabricant
);

-- =========================================================================
-- 2) Protocoles anti-mycotoxines par ferme (incorporation aliment)
-- =========================================================================
CREATE TABLE IF NOT EXISTS protocoles_anti_mycotoxines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  produit_id uuid NOT NULL REFERENCES produits_anti_mycotoxines(id),
  matiere_premiere_id uuid REFERENCES matieres_premieres(id),
  dose_kg_par_tonne numeric(6,3) NOT NULL,
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date,
  actif boolean NOT NULL DEFAULT true,
  observations text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_protocoles_antimyco_ferme_actif
  ON protocoles_anti_mycotoxines(ferme_id, actif)
  WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON protocoles_anti_mycotoxines TO anon, authenticated;

-- =========================================================================
-- 3) Vue : recommandation anti-mycotoxines par lot
-- =========================================================================
CREATE OR REPLACE VIEW v_recommandations_anti_mycotoxines
WITH (security_invoker=true) AS
SELECT
  lmp.id AS lot_id,
  lmp.ferme_id,
  lmp.reference_lot,
  mp.nom AS matiere_nom,
  lmp.date_reception,
  lmp.analyse_aflatoxine_b1_ppb,
  lmp.analyse_zearalenone_ppb,
  lmp.analyse_don_ppb,
  lmp.analyse_ochratoxine_a_ppb,
  lmp.analyse_fumonisine_ppb,
  lmp.conforme,
  CASE
    WHEN lmp.analyse_aflatoxine_b1_ppb >= 15
      OR lmp.analyse_zearalenone_ppb  >= 200
      OR lmp.analyse_don_ppb          >= 700
      OR lmp.analyse_ochratoxine_a_ppb>= 40
      OR lmp.analyse_fumonisine_ppb   >= 4000 THEN 'eleve'
    WHEN lmp.analyse_aflatoxine_b1_ppb >= 5
      OR lmp.analyse_zearalenone_ppb  >= 100
      OR lmp.analyse_don_ppb          >= 400
      OR lmp.analyse_ochratoxine_a_ppb>= 20
      OR lmp.analyse_fumonisine_ppb   >= 2000 THEN 'modere'
    WHEN lmp.analyse_aflatoxine_b1_ppb IS NULL
      AND lmp.analyse_zearalenone_ppb IS NULL
      AND lmp.analyse_don_ppb IS NULL THEN 'non_analyse'
    ELSE 'faible'
  END AS niveau_risque
FROM lots_matieres_premieres lmp
JOIN matieres_premieres mp ON mp.id = lmp.matiere_premiere_id
WHERE lmp.deleted_at IS NULL
  AND (
    mp.nom ILIKE '%maïs%'
    OR mp.nom ILIKE '%mais%'
    OR mp.nom ILIKE '%arachide%'
    OR mp.nom ILIKE '%soja%'
  );

GRANT SELECT ON v_recommandations_anti_mycotoxines TO anon, authenticated;

COMMIT;
