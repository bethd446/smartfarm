# AUDIT R4 — Smart Farm (caveman ≤80L)

## TOI
Auditeur senior design+UX. Tu juges, tu chiffres, tu propose. Pas re-build.

## LIS D'ABORD (obligatoire — déjà count)
1. `/root/projects/smartfarm/.brain/CONTEXT.md`
2. `skill_view(name='impeccable')` puis `skill_view(name='impeccable', file_path='reference/critique.md')` puis `skill_view(name='impeccable', file_path='reference/audit.md')`

## OBJECTIF
Note Smart Farm /10 sur 4 axes + 5 P0 max + 1 commande patch par P0.

## ENTRÉES
- HTML brut servi (déjà capturé) : `/tmp/sf-r4/{dashboard,cheptel,alertes,reproduction,kpi,sanitaire}.html`
- Recos DB ui-ux-pro-max : `/tmp/sf-r4/reco-{product,color,style,ux}.md`
- Charte actuelle dans CONTEXT.md section "CHARTE Terrain Vivant"
- Code source : `/root/projects/smartfarm/app/src/` (lis uniquement si P0 nécessite preuve)

## MÉTHODE (frugal, pas naviguer dans browser)
1. `grep -o 'class="[^"]*"' /tmp/sf-r4/cheptel.html | sort -u | head -30` → palette classes utilisées
2. `grep -oE 'text-(xl|2xl|3xl|4xl|sm|xs|base)' /tmp/sf-r4/*.html | sort | uniq -c` → hiérarchie typo
3. `grep -oE 'bg-\[var\(--sf-[^)]+\)\]' /tmp/sf-r4/*.html | sort -u` → tokens utilisés
4. `grep -oE 'min-h-(8|10|12|14|16)' /tmp/sf-r4/*.html | sort | uniq -c` → cibles tap (cible 44px = h-11+)
5. Cross-check vs `/tmp/sf-r4/reco-style.md` (Organic Biophilic + Flat) et `/tmp/sf-r4/reco-color.md` (Earth Green #4A7C23 + Brown + Sky Blue)

## NOTES 4 AXES /10 (justifie en 1 ligne chacune)
- **Hiérarchie visuelle** : H1/H2/H3 distinguables ? grille typo cohérente ?
- **Tokens design** : --sf-* utilisés partout ou hardcodés ?
- **A11y mobile** : cibles ≥44px ? contraste H1 ≥4.5:1 ?
- **Anti-AI-slop** (impeccable critique) : génériques (lucide partout), même card, même padding, faiblesse d'engagement, absence de personnalité agricole/CI ?

## 5 P0 MAX
Format strict par P0 :
```
P0-X : <titre court>
Évidence : <ligne HTML/grep>
Impact : <ce que ça casse>
Fix : <commande sed/patch ou path fichier + 3 lignes diff>
Effort : <5min/30min/2h>
```

## SORTIE
1 fichier `/tmp/sf-r4/RAPPORT.md` ≤ 6 KB. Format :
```
# AUDIT R4 — Smart Farm
**Score** : H X.X | T X.X | A X.X | S X.X → **Global X.X/10**
**Verdict** : GO / FIX-FIRST / REWORK

## Score détaillé
[4 lignes 1 par axe]

## 5 P0
[5 blocs format ci-dessus]

## 3 quick wins bonus (≤15 min chacun)
[liste]

## Comparaison vs reco DB ui-ux-pro-max
[3 lignes : style match? couleurs match? UX match?]
```

## INTERDICTIONS
- ❌ npm install / build / restart
- ❌ modifier code (rapport uniquement)
- ❌ lire >5 fichiers source (preuve uniquement)
- ❌ rapport >6 KB
- ❌ vision_analyze (texte uniquement)
- ❌ inventer P0 si <5 trouvés (livrer 3 P0 vrais > 5 P0 mous)

Go.
