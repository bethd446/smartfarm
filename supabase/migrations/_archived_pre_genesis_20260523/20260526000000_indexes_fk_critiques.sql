-- R7 P2 M2 — Index sur 9 FK critiques métier (K2 #5)
--
-- Contexte : audit K2 a identifié 15 FK sans index (dont 9 critiques métier).
-- Sans index sur la colonne FK, chaque DELETE/UPDATE de la table parente
-- déclenche un Seq Scan sur la table enfant. Idem pour les JOIN explicites
-- (cheptel → mises_bas, classement truies → sevrages, etc.).
--
-- Cibles (toutes vérifiées présentes via information_schema, jamais déjà indexées) :
--   * animaux.case_id, animaux.mere_id, animaux.pere_id
--   * mises_bas.bande_id
--   * sevrages.truie_id
--   * mortalites.animal_id
--   * diagnostics_gestation.saillie_id
--   * pesees.animal_id (déjà couvert par idx_pesees_animal — on skip)
--   * vaccinations.animal_id
--
-- Predicates partiels `WHERE deleted_at IS NULL` ou `WHERE statut='actif'`
-- pour rester cohérent avec les soft-delete utilisés par l'app (lectures
-- toujours filtrées par deleted_at IS NULL côté Server Actions).

BEGIN;

-- mises_bas.bande_id : utilisé par /bandes/[id] (effectif portées de la bande)
CREATE INDEX IF NOT EXISTS idx_mises_bas_bande_id
  ON mises_bas(bande_id)
  WHERE deleted_at IS NULL;

-- sevrages.truie_id : classement truies, calcul ISSF
CREATE INDEX IF NOT EXISTS idx_sevrages_truie_id
  ON sevrages(truie_id)
  WHERE deleted_at IS NULL;

-- animaux.case_id : densité bâtiment, transit phase
CREATE INDEX IF NOT EXISTS idx_animaux_case_id
  ON animaux(case_id)
  WHERE statut = 'actif' AND deleted_at IS NULL;

-- animaux.mere_id : généalogie /cheptel/[id]/genealogie
CREATE INDEX IF NOT EXISTS idx_animaux_mere_id
  ON animaux(mere_id)
  WHERE deleted_at IS NULL;

-- animaux.pere_id : généalogie
CREATE INDEX IF NOT EXISTS idx_animaux_pere_id
  ON animaux(pere_id)
  WHERE deleted_at IS NULL;

-- mortalites.animal_id : fiche truie /cheptel/[id] historique
CREATE INDEX IF NOT EXISTS idx_mortalites_animal_id
  ON mortalites(animal_id)
  WHERE deleted_at IS NULL;

-- diagnostics_gestation.saillie_id : /reproduction (statut MP/+/-)
-- NB : table sans deleted_at → index complet
CREATE INDEX IF NOT EXISTS idx_diagnostics_saillie_id
  ON diagnostics_gestation(saillie_id);

-- pesees.animal_id : DÉJÀ COUVERT par idx_pesees_animal — SKIP
-- (vérifié via pg_indexes : idx_pesees_animal existe déjà)

-- vaccinations.animal_id : calendrier sanitaire porcelets, fiche animal
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal_id
  ON vaccinations(animal_id)
  WHERE deleted_at IS NULL;

-- Refresh stats planner après création de plusieurs index
ANALYZE animaux;
ANALYZE mises_bas;
ANALYZE sevrages;
ANALYZE mortalites;
ANALYZE diagnostics_gestation;
ANALYZE vaccinations;

COMMIT;
