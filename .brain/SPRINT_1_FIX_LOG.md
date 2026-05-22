# Sprint 1 — Fix Log

## Bug #1 — Middleware : gate onboarding court-circuitée en QA Hostinger

**Date** : 2026-05-22
**Sprint** : 1 (F1 — onboarding wizard)
**Sévérité** : 🔴 Blocker QA (Sprint 1 non validable sans ce fix)

### Symptôme observé

Un utilisateur authentifié avec `utilisateurs.onboarded_at IS NULL` arrivait
directement sur `/dashboard` après login, au lieu d'être redirigé vers
`/onboarding` comme prévu par la gate F1 Sprint 1.

Reproductible en QA Hostinger sur `samotjeanmarc@gmail.com` (avant son
onboarding), `contact@smartfarm.group`, et `contact+confirm1@smartfarm.group`
(les trois ont `onboarded_at = null` en base).

### Diagnostic (root cause)

Lecture ligne par ligne de `src/middleware.ts` (version buggée) :

```ts
// 2) Bypass mode démo
const demoMode = process.env['SMARTFARM_DEMO_MODE']
if (demoMode !== 'false') {
  return NextResponse.next()    // ← BYPASS COMPLET, on sort du middleware
}
// ...
// 4) F1 Sprint 1 — Gate onboarding (JAMAIS atteint en démo)
if (path !== '/onboarding' && !path.startsWith('/onboarding/')) {
  const { data: profil } = await sb.from('utilisateurs')...
  if (profil && !profil.onboarded_at) {
    return NextResponse.redirect(/onboarding)
  }
}
```

Or `deploy.sh` ligne 37 force `export SMARTFARM_DEMO_MODE=true` à chaque
déploiement Hostinger. Conséquence :

- `demoMode = 'true'`
- `'true' !== 'false'` ⇒ `true`
- `return NextResponse.next()` exécuté **immédiatement** après les redirects
  sanitaire
- La gate onboarding (étape 4 du middleware) n'est **jamais évaluée**

Le commentaire dans `src/app/(auth)/_actions.ts` (ligne 15-17) confirmait
d'ailleurs le comportement attendu côté code legacy :
> *"Si SMARTFARM_DEMO_MODE=true, l'utilisateur arrive directement sur
> /dashboard via le middleware (bypass)."*

Mais ce comportement, écrit pour la démo Yamoussoukro 100% navigable sans
auth, **était antérieur à l'introduction de la gate F1 Sprint 1**. Personne
n'a re-ordonnancé la logique du middleware quand la gate onboarding a été
ajoutée.

### Hypothèses écartées

| # | Hypothèse | Verdict |
|---|---|---|
| 1 | RLS `utilisateurs_select_by_auth` n'autorise pas le SELECT côté middleware | ❌ — policy `auth_id = auth.uid()` existe et est correcte (vérifié via psql admin). Le client `createServerClient` avec cookies positionne bien `auth.uid()`. De toute façon le code n'arrivait jamais jusqu'à ce SELECT. |
| 2 | Matcher exclut `/dashboard` | ❌ — matcher `/((?!_next/static\|_next/image\|favicon.ico\|sitemap.xml\|robots.txt\|manifest.json).*)` capture bien `/dashboard`. |
| 3 | Middleware pas déployé | ❌ — fichier présent et identique à HEAD. |
| 4 | Bug condition `if (profil && !profil.onboarded_at)` | ❌ — condition correcte, mais inaccessible. |
| **5** | **Bypass démo court-circuite la gate onboarding** | ✅ **ROOT CAUSE** |

### Fix appliqué

Fichier : `app/src/middleware.ts`
Diff : `+37 / -12`

**Stratégie** : déplacer le bypass démo *après* la résolution de la session
Supabase et n'appliquer le bypass **que si aucune session n'est présente**.
Dès qu'un user est authentifié (même en démo), la gate onboarding F1 Sprint 1
s'applique.

Nouveau pipeline du middleware :

1. Redirects sanitaire (308)
2. Routes publiques (`/`, `/connexion`, `/inscription`, `/auth/*`, `/api/*`, statics) → passthrough
3. Création du client Supabase SSR + `sb.auth.getUser()`
4. **Bypass démo conditionnel** : si `SMARTFARM_DEMO_MODE != 'false'` **ET** pas de user → passthrough (Yamoussoukro mode)
5. Si pas de user en mode prod → redirect `/connexion?next=<path>`
6. **Gate onboarding** (F1 Sprint 1) : si `profil.onboarded_at IS NULL` et path n'est pas `/onboarding*` → redirect `/onboarding`

Logs `console.log('[mw] ...')` ajoutés à chaque branche décisionnelle pour
faciliter le debug runtime sur `tail -f /tmp/sf-standalone.log`. À retirer
après validation QA (TODO Sprint 1.1).

### Validation attendue

Cas QA à re-tester après redéploiement (`bash deploy.sh`) :

| Cas | Auth | onboarded_at | Path demandé | Attendu |
|---|---|---|---|---|
| A | ❌ | n/a | `/dashboard` | passthrough (démo Yamoussoukro) |
| B | ✅ | `null` | `/dashboard` | **redirect → `/onboarding`** ← le fix |
| C | ✅ | `null` | `/onboarding` | passthrough (sinon boucle) |
| D | ✅ | `2026-05-22 ...` | `/dashboard` | passthrough |
| E | ❌ | n/a | `/connexion` | passthrough (public) |

Cas B est le bug rapporté — couvert par le fix.
Cas A préserve le mode démo Yamoussoukro (régression évitée).

### Suivi

- [ ] Retirer les `console.log('[mw] ...')` après QA OK (ticket Sprint 1.1).
- [ ] Ajouter test e2e Playwright : user `onboarded_at = null` → `/dashboard` doit 302 vers `/onboarding`.
- [ ] Reviewer si `SMARTFARM_DEMO_MODE=true` reste pertinent en QA Hostinger maintenant que la gate marche — à terme on devrait passer QA en `SMARTFARM_DEMO_MODE=false` (vrai mode prod) puisque toute la chaîne Auth Supabase fonctionne.

### Fichiers modifiés

- `app/src/middleware.ts` (+37 / -12)
- `.brain/SPRINT_1_FIX_LOG.md` (créé)
