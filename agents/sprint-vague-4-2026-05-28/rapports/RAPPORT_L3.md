# RAPPORT L3 — B9 Zod garde-fous métier

## Fichiers (3, strict)
- `app/src/app/(app)/reproduction/_schemas.ts` 35→101 L (+66)
- `app/src/app/(app)/mises-bas/_schemas.ts` 121→260 L (+139)
- `app/src/app/(app)/mortalites/_schemas.ts` 113→126 L (+13)

## reproduction — 2 superRefine, 7 règles
saillieSchema (5) :
- `date_saillie >= DATE_MIN` → "Date trop ancienne (minimum 2020-01-01)"
- `date_saillie <= today+7` → "Date trop future (max +7 jours pour saillie programmée)"
- `bcs_truie` entier → "BCS entier requis (1-5, pas de demi-points)"
- `rang_porte` min 1 → "Rang de portée minimum : 1"
- `rang_porte` max 20 → "Rang de portée maximum : 20 (truie de réforme au-delà)"

diagnosticSchema (2) :
- `date_diagnostic >= DATE_MIN` → "Date trop ancienne (minimum 2020-01-01)"
- `date_diagnostic <= today` → "Date de diagnostic ne peut pas être future"

## mises-bas — 2 superRefine, 13 règles (`.refine` somme nes_* PRÉSERVÉ l.36-44)
miseBasSchema (7) :
- `date_mise_bas >= DATE_MIN` → "Date trop ancienne (minimum 2020-01-01)"
- `date_mise_bas <= today+1` → "Date trop future (max +1 jour pour saisie le lendemain)"
- `nes_totaux <= 30` → "Nés totaux > 30 invraisemblable (record physiologique ~25)"
- `poids_portee_kg <= 60` → "Poids portée > 60 kg invraisemblable (vérifier la saisie)"
- `duree_minutes >= 15` → "Durée < 15 min irréaliste (vérifier la saisie)"
- `duree_minutes <= 720` → "Durée > 12 h : dystocie sévère, contacter le vétérinaire"
- `bcs_truie` entier → "BCS entier requis (1-5, pas de demi-points)"

sevrageSchema (6) :
- `date_sevrage >= DATE_MIN` → "Date trop ancienne (minimum 2020-01-01)"
- `date_sevrage <= today+1` → "Date trop future (max +1 jour pour saisie le lendemain)"
- `poids_moyen >= 3 kg` (calc `poids_total/nb_sevres`) → "Poids moyen porcelet < 3 kg invraisemblable (cible CI 6-8 kg)"
- `poids_moyen <= 15 kg` → "Poids moyen porcelet > 15 kg invraisemblable (sevrage tardif ?)"
- `age_jours <= 60` → "Âge > 60 jours : sevrage tardif inhabituel (vérifier la saisie)"
- `bcs_truie` entier → "BCS entier requis (1-5, pas de demi-points)"

## mortalites — superRefine étendu, 2 règles (existant PRÉSERVÉ l.64-99)
- `date_mortalite >= DATE_MIN` → "Date trop ancienne (minimum 2020-01-01)"
- `nb_animaux max 1000` → message enrichi "Maximum 1000 animaux par déclaration (scinder le lot au-delà)"

## Divergence brief
Champ `poids_moyen_kg` cité brief absent du sevrageSchema réel → calcul via `poids_total_kg / nb_sevres`, plage [3,15] appliquée sur la moyenne. Non-cassant.

mises-bas dépasse "+50 L max indicatif" : +139 L car 13 règles addIssue avec branches min/max (poids/durée/sevrage). Pas de redondance.

## Vérifications (sorties réelles)

V1. `grep -c DATE_MIN|todayISO` (≥2/fichier) : repro 9 · mises-bas 8 · morta 6 → OK

V2. `grep -c superRefine reproduction` (≥2) : 2 → OK

V3. `grep -c addIssue` total (≥15) : 5 + 13 + 6 = 24 → OK

V4. vocab interdit (`\bcochon\b|\bporc\b|\bcochonne\b` word-boundary) : 0 → OK

V5. `wc -l` (3 fichiers) : 101 / 260 / 126 (cf §1)

## Préservations validées
- miseBasSchema `.refine(nes_vivants+nes_morts+momifies === nes_totaux)` intact (l.36-44)
- mortaliteSchema cible exclusive + motif=autre→motif_libre intacts (l.64-99)
- adoptionSchema 2 `.refine` intacts (HORS périmètre, non touché)

## Interdits respectés
Aucun build/tsc/commit/push. 3 fichiers touchés strictement. 0 règle retirée. 0 dépendance ajoutée.
