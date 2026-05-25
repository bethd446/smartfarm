# Brief Lane PROF — Vérification croisée Sprint S2

## TOI
Reviewer senior NSA-level. CONTEXTE VIERGE. Adversaire bienveillant.
Tu ne fais CONFIANCE à RIEN — tu vérifies tout en lisant le diff réel et en testant.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (rapidement)
2. `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md` (les bugs cibles)
3. `git diff main` dans `/root/projects/smartfarm` (les modifs des 3 lanes)

## MISSION
Pour chacun des 4 bugs (B1, B2, B3, B4, B6) prétendument fixés :
1. **Lire le diff réel** : `cd /root/projects/smartfarm && git diff -- <fichier>`
2. **Vérifier** que la modif correspond effectivement au fix demandé dans RAPPORT_AUDIT.md
3. **Détecter régressions** : grep des paths d'API, imports cassés, syntaxe TS
4. **Tester typecheck + build** : `cd /root/projects/smartfarm/app && npx tsc --noEmit && npm run build 2>&1 | tail -20`
5. **Si build OK** : vérifier localement que `npm run build` produit bien le standalone et que le bundle contient les changements (`grep -r "RelativeTime\|statut.*actif" .next/standalone/projects/smartfarm/app/.next/server/app/ 2>&1 | head -5`)

## VERDICT par bug (table à produire)
| Bug | Modif détectée | Conforme au fix demandé ? | Régression ? | Verdict |
|---|---|---|---|---|
| B1 | ... | OUI/NON | OUI/NON | ✅/❌ |
| ... | ... | | | |

Si verdict ❌ → écris la commande EXACTE de correction (1 ligne, copier-coller-exécutable).

## LIVRABLE
1 fichier : `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_PROF.md` (≤4 KB)
Contient :
- Tableau verdicts
- Si tout ✅ : ligne "READY TO COMMIT" + message de commit suggéré
- Si ❌ : section "À CORRIGER avant commit" avec commandes exactes

## PÉRIMÈTRE
✅ READ-ONLY sur les fichiers du projet (sauf rapport prof à écrire)
✅ Peut lancer `tsc`, `npm run build`, grep, git diff
❌ NE PAS modifier les fichiers source
❌ NE PAS commit
❌ NE PAS push
❌ Pas de Playwright (le smoke prod sera fait par l'orchestrateur après commit)

## ANTI-PIÈGES
- Si build prend >120s, c'est normal (Next 16 + Turbopack). Patiente.
- Si TS erreur sur autre fichier qu'on a touché → c'est une erreur pré-existante, signaler mais pas bloquer
- Le RAPPORT_AUDIT.md a été mis à jour : B5 = faux positif, ignorer

Go.
