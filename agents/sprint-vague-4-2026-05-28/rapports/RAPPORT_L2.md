# RAPPORT L2 — C10 Photos animaux Supabase Storage

Date : 2026-05-28
Statut : DONE (avec divergence brief documentée — voir §5)

## 1. Fichiers livrés

| Fichier | Statut | Bytes |
|---|---|---|
| `supabase/migrations/20260528120000_animaux_photo_storage.sql` | NEW | 2.1 KB |
| `app/src/app/(app)/cheptel/[id]/_photo-actions.ts` | NEW | 3.2 KB |
| `app/src/app/(app)/cheptel/[id]/_photo-upload.tsx` | NEW | 4.4 KB |

Aucun autre fichier touché. Migration NON appliquée (orchestrateur).

## 2. Vérifications obligatoires (sorties réelles)

```
V1 ls 2 fichiers          → app/src/app/(app)/cheptel/[id]/_photo-actions.ts
                            app/src/app/(app)/cheptel/[id]/_photo-upload.tsx   ✅
V2 ls migration            → supabase/migrations/20260528120000_animaux_photo_storage.sql ✅
V3 grep bucket/objects     → 14 (cible ≥5) ✅
V4 grep current_farm_id    → 4  (cible ≥4) ✅
V5 grep capture=           → capture="environment" présent ✅
```

## 3. Choix d'implémentation conformes au brief

- Bucket privé `animaux-photos` (tiret), MIME whitelist [webp, jpeg, png], 512 Ko.
- Path Storage `{ferme_id}/{animal_id}/{timestamp}.{ext}` (isolation tenant via `storage.foldername(name)[1]`).
- 3 policies RLS scopées via `public.current_farm_id()::text` (UUID → text cast).
- Compression client canvas → WebP 800px max, qualité 0.82, court-circuit si déjà ≤200 Ko WebP.
- URLs signées 1 an (`createSignedUrl(60*60*24*365)`).
- 1 photo principale par animal (override = remplace + delete ancien fichier via regex match du path dans l'URL signée).
- Rollback Storage si échec génération URL signée OU UPDATE animaux.
- Server actions idempotent : `supprimerPhotoAnimal` renvoie `{ok:true}` si déjà null.
- `input type=file accept="image/jpeg,image/png,image/webp" capture="environment"` → caméra arrière mobile, file picker desktop.
- Aucune nouvelle dep npm (sonner, lucide-react, @supabase/ssr déjà présents — vérifié `app/package.json`).
- `revalidatePath('/cheptel')` + `revalidatePath('/cheptel/${animalId}')` après mutation.

## 4. Conformité contraintes

- ❌ Pas de migration appliquée (orchestrateur).
- ❌ Pas de `npm run build`, pas de `tsc`, pas de commit, pas de push.
- ❌ Pas de modif `page.tsx`, `_tabs.tsx`, `_actions.ts`, `animal-photo-upload.tsx`.
- ❌ Pas de base64 dans `photo_url`.
- ❌ Pas de nouvelle dep npm.
- ✅ Charte §10 r.4 respectée : `current_farm_id()` réutilisée, non recréée.

## 5. DIVERGENCE BRIEF (importante — décision orchestrateur requise)

Le brief affirme "1ère intégration Storage du projet — 0 usage existant". **C'est faux.** L'état réel :

1. `animaux.photo_url` (text) **existe déjà** dans `supabase/migrations/20260523120000_smartfarm_genesis.sql:359`. La ligne `ALTER TABLE … ADD COLUMN IF NOT EXISTS photo_url text` de la nouvelle migration est donc NO-OP idempotent (sûr).
2. Bucket `animaux_photos` (**underscore**) déjà sécurisé dans archive `_archived_pre_genesis_20260523/20260526000001_r7_p1_secure_storage_animaux_photos.sql` (4 policies `*_own_farm` via `utilisateur_fermes`).
3. Server action `uploadPhotoAnimal` existe déjà dans `app/src/app/(app)/cheptel/[id]/_actions.ts:168-235` (validation MIME + signed URL 1 an).
4. Composant `AnimalPhotoUpload` existe (`app/src/components/animal-photo-upload.tsx`), câblé dans `cheptel/[id]/page.tsx:307-311` avec `uploadAction={uploadPhotoAnimal}`.
5. Le grep brief `grep -rln "@supabase/storage" app/src/lib` est correct (vide) mais TROMPEUR — l'usage Storage passe par `supabase.storage.from()` du client `@supabase/ssr` et vit dans `cheptel/[id]/_actions.ts`, pas dans `lib/`.

### Conséquences

Si l'orchestrateur applique la nouvelle migration TELLE QUELLE → on aura **2 buckets parallèles** :
- `animaux_photos` (underscore, scope via `utilisateur_fermes`, archive non rejouée) — utilisé en prod actuelle.
- `animaux-photos` (tiret, scope via `current_farm_id()`) — créé par la nouvelle migration, utilisé par les nouveaux fichiers livrés.

### Options orchestrateur

A. **Garder les 2 (cohabitation)** : nouveau code utilise `animaux-photos`, ancien code utilise `animaux_photos`. À terme, migrer données et supprimer l'ancien.
B. **Aligner sur l'existant** : éditer la migration + `_photo-actions.ts` pour utiliser `animaux_photos` (underscore). Adapter les policies pour pointer le bon bucket.
C. **Replacer l'ancien proprement** : nouvelle migration + DROP des anciennes policies + DELETE bucket `animaux_photos` (vide en prod ? à vérifier via dashboard Supabase) + remplacer `AnimalPhotoUpload`+`uploadPhotoAnimal` par `PhotoUpload`+`uploaderPhotoAnimal`.

Recommandation : **option C** (sinon dette technique = 2 buckets + 2 composants + 2 server actions pour la même feature). Mais nécessite vérif données prod existantes et arbitrage Christophe.

## 6. TODO orchestrateur (séquence)

1. Trancher options A/B/C ci-dessus avec Christophe.
2. Appliquer migration via Mgmt API (`POST /v1/projects/tpzhxjzwlxwujboboyit/database/query`).
3. Si option A : câbler `<PhotoUpload animalId tag photoUrl={animal.photo_url} />` dans `cheptel/[id]/page.tsx` à côté ou à la place de `<AnimalPhotoUpload>`.
4. Si option C : supprimer `app/src/components/animal-photo-upload.tsx`, retirer `uploadPhotoAnimal` de `_actions.ts`, mettre à jour `page.tsx`.
5. Smoke desktop + mobile Safari iOS (camera back, plein soleil) :
   - prise photo → compression WebP → upload → preview <2s
   - remplacement → ancien fichier supprimé du bucket
   - suppression → photo_url=null + fichier supprimé
   - cross-tenant : compte demo ne voit pas photos de ferme Yamoussoukro (RLS Storage)

## 7. Notes techniques

- `accept="image/jpeg,image/png,image/webp"` strict (pas `image/*`) → cohérent avec MIME bucket.
- `capture="environment"` ignoré silencieusement sur desktop (file picker normal).
- Regex de cleanup `/animaux-photos\/([^?]+)/` fonctionne sur URLs signées Supabase standard (`…/object/sign/animaux-photos/{path}?token=…`).
- `revalidatePath('/cheptel')` invalide la liste + page détail simultanément.
- Compression : si canvas API échoue (très rare), `Promise.reject` → toast erreur sans upload (best-effort comme spécifié brief).
