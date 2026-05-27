# BRIEF — Audit sécurité branche `feat/phase-a-quick-wins` + patch (non appliqué BDD)

**Date** : 2026-05-27 (soir)
**Branche** : `feat/phase-a-quick-wins`
**Auteur** : Claude Code session 1 (Opus 4.7 1M ctx)
**Destinataire** : Claude Code session 2 (toi)
**Statut migrations** : ✅ patchs disque OK · ❌ **NON APPLIQUÉES en BDD** (blocage MCP — voir §4)

---

## 1. Contexte

Christophe a installé le plugin `security-guidance@2.0.0` (claude-plugins-official) et demandé un audit du projet. Audit lancé via sub-agent `security-reviewer` NSA-level sur le diff complet de la branche + les 3 nouvelles migrations SQL B1/B1-seed/B3 + le module `sanitaire/actes/` neuf.

**5 findings actionnés** : 2 P0 bloquants + 1 P1 sérieux + 1 P1 SSRF différé + 1 config plugin manquante.
**4 findings reportés** en P2 (cf §6).

---

## 2. Fichiers modifiés / créés (non commités)

| Fichier | Statut | Diff |
|---|---|---|
| `.claude/claude-security-guidance.md` | **nouveau** (4.4 KB) | Règles métier Smart Farm pour le plugin (RLS, SECURITY INVOKER, filtres animaux, secrets, …). Concaténé à chaque LLM review du plugin. |
| `app/src/app/(app)/sanitaire/actes/_server-actions.ts` | edit (+24 lignes) | Check FK `animal_id`/`bande_id` ∈ ferme courante via RLS SELECT avant INSERT |
| `app/src/app/(app)/sanitaire/actes/_schemas.ts` | edit (+12 lignes) | Refine Zod `ordonnance_url` : protocol https/http only |
| `supabase/migrations/20260527160100_seed_veterinaires_standards.sql` | edit | `REVOKE EXECUTE ... FROM authenticated, anon, PUBLIC` + `GRANT EXECUTE ... TO service_role` only |
| `supabase/migrations/20260527190000_security_hardening_rpc_anon.sql` | **nouveau** | `REVOKE EXECUTE ON FUNCTION public.email_par_numero_client(TEXT) FROM anon` (fonction définie dans `_archived_pre_genesis_20260523/`, déjà en prod) |

**Vérifs déterministes faites** :
- `cd app && npx tsc --noEmit` → 0 erreur nouvelle (1 préexistante hors scope : `mortalites/_dialog-mortalite.tsx:463`)
- Plugin security layer 1 (regex) a déclenché 3 warnings sur `claude-security-guidance.md` → faux positifs attendus (mentions textuelles `new Function` / `dangerouslySetInnerHTML` / `yaml.load` documentées comme interdites — pas d'usage réel)

---

## 3. Findings corrigés (référence rapide pour review code)

### P0-1 — IDOR cross-ferme acte sanitaire
**Vecteur** : `creerActeSanitaire` recevait `animal_id` / `bande_id` du client et les insérait sans vérifier l'appartenance à `ferme_id`. RLS INSERT sur `actes_sanitaires` valide `ferme_id ∈ user_farms` mais PAS les FK latérales. User avec 2 comptes pouvait créer un acte sur ferme A pointant un animal de ferme B.
**Fix** : `_server-actions.ts:38-65` — SELECT préalable sur `animaux`/`bandes` (filtre RLS automatique) ; `null` ⇒ rejet `"Animal introuvable ou hors périmètre."`.

### P0-2 — Privilege escalation `seed_veterinaires_standards`
**Vecteur** : Fonction `SECURITY DEFINER` avec `GRANT EXECUTE TO authenticated`. Insère `ferme_id = NULL` (standard partagé), contournant la RLS INSERT qui interdit explicitement ce cas. Tout user pouvait `POST /rest/v1/rpc/seed_veterinaires_standards` via PostgREST.
**Fix** : migration `20260527160100` — `REVOKE FROM PUBLIC/authenticated/anon`, `GRANT TO service_role` only. Le seed initial dans la migration tourne en owner postgres, OK.

### P1-3 — User enumeration `email_par_numero_client`
**Vecteur** : RPC callable par `anon`, lookup email par numéro SF-XXXXXX (espace 1M). Brute-force ~10h à 3 req/s exfiltre tous les emails éleveurs.
**Fix** : nouvelle migration `20260527190000` — `REVOKE FROM anon`, garde `authenticated + service_role`.
**Trade-off** : un user qui ne s'est jamais authentifié ne peut plus utiliser le login alt par numéro client. Flow attendu : inscription → email confirmation → 1er login = transition acceptable. À reconsidérer Phase D avec wrapper rate-limit pg_sleep.

### P1-5 — SSRF différé `ordonnance_url`
**Vecteur** : Stockage URL sans validation de protocole. Aucun fetch server-side aujourd'hui, donc pas exploitable, mais piège pour la prochaine feature qui voudrait télécharger/valider l'ordonnance.
**Fix** : `_schemas.ts:44-58` — refine Zod, protocol `https:` ou `http:` only.

### Config plugin — `.claude/claude-security-guidance.md` créé
Sans ce fichier, le plugin tournait avec ses règles built-in seules, ignorant tous les invariants Smart Farm (RLS multi-tenant, `current_farm_id()`, SECURITY INVOKER obligatoire, filtres `statut`/`deleted_at`, comptes test vs prod). Maintenant concaténé à chaque review LLM Stop hook.

---

## 4. BLOCAGE BDD — MCP Supabase pointe sur le mauvais projet

**Découverte critique en tentant `apply_migration`** :

| Source | project_ref |
|---|---|
| MCP Supabase actuel (`get_project_url`) | `jcritwravdwefwqwyjvk.supabase.co` |
| CLAUDE.md + `.brain/CONTEXT.md` Smart Farm prod | **`tpzhxjzwlxwujboboyit`** |

Le MCP est connecté à une instance **legacy V2x** (tables : `sows`, `boars`, `batches`, `farms`, `farm_members`, `troupeaux`, `loges`, `pesees`, `lots`, etc.). Dernière migration `list_migrations` = **20260518205607** (`20260518_rls_hardening`). **La genesis V2 du 23/05 (`20260523120000_smartfarm_genesis.sql`, commit `0236013`) n'apparaît pas — elle n'a jamais été appliquée à ce projet.**

Tables canoniques V2 du nouveau code (`fermes`, `animaux`, `bandes`, `user_farms`, `utilisateurs`, fonction `current_farm_id()`) → **toutes absentes**.

→ J'ai refusé d'appliquer. Pousser sur `jcritwravdwefwqwyjvk` aurait causé FK violations + tables fantômes dans le mauvais projet.

**À faire AVANT de pouvoir appliquer (toi ou Christophe)** :
1. Confirmer quel projet est la vraie prod Smart Farm V2 (`tpzhxjzwlxwujboboyit` ou un autre).
2. Vérifier sur ce projet que la genesis 20260523 + toutes les migrations entre 20260524 et 20260525 sont appliquées (`supabase migration list --project-ref <ref>`).
3. Soit reconfigurer le MCP (changer `SUPABASE_ACCESS_TOKEN` ou project-ref dans config Claude Code), soit `supabase db push --project-ref tpzhxjzwlxwujboboyit` en CLI direct.
4. Ensuite, dans l'ordre lexico naturel, ces 4 migrations seront appliquées :
   - `20260527160000_create_veterinaires_standards.sql`
   - `20260527160100_seed_veterinaires_standards.sql` (modifié — REVOKE auth)
   - `20260527170000_actes_sanitaires.sql`
   - `20260527180000_mortalites.sql` (déjà sur disque, pas touché par moi)
   - `20260527190000_security_hardening_rpc_anon.sql` (nouveau — REVOKE email_par_numero_client FROM anon)

---

## 5. Smoke test attendu post-application

Après push migrations sur le bon projet, à exécuter :

```bash
# 1. Login compte demo
demo@smartfarm.group / Demo6734N0xUHH1I

# 2. Tenter IDOR (curl direct sur server action, animal_id d'une autre ferme)
#    → doit renvoyer "Animal introuvable ou hors périmètre."

# 3. Tenter privilege escalation RPC (en tant qu'authenticated)
curl -X POST "$SUPABASE_URL/rest/v1/rpc/seed_veterinaires_standards" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"p_ferme": null}'
#    → doit renvoyer 403 / "permission denied"

# 4. Tenter enumeration anon
curl -X POST "$SUPABASE_URL/rest/v1/rpc/email_par_numero_client" \
  -H "apikey: $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"p_numero": "SF-000001"}'
#    → doit renvoyer 403 / "permission denied"

# 5. Login alt par numéro client (user authentifié au moins une fois) → doit MARCHER
```

---

## 6. P1/P2 non patchés (laissés volontairement à toi ou Christophe)

| # | Finding | Effort | Recommandation |
|---|---|---|---|
| P1-4 | `inscriptionAction` lit `numero_client` post-`signUp` sans session si email confirmations activées | 30 min | Wrapper en fonction `SECURITY DEFINER` callable par `service_role` post-signUp, OU documenter explicitement la config Supabase (email confirmations OFF) |
| P2-6 | Stub `veterinaires_standards` dans bloc DO de B3 sans `ENABLE ROW LEVEL SECURITY` | 5 min | Ordre lexico naturel garantit B1 avant B3 → race théorique. Ajout `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` dans le bloc DO si tu veux blinder. |
| P2-7 | Bug latent `dashboard/page.tsx:74` query `.from('utilisateur_fermes')` → table inexistante (canonique = `user_farms`). `.maybeSingle()` swallow l'erreur 42P01 silencieusement, `fermeNom = null`. | 5 min | Renommer en `user_farms` ou supprimer la query si elle ne sert plus. |
| P2-8 | `numero_client` exposé en double dans `AuthResult` (champ `message` ET champ `numero_client`) | 2 min | Garder uniquement le champ structuré. |
| P2-9 | Pas de longueur max sur `nom_complet` côté server | 2 min | Ajouter `if (nom_complet.length > 120) return { error: ... }` ou Zod. |

---

## 7. Plan d'action recommandé pour toi

1. **Confirmer projet Supabase** avec Christophe (`tpzhxjzwlxwujboboyit` ?) ; reconfigurer MCP si besoin.
2. **`supabase migration list`** sur le bon projet pour vérifier genesis V2 + migrations 24-25/05 appliquées.
3. **`supabase db push`** (ou MCP `apply_migration` après reconfig) pour appliquer les 4 nouvelles migrations.
4. **Exécuter smoke test §5** sur démo (jamais sur compte prod `13smartfarm@gmail.com`).
5. **Commit groupé** :
   ```
   git add .claude/claude-security-guidance.md \
           app/src/app/\(app\)/sanitaire/actes/_server-actions.ts \
           app/src/app/\(app\)/sanitaire/actes/_schemas.ts \
           supabase/migrations/20260527160100_seed_veterinaires_standards.sql \
           supabase/migrations/20260527190000_security_hardening_rpc_anon.sql

   git commit -m "fix(security): IDOR actes_sanitaires + REVOKE seed/email_par_numero_client (audit phase A)

   - P0-1 IDOR cross-ferme: check FK animal_id/bande_id vs ferme courante
   - P0-2 Privilege escalation: REVOKE seed_veterinaires_standards FROM authenticated
   - P1-3 User enumeration: REVOKE email_par_numero_client FROM anon
   - P1-5 SSRF différé: refine ordonnance_url protocol https/http only
   - Plugin security-guidance: config projet .claude/claude-security-guidance.md"
   ```
6. **Validation visuelle** comme d'habitude (cf CLAUDE.md section 4) avant `git push`.
7. **Considérer P2-7** (`utilisateur_fermes` → `user_farms`) dans le même commit ou le suivant : c'est un bug fonctionnel évident, pas un finding sécu.

---

## 8. Ne pas faire

- ❌ Ne **PAS** ré-auditer le diff entier de la branche : c'est déjà fait, findings classés P0→P2 ci-dessus. Vérifie juste les 5 patchs ci-dessus si tu doutes.
- ❌ Ne **PAS** appliquer les migrations sur `jcritwravdwefwqwyjvk` (legacy V2x). Vérifier project_ref avant tout `db push` ou MCP `apply_migration`.
- ❌ Ne **PAS** muter avec `13smartfarm@gmail.com` pendant les tests (ferme réelle Yamoussoukro). Utiliser `demo@smartfarm.group`.
- ❌ Ne **PAS** modifier `.brain/CONTEXT.md` ni `CLAUDE.md` sans demander à Christophe.

---

## 9. État sub-agent (rapport détaillé sécu disponible)

L'audit sub-agent a aussi un agentId en mémoire (`a4ba65ed50d8561e6`) si tu veux SendMessage pour creuser un finding spécifique. Sinon, tout le contenu pertinent est ci-dessus.

---

**Bonne suite.**
