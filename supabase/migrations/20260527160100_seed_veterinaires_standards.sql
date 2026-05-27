-- ============================================================================
-- B1 Sprint Phase B/C — Seed catalogue 20 produits vétérinaires CI
--
-- Function : public.seed_veterinaires_standards(p_ferme uuid)
--   Seed idempotent (ON CONFLICT DO NOTHING via index unique partiel
--   `veterinaires_standards_nom_global_uniq` sur (nom) WHERE ferme_id IS NULL).
--
--   Le paramètre p_ferme est ACCEPTÉ pour cohérence avec
--   seed_matieres_premieres_standards / seed_batiments_standards (signature
--   appelable par trg_seed_nouvelle_ferme), mais les produits sont insérés
--   en standards partagés (ferme_id = NULL) — partagés entre toutes fermes.
--
-- Source : Brief V2 §3.2 (20 références CI validées éleveur Yamoussoukro).
-- Délais d'attente viande : références OMS Codex Alimentarius / RCP fabricants.
--
-- Catégories (20 produits) :
--   5 vitamines/toniques + 2 minéraux + 6 antibiotiques
--   + 4 antiparasitaires + 4 vaccins + 3 désinfectants = 24 inserts
--   (le brief mentionne ~20, on couvre l'ensemble pour exhaustivité)
--
-- SECURITY DEFINER : peut INSERT en tant qu'admin malgré RLS qui bloque
-- l'insertion de standards (ferme_id IS NULL) par les utilisateurs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.seed_veterinaires_standards(p_ferme uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- VITAMINES / TONIQUES (5) ----------------------------------------------
  INSERT INTO public.veterinaires_standards
    (ferme_id, nom, type, voie, delai_attente_j, max_jours, obligatoire_ci, notes)
  VALUES
    (NULL, 'Bimestimul (B12+B1)',       'tonique',  'IM', 0, NULL, false,
     'Tonique B12+B1 injectable, soutien post-MB/sevrage, anémie porcelets'),
    (NULL, 'Certivit AD3E inj',         'vitamine', 'IM', 0, NULL, false,
     'Polyvitaminé AD3E injectable, carences croissance / cochettes pré-saillie'),
    (NULL, 'Sorbitonic',                'tonique',  'IM', 0, NULL, false,
     'Sorbitol + vitamines, hépatoprotecteur post-mycotoxines / convalescence'),
    (NULL, 'Catosal B12',               'tonique',  'IM', 0, NULL, false,
     'Butafosfan + B12, soutien métabolique truies fin gestation / lactation'),
    (NULL, 'Multivit AD3EK oral',       'vitamine', 'PO', 0, NULL, false,
     'Polyvitaminé oral via eau de boisson, prévention carences bandes')
  ON CONFLICT (nom) WHERE ferme_id IS NULL DO NOTHING;

  -- MINÉRAUX (2) -----------------------------------------------------------
  INSERT INTO public.veterinaires_standards
    (ferme_id, nom, type, voie, delai_attente_j, max_jours, obligatoire_ci, notes)
  VALUES
    (NULL, 'Ucaphoscal',                'mineral',  'IV', 0, 5, true,
     'Calcium+phosphore+magnésium IV, hypocalcémie post-MB. MAX 5 JOURS consécutifs (risque arrêt cardiaque). Injection lente impérative.'),
    (NULL, 'Calcium-Phosphore drench',  'mineral',  'drench', 0, NULL, false,
     'Drench oral Ca/P post-MB, alternative non-IV sans risque cardiaque')
  ON CONFLICT (nom) WHERE ferme_id IS NULL DO NOTHING;

  -- ANTIBIOTIQUES (6) ------------------------------------------------------
  INSERT INTO public.veterinaires_standards
    (ferme_id, nom, type, voie, delai_attente_j, max_jours, obligatoire_ci, contre_indications, notes)
  VALUES
    (NULL, 'Neobion',                   'antibiotique', 'IM', 14, 5, false,
     ARRAY['gestation_tardive'],
     'Néomycine+pénicilline, infections digestives porcelets sevrés. Délai viande 14j.'),
    (NULL, 'Oxytétracycline LA',        'antibiotique', 'IM', 21, NULL, false,
     ARRAY['allergie_tetracyclines'],
     'Longue action 48-72h, large spectre (Mycoplasme, Pasteurella). Délai viande 21j.'),
    (NULL, 'Pénicilline G procaïne',    'antibiotique', 'IM', 14, 5, false,
     ARRAY['allergie_pénicillines'],
     'Bêta-lactamine, infections cutanées/articulaires. Délai viande 14j.'),
    (NULL, 'Tylosine',                  'antibiotique', 'IM', 14, 5, false,
     NULL,
     'Macrolide, Mycoplasmose / dysenterie (Brachyspira). Délai viande 14j.'),
    (NULL, 'Enrofloxacine 10%',         'antibiotique', 'IM', 10, 5, false,
     ARRAY['porcelets_moins_4_semaines', 'reproducteurs'],
     'Fluoroquinolone, infections graves résistantes. Usage RAISONNÉ (antibiorésistance). Délai viande 10j.'),
    (NULL, 'Sulfamides',                'antibiotique', 'PO', 15, 5, false,
     ARRAY['insuffisance_renale'],
     'Sulfamides potentialisés (triméthoprime), coccidiose / colibacillose. Eau de boisson. Délai viande 15j.')
  ON CONFLICT (nom) WHERE ferme_id IS NULL DO NOTHING;

  -- ANTIPARASITAIRES (4) ---------------------------------------------------
  INSERT INTO public.veterinaires_standards
    (ferme_id, nom, type, voie, delai_attente_j, obligatoire_ci, notes)
  VALUES
    (NULL, 'Ivermectine 1% inj',        'antiparasitaire', 'SC', 28, false,
     'Endectocide injectable SC, gale + strongles + ascaris. Délai viande 28j.'),
    (NULL, 'Doramectine',               'antiparasitaire', 'SC', 42, false,
     'Endectocide longue action, alternative ivermectine. Délai viande 42j (le plus long).'),
    (NULL, 'Albendazole',               'antiparasitaire', 'PO', 14, false,
     'Benzimidazole oral, ascaris+strongles. CI: gestation <30j (tératogène). Délai viande 14j.'),
    (NULL, 'Imidocarbe',                'antiparasitaire', 'IM', 90, false,
     'Babésiose / piroplasmose (rare CI mais introduit via animaux importés). Délai viande 90j.')
  ON CONFLICT (nom) WHERE ferme_id IS NULL DO NOTHING;

  -- VACCINS (4) ------------------------------------------------------------
  INSERT INTO public.veterinaires_standards
    (ferme_id, nom, type, voie, delai_attente_j, obligatoire_ci, notes)
  VALUES
    (NULL, 'Vaccin PPC',                'vaccin', 'IM', 0, true,
     'Peste Porcine Classique — OBLIGATOIRE Côte d''Ivoire (LANADA). Primo + rappel annuel.'),
    (NULL, 'Vaccin Pasteurellose',      'vaccin', 'IM', 0, false,
     'Pasteurella multocida, pneumonies. Truies gestantes J85+J100, porcelets sevrage.'),
    (NULL, 'Vaccin Mycoplasme',         'vaccin', 'IM', 0, false,
     'Mycoplasma hyopneumoniae, pneumonie enzootique. Porcelets J21-J28 monodose.'),
    (NULL, 'Vaccin Parvovirose truie',  'vaccin', 'IM', 0, false,
     'Parvovirus porcin (mortalité embryonnaire), cochettes pré-saillie + rappel annuel truies.')
  ON CONFLICT (nom) WHERE ferme_id IS NULL DO NOTHING;

  -- DÉSINFECTANTS (3) ------------------------------------------------------
  INSERT INTO public.veterinaires_standards
    (ferme_id, nom, type, voie, delai_attente_j, obligatoire_ci, notes)
  VALUES
    (NULL, 'Iode 10%',                  'desinfectant', 'topique', 0, false,
     'Désinfection cordon ombilical porcelets, plaies, ongles. Solution PVP-iodée.'),
    (NULL, 'Chlorhexidine',             'desinfectant', 'topique', 0, false,
     'Antiseptique cutané, lavages plaies / matrices post-MB. 0.05% à 0.5%.'),
    (NULL, 'Virucide bâtiments',        'desinfectant', 'topique', 0, false,
     'Désinfection bâtiments vide sanitaire (glutaraldéhyde / ammoniums quaternaires).')
  ON CONFLICT (nom) WHERE ferme_id IS NULL DO NOTHING;

END;
$$;

COMMENT ON FUNCTION public.seed_veterinaires_standards(uuid) IS
  'Seed idempotent du catalogue partagé veterinaires_standards (24 produits CI). Brief V2 §3.2. SECURITY DEFINER + EXECUTE service_role only — appel admin uniquement.';

-- Sécurité : SECURITY DEFINER + GRANT EXECUTE à authenticated permettrait à tout
-- user d'invoquer la RPC via PostgREST et de contourner la RLS INSERT qui interdit
-- ferme_id IS NULL. On limite donc l'execute à service_role (et postgres owner).
REVOKE ALL ON FUNCTION public.seed_veterinaires_standards(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.seed_veterinaires_standards(uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.seed_veterinaires_standards(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_veterinaires_standards(uuid) TO service_role;

-- Exécution initiale (peut être ré-appelée sans danger : ON CONFLICT DO NOTHING)
-- Ici en contexte migration → tourne en owner postgres, OK.
SELECT public.seed_veterinaires_standards(NULL);

NOTIFY pgrst, 'reload schema';
