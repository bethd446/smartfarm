-- Phase A.5 : alias colonnes sevrages + FK directe vers mises_bas
ALTER TABLE sevrages 
  ADD COLUMN IF NOT EXISTS nb_sevres integer GENERATED ALWAYS AS (effectif_sevre) STORED;
ALTER TABLE sevrages
  ADD COLUMN IF NOT EXISTS poids_total_kg numeric;
ALTER TABLE sevrages
  ADD COLUMN IF NOT EXISTS mb_id uuid;
UPDATE sevrages s
SET mb_id = p.mb_id
FROM portees p
WHERE p.id = s.portee_id AND s.mb_id IS NULL;
DO $$ BEGIN
  ALTER TABLE sevrages
    ADD CONSTRAINT sevrages_mb_id_fkey FOREIGN KEY (mb_id)
    REFERENCES mises_bas(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
NOTIFY pgrst, 'reload schema';
