# Brief L2 — C10 Photos animaux Supabase Storage

## TOI
Dev senior React/Next + Supabase Storage. Tu intègres la première feature Storage du projet (0 usage existant — pattern à inaugurer proprement).

## LIS D'ABORD (obligatoire)
1. `CLAUDE.md` (racine) — règles charte §10 RLS multi-tenant
2. `app/src/app/(app)/cheptel/[id]/page.tsx` — fiche animal existante
3. `app/src/app/(app)/cheptel/[id]/_actions.ts` — pattern server actions cheptel
4. `app/src/lib/supabase/server.ts` + `client.ts` — pattern client SDK
5. `app/src/lib/supabase/ferme-context.ts` — `getFermeId()` source ferme courante
6. Vérifier `grep -rln "@supabase/storage" app/src/lib` — devrait être absent (1ère intégration)

## Périmètre
✅ Touche (NOUVEAUX) :
- `supabase/migrations/20260528120000_animaux_photo_storage.sql` (migration : ADD COLUMN photo_url + bucket animaux-photos + policies)
- `app/src/app/(app)/cheptel/[id]/_photo-upload.tsx` (composant client upload + preview)
- `app/src/app/(app)/cheptel/[id]/_photo-actions.ts` (server actions uploaderPhotoAnimal + supprimerPhotoAnimal)

❌ Touche pas :
- `cheptel/[id]/page.tsx` (l'orchestrateur câble le composant en suivi)
- `_tabs.tsx`, `_courbe-poids.tsx`, autres composants existants
- Tout fichier hors `cheptel/[id]/` (sauf migration SQL)

❌ Pas `npm run build`, pas `npx tsc`, pas commit, pas push, **pas appliquer la migration** (l'orchestrateur le fait via Mgmt API).

## Contexte

État actuel : `animaux` table sans colonne photo. Aucun bucket Storage existant projet.

Cible : permettre à l'éleveur de **prendre une photo animal** (smartphone CI 4G plein soleil) pour identification visuelle (en complément du tag). Cas d'usage :
- Reconnaître une truie sans s'approcher (cicatrice, marquage)
- Documenter état corporel (BCS visuel)
- Preuve photographique mortalité / réforme

Contraintes techniques :
- Upload via input file mobile (avec `capture="environment"` = caméra arrière)
- Compression côté client si possible (canvas resize → WebP 800px, < 200 Ko)
- Path Storage : `{ferme_id}/{animal_id}/{timestamp}.webp` (isolation tenant)
- RLS Storage : SELECT/INSERT/DELETE seulement sur sa propre ferme
- 1 photo principale par animal (override = remplace, ancien fichier supprimé)

## Mission
1. Migration SQL : ALTER animaux + bucket + 3 policies Storage
2. Server actions : upload (parse file, write Storage, update photo_url) + delete (delete Storage + clear photo_url)
3. Composant client : input file + preview + bouton upload/supprimer + state loading

## Détails techniques

### Fix #1 — Migration `20260528120000_animaux_photo_storage.sql`

```sql
-- Migration : photos animaux Supabase Storage
-- Ajoute colonne photo_url + bucket dédié + 3 policies multi-tenant
BEGIN;

-- 1. Colonne photo_url sur animaux
ALTER TABLE public.animaux
  ADD COLUMN IF NOT EXISTS photo_url text;

COMMENT ON COLUMN public.animaux.photo_url IS
  'URL publique signée Supabase Storage (bucket animaux-photos). Null = pas de photo.';

-- 2. Bucket privé (signed URLs uniquement, pas de listing public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'animaux-photos',
  'animaux-photos',
  false,
  524288, -- 512 Ko max (objectif < 200 Ko après compression côté client)
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Policies storage.objects pour bucket animaux-photos
-- Pattern path: {ferme_id}/{animal_id}/{filename}
-- => storage.foldername(name)[1] = ferme_id (string UUID)

-- SELECT : seulement les fichiers de sa propre ferme
DROP POLICY IF EXISTS "animaux_photos_select_own_farm" ON storage.objects;
CREATE POLICY "animaux_photos_select_own_farm"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'animaux-photos'
    AND (storage.foldername(name))[1] = public.current_farm_id()::text
  );

-- INSERT : upload uniquement dans sa propre ferme
DROP POLICY IF EXISTS "animaux_photos_insert_own_farm" ON storage.objects;
CREATE POLICY "animaux_photos_insert_own_farm"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'animaux-photos'
    AND (storage.foldername(name))[1] = public.current_farm_id()::text
  );

-- DELETE : suppression uniquement dans sa propre ferme
DROP POLICY IF EXISTS "animaux_photos_delete_own_farm" ON storage.objects;
CREATE POLICY "animaux_photos_delete_own_farm"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'animaux-photos'
    AND (storage.foldername(name))[1] = public.current_farm_id()::text
  );

COMMIT;
```

⚠️ La fonction `current_farm_id()` existe déjà (charte §10 r.4). NE PAS la recréer.
⚠️ Vérifier que `public.current_farm_id()` retourne bien un UUID (cast `::text` requis pour comparaison `storage.foldername`).

### Fix #2 — `_photo-actions.ts` (server actions)

```ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getFermeId } from '@/lib/supabase/ferme-context'
import { revalidatePath } from 'next/cache'

const BUCKET = 'animaux-photos'

export async function uploaderPhotoAnimal(
  animalId: string,
  file: File,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!animalId) return { ok: false, error: 'Animal ID requis' }
  if (!file || file.size === 0) return { ok: false, error: 'Fichier requis' }
  if (file.size > 524288) return { ok: false, error: 'Fichier > 512 Ko' }
  const allowedMime = ['image/webp', 'image/jpeg', 'image/png']
  if (!allowedMime.includes(file.type)) {
    return { ok: false, error: 'Format non supporté (WebP, JPEG, PNG uniquement)' }
  }

  const supabase = await createClient()
  const fermeId = await getFermeId()

  // 1. Vérifier que l'animal appartient bien à la ferme
  const { data: animal, error: errAnimal } = await supabase
    .from('animaux')
    .select('id, photo_url')
    .eq('id', animalId)
    .maybeSingle()
  if (errAnimal || !animal) return { ok: false, error: 'Animal introuvable ou hors ferme' }

  const a = animal as { id: string; photo_url: string | null }

  // 2. Supprimer l'ancienne photo si présente (cleanup proactif)
  if (a.photo_url) {
    // Extraire le path du URL signée (segment après /storage/v1/object/sign/animaux-photos/)
    const match = a.photo_url.match(/animaux-photos\/([^?]+)/)
    if (match) {
      await supabase.storage.from(BUCKET).remove([match[1]])
    }
  }

  // 3. Upload nouveau fichier
  const ext = file.type === 'image/webp' ? 'webp' : file.type === 'image/png' ? 'png' : 'jpg'
  const path = `${fermeId}/${animalId}/${Date.now()}.${ext}`
  const { error: errUp } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type,
  })
  if (errUp) return { ok: false, error: `Upload échoué : ${errUp.message}` }

  // 4. Générer URL signée (valide 1 an)
  const { data: signed, error: errSigned } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 60 * 60 * 24 * 365)
  if (errSigned || !signed) {
    await supabase.storage.from(BUCKET).remove([path]) // rollback
    return { ok: false, error: `URL signée échouée : ${errSigned?.message}` }
  }

  // 5. Update animaux.photo_url
  const { error: errUpdate } = await supabase
    .from('animaux')
    .update({ photo_url: signed.signedUrl })
    .eq('id', animalId)
  if (errUpdate) {
    await supabase.storage.from(BUCKET).remove([path]) // rollback
    return { ok: false, error: `Update animaux échoué : ${errUpdate.message}` }
  }

  revalidatePath('/cheptel')
  revalidatePath(`/cheptel/${animalId}`)
  return { ok: true, url: signed.signedUrl }
}

export async function supprimerPhotoAnimal(
  animalId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()

  const { data: animal } = await supabase
    .from('animaux')
    .select('id, photo_url')
    .eq('id', animalId)
    .maybeSingle()
  const a = animal as { id: string; photo_url: string | null } | null
  if (!a) return { ok: false, error: 'Animal introuvable' }
  if (!a.photo_url) return { ok: true } // déjà sans photo, idempotent

  const match = a.photo_url.match(/animaux-photos\/([^?]+)/)
  if (match) {
    await supabase.storage.from(BUCKET).remove([match[1]])
  }

  const { error } = await supabase
    .from('animaux')
    .update({ photo_url: null })
    .eq('id', animalId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/cheptel')
  revalidatePath(`/cheptel/${animalId}`)
  return { ok: true }
}
```

### Fix #3 — `_photo-upload.tsx` (composant client)

```tsx
'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploaderPhotoAnimal, supprimerPhotoAnimal } from './_photo-actions'

const MAX_DIMENSION = 800
const QUALITY = 0.82

async function compressImage(file: File): Promise<File> {
  // Si déjà ≤ 200 Ko et WebP, return tel quel
  if (file.size <= 204800 && file.type === 'image/webp') return file

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const ratio = Math.min(MAX_DIMENSION / img.width, MAX_DIMENSION / img.height, 1)
        const w = Math.round(img.width * ratio)
        const h = Math.round(img.height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas context'))
        ctx.drawImage(img, 0, 0, w, h)
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Blob échoué'))
            resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), {
              type: 'image/webp',
              lastModified: Date.now(),
            }))
          },
          'image/webp',
          QUALITY,
        )
      }
      img.onerror = () => reject(new Error('Image load'))
      img.src = e.target?.result as string
    }
    reader.onerror = () => reject(new Error('Reader'))
    reader.readAsDataURL(file)
  })
}

export function PhotoUpload({
  animalId,
  photoUrl,
  tag,
}: {
  animalId: string
  photoUrl: string | null
  tag: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    try {
      const compressed = await compressImage(file)
      const formData = new FormData()
      // server action attend (animalId, File) directement
      const res = await uploaderPhotoAnimal(animalId, compressed)
      if (res.ok) {
        toast.success('Photo enregistrée')
        router.refresh()
      } else {
        toast.error('Erreur', { description: res.error })
      }
    } catch (err) {
      toast.error('Compression échouée', { description: String(err) })
    } finally {
      setLoading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleDelete() {
    if (!confirm(`Supprimer la photo de ${tag} ?`)) return
    setLoading(true)
    try {
      const res = await supprimerPhotoAnimal(animalId)
      if (res.ok) {
        toast.success('Photo supprimée')
        router.refresh()
      } else {
        toast.error('Erreur', { description: res.error })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {photoUrl ? (
        <div className="relative w-full max-w-xs">
          <img
            src={photoUrl}
            alt={`Photo de ${tag}`}
            className="w-full h-auto rounded-md border border-[var(--sf-line)]"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="w-full max-w-xs aspect-square rounded-md border-2 border-dashed border-[var(--sf-line)] flex items-center justify-center text-[var(--sf-muted)]">
          <Camera className="h-12 w-12" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFile}
          className="hidden"
        />
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
        >
          {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
          {photoUrl ? 'Remplacer' : 'Prendre une photo'}
        </Button>
        {photoUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={handleDelete}
            className="text-[var(--sf-danger-ink,#7A2A1F)]"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Supprimer
          </Button>
        )}
      </div>
    </div>
  )
}
```

⚠️ `capture="environment"` ouvre la caméra arrière mobile (objectif terrain). Sur desktop, ouvre le file picker normal.
⚠️ La compression est best-effort : si canvas API échoue (rare), upload le fichier original si < 512 Ko, sinon erreur.

## VÉRIFICATIONS OBLIGATOIRES
1. `ls app/src/app/\(app\)/cheptel/\[id\]/_photo-upload.tsx app/src/app/\(app\)/cheptel/\[id\]/_photo-actions.ts` → 2 fichiers
2. `ls supabase/migrations/20260528120000_*.sql` → présent
3. `grep -c "animaux-photos\|storage.buckets\|storage.objects" supabase/migrations/20260528120000_*.sql` → ≥ 5
4. `grep -c "current_farm_id\|foldername" supabase/migrations/20260528120000_*.sql` → ≥ 4 (1 per policy × 3 + bucket cast)
5. `grep "capture=" app/src/app/\(app\)/cheptel/\[id\]/_photo-upload.tsx` → présent (mobile caméra arrière)

## LIVRABLE
1 fichier : `agents/sprint-vague-4-2026-05-28/rapports/RAPPORT_L2.md` (≤120 lignes)

TODO orchestrateur dans le rapport : appliquer migration, câbler `<PhotoUpload>` dans `cheptel/[id]/page.tsx` (fetch photo_url depuis animal data), tester smoke desktop + mobile (objectif rendu caméra arrière sur Safari iOS).

## INTERDITS
- ❌ Appliquer la migration SQL
- ❌ Modifier `cheptel/[id]/page.tsx` ou tout autre fichier hors périmètre
- ❌ Ajouter dépendance npm (Web APIs canvas/FileReader natifs suffisent)
- ❌ Stocker la photo en base64 dans `photo_url` (Storage bucket obligatoire)
- ❌ Rapport > 120 lignes

Go.
