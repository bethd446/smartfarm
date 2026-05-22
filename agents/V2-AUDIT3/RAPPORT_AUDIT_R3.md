# Audit V2 Round 3

## Score consolidé : **8.8/10**

## Détail
- QA fonctionnel : **8.7/10**
- Design/UX : **9.0/10**
- Métier porcin : **8.7/10**

## Validations OK
- 18/18 routes principales en HTTP 200 (dashboard, alertes, kpi, cheptel, reproduction, mises-bas, sanitaire/*, alimentation/*, stock, assistant, conseiller) ✓
- Middleware redirect `/biosecurite` → `/sanitaire/biosecurite` en **308** ✓
- 20 règles **R01-R20** présentes dans `v_alertes_actives` (def SQL) ET mappées UI (`alertes-regles.ts` = 20 entrées, R20-iss-trop-long inclus) ✓
- Calendrier porcelets : Fer J1, Castration, **Mycoplasma J14 + J28**, Pesée+sevrage J28 (PAS J7/J21) ✓
- TMM IFIP T-001 = **7.69 %** (formule sans écrasés validée) ✓
- 5 mycotoxines en DB (`afla_b1`, `ZEA`, `DON`, `OTA`, `FUM`) + col `conforme` générée avec les bons seuils OMS/UE ✓
- Voie `IM (encolure)` présente sur protocoles vaccinaux ✓
- **4 protocoles cochettes** (Parvo+Lepto, Rouget, Érysipèle+Parvo, Vermifuge pré-saillie) — la TODO "cochettes Parvo/Lepto" est en fait *fermée* ✓
- BCS truie présent dans `saillies`, `mises_bas`, `sevrages` (numeric(2,1), check 1-5) ✓
- Sidebar = exactement 5 groupes (Pilotage / Élevage / Santé / Logistique & Nutrition / Intelligence & Système), `Performances` bien rangé dans Pilotage ✓
- Metadata `<title>Alertes — Smart Farm</title>` + 15 titres spécifiques détectés sur les pages principales ✓
- Server Action `noterAuditBiosecurite` codée et câblée sur 2 formulaires de `/sanitaire/biosecurite` (table `biosecurite_audits` créée, vide = normal data démo) ✓
- `revalidatePath('/sanitaire')` + `/sanitaire/calendrier` après mutation `marquer fait` ✓
- Libs métier : `AJUSTEMENT_HEAT_STRESS` (nutrition-engine), `CIBLES_BCS` (repro-cibles), `R20-iss-trop-long` (alertes-regles) tous présents ✓
- H1 `/reproduction` = "Reproduction" (pas "Nouvelle saillie") ✓

## P0 bugs restants
*(aucun)*

## P1
- `biosecurite_audits` = 0 ligne : table prête, Server Action prête, **aucune donnée seed** → checklist affichera tous les items en "non audité" au premier lancement. Acceptable mais à seeder pour démo terrain.
- POST direct sur `/sanitaire/calendrier` (curl raw form-urlencoded) retourne 200 et non 303 : comportement Next 16 RSC normal (action serveur réelle invoquée via React form, pas via POST classique). Non bloquant — flow UI fonctionnel.

## P2 polish
- Décomposition AA (Thr/Trp/Cys) manquante sur matières CI hors maïs/soja (TODO connu).
- Page mycotoxines : afficher colonnes OTA/FUM dans le tableau UI (les analyses sont en DB, seuils calculés, juste l'affichage).
- Paie ouvriers, marketplace, finances : non démarrés (hors scope pilote).

## Comparaison R2 → R3
- QA : 5.5 → **8.7**
- Design : 7.4 → **9.0**
- Métier : 6.5 → **8.7**
- Global : 6.5 → **8.8**

## Verdict pilote terrain
### ✅ **GO** pilote terrain

Tous les P0 R2 sont résolus, les 20 règles métier sont câblées DB+UI, calendrier sanitaire conforme IFIP (J14/J28 Mycoplasma), TMM IFIP exact, BCS partout, 5 mycotoxines avec seuils OMS/UE, sidebar 5 groupes propre, redirects en place, titres meta cohérents, Server Actions de mutation correctement câblées avec `revalidatePath`. Score consolidé 8.8/10 > seuil 8.5/10.

Recommandation : seeder 5-10 entrées dans `biosecurite_audits` avant déploiement démo + suivre les 3 P2 en sprint post-pilote.
