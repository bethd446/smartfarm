-- S5 Lane 1 R4 fix : enum action_audit accepte STADE_CHANGE + STADE_CHANGE_BATCH
-- Bug détecté par prof reviewer R4 sur Lane 1 audit_log batch (INSERT silently broken).
-- Corrige aussi bug pré-existant [id]/_actions.ts:95 (STADE_CHANGE single broken depuis F1).
-- Non destructif : ADD VALUE IF NOT EXISTS.

ALTER TYPE public.action_audit ADD VALUE IF NOT EXISTS 'STADE_CHANGE';
ALTER TYPE public.action_audit ADD VALUE IF NOT EXISTS 'STADE_CHANGE_BATCH';
