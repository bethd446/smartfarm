-- R7-P1 V2+V7 — Sécurisation bucket animaux_photos
--
-- Avant : bucket public=true + 4 policies anon CRUD complet sans scope.
-- Après : bucket privé (signed URLs), policies authenticated scopées via path ferme_id.
--
-- Convention de path : <ferme_id>/<animal_id>/<filename>
-- (storage.foldername(name))[1] = ferme_id
--
-- Mode demo : auth.uid() = NULL → toutes les policies authenticated échouent.
-- L'upload via Server Action `uploadPhotoAnimal` continue de fonctionner car il
-- utilise `service_role` (bypass RLS), et il prend en charge le scoping du path
-- côté applicatif avec DEMO_FERME_ID / getFermeId().
--
-- file_size_limit + allowed_mime_types appliqués au niveau bucket (défense profondeur,
-- en plus de la validation Server Action).

BEGIN;

-- 1) Bucket privé + limites taille/MIME
UPDATE storage.buckets
SET public = false,
    file_size_limit = 5242880,  -- 5 Mo
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'animaux_photos';

-- 2) Supprime les anciennes policies (noms réels confirmés via pg_policies)
DROP POLICY IF EXISTS animaux_photos_read   ON storage.objects;
DROP POLICY IF EXISTS animaux_photos_insert ON storage.objects;
DROP POLICY IF EXISTS animaux_photos_update ON storage.objects;
DROP POLICY IF EXISTS animaux_photos_delete ON storage.objects;

-- 3) Policies scopées ferme_id via le 1er segment du path
--    (utilisateur_fermes.utilisateur_id, pas user_id — schéma SmartFarm)

CREATE POLICY animaux_photos_select_own_farm ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'animaux_photos'
    AND (storage.foldername(name))[1] IN (
      SELECT ferme_id::text FROM public.utilisateur_fermes
      WHERE utilisateur_id = auth.uid()
    )
  );

CREATE POLICY animaux_photos_insert_own_farm ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'animaux_photos'
    AND (storage.foldername(name))[1] IN (
      SELECT ferme_id::text FROM public.utilisateur_fermes
      WHERE utilisateur_id = auth.uid()
    )
  );

CREATE POLICY animaux_photos_update_own_farm ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'animaux_photos'
    AND (storage.foldername(name))[1] IN (
      SELECT ferme_id::text FROM public.utilisateur_fermes
      WHERE utilisateur_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'animaux_photos'
    AND (storage.foldername(name))[1] IN (
      SELECT ferme_id::text FROM public.utilisateur_fermes
      WHERE utilisateur_id = auth.uid()
    )
  );

CREATE POLICY animaux_photos_delete_own_farm ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'animaux_photos'
    AND (storage.foldername(name))[1] IN (
      SELECT ferme_id::text FROM public.utilisateur_fermes
      WHERE utilisateur_id = auth.uid()
    )
  );

COMMIT;
