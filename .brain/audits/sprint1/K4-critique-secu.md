# K4 — Critique Sécurité/Data (Pentesteur paranoiaque)

> Audit adversaire Smart Farm avant 1er user externe. Mode "tu peux pas faire confiance".
> Date : 22 mai 2026. Environnement : Supabase local (Docker) + Next.js 16.2.6 standalone :3000.
> Tests **lecture seule** + INSERT/DELETE éphémères avec **rollback**. Aucun secret en clair dans ce rapport.

---

## Verdict : PRODUCTION-SÉCURISABLE ? **NON — pas en l'état**

5 raisons (toutes prouvées, POC ci-dessous) :

1. **Token API "secret" shippé en clair côté client** (`DEMO_API_TOKEN` === `NEXT_PUBLIC_DEMO_API_TOKEN`). N'importe quel visiteur du site lit le token dans DevTools et appelle `/api/export/animaux` ou `/api/registre` qui tournent en `service_role` → exfiltration **complète** de toutes les tables whitelistées.
2. **Bucket Storage `animaux_photos` ouvert aux 4 vents** : policies `anon`/`public` autorisent **INSERT / UPDATE / DELETE / SELECT** sans aucun check `bucket_id`-only ; pas de scoping `ferme_id`, pas de check MIME/taille, pas de filtre path. POC : upload arbitraire `EVIL/fake-tenant-42/payload.txt` réussi en anonyme.
3. **Pas d'auth applicative** : toutes les pages `/dashboard /cheptel /reproduction /sanitaire /kpi /alertes /parametres` renvoient **200** sans cookie ni session. Middleware Next ne fait que des redirects sanitaires, aucun check d'identité.
4. **`service_role` partout côté SSR** (18 fichiers d'actions/API utilisent la clé admin DB). Toutes les RLS sont bypassées en mode demo. Le switch `SMARTFARM_DEMO_MODE=false` ne supprime pas les 18 imports directs `createClient(URL, SERVICE_ROLE_KEY)` qui bypassent le wrapper SSR — bascule prod = trou multi-tenant ouvert.
5. **Headers de sécurité totalement absents** : pas de CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Aucun cookie SameSite/HttpOnly émis. Clickjacking, MIME sniffing, framing — tout est ouvert.

---

## Score par axe /10

| Axe | Note | Justification |
|---|---|---|
| RLS (DB) | **8/10** | 44/44 tables RLS=ON, 102 policies, WITH CHECK sur INSERT. `pesees`/`vaccinations`/`traitements` policies tenant-scoped via JOIN à `animaux.ferme_id`. **MAIS** systématiquement bypassé par `service_role` côté app. |
| Injection | **8/10** | Zod partout (44 occurrences), pas de string concat SQL, pas de `dangerouslySetInnerHTML` côté UI. `/api/export/[table]` whitelistée (12 tables). |
| Auth | **1/10** | Aucune auth. Pages publiques. Token API "secret" shippé côté client. Pas de cookie session. |
| Storage | **0/10** | Bucket `public=true`, policies anon CRUD complet, pas de scoping `ferme_id`/`path`, pas de validation type/taille. |
| Intégrité | **3/10** | Audit logs sur 26 tables (excellent), UTC en DB, mais : 5 hard DELETE (plans, consommations, matières, formulations, protocoles), pas d'`updated_at`/`version` sur 11/12 tables critiques (cf. audit C), aucune transaction côté JS (cf. audit C P0-1 à P0-6 déjà reproduits). |
| Secrets | **3/10** | `.env.local` pas dans git ✅, `service_role` jamais shipped au bundle client ✅, **MAIS** `DEMO_API_TOKEN` privé = `NEXT_PUBLIC_DEMO_API_TOKEN` public ⛔ + `OPENROUTER_API_KEY` côté serveur uniquement ✅. |
| RGPD | **4/10** | Données nominatives faibles (juste `acheteur` dans `departs` et `nom_visiteur` dans biosécurité, pas de table éleveur/ouvrier détaillée). Soft delete sur 27/44 tables. **Pas d'API export user-driven**, pas de purge programmée, pas de retention policy formelle. |

**Score global moyen : 3.9/10** → NO-GO prod multi-clients.

---

## TOP 10 VULNÉRABILITÉS P0 (POC reproductibles)

### V1 — Exfiltration totale via token "public" exposé au browser ★ CRITICAL

**Gravité** : Critical
**Composant** : `src/lib/api-auth.ts` + `.env.local` (`DEMO_API_TOKEN` === `NEXT_PUBLIC_DEMO_API_TOKEN`)

**Description** : L'API d'export (`/api/export/[table]`, `/api/registre`, `/api/kpi/refresh`) est protégée par `DEMO_API_TOKEN` côté serveur (timingSafeEqual). MAIS le `.env.local` définit aussi `NEXT_PUBLIC_DEMO_API_TOKEN` avec **la même valeur** pour que le bouton "Exporter" client puisse appeler l'API. Le préfixe `NEXT_PUBLIC_` ⇒ Next inline cette valeur dans **tous les chunks JS** servis au browser. Conséquence : un visiteur (même non authentifié au sens applicatif, vu que pas d'auth) ouvre DevTools, lit le token, et appelle l'API directement → **bypass de l'auth + exfiltration en `service_role` (RLS bypass)** de 12 tables (animaux, bandes, saillies, mises_bas, sevrages, pesees, vaccinations, traitements, mortalites, matieres_premieres, mouvements_stock, departs).

**POC** :
```bash
# Récupérer le token "public" depuis le bundle client (=DevTools côté navigateur)
TOK=$(grep -oE 'NEXT_PUBLIC_DEMO_API_TOKEN[^"]{0,200}' /root/projects/smartfarm/app/.next/static/chunks/*.js \
  | head -1 | grep -oE '[A-Za-z0-9+/=]{40,}')
# Ou plus simple : ouvrir n'importe quel chunk JS du site → ctrl-F
curl -s -H "Authorization: Bearer $TOK" \
  http://127.0.0.1:3000/api/export/animaux -o exfil.csv
wc -l exfil.csv         # → toute la table animaux
curl -s -H "Authorization: Bearer $TOK" \
  http://127.0.0.1:3000/api/export/mouvements_stock -o stock.csv
# /api/kpi/refresh peut être hammered → DoS la matview
```
**Test exécuté** : `HTTP 200 bytes=4001` sur `/api/export/animaux` (2 truies + header CSV). Confirmé.

**Mitigation** :
- **Court terme** : retirer `NEXT_PUBLIC_DEMO_API_TOKEN`, basculer le bouton "Exporter" en **Server Action** qui pipe le CSV à la réponse (le token reste 100% côté serveur).
- **Long terme** : remplacer ce token statique par une **session Supabase Auth** (cookie HttpOnly) + RLS prend le relais, plus de `service_role` côté API.

---

### V2 — Storage bucket `animaux_photos` totalement ouvert ★ CRITICAL

**Gravité** : Critical
**Composant** : Policies `storage.objects` (`animaux_photos_*`)

**Description** : Les 4 policies du bucket sont triviales — uniquement check `bucket_id = 'animaux_photos'`. Aucun scoping :
- `animaux_photos_read` : `SELECT` ouvert à `public` (anon + auth)
- `animaux_photos_insert` : `INSERT` ouvert à `anon` + `authenticated`, aucun WITH CHECK sur path/ferme
- `animaux_photos_update`/`animaux_photos_delete` : idem pour DELETE/UPDATE

Conséquences :
1. Path traversal : un attaquant écrit `FERME_AUTRE_TENANT/<uuid>.jpg` et écrase/insère des images chez un autre éleveur.
2. Hébergement abusif : bucket = stockage public gratuit pour malware/warez (`*.exe`, `*.iso`).
3. Pas de check taille/MIME → DoS disque (uploader 10 GB).
4. Suppression hostile : `DELETE` anon permet d'effacer toute photo de n'importe quelle ferme.

**POC** (exécuté, rollback effectué) :
```bash
ANON=sb_publishable_XXXX  # publishable, lisible publiquement
# Upload arbitraire path traversal
curl -s -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -X POST --data-binary @evil.txt \
  "http://127.0.0.1:54321/storage/v1/object/animaux_photos/EVIL/fake-tenant-42/payload.txt"
# → {"Key":"animaux_photos/EVIL/fake-tenant-42/payload.txt","Id":"96e3ddf6-…"}
# Lecture publique
curl -s "http://127.0.0.1:54321/storage/v1/object/public/animaux_photos/EVIL/fake-tenant-42/payload.txt"
# → HTTP 200, contenu rendu
# DELETE anon
curl -X DELETE -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "http://127.0.0.1:54321/storage/v1/object/animaux_photos/EVIL/fake-tenant-42/payload.txt"
# → {"message":"Successfully deleted"}
```
**Verdict** : 100% des opérations réussies sans auth. Rollback : `DELETE` du fichier de test effectué.

**Mitigation** :
```sql
DROP POLICY animaux_photos_insert ON storage.objects;
DROP POLICY animaux_photos_update ON storage.objects;
DROP POLICY animaux_photos_delete ON storage.objects;
DROP POLICY animaux_photos_read   ON storage.objects;

-- Bucket non-public, signed URLs uniquement
UPDATE storage.buckets SET public = false WHERE id = 'animaux_photos';

-- INSERT : auth + path commence par "<ferme_id>/"
CREATE POLICY animaux_photos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'animaux_photos'
    AND (storage.foldername(name))[1] = current_farm_id()::text
  );
-- SELECT/UPDATE/DELETE idem + check rôle
-- Côté Server Action : validation MIME (image/jpeg, image/webp) + taille (5 MB max).
```

---

### V3 — Aucune authentification applicative ★ CRITICAL

**Gravité** : Critical
**Composant** : `src/middleware.ts` (ne fait que des redirects), pas de wrapper auth sur `(app)`

**Description** : Toutes les pages du segment `(app)` (dashboard, cheptel, reproduction, sanitaire, kpi, alertes, paramètres) sont accessibles directement en GET HTTP sans aucune session/cookie.

**POC** :
```bash
for p in / /dashboard /cheptel /reproduction /sanitaire /kpi /alertes /parametres; do
  curl -s -o /dev/null -w "%{http_code} $p\n" http://127.0.0.1:3000$p
done
# Sortie : 200 partout
```

**Impact** : seul rempart actuel = ne pas connaître l'URL publique. Si la VPS expose `:3000` sans Traefik+auth, **toute la base est lisible** (les pages SSR récupèrent les données via `service_role` côté server). Les server actions d'écriture (form submission) n'ont aucun contrôle d'auth non plus — un attaquant qui devine l'ID Next-Action peut écrire.

**Mitigation** :
- Brancher Supabase Auth (magic link, OTP SMS, ou OIDC) + middleware Next qui vérifie session sur `(app)/*`.
- Tant que pas branché : **mettre l'app derrière Traefik basic_auth ou IP allowlist** (mesure compensatoire).

---

### V4 — `service_role` utilisé dans 18 fichiers (RLS bypass total) ★ HIGH

**Gravité** : High
**Composant** : 18 fichiers — 4 API routes + 14 Server Actions + 1 lib chatbot

**Description** :
```
src/app/api/registre/route.ts
src/app/api/export/[table]/route.ts
src/app/api/kpi/refresh/route.ts
src/app/api/chatbot/route.ts (via createClient wrapper)
src/app/(app)/cheptel/{_server-actions,_actions,[id]/_actions}.ts
src/app/(app)/reproduction/_server-actions.ts
src/app/(app)/pesees/_server-actions.ts
src/app/(app)/alimentation/{formulation,matieres,consommations,plans}/_actions.ts
src/app/(app)/stock/_server-actions.ts
src/app/(app)/bandes/{_server-actions,[id]/_actions}.ts
src/app/(app)/mises-bas/_server-actions.ts
src/app/(app)/sanitaire/{eau,calendrier,calendrier-porcelets,_server-actions,protocoles,mycotoxines,ppa,biosecurite}/_actions.ts
src/lib/chatbot/rag.ts
src/lib/supabase/server.ts (wrapper demo)
src/lib/supabase/ferme-context.ts (helper)
```

Chacun `createClient(URL, SUPABASE_SERVICE_ROLE_KEY)` → tous les checks RLS sont court-circuités. Le mode demo masque le problème (un seul tenant). En multi-tenant prod = **fuite croisée garantie** si bug logique.

**Sub-vulnérabilité V4.1** : 6 fichiers Server Actions n'utilisent NI `getFermeId()` NI `DEMO_FERME_ID` :
```
mises-bas/_server-actions.ts          → ferme_id dérivé via saillie (OK mais fragile)
pesees/_server-actions.ts             → AUCUN ferme_id inséré (pas de col ferme_id sur pesees, OK)
bandes/[id]/_actions.ts               → suppose bande déjà attachée à une ferme
cheptel/[id]/_actions.ts              → idem animal
sanitaire/calendrier/_actions.ts      → idem
sanitaire/calendrier/_actions-porcelets.ts → idem
```
→ Si la table cible a un FK vers une ferme et qu'on insère sans check, on peut **forger un FK cross-tenant** quand `service_role` actif.

**Sub-vulnérabilité V4.2** : 11 fichiers hardcodent `const DEMO_FERME_ID = '00000000-0000-0000-0000-000000000001'`. En prod, ils écriront tous dans la ferme démo, ou pire (constante remplacée à la main) dans la mauvaise ferme.

**POC (DB côté)** :
```bash
# Avec service_role (clé serveur), aucun filtre :
docker exec supabase_db_smartfarm psql -U postgres -d postgres -c \
  "SELECT count(*), array_agg(DISTINCT ferme_id) FROM animaux;"
# Voit toutes les fermes.

# Avec anon JWT seul (= comportement prod attendu) : bloqué proprement
curl -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  "http://127.0.0.1:54321/rest/v1/animaux?select=*&limit=5"
# → []  ✅ RLS fonctionne, c'est juste que l'app contourne.
```

**Mitigation** :
- Remplacer **partout** `createClient(URL, SERVICE_ROLE_KEY)` par `createClient()` (le wrapper SSR de `src/lib/supabase/server.ts`).
- Brancher Supabase Auth.
- Garder `service_role` uniquement pour 2-3 RPC cron (refresh_kpi_views, seeds) appelés via webhook signé.
- Test go/no-go : `grep -rn "SERVICE_ROLE_KEY" src/` doit retourner **0** dans `(app)/*/_actions.ts`.

---

### V5 — Headers de sécurité totalement absents ★ HIGH

**Gravité** : High
**Composant** : `next.config.ts` (3 lignes, juste `output:"standalone"`)

**Description** : Aucun CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. Pas de cookie applicatif (puisque pas d'auth) donc pas de SameSite/HttpOnly à juger — mais quand auth branchée, faudra y penser.

**POC** :
```bash
curl -sI http://127.0.0.1:3000/dashboard | grep -iE 'csp|frame|hsts|xss|referrer|permissions'
# → vide
```

**Impact** :
- **Clickjacking** : site embed dans iframe par phishing.
- **XSS chaining** : sans CSP, une injection devient exécutable trivialement.
- **MIME sniff** : navigateurs vont parfois exécuter `image/jpeg` comme JS.

**Mitigation** :
```ts
// next.config.ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'Content-Security-Policy', value:
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://openrouter.ai; frame-ancestors 'none';" },
    ],
  }]
}
```

---

### V6 — Hard DELETE sur 5 tables critiques (audit log perdu) ★ HIGH

**Gravité** : High
**Composant** : 5 server actions

```
alimentation/plans/_actions.ts:74           → .delete() plans_alimentation
alimentation/consommations/_actions.ts:107  → .delete() consommations_aliment
alimentation/matieres/_actions.ts:123       → .delete() matieres_premieres (!)
alimentation/formulation/_actions.ts:99     → .delete() formulations
sanitaire/protocoles/_actions.ts:138        → .delete() protocoles_vaccinaux
```

**Description** : Ces tables ont toutes un trigger `audit_log` (cf. audit DB) qui capture le DELETE. MAIS si l'attaquant a `service_role` (V1 → token public), ces 5 endpoints permettent **destruction permanente** sans soft-delete. Notamment `matieres_premieres` (stock physique) → l'éleveur perd la traçabilité de ses ingrédients.

**POC** : pas exécuté (destructif). Voir le code direct :
```ts
// alimentation/matieres/_actions.ts:123
const { error } = await sb().from('matieres_premieres').delete().eq('id', id)
// Pas de .update({deleted_at:now()}). DEFINITIF.
```

**Mitigation** :
- Ajouter `deleted_at` (où absent : `consommations_aliment`, `formulations`, `protocoles_vaccinaux` n'en ont pas).
- Remplacer `.delete()` par `.update({ deleted_at: new Date().toISOString() })`.
- Toutes les vues `WHERE deleted_at IS NULL`.

---

### V7 — Pas de validation MIME/taille sur uploads photo animaux ★ HIGH

**Gravité** : High
**Composant** : aucun code de validation Storage côté client/server

**Description** : `grep -rn 'image/\|mimetype\|fileSize\|maxFileSize' src/` → **0 result**. Le bucket accepte tout : .exe, .iso, fichiers de 10 Go. Combiné à V2, c'est un hébergement public gratuit.

**Mitigation** : politique bucket + check côté Server Action :
```ts
const ALLOWED = ['image/jpeg','image/png','image/webp']
if (!ALLOWED.includes(file.type)) throw new Error('Type non autorisé')
if (file.size > 5_000_000) throw new Error('Trop gros (>5 Mo)')
```
+ option Supabase `allowed_mime_types`, `file_size_limit` sur le bucket.

---

### V8 — Inconsistance `DEMO_FERME_ID` hardcodé vs `getFermeId()` ★ MEDIUM

**Gravité** : Medium (devient High en bascule prod)
**Composant** : 11 fichiers hardcodent la constante, 6 fichiers ne référencent ni l'un ni l'autre

**Description** : Le helper propre `getFermeId()` (qui sait basculer demo→prod via `SMARTFARM_DEMO_MODE`) n'est utilisé que par 1 fichier (`cheptel/_server-actions.ts`). Les 11 autres déclarent leur propre `const DEMO_FERME_ID = '00000000-…0001'`. Le jour du switch prod, 11 endroits écriront dans la ferme démo en aveugle même si l'utilisateur est un autre tenant. Si la constante est modifiée manuellement → race conditions sur ferme arbitraire.

**POC** :
```bash
grep -rln "const DEMO_FERME_ID\b" /root/projects/smartfarm/app/src
# → 11 fichiers
grep -rln "getFermeId" /root/projects/smartfarm/app/src
# → 2 fichiers (le helper + cheptel)
```

**Mitigation** : remplacer **partout** `const DEMO_FERME_ID = '...'` + usage par `import { getFermeId } from '@/lib/supabase/ferme-context'` + `await getFermeId()`. Migration mécanique.

---

### V9 — Pas d'`updated_at`/`version` → lost updates en multi-user ★ MEDIUM

**Gravité** : Medium (déjà rapporté audit C P0-8, je l'embarque pour complétude)
**Composant** : 11/12 tables critiques sans optimistic concurrency

```
animaux            : updated_at ✅, version ❌
saillies/mises_bas : ❌ ❌
matieres_premieres : ❌ ❌ (CRITIQUE — stock_actuel updaté en SELECT-then-UPDATE → lost update prouvé)
```

**POC** : voir audit C — `/tmp/stock_race.py` reproduit perte 10 kg sur stock.

**Mitigation** : déjà détaillée audit C section "Patterns 2 — Optimistic concurrency".

---

### V10 — Token chatbot HMAC : OK mais clé secrète sans rotation, exposed via .env.local ★ LOW

**Gravité** : Low
**Composant** : `src/lib/chatbot/session-token.ts` + `.env.local` (`CHATBOT_SESSION_SECRET`)

**Description** : Le chatbot signe les sessions avec HMAC d'un secret long-vie. Pas de rotation, pas de versionnage de clé. Si le secret fuite (backup, dump), tout token forgé est valide pour toujours.

**POC** : non exécuté (pas de PoC offensif, juste design review).

**Mitigation** :
- Inclure `kid` (key ID) dans le token, supporter rotation.
- TTL court (15 min) + refresh endpoint.
- Rate limit déjà OK (20 req/min in-memory).

---

## Tests live exécutés

| # | Test | Résultat | Rollback |
|---|---|---|---|
| 1 | `GET /api/export/animaux` sans Authorization | HTTP 401 `{"error":"Unauthorized"}` | n/a |
| 2 | `GET /api/export/animaux` avec `NEXT_PUBLIC_DEMO_API_TOKEN` (lu depuis .env) | **HTTP 200, 4001 bytes** (CSV complet T-001, T-002, …) | fichier exfil supprimé `/tmp/k4-leak-anim.csv` |
| 3 | `GET /api/export/mouvements_stock` avec token public | **HTTP 200** (vide en mode demo mais accessible) | idem |
| 4 | `GET /api/registre`, `/api/kpi/refresh`, `/api/chatbot` sans token | HTTP 401 partout | n/a |
| 5 | `GET /dashboard /cheptel /reproduction /kpi /alertes` sans cookie | **HTTP 200 partout** | n/a |
| 6 | PostgREST `GET /rest/v1/animaux` avec `anon` key | `[]` (RLS bloque, OK) | n/a |
| 7 | PostgREST `POST /rest/v1/saillies` avec `anon` | HTTP 401 `new row violates RLS policy` (OK) | n/a |
| 8 | Storage `POST /storage/v1/object/animaux_photos/EVIL/fake/payload.txt` anon | **HTTP 200, fichier créé** | `DELETE` exécuté, retourné `Successfully deleted` ✅ |
| 9 | Storage `GET /storage/v1/object/public/animaux_photos/EVIL/...` anon | **HTTP 200** (lecture publique) | rollback via test 8 |
| 10 | Storage `DELETE` anon de l'objet | **HTTP 200 Successfully deleted** | propre |
| 11 | `INSERT pesees` en role `anon` sans ferme/animal | HTTP 401 RLS (OK) | n/a |
| 12 | `INSERT pesees` en role `anon` avec `bande_id` quelconque | `INSERT 0 0` (silencieusement, OK car EXISTS faux) | aucun row inséré |
| 13 | Tentative `Next-Action` ID bidon avec `Origin: https://evil.example.com` | HTTP 500 digest, **pas de check Origin explicite** | n/a |
| 14 | Search `service_role` prefix 30-char dans `.next/static/**` | aucune occurrence (clé NON shipped) ✅ | n/a |
| 15 | Search `DEMO_API_TOKEN` 8-char prefix dans `.next/static/**` | **présent dans 5+ chunks** (token shipped) ⛔ | n/a |
| 16 | Comparaison `DEMO_API_TOKEN` vs `NEXT_PUBLIC_DEMO_API_TOKEN` | **IDENTIQUES** ⛔ | n/a |

---

## Secrets check

Grep secrets dans `src/` + bundle :

| Pattern | Hits source | Hits bundle client | Verdict |
|---|---|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` (référence env) | 26 fichiers | **0** (préfixe 30-char unique non trouvé en `.next/static/`) | ✅ jamais shipped |
| `process.env.NEXT_PUBLIC_*` | 7 usages | shipped (normal pour publique) | ⚠️ `NEXT_PUBLIC_DEMO_API_TOKEN` ne devrait pas exister |
| `DEMO_API_TOKEN` privé (64 chars) | 1 fichier (`api-auth.ts`) | **présent dans 5+ chunks** car valeur identique à NEXT_PUBLIC | ⛔ |
| `OPENROUTER_API_KEY` | 1 fichier (`chatbot/provider.ts`) | 0 | ✅ |
| `CHATBOT_SESSION_SECRET` | 1 fichier (`session-token.ts`) | 0 | ✅ |
| Hardcoded passwords `password\s*=\s*"` | 0 | 0 | ✅ |
| Hardcoded GitHub tokens `ghp_`, AWS `sk_` | 0 | 0 | ✅ |
| `.env*` tracked in git | uniquement `scripts/switch-env.sh` (script utilitaire, OK) | n/a | ✅ |
| `.gitignore` couvre `.env.local` | non listé explicitement mais `.env*` non commités | n/a | ⚠️ ajouter `*.env.local*` explicite |

---

## Recommandations sécurité prio

### Bloquant pour 1er user externe (avant prod)

1. **Supprimer `NEXT_PUBLIC_DEMO_API_TOKEN`** + basculer "Exporter" et "Registre" en Server Actions (renvoient le CSV/PDF directement, jamais d'appel client→API). (V1)
2. **Brancher Supabase Auth** (magic link minimum) + middleware Next sur `(app)/*`. (V3)
3. **Verrouiller bucket Storage** `animaux_photos` : `public=false`, policies scoped par `ferme_id`/path, validation MIME+taille côté Server Action. (V2, V7)
4. **Remplacer `service_role` par wrapper SSR auth** dans les 18 fichiers (uniformiser via `import { createClient } from '@/lib/supabase/server'`). (V4)
5. **Headers de sécurité** dans `next.config.ts` (CSP, HSTS, XFO, etc.). (V5)
6. **Soft delete partout** : remplacer les 5 `.delete()` hard par `.update({ deleted_at: now() })`. (V6)
7. **Mesure compensatoire en attendant auth** : Traefik basic-auth ou IP allowlist sur :3000.

### Hardening Sprint 2

8. Migration mécanique `DEMO_FERME_ID` hardcodé → `getFermeId()`. (V8)
9. Optimistic concurrency (`updated_at` + `version`) sur 11 tables critiques. (V9 / audit C P0-8)
10. Rotation `CHATBOT_SESSION_SECRET` + `kid`. (V10)
11. Pen-test externe (boîte tierce) après ces 10 fix.

### Quick wins (< 1h)

- Ajouter `*.env*` ligne explicite dans `.gitignore` (défense en profondeur).
- Activer `bucket.allowed_mime_types = ['image/jpeg','image/png','image/webp']` + `bucket.file_size_limit = 5242880` (5 MB) en attendant la refonte des policies.
- Désactiver `/api/kpi/refresh` POST anonyme si token public → bouton "Recalculer KPI" doit passer par Server Action.

---

## Verdict final

**ALLOWED IN PROD : NON.**

Smart Farm est **fonctionnellement solide** côté business (audits A, C, D, F1, F3 montrent une UI mûre, des KPI IFIP, des règles métier 28/28 actives) et **RLS côté DB est correctement écrite** (44/44 tables RLS=ON, 102 policies cohérentes, WITH CHECK en place sur INSERT, jointures multi-tenant via `animaux.ferme_id`). Mais l'**application en frontal contourne ces protections** :

- pas d'auth applicative
- `service_role` partout côté SSR
- token "secret" leaked au client
- Storage bucket totalement ouvert
- aucun header sécurité HTTP

**Conditions à satisfaire avant le 1er user externe** (ordre d'urgence) :

1. ✅ V1 résolu — `NEXT_PUBLIC_DEMO_API_TOKEN` supprimé, exports en Server Action.
2. ✅ V3 résolu — Supabase Auth branché, middleware Next protège `(app)/*`.
3. ✅ V2 + V7 résolus — bucket privé, policies scoped, validation MIME/taille.
4. ✅ V4 résolu — `service_role` uniquement dans 0-2 endpoints cron signés, jamais dans Server Actions UI.
5. ✅ V5 résolu — headers `CSP`/`HSTS`/`XFO` configurés.
6. ✅ V6 résolu — 5 hard DELETE convertis en soft delete.
7. ✅ Audit C P0-1 à P0-7 résolus (race conditions stock + saillies + mortalité, déjà documentés).
8. ✅ Smoke pentest externe sur l'app sécurisée.

**Sans ces 8 conditions** : ne pas confier 1 seule donnée réelle d'éleveur à cette app. Le mode demo masque la totalité des trous parce qu'il n'y a qu'un tenant et que personne ne sait que l'app existe. Dès qu'on publie l'URL = exfil totale en 30 secondes via DevTools.

— Fin K4 · 22 mai 2026
