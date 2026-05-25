# Brief AUDIT S3 — 4 angles nouveaux Smart Farm prod

## TOI
Auditeur senior NSA-level. Read-only. Caveman. Contexte vierge.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (notamment règles 8-9)
2. `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md` (ce qu'on a déjà trouvé S2)

## OBJECTIF
Produire `/root/projects/smartfarm/agents/sprint-s3/RAPPORT_S3.md` (≤8 KB) couvrant 4 angles **nouveaux** :

### Angle A — A11y desktop & mobile (Lighthouse-style)
- Installer si besoin : `npm i -g lighthouse` OU utiliser axe-core via Playwright (préféré, plus rapide)
- Audit 4 pages : `/dashboard`, `/cheptel`, `/alertes`, `/sanitaire/maladies` en mobile (Pixel 7)
- Scorer chacune : contrast ratios, alt text, ARIA, headings hierarchy, focus visible, keyboard nav
- Lister **TOP 5 violations critiques** (impact=serious/critical) avec règle WCAG + selector

### Angle B — Performance desktop (1280×800 + 1920×1080)
- Mesurer LCP / FCP / TTFB / TBT sur 6 pages (`/dashboard`, `/cheptel`, `/alertes`, `/reproduction`, `/calendrier`, `/sanitaire/maladies`)
- Pas Lighthouse complet (trop lent) — utiliser `page.evaluate(() => performance.getEntriesByType('navigation'))` + `PerformanceObserver` pour LCP/FCP
- Identifier les pages >2.5s LCP (red zone)
- Lister **payloads anormaux** : images >500KB, JS chunks >1MB, polices >100KB

### Angle C — BDD orphelins & cohérence
- Utiliser service-role key (`/root/projects/smartfarm/app/.env.local`)
- Vérifier (via curl REST API Supabase) :
  - `saillies.truie_id` avec `animaux.statut='actif'` mais `animaux.deleted_at IS NOT NULL` (orphelin soft-deleted)
  - `pesees.animal_id` orphelins (animal supprimé hard)
  - `mises_bas.saillie_id` orphelins
  - `porcelets.portee_id` orphelins
  - `alertes` (table) si présente : cibles orphelines
  - `user_farms` avec `farm_id` ou `user_id` qui n'existent plus
- Lister chaque incohérence : table, colonne, nb lignes affectées, requête SQL de fix proposée

### Angle D — Sécurité multi-tenant cross-ferme (RLS leak)
- Probe : créer un compte test sur une autre ferme (OU utiliser un compte existant si dispo) — sinon : tenter d'accéder à `/cheptel/<id_animal_autre_ferme>` en étant logué Smart Farm
- Vérifier que les API REST publiques (`/rest/v1/animaux`, `/rest/v1/pesees`, `/rest/v1/fermes`) RESPECTENT la RLS quand on utilise l'`ANON_KEY` + JWT user
- Test précis :
  ```bash
  # Récupérer un JWT user via login Supabase Auth
  JWT=$(curl -s -X POST "https://tpzhxjzwlxwujboboyit.supabase.co/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON" -H "Content-Type: application/json" \
    -d '{"email":"13smartfarm@gmail.com","password":"SmartFarm2026!"}' | jq -r .access_token)
  
  # Tenter de lister TOUS les animaux (devrait ne voir QUE la ferme Smart Farm)
  curl -s "https://tpzhxjzwlxwujboboyit.supabase.co/rest/v1/animaux?select=ferme_id" \
    -H "apikey: $ANON" -H "Authorization: Bearer $JWT" | jq '[.[].ferme_id] | unique'
  ```
- Si plus de 1 ferme_id retourné → **RLS LEAK CRITIQUE P0**
- Vérifier aussi : `pesees`, `saillies`, `mises_bas`, `donnees_metier`, `user_farms`

## MÉTHODE
1. Pour chaque angle : ouvrir un fichier `/tmp/sf-s3/angle-<A|B|C|D>.json` pour stocker les résultats bruts
2. À la fin, synthétiser dans RAPPORT_S3.md

## LIVRABLE
`/root/projects/smartfarm/agents/sprint-s3/RAPPORT_S3.md` ≤ 8 KB

Format strict :
```md
# RAPPORT S3 — 4 angles
## Synthèse
| Angle | Findings | P0 | P1 | P2 |
| A a11y | … | 1 | 3 | 2 |
| B perf | … | 0 | 2 | 1 |
| C bdd | … | 2 | 1 | 0 |
| D sec | … | ??? | … | … |

## A — A11y (top 5)
| ID | Page | Selector | Règle WCAG | Sévérité | Fix proposé |

## B — Perf
| Page | LCP | FCP | TTFB | Verdict |

## C — BDD orphelins
| Table | Colonne | Nb orphelins | SQL fix |

## D — RLS leaks (LE PLUS IMPORTANT)
| Endpoint | Fermes vues | Attendu | Verdict |

## Recommandations sprint S3 prioritaires
- Lane fix X (15min, P0)
- Lane fix Y (30min, P1)
```

## INTERDICTIONS
- ❌ Modifier le moindre fichier source du projet (audit pur read-only)
- ❌ Jamais commiter / pousser
- ❌ Inventer des findings — chaque entrée DOIT avoir une preuve (output curl/playwright)
- ❌ Rapport >8 KB (densité > exhaustivité)
- ❌ Plus de 60 min total (si Angle X ralentit, time-cap à 15 min et écris ce que tu as)
- ❌ `npm run build`, restart serveur
- ❌ Plus de 6 reads de fichiers source (audit, pas code review)

## CRITÈRES SUCCÈS
- 4 angles abordés (même partiellement, dire ce qui a été testé)
- Angle D OBLIGATOIRE (sécurité = priorité absolue)
- Tableau synthèse + ≥1 finding par angle (ou justification claire "0 finding trouvé")
- Recommandations actionnables en bas

Go.
