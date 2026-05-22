-- ============================================================================
-- Migration : Seed Smart Farm CI-01 (ferme réelle Christophe)
-- Date      : 2026-05-22
-- Auteur    : Hermes (mode prod)
-- Contexte  : Promotion admin 13smartfarm + création ferme réelle + cheptel
-- ============================================================================

BEGIN;

-- ─── Étape 1 : élargir types d'événements pour gestion transits ───────────────
ALTER TABLE evenements_prevus
DROP CONSTRAINT IF EXISTS evenements_prevus_type_evenement_check;

ALTER TABLE evenements_prevus
ADD CONSTRAINT evenements_prevus_type_evenement_check
CHECK (type_evenement = ANY (ARRAY[
  'mise_bas_prevue','transfert_maternite','sevrage_prevu',
  'diagnostic_gestation_15j','diagnostic_gestation_28j','tarissement',
  'rappel_vaccinal','depart_engraissement',
  'vaccin_parvo_lepto_cochette_j70','vaccin_parvo_lepto_cochette_j91',
  'vaccin_rouget_cochette_j150','vaccin_erysipele_parvo_j165','vermifuge_cochette_j165',
  'fer_dextran_porcelets_j1','castration_porcelets_j5',
  'vaccin_mycoplasma_primo_j14','vaccin_mycoplasma_rappel_j28','sevrage_j28',
  'vermifuge_truie_pre_mb','vaccin_erysipele_parvo_truie_pre_mb',
  -- NOUVEAUX : transit de phase + alertes pré-transit
  'transit_phase','pesee_prevue','alerte_seuil_poids'
]::text[]));

COMMIT;

-- Note : Le seed du cheptel (17 truies + 2 verrats + 120 porcelets + bande + pesées
-- + 3 événements planifiés) a été exécuté en direct via API admin et n'est pas
-- inclus ici pour éviter les doublons. État BDD :
--   Ferme   : Smart Farm CI-01 (code SF-CI-01, Yamoussoukro CI)
--   Admin   : 13smartfarm@gmail.com (Christophe Liegeois)
--   Cheptel : 17 truies (TR001-TR017) Croisé F1 + 2 verrats (VR001-VR002) Large White
--             + 120 porcelets (PL001-PL120) bande BD2-2026-05 phase=demarrage
--   Pesées  : initiale 04/05 (12 kg) + intermédiaire 21/05 (19.65 kg)
--   Events  : transit 02/06, pesée pré-transit 01/06, alerte anticipée 28/05
--   GMQ     : 450 g/j cible — seuil transit 25 kg (tolérance 24 kg)
