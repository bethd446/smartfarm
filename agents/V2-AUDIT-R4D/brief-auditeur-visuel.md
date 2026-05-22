# AUDIT R4-D VISUEL — Smart Farm (caveman ≤80L)

## TOI
Auditeur visuel senior. Tu analyses 6 captures déjà vues par orchestrateur, tu chiffres, tu prépare le terrain pour brief identité de marque (B).

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (7.6 KB) — cerveau projet
2. `skill_view(name='impeccable')` puis `skill_view(name='impeccable', file_path='reference/critique.md')`
3. `skill_view(name='canvas-design')` (pour préparer le brief B identité)
4. Rapport R4 texte existant : `/tmp/sf-r4/RAPPORT.md` (5 P0 déjà identifiés)
5. Observations visuelles déjà notées par orchestrateur (en bas du brief)

## CAPTURES disponibles (déjà analysées par orchestrateur via vision)
- `/tmp/sf-r4d/mobile-dashboard.png` (28KB)
- `/tmp/sf-r4d/mobile-cheptel.png` (39KB)
- `/tmp/sf-r4d/mobile-alertes.png` (32KB)
- `/tmp/sf-r4d/desktop-dashboard.png` (127KB)
- `/tmp/sf-r4d/desktop-cheptel.png` (86KB)
- `/tmp/sf-r4d/desktop-alertes.png` (121KB)

**N'utilise PAS vision_analyze** (toolset image_gen exclu) — appuie-toi sur les notes orchestrateur ci-dessous + grep sur HTML `/tmp/sf-r4/*.html` si besoin de chiffrer.

## OBSERVATIONS ORCHESTRATEUR (vues nativement)
1. **Logo actuel** = icône "sprout" lucide générique sur badge vert + wordmark "SMART FARM" en Big Shoulders. Identité = "potager startup", PAS "ferme porcine CI"
2. **Mascotte cochon** = silhouette stylisée beige sur card crème (dashboard) — sympathique mais kawaii, pas pro
3. **Couleurs CI absentes** : seul indicateur ivoirien = emoji 🇨🇮 microscopique dans la sidebar
4. **Différenciation alertes faible** : 3 niveaux de rouge/orange quasi-identiques (critiques/élevées vs moyennes seulement légèrement plus jaune)
5. **Texte microscopique** confirmé visuellement : "il y a moins d'une minute" + "1 bande active" presque invisible
6. **Sidebar desktop excellente** : groupes clairs, hiérarchie OK
7. **Tagline absente** sous "SMART FARM" : juste "YAMOUSSOUKRO 🇨🇮" — manque promesse de valeur
8. **Empty space mal exploité** dashboard desktop : 3 KPI verticaux étirés à droite = whitespace gaspillé

## OBJECTIF
Score visuel /10 + 5 axes branding + brief prêt pour identité B (logo + palette + typo + iconographie).

## SCORE 5 AXES /10 (justifie en 1 ligne chacune)
- **Identité de marque** : reconnaissable à 1m ? Diff vs concurrent Airtable/Notion ?
- **Ancrage CI/Afrique** : éléments visuels rappellent terroir ? Ou interchangeable Europe ?
- **Hiérarchie info visuelle** : œil sait où aller ? Sections claires ? Densité OK ?
- **Cohérence cross-device** : mobile et desktop racontent même histoire ?
- **Charge émotionnelle pro** : sérieux crédible (banquier/vétérinaire valide) ou amateur ?

## 3 RECOS POUR BRIEF B (identité de marque)
Format :
```
RECO-X : <titre>
Justification visuelle : <quoi dans les captures motive>
Direction proposée : <forme/couleur/typo/iconographie concrète>
Référence DB ui-ux-pro-max : <commande python à lancer ou résultat déjà vu>
```

## 5 P0 VISUELS COMPLÉMENTAIRES (différents des 5 P0 texte R4)
Format strict :
```
P0V-X : <titre>
Évidence visuelle : <ce qui apparaît dans capture X>
Impact : <effet sur perception marque>
Fix : <commande sed/patch byte-precise OU intention design + temps>
Effort : <5min/30min/2h>
```

## SORTIE
`/tmp/sf-r4d/RAPPORT-VISUEL.md` ≤ 6 KB. Format :
```
# AUDIT R4-D VISUEL — Smart Farm
**Score visuel** : I X.X | C X.X | H X.X | X X.X | É X.X → **Global X.X/10**
**Verdict marque** : PRÊT B / FIX-FIRST / REWORK-IDENTITÉ

## Score 5 axes
[5 lignes]

## 5 P0 visuels
[5 blocs]

## 3 recos pour brief B (identité)
[3 blocs]

## Palette validée par ui-ux-pro-max DB
[commande exécutée + 3-5 codes hex + justification]
```

## INTERDICTIONS
- ❌ vision_analyze (déjà fait par orchestrateur, tu te bases sur ses notes)
- ❌ modifier code
- ❌ rapport >6 KB
- ❌ inventer P0V si <5 vrais
- ❌ npm/build

Go.
