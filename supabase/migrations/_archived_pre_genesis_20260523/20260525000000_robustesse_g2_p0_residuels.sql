-- ============================================================================
-- G2 — Robustesse Data (Wave 2) : P0-3, P0-4, P0-5 RPC atomiques + idempotency
-- Sprint 2 Wave 2 — fixes résiduels post-F2
-- Réf : audits/sprint1/C-robustesse-data.md (P0-3, P0-4, P0-5)
-- ============================================================================
-- Périmètre :
--   1) P0-3 — RPC enregistrer_mortalite_atomique : INSERT mortalité + UPDATE
--      animaux.statut='mort' en transaction unique avec idempotency.
--   2) P0-4 — Idempotency + guard statut sur evenements_prevus :
--      colonne fait_idempotency_key UUID UNIQUE + RPC marquer_evenement_realise
--      avec guard `statut IN ('planifie','retard')`.
--   3) P0-5 — RPC sexer_bande_atomique : sexage de toute une bande en 1 passe
--      SQL (UPDATE bandes + UPDATE bande_animaux corrélé via FROM animaux),
--      idempotent (re-run = no-op si sexee=true).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) P0-3 — enregistrer_mortalite_atomique(uuid, text, date, uuid, uuid)
-- ---------------------------------------------------------------------------
-- Usage côté client (Server Action) :
--   supabase.rpc('enregistrer_mortalite_atomique', {
--     p_animal_id: '...',          -- nullable (perte lot ⇒ pas d'animal id)
--     p_bande_id: '...',           -- nullable
--     p_ferme_id: '...',           -- requis
--     p_date_mort: '2026-05-25',
--     p_cause: 'pneumonie',
--     p_diagnostic: 'détresse respiratoire',
--     p_autopsie: false,
--     p_observations: '...',
--     p_idempotency_key: 'uuid...' -- optionnel mais recommandé
--   })
-- Retour :
--   { ok: true, mortalite_id: uuid, animal_status_updated: bool, dedup: bool }
--   | { ok: false, error: 'animal_introuvable' | 'animal_deja_mort' | … }

CREATE OR REPLACE FUNCTION public.enregistrer_mortalite_atomique(
  p_ferme_id        UUID,
  p_date_mort       DATE,
  p_cause           TEXT,
  p_animal_id       UUID    DEFAULT NULL,
  p_bande_id        UUID    DEFAULT NULL,
  p_diagnostic      TEXT    DEFAULT NULL,
  p_autopsie        BOOLEAN DEFAULT FALSE,
  p_observations    TEXT    DEFAULT NULL,
  p_idempotency_key UUID    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_mortalite_id UUID;
  v_animal_statut TEXT;
  v_animal_updated BOOLEAN := FALSE;
  v_rowcount INT := 0;
BEGIN
  -- 0) Garde minimale
  IF p_ferme_id IS NULL OR p_date_mort IS NULL OR p_cause IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'parametres_manquants');
  END IF;

  -- 1) Idempotence : si la clé existe déjà → retour silencieux dedup
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_mortalite_id
      FROM mortalites
     WHERE idempotency_key = p_idempotency_key
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true, 'dedup', true,
        'mortalite_id', v_mortalite_id,
        'animal_status_updated', false
      );
    END IF;
  END IF;

  -- 2) Si animal_id fourni, lock + vérification statut
  IF p_animal_id IS NOT NULL THEN
    SELECT statut INTO v_animal_statut
      FROM animaux
     WHERE id = p_animal_id
       AND ferme_id = p_ferme_id
       AND deleted_at IS NULL
     FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('ok', false, 'error', 'animal_introuvable');
    END IF;

    -- Si déjà marqué mort : on n'insère pas une 2ᵉ mortalité (sécurité métier).
    -- Le caller peut envoyer un idempotency_key pour récupérer l'existant.
    IF v_animal_statut = 'mort' THEN
      RETURN jsonb_build_object(
        'ok', false, 'error', 'animal_deja_mort',
        'animal_id', p_animal_id
      );
    END IF;
  END IF;

  -- 3) INSERT mortalité
  INSERT INTO mortalites (
    animal_id, bande_id, ferme_id,
    date_mort, cause, diagnostic, autopsie,
    observations, idempotency_key
  ) VALUES (
    p_animal_id, p_bande_id, p_ferme_id,
    p_date_mort, p_cause, p_diagnostic, COALESCE(p_autopsie, FALSE),
    p_observations, p_idempotency_key
  )
  RETURNING id INTO v_mortalite_id;

  -- 4) UPDATE statut animal dans la même transaction
  IF p_animal_id IS NOT NULL THEN
    UPDATE animaux
       SET statut = 'mort'
     WHERE id = p_animal_id;
    GET DIAGNOSTICS v_rowcount = ROW_COUNT;
    v_animal_updated := (v_rowcount > 0);
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'dedup', false,
    'mortalite_id', v_mortalite_id,
    'animal_status_updated', v_animal_updated
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Course concurrente sur idempotency_key : retourne l'existant
    IF p_idempotency_key IS NOT NULL THEN
      SELECT id INTO v_mortalite_id
        FROM mortalites
       WHERE idempotency_key = p_idempotency_key;
      RETURN jsonb_build_object(
        'ok', true, 'dedup', true,
        'mortalite_id', v_mortalite_id,
        'animal_status_updated', false
      );
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.enregistrer_mortalite_atomique(
  UUID, DATE, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, UUID
) TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.enregistrer_mortalite_atomique(
  UUID, DATE, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, UUID
) IS 'G2 P0-3: insert mortalité + update animaux.statut atomique + idempotent';


-- ---------------------------------------------------------------------------
-- 2) P0-4 — Idempotency sur evenements_prevus + RPC guard statut
-- ---------------------------------------------------------------------------
-- a) Ajout colonne idempotency
ALTER TABLE public.evenements_prevus
  ADD COLUMN IF NOT EXISTS fait_idempotency_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS idx_evp_fait_idempotency
  ON public.evenements_prevus (fait_idempotency_key)
  WHERE fait_idempotency_key IS NOT NULL;

-- b) RPC marquer_evenement_realise : guard statut + idempotency
-- Retour :
--   { ok: true, updated: bool, dedup: bool, evenement_id: uuid }
--   | { ok: false, error: 'evenement_introuvable' | 'parametres_manquants' }
CREATE OR REPLACE FUNCTION public.marquer_evenement_realise(
  p_event_id        UUID,
  p_date_realisation DATE DEFAULT CURRENT_DATE,
  p_idempotency_key UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_statut_actuel TEXT;
  v_existing_key UUID;
  v_updated INT := 0;
BEGIN
  IF p_event_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'parametres_manquants');
  END IF;

  -- 1) Idempotence : si même clé déjà appliquée → dedup
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_key
      FROM evenements_prevus
     WHERE fait_idempotency_key = p_idempotency_key
     LIMIT 1;
    IF FOUND THEN
      RETURN jsonb_build_object(
        'ok', true, 'dedup', true, 'updated', false,
        'evenement_id', v_existing_key
      );
    END IF;
  END IF;

  -- 2) Lock + check statut courant
  SELECT statut INTO v_statut_actuel
    FROM evenements_prevus
   WHERE id = p_event_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'evenement_introuvable');
  END IF;

  -- 3) Si déjà réalisé → idempotent : on ne touche pas, succès silencieux
  IF v_statut_actuel = 'realise' THEN
    RETURN jsonb_build_object(
      'ok', true, 'dedup', true, 'updated', false,
      'evenement_id', p_event_id
    );
  END IF;

  -- 4) UPDATE guard `statut IN ('planifie','retard')` (pas 'annule')
  UPDATE evenements_prevus
     SET statut = 'realise',
         date_realisation = p_date_realisation,
         fait_idempotency_key = COALESCE(p_idempotency_key, fait_idempotency_key)
   WHERE id = p_event_id
     AND statut IN ('planifie', 'retard');
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated = 0 THEN
    -- statut était 'annule' → on respecte le métier, ne pas ré-ouvrir
    RETURN jsonb_build_object(
      'ok', false, 'error', 'statut_non_modifiable',
      'statut_actuel', v_statut_actuel
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'dedup', false, 'updated', true,
    'evenement_id', p_event_id
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Course concurrente idempotency_key
    SELECT id INTO v_existing_key
      FROM evenements_prevus
     WHERE fait_idempotency_key = p_idempotency_key;
    RETURN jsonb_build_object(
      'ok', true, 'dedup', true, 'updated', false,
      'evenement_id', v_existing_key
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marquer_evenement_realise(UUID, DATE, UUID)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.marquer_evenement_realise(UUID, DATE, UUID)
  IS 'G2 P0-4: marque evenement_prevus realise, guard statut + idempotent';


-- ---------------------------------------------------------------------------
-- 3) P0-5 — sexer_bande_atomique : 1 transaction SQL (pas de boucle JS)
-- ---------------------------------------------------------------------------
-- Usage : supabase.rpc('sexer_bande_atomique', { p_bande_id: '...' })
-- Retour : { ok: true, animaux_sexes: int, deja_sexee: bool }
--          | { ok: false, error: 'bande_introuvable' }
CREATE OR REPLACE FUNCTION public.sexer_bande_atomique(
  p_bande_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deja_sexee BOOLEAN := FALSE;
  v_count INT := 0;
BEGIN
  IF p_bande_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'parametres_manquants');
  END IF;

  -- 1) Lock bande + check existence
  SELECT sexee INTO v_deja_sexee
    FROM bandes
   WHERE id = p_bande_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bande_introuvable');
  END IF;

  -- 2) Sexage en 1 UPDATE corrélé (UPDATE…FROM) — atomique par construction
  -- On (re)applique sous_groupe sur tous les animaux présents (idempotent).
  UPDATE bande_animaux ba
     SET sous_groupe = a.sexe::text
    FROM animaux a
   WHERE ba.animal_id = a.id
     AND ba.bande_id = p_bande_id
     AND ba.date_sortie IS NULL
     AND a.sexe IN ('M', 'F')
     AND (ba.sous_groupe IS DISTINCT FROM a.sexe::text);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- 3) Marquer la bande sexée si pas déjà fait
  IF NOT COALESCE(v_deja_sexee, FALSE) THEN
    UPDATE bandes SET sexee = TRUE WHERE id = p_bande_id;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'animaux_sexes', v_count,
    'deja_sexee', COALESCE(v_deja_sexee, FALSE)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sexer_bande_atomique(UUID)
  TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.sexer_bande_atomique(UUID)
  IS 'G2 P0-5: sexage bande atomique (UPDATE FROM, pas de boucle JS)';

COMMENT ON COLUMN public.evenements_prevus.fait_idempotency_key
  IS 'G2 P0-4: idempotency key pour marquer_evenement_realise';

COMMIT;
