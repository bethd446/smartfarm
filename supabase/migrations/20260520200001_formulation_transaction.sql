-- ============================================================================
--  20260520200001_formulation_transaction.sql
--  Migration : transactionnalité formulation + colonne stade_cible
--
--  Contexte (NSA review P0-3 / P1-5) :
--    - Le serveur Next faisait jusqu'ici 2 INSERTs séquentiels (formulation
--      puis ingrédients) avec un rollback applicatif (DELETE formulation si
--      l'INSERT ingrédients échoue). Fragile : un crash entre les deux laisse
--      une formulation orpheline.
--    - La colonne `formulations.stade_cible` n'existait pas. Le code
--      applicatif avait un fallback silencieux qui perdait l'information.
--
--  Cette migration :
--    1. Ajoute la colonne `stade_cible text` à `formulations` (idempotent).
--    2. Crée la fonction PG `creer_formulation_complete(payload jsonb)` qui
--       fait les 2 INSERTs dans UNE seule transaction Postgres
--       (atomique : BEGIN/COMMIT implicites dans la fonction plpgsql).
--    3. Valide en interne que la somme des pourcentages = 100 ± 0.01.
-- ============================================================================

-- 1) Colonne stade_cible (idempotent) -----------------------------------------
alter table public.formulations
  add column if not exists stade_cible text;

-- 2) Fonction transactionnelle ------------------------------------------------
--
--  Payload attendu :
--    {
--      "ferme_id":        "uuid",
--      "nom":             "string",
--      "stade_cible":     "porcelet_1|porcelet_2|croissance|...|verrat" | null,
--      "type_aliment_id": "uuid" | null,
--      "cout_kg":         number | null,
--      "actif":           boolean (default true),
--      "ingredients": [
--        { "matiere_premiere_id": "uuid", "pourcentage": number }, ...
--      ]
--    }
--
--  Retourne : { "id": "<formulation_id>" }
--
--  Erreurs possibles :
--    - 'total != 100'  : somme des pourcentages hors fenêtre [99.99, 100.01]
--    - 'ingredients vide' : aucun ingrédient fourni
--    - propagation des erreurs FK / contraintes Postgres
--
create or replace function public.creer_formulation_complete(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total      numeric;
  v_count      int;
  v_formulation_id uuid;
begin
  -- Validation existence ingrédients
  if jsonb_typeof(payload->'ingredients') is distinct from 'array' then
    raise exception 'ingredients manquants' using errcode = '22023';
  end if;

  select count(*) into v_count
    from jsonb_array_elements(payload->'ingredients') as e;

  if v_count = 0 then
    raise exception 'ingredients vide' using errcode = '22023';
  end if;

  -- Validation somme = 100 ± 0.01
  select coalesce(sum((value->>'pourcentage')::numeric), 0)
    into v_total
    from jsonb_array_elements(payload->'ingredients') as value;

  if v_total < 99.99 or v_total > 100.01 then
    raise exception 'total != 100 (reçu : %)', v_total
      using errcode = '22023';
  end if;

  -- INSERT formulation
  insert into public.formulations (
    ferme_id,
    nom,
    type_aliment_id,
    stade_cible,
    cout_kg,
    actif
  )
  values (
    (payload->>'ferme_id')::uuid,
    payload->>'nom',
    nullif(payload->>'type_aliment_id','')::uuid,
    nullif(payload->>'stade_cible',''),
    nullif(payload->>'cout_kg','')::numeric,
    coalesce((payload->>'actif')::boolean, true)
  )
  returning id into v_formulation_id;

  -- INSERT ingrédients (même transaction PG)
  insert into public.formulation_ingredients (
    formulation_id,
    matiere_premiere_id,
    pourcentage
  )
  select
    v_formulation_id,
    (e->>'matiere_premiere_id')::uuid,
    (e->>'pourcentage')::numeric
  from jsonb_array_elements(payload->'ingredients') as e;

  return jsonb_build_object('id', v_formulation_id);
end;
$$;

comment on function public.creer_formulation_complete(jsonb) is
  'Crée formulation + ingrédients dans une transaction atomique. Valide somme=100% (±0.01). Voir migration 20260520200001.';

-- 3) Droits ------------------------------------------------------------------
grant execute on function public.creer_formulation_complete(jsonb) to anon, authenticated, service_role;
