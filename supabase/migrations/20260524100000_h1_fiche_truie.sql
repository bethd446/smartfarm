-- ============================================================================
-- H1 — Fiche reproducteur TRUIE
-- 1) animaux.photo_url (ADD COLUMN IF NOT EXISTS)
-- 2) Bucket storage 'animaux_photos' (public)
-- 3) Vue v_score_truie (score IFIP composite + classement par ferme)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Colonne photo_url sur animaux
-- ---------------------------------------------------------------------------
ALTER TABLE animaux ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- ---------------------------------------------------------------------------
-- 2) Bucket storage 'animaux_photos' (public lecture)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('animaux_photos', 'animaux_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policies storage (publiques en lecture, écriture authenticated + service_role)
DROP POLICY IF EXISTS "animaux_photos_read"   ON storage.objects;
DROP POLICY IF EXISTS "animaux_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "animaux_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "animaux_photos_delete" ON storage.objects;

CREATE POLICY "animaux_photos_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'animaux_photos');

CREATE POLICY "animaux_photos_insert"
  ON storage.objects FOR INSERT
  TO authenticated, anon
  WITH CHECK (bucket_id = 'animaux_photos');

CREATE POLICY "animaux_photos_update"
  ON storage.objects FOR UPDATE
  TO authenticated, anon
  USING (bucket_id = 'animaux_photos');

CREATE POLICY "animaux_photos_delete"
  ON storage.objects FOR DELETE
  TO authenticated, anon
  USING (bucket_id = 'animaux_photos');

-- ---------------------------------------------------------------------------
-- 3) v_score_truie — score composite IFIP + classement par ferme
--
-- Pondération (total 100) :
--   30 % Nés vivants moyens / portée   (cible 14)
--   20 % Vitalité (nés vivants - mort-nés) (cible 13)
--   25 % Survie hors écrasés (1 - TMM/100 hors écrasés)
--   15 % ISSF (intervalle sevrage→saillie féc.) — bonus si <=8 jours
--   10 % Longévité (nb portées, plafond 8)
-- ---------------------------------------------------------------------------
DROP VIEW IF EXISTS v_score_truie CASCADE;

CREATE VIEW v_score_truie
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    a.id            AS truie_id,
    a.ferme_id,
    a.tag,
    a.nom,
    a.photo_url,
    a.date_naissance,
    k.nb_mises_bas,
    k.nb_sevrages,
    k.nes_vivants_moyen,
    k.nes_totaux_moyen,
    k.sevres_moyen,
    k.tmm_pct,
    k.issf_jours,
    k.productivite_numerique,
    -- Vitalité = (nés vivants moyen) - (mort-nés moyen)
    CASE
      WHEN k.nes_vivants_moyen IS NOT NULL AND k.nes_totaux_moyen IS NOT NULL
      THEN GREATEST(k.nes_vivants_moyen - (k.nes_totaux_moyen - k.nes_vivants_moyen), 0)
      ELSE NULL
    END::numeric(6,2) AS vitalite,
    -- Survie hors écrasés = 1 - tmm_pct/100  (tmm_pct exclut déjà les écrasés cf. v_kpi_techniques_truie)
    CASE
      WHEN k.tmm_pct IS NOT NULL THEN ((100.0 - k.tmm_pct) / 100.0)::numeric(5,3)
      ELSE NULL
    END AS surv_hors_ecrases
  FROM animaux a
  LEFT JOIN v_kpi_techniques_truie k ON k.truie_id = a.id
  WHERE a.sexe = 'F'
    AND a.categorie = 'truie'
    AND a.statut = 'actif'
    AND a.deleted_at IS NULL
),
scored AS (
  SELECT
    b.*,
    -- Sous-scores (chacun /poids)
    (LEAST(COALESCE(b.nes_vivants_moyen, 0) / 14.0, 1.0)   * 30.0)::numeric(6,2) AS sub_nv,
    (LEAST(COALESCE(b.vitalite, 0) / 13.0, 1.0)             * 20.0)::numeric(6,2) AS sub_vitalite,
    (COALESCE(b.surv_hors_ecrases, 0)                        * 25.0)::numeric(6,2) AS sub_survie,
    -- ISSF (à minimiser) : 8j parfait, 30j = 0
    (CASE
       WHEN b.issf_jours IS NULL THEN 0
       WHEN b.issf_jours <= 8 THEN 15.0
       WHEN b.issf_jours >= 30 THEN 0
       ELSE (15.0 * (30.0 - b.issf_jours) / 22.0)
     END)::numeric(6,2) AS sub_issf,
    (LEAST(COALESCE(b.nb_mises_bas, 0)::numeric / 8.0, 1.0) * 10.0)::numeric(6,2) AS sub_longevite
  FROM base b
)
SELECT
  truie_id,
  ferme_id,
  tag,
  nom,
  photo_url,
  date_naissance,
  COALESCE(nb_mises_bas, 0)  AS nb_portees,
  COALESCE(nb_sevrages, 0)   AS nb_sevrages,
  nes_vivants_moyen,
  vitalite,
  surv_hors_ecrases,
  issf_jours,
  tmm_pct,
  productivite_numerique,
  sub_nv,
  sub_vitalite,
  sub_survie,
  sub_issf,
  sub_longevite,
  ROUND((sub_nv + sub_vitalite + sub_survie + sub_issf + sub_longevite)::numeric, 1) AS score_global,
  RANK() OVER (
    PARTITION BY ferme_id
    ORDER BY (sub_nv + sub_vitalite + sub_survie + sub_issf + sub_longevite) DESC NULLS LAST,
             COALESCE(nb_mises_bas, 0) DESC
  ) AS classement,
  COUNT(*) OVER (PARTITION BY ferme_id) AS total_truies_ferme
FROM scored;

GRANT SELECT ON v_score_truie TO anon, authenticated, service_role;

COMMIT;
