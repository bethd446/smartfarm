# CAVEMAN MODE — règles brief sous-agent SmartFarm

> S'inspire de github.com/JuliusBrussee/caveman (65% économie tokens output, 100% accuracy).
> Brain still big. Mouth small. Code/SQL/paths byte-preserved.

## RÈGLES BRIEF (orchestrateur)

1. **Drop filler** : pas "il s'agit de", "merci de", "tu devras", "n'oublie pas". Direct.
2. **Fragments OK** : phrases nominales. "Migration. BEGIN. ALTER TABLE. COMMIT." > paragraphe.
3. **Liste > prose** : bullet, table, code block. Pas paragraphes explicatifs.
4. **Code intact** : SQL/TSX/paths jamais raccourcis. Tout le reste compressé.
5. **Référence cerveau** : "voir CONTEXT.md §VUES" plutôt que recopier les colonnes.
6. **Périmètre exclusif en tête** : 3-5 lignes max. Le sous-agent doit savoir ce qu'il NE touche PAS en 5 secondes.
7. **Anti-pièges en fin** : 2-4 puces max. Pas de bla-bla.
8. **Pas d'exemples redondants** : 1 exemple suffit, pas 3 variantes.

## TEMPLATE BRIEF (≤ 200 lignes max)

```md
# Brief X — <titre 5 mots max>

## Périmètre
✅ Touche : <fichier1>, <fichier2>
❌ Touche pas : <fichier3>, <fichier4>
❌ Pas `npm run build`, pas restart serveur, pas modif migration existante

## Contexte
Voir `/root/projects/smartfarm/.brain/CONTEXT.md` § <section>.
DB: standard. Stack: standard. Sidebar/composants UI: standard.

## Mission
<3-5 fix en bullets, 1-2 lignes chacun>

## Détails techniques (par fix)
### Fix #1
**Bug** : <1 ligne>
**Fix** : <SQL/TS exact, copier-coller-modifier>
**Vérif** : `SELECT … ;` attendu N rows

### Fix #2 …

## Livrables
1. Migration `YYYYMMDDHHMMSS_xxx.sql` appliquée
2. <fichier> modifié
3. Rapport `agents/<sprint>/RAPPORT_X.md`

## Anti-pièges
- <piège 1>
- <piège 2>
```

## RÈGLES RAPPORT (sous-agent)

Format télégraphique. Pas "j'ai fait", direct "Fait : X. Vérifié : Y."

```md
# RAPPORT X

## Fait
- Migration `…sql` appliquée
- Fichier `…ts` modifié (+12 lignes)
- 5 tests SQL OK

## Vérifs
- `SELECT regle_id, COUNT(*) FROM v_alertes_actives` → R01:1, R10:3
- HTTP /alertes : 200

## Divergence brief
- Colonne `xxx` n'existe pas → utilisé `yyy` à la place

## TODO orchestrateur
- Rebuild + restart serveur
```

## ÉCONOMIE TYPE attendue

| Avant | Après caveman | Ratio |
|---|---|---|
| Brief 10K chars + agent explore → 2M IN tokens | Brief 5K chars + CONTEXT.md référencé → 500K IN | -75% |
| Opus partout | Sonnet 4.5 pour producteur, Opus seulement reviewer | -80% prix |
| Rapport 8KB prose | Rapport 2KB télégraphique | -75% OUT |

## CHECKLIST avant lancer sous-agent

- [ ] Brief lit CONTEXT.md en intro
- [ ] Périmètre exclusif fichiers en haut
- [ ] SQL/TSX exact copiable
- [ ] Vérif déterministe (commande + sortie attendue)
- [ ] Rapport ≤ 200 lignes attendu
- [ ] Modèle Sonnet 4.5 sauf review/audit (Opus)
- [ ] Toolsets réduits au strict nécessaire (souvent `["terminal", "file"]` suffit)
