-- Phase A.6 : sevrages colonnes physiques manquantes
ALTER TABLE sevrages ADD COLUMN IF NOT EXISTS bande_id uuid;
ALTER TABLE sevrages ADD COLUMN IF NOT EXISTS age_jours integer;
ALTER TABLE sevrages ADD COLUMN IF NOT EXISTS bcs_truie numeric;
ALTER TABLE sevrages ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS sevrages_idempotency_key_uniq
  ON sevrages(idempotency_key) WHERE idempotency_key IS NOT NULL;
NOTIFY pgrst, 'reload schema';
