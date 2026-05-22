# BRIEF AUDIT R6 — Final post-D1→D4 + α.1+α.2 (caveman ≤60L)

## TOI
Auditeur final. Tu chiffres score consolidé + verdict GO production.

## LIS
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `/tmp/sf-r4/RAPPORT.md` (5 P0 originaux)
3. `/tmp/sf-r4d/RAPPORT-VISUEL.md` (5 P0V originaux + score 4.6)
4. `/tmp/sf-r5/RAPPORT-R5.md` (post-B1 = 6.8)
5. `skill_view(name='impeccable', file_path='reference/audit.md')`

## ENTRÉES POST-α
- HTML servi : `/tmp/sf-r6-html/*.html` à capturer si besoin via `curl`
- Captures : `/tmp/sf-r6/{mobile,desktop}-{dashboard,cheptel,kpi,alertes}.png`
- KPI IFIP DATA RÉELLE post-seed :
  - MCA = 888 XOF/kg croît (zone gold)
  - IC ferme = 3,65 (au-dessus seuil 3.2 → R27 active)
  - GMQ engraissement = 777 g/j (zone verte)
  - GMQ sevrage = 468 g/j (zone verte)
- 6 règles alertes actives : R10×3, R11×20, R13, R18, R22, R27
- Logo Cachet C v2-2 "Truie au pied" actif

## SCORE FINAL 5 axes /10
- **Identité marque** (base 7.0 post-B1, gain v2-2 truie subtile)
- **Ancrage CI** (base 6.5)
- **Hiérarchie info** (base 6.5, gain h2/h3 D2)
- **Cross-device** (base 7.5)
- **Émotionnel pro** (base 6.5, gain KPI vivants)

PLUS 2 axes métier :
- **Couverture fonctionnelle métier** (alertes 28, KPI IFIP MCA/IC/GMQ vivants, biosec, mycotox, PPA)
- **Crédibilité données** (donner score chiffré : pesées seed cohérent IFIP, AA NRC seedés, alertes actives)

## OBJECTIF
1. Score 7 axes /10 + delta vs R4 baseline + verdict
2. Top 3 forces consolidées
3. Top 3 faiblesses restantes (réalistes, pas inventées)
4. Verdict : GO-PROD / GO-PILOTE-TERRAIN / FIX-1-SPRINT / REWORK

## SORTIE
`/tmp/sf-r6/RAPPORT-R6.md` ≤ 4 KB :
```
# AUDIT R6 — Smart Farm v0.3.0
**Score consolidé** : I X.X | C X.X | H X.X | X X.X | É X.X | F X.X | D X.X → **Global X.X/10**
**Delta vs R4 baseline (4.6)** : Δ+X.X
**Verdict** : GO-…

## 3 forces consolidées
…

## 3 faiblesses restantes
…

## Recommandation Sprint suivant
…
```

## INTERDICTIONS
- ❌ npm/build/restart
- ❌ modifier code
- ❌ vision_analyze (orchestrateur a déjà vu captures, te transmet ses notes ci-dessous)

## OBSERVATIONS ORCHESTRATEUR (post-vision /tmp/sf-r6/)
- Logo v2-2 actif (truie discrète au pied du SF, entre filets gold)
- KPI section "Productivité IFIP" affiche cards MCA 888, IC ferme 3,65 (rouge alerte), tableau GMQ avec 2 stades verts + 1 en EmptyState
- Tagline présente partout
- Cards alertes : 6 cartes distinctes avec couleurs différenciées (R27 en orange gold)
- Hiérarchie h2 visible sur /kpi (h2 "KPI techniques métier", h2 "Productivité IFIP", h2 "Performance ferme")
- text-xs base 13px lisible

Go.
