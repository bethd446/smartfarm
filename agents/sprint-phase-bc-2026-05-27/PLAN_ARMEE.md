# Armée Opus 4.7 — Plan d'attaque Phases B + C
**Date** : 2026-05-27 · **Stratégie** : dispersion intelligente, 0 conflit fichiers Phase A

## Pré-requis avant dispatch

1. ✅ Phase A complétée et **mergée sur main** (PR à venir)
2. ✅ Migrations Phase A appliquées en BDD prod (si applicable)
3. ✅ Lane RGPD A12 terminée (en cours)

## 6 lanes prêtes à dispatch (3 vagues séquencées)

### 🟢 Vague 2 — Phase B foundations (4 lanes parallèles, ~7h wall-time)

| Lane | Brief | Effort | Fichiers exclusifs | Dépendances |
|---|---|---|---|---|
| **B1** SQL référentiel véto | [B1_sql_veto.md](./briefs/B1_sql_veto.md) | 5h | `supabase/migrations/2026052716*.sql` | aucune |
| **B3** Actes sanitaires | [B3_actes_sanitaires.md](./briefs/B3_actes_sanitaires.md) | 8h | `supabase/migrations/`, `app/(app)/sanitaire/actes/*` new, +1 card hub | B1 (graceful fallback si absent) |
| **B8** EmptyOnboarding | [B8_empty_onboarding.md](./briefs/B8_empty_onboarding.md) | 3h | `components/ui/empty-onboarding.tsx` new + 4 patches empty states | aucune |
| **B10** Mortalités module | [B10_mortalites.md](./briefs/B10_mortalites.md) | 4h | `supabase/migrations/`, `app/(app)/mortalites/*` new, +1 entrée nav sidebar | aucune (post-Phase A donc sidebar.tsx libre) |

**Total cumulé** : 20h · **Wall-time parallèle** : ~5-7h (max effort B3)

### 🟡 Vague 3 — Phase C livraisons rapides (2 lanes parallèles, ~6h wall-time)

| Lane | Brief | Effort | Fichiers exclusifs | Dépendances |
|---|---|---|---|---|
| **C7** Calendrier prévisionnel | [C7_calendrier_previsionnel.md](./briefs/C7_calendrier_previsionnel.md) | 6h | `app/(app)/calendrier/*`, `app/api/calendrier/ical/`, `lib/calendrier-helpers.ts` | aucune |
| **C9** Adoption portées | [C9_adoption_portees.md](./briefs/C9_adoption_portees.md) | 4h | `supabase/migrations/`, `app/(app)/mises-bas/_dialog-adoption.tsx` new | aucune |

**Total cumulé** : 10h · **Wall-time parallèle** : ~4-6h

### 🔴 Vague 4 — Phase B/C bloquées (post-Vague 2+3 merge)

Items qui nécessitent les fondations Vague 2/3 :

| Item | Effort | Bloqué par |
|---|---|---|
| B2 Enum unités SQL + UI selects | 4h | Conflit multi-écrans (faire après merge B1) |
| B4 Carnet MIRAH PDF/CSV | 4h | B3 actes_sanitaires (extends export) |
| B5 Traçabilité ATB + upload ordonnance | 6h | B3 + Supabase Storage bucket |
| B6 Bulk action porcelets sélection multi | 4h | A10 cheptel (cohérence onglet porcelets après cochettes split) |
| B7 Lookup truies pré-rempli DIAGNOSTIC | 2h | A2 conseiller (pas vraiment, juste vérif post-Phase A) |
| B9 Garde-fous Zod saisie métier | 2h | A11 inscription (server actions) |
| C1 Module conduite en bande | **24h** | B3 actes (gros morceau — sprint dédié) |
| C2 Rang portée + parité | 8h | B1 schema |
| C3 ISSF + TMM par parité | 6h | C2 |
| C4 GMQ + IC par stade + graphs recharts | 8h | C2 |
| C5 Conseil contextuel | 10h | A2 (conseiller modifié), C7 calendrier |
| C6 40 fiches MVP conseiller | 16h | C5 + co-écriture ANADER (hors-scope dev) |
| C8 Prix matières CI table + UI admin | 4h | B1 |
| C10 Photos animaux Storage | 6h | A10 (cheptel modifié) |

## Discipline d'exécution (CLAUDE.md compliance)

**Pour chaque lane dispatch** :
- Brief caveman ≤200 lignes (✅ déjà rédigé)
- Périmètre exclusif en tête (✅ section "Touche / Touche pas")
- Anti-pièges en fin (✅ 4 puces max par brief)
- 1 livrable rapport markdown ≤120 lignes par lane
- Toolsets implicites : Read/Edit/Write/Bash (pas browser, pas Agent recursif)
- Modèle Opus 4.7 forcé (`model: "opus"`)
- Contexte vierge : brief auto-suffisant (référence brain CONTEXT.md mais pas attendu lu)

**Garde-fous absolus** :
- ❌ Pas de `git push` par sous-agent
- ❌ Pas d'application migration SQL par sous-agent (le user applique via PAT)
- ❌ Pas de `npm install` (pas de nouvelle dépendance)
- ❌ Pas de modif `next.config.ts` / `package.json` / `proxy.ts`
- ✅ Chaque lane lance `npx tsc --noEmit` avant signaler fini (sinon flag dans rapport)

**Périmètres strictement disjoints (vérifiés)** :
| Vague 2 | Fichiers |
|---|---|
| B1 | `supabase/migrations/2026052716*.sql` (2 fichiers SQL only) |
| B3 | `supabase/migrations/20260527170000_*.sql` + `app/(app)/sanitaire/actes/*` (route new) + `sanitaire/page.tsx` (+1 ligne card) |
| B8 | `components/ui/empty-onboarding.tsx` (new) + 4 patches isolés empty states |
| B10 | `supabase/migrations/20260527180000_*.sql` + `app/(app)/mortalites/*` (route new) + `sidebar.tsx` (+1 ligne nav) |

**Conflit potentiel résiduel** : `sidebar.tsx` (B10) — risque si autre lane y touche aussi. **Mitigation** : aucune autre lane Vague 2 ne touche sidebar.

| Vague 3 | Fichiers |
|---|---|
| C7 | `app/(app)/calendrier/*` (route existing refonte) + `app/api/calendrier/ical/route.ts` (new) + `lib/calendrier-helpers.ts` (new) |
| C9 | `supabase/migrations/20260527190000_*.sql` + `app/(app)/mises-bas/_dialog-adoption.tsx` (new) + `mises-bas/page.tsx` patch + `_server-actions.ts` extend |

**Aucun conflit C7 ↔ C9** (périmètres orthogonaux).

## Effort total prévisionnel

| Item | Wall-time cumulé | Wall-time parallèle |
|---|---|---|
| Vague 2 (B1+B3+B8+B10) | 20h | ~7h |
| Vague 3 (C7+C9) | 10h | ~6h |
| **Sous-total armée immédiate** | **30h** | **~13h** |
| Vague 4 (séquencement requis) | ~104h | ~30-40h (par groupes) |

## Commande de dispatch (à exécuter par orchestrateur quand prêt)

```ts
// Vague 2 — 4 lanes parallèles Opus 4.7
Agent({ subagent_type: 'general-purpose', model: 'opus', prompt: readFile('briefs/B1_sql_veto.md') })
Agent({ subagent_type: 'general-purpose', model: 'opus', prompt: readFile('briefs/B3_actes_sanitaires.md') })
Agent({ subagent_type: 'general-purpose', model: 'opus', prompt: readFile('briefs/B8_empty_onboarding.md') })
Agent({ subagent_type: 'general-purpose', model: 'opus', prompt: readFile('briefs/B10_mortalites.md') })

// Vague 3 — 2 lanes parallèles (lancer après merge Vague 2)
Agent({ subagent_type: 'general-purpose', model: 'opus', prompt: readFile('briefs/C7_calendrier_previsionnel.md') })
Agent({ subagent_type: 'general-purpose', model: 'opus', prompt: readFile('briefs/C9_adoption_portees.md') })
```

## Status actuel

- ✅ Briefs Vague 2 + Vague 3 rédigés (6 fichiers `briefs/B*.md` + `C*.md`)
- ✅ Plan d'attaque documenté (ce fichier)
- ⏳ Phase A en cours (Lane RGPD A12 + commit/PR final)
- 🟡 GO user requis pour lancer Vague 2 après merge Phase A

---

**Stratégie** : armée Opus disciplinée, dispersée par dossiers disjoints, séquencée par dépendances métier. Pas de jonglage branches, pas de conflits merge, pas de promesses irréalisables.
