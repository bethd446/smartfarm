# Brief Lane A — Filtre statut=actif cheptel (B1 P0)

## TOI
Dev senior. 1 fichier. 15 min. Caveman.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (rapidement)
2. `/root/projects/smartfarm/agents/sprint-s2-audit/RAPPORT_AUDIT.md` §B1

## PÉRIMÈTRE
✅ Touche : `/root/projects/smartfarm/app/src/app/(app)/cheptel/page.tsx` UNIQUEMENT
❌ Pas d'autre fichier
❌ Pas `npm run build`, pas restart serveur, pas git commit
❌ Pas de migration SQL

## MISSION
Ajouter `.eq('statut', 'actif').is('deleted_at', null)` à TOUTES les chaînes `sb.from('animaux')...` du fichier (lignes ~63, ~64, ~65, ~98).
Le tab "portees" ne touche pas `animaux`, ignorer.

## DÉTAIL EXACT
Lignes ciblées :
- L63 : `sb.from('animaux').select('*', { count: 'exact', head: true }).in('categorie', CAT_TRUIES ...).eq('sexe', 'F')`
- L64 : pareil VERRATS
- L65 : pareil PORCELETS
- L98 : `let aq = sb.from('animaux').select('*, races(nom)').order('tag')`

Sur chacune des 4 lignes, INSÉRER `.eq('statut', 'actif').is('deleted_at', null)` après `.from('animaux')` mais avant les autres `.select/.in/.eq`. Style :

```ts
sb.from('animaux')
  .select('*', { count: 'exact', head: true })
  .eq('statut', 'actif')
  .is('deleted_at', null)
  .in('categorie', CAT_TRUIES as unknown as string[])
  .eq('sexe', 'F')
```

## VÉRIFICATIONS OBLIGATOIRES après modif
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. `grep -c "statut.*actif" /root/projects/smartfarm/app/src/app/\\(app\\)/cheptel/page.tsx` → doit afficher au moins 4

## LIVRABLE
1. Fichier patché
2. Rapport télégraphique stdout : 4 lignes max :
   - Fichier : path
   - Lignes modifiées : 63,64,65,98 (ou autres)
   - tsc : OK / FAIL
   - grep statut.*actif : N occurrences

## ANTI-PIÈGES
- Ne PAS toucher la query `from('portees')` ligne 66 ni les query `.from('races')`
- Ne PAS toucher le bloc tab='portees' (lignes 81-96)
- Si la ligne 98 a `await` ou `.order`, garder ordre cohérent
- 4 modifs minimum. Si tu en fais 3 ou 5, erreur.

Go.
