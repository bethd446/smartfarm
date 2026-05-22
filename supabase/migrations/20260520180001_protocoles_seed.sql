-- ============================================================================
-- C5-A — Protocoles vaccinaux : colonnes manquantes + seed 12 standards
-- ============================================================================
--
-- Ajoute :
--   * description text         (notes vétérinaires)
--   * rappels_jours int[]      (rappels multiples)
--   * obligatoire boolean      (acte non négociable)
--
-- Puis seed 12 protocoles porcins standards Côte d'Ivoire.
-- ============================================================================

-- 1) Colonnes additionnelles -------------------------------------------------
alter table protocoles_vaccinaux
  add column if not exists description    text,
  add column if not exists rappels_jours  int[]    not null default '{}'::int[],
  add column if not exists obligatoire    boolean  not null default false;

-- 2) Seed (idempotent : on supprime ce que la fonction de seed a posé,
--    on ne touche PAS aux protocoles personnalisés ajoutés via UI).
--    On marque les protocoles seed par un préfixe stable dans `description`.
-- ----------------------------------------------------------------------------

create or replace function public.seed_protocoles_standards(p_ferme uuid)
returns int
language plpgsql
as $$
declare
  v_count int := 0;
begin
  -- on retire d'abord les protocoles déjà seedés pour cette ferme
  delete from protocoles_vaccinaux
   where ferme_id = p_ferme
     and description like '[STANDARD]%';

  insert into protocoles_vaccinaux
    (ferme_id, nom, categorie_cible, age_jours, produit, voie, dose_ml,
     rappel_jours, rappels_jours, obligatoire, actif, description)
  values
    (p_ferme, 'Fer dextran (anti-anémie)', 'porcelet', 1,
     'Fer dextran 100 mg/ml', 'IM', 2.0,
     null, '{}'::int[], true, true,
     '[STANDARD] Prévention de l''anémie ferriprive du porcelet. Injection unique J1-J3 en encolure (musculature massétère).'),

    (p_ferme, 'Coccidiostatique oral (Baycox)', 'porcelet', 3,
     'Toltrazuril 5% (Baycox)', 'Orale', 1.0,
     null, '{}'::int[], false, true,
     '[STANDARD] Prévention coccidiose porcelet. Dose unique orale J3-J5.'),

    (p_ferme, 'Castration mâles + soin plaie', 'porcelet', 7,
     'Antiseptique + analgésique (méloxicam)', 'Topique', null,
     null, '{}'::int[], true, true,
     '[STANDARD] Castration chirurgicale des mâles non destinés à la reproduction, désinfection plaie + AINS.'),

    (p_ferme, 'Vaccin Mycoplasma hyopneumoniae (primo)', 'porcelet', 14,
     'Mycoplasma hyopneumoniae inactivé', 'IM', 2.0,
     28, '{28}'::int[], false, true,
     '[STANDARD] Primo-vaccination contre la pneumonie enzootique. Rappel J28.'),

    (p_ferme, 'Vermifuge porcelet (Ivermectine)', 'porcelet', 21,
     'Ivermectine 1%', 'SC', 0.3,
     null, '{}'::int[], false, true,
     '[STANDARD] Vermifugation systémique 0,3 ml / 10 kg PV. Couvre nématodes et gale sarcoptique.'),

    (p_ferme, 'Vaccin Mycoplasma rappel + Circovirose', 'porcelet', 28,
     'Mycoplasma + Circovirus PCV2', 'IM', 2.0,
     null, '{}'::int[], false, true,
     '[STANDARD] Rappel Mycoplasma associé à la vaccination Circovirose (PCV2).'),

    (p_ferme, 'Peste Porcine + Rouget (sevrage)', 'sevrage', 42,
     'Peste porcine (souche disponible) + Erysipelothrix rhusiopathiae', 'IM', 2.0,
     null, '{}'::int[], true, true,
     '[STANDARD] Au sevrage J42. Peste Porcine Africaine : pas de vaccin homologué — utiliser PPC si disponible. Rouget systématique.'),

    (p_ferme, 'Vermifuge rappel post-sevrage', 'sevrage', 56,
     'Ivermectine 1%', 'SC', 0.3,
     null, '{}'::int[], false, true,
     '[STANDARD] Rappel vermifuge 2 semaines après le sevrage.'),

    (p_ferme, 'Parvovirose + Leptospirose (cochettes)', 'cochette', 70,
     'Parvovirus porcin + Leptospira spp.', 'IM', 2.0,
     21, '{21}'::int[], true, true,
     '[STANDARD] Préparation des futures reproductrices. Primo J70, rappel 3 semaines plus tard.'),

    (p_ferme, 'Pasteurellose', 'engraissement', 100,
     'Pasteurella multocida toxinogène', 'IM', 2.0,
     null, '{}'::int[], false, true,
     '[STANDARD] Vaccin Pasteurellose en engraissement. Optionnel selon pression sanitaire.'),

    (p_ferme, 'Erysipèle + Parvovirose (truie gestante)', 'truie', null,
     'Parvovirus + Erysipelothrix rhusiopathiae', 'IM', 2.0,
     null, '{}'::int[], true, true,
     '[STANDARD] À administrer 2 à 3 semaines avant la mise-bas, à chaque gestation.'),

    (p_ferme, 'Parvovirose + Leptospirose (verrat)', 'verrat', null,
     'Parvovirus + Leptospira spp.', 'IM', 2.0,
     null, '{}'::int[], true, true,
     '[STANDARD] Vaccination semestrielle des verrats reproducteurs (2 fois par an).');

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- 3) Exécution du seed sur la ferme DEMO -------------------------------------
-- Conditionnel : skip si la ferme demo n'existe pas (cas cloud vierge avant seed-demo-data.sql)
do $$
begin
  if exists (select 1 from public.fermes where id = '00000000-0000-0000-0000-000000000001'::uuid) then
    perform public.seed_protocoles_standards('00000000-0000-0000-0000-000000000001'::uuid);
  end if;
end $$;
