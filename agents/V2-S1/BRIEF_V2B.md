# Brief V2-B — Calendrier sanitaire porcelets (J1/J3/J7)

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : Rendre visible les actes sanitaires obligatoires sur porcelets nés (J1, J3, J7, J21)

---

## PÉRIMÈTRE EXCLUSIF

Tu touches UNIQUEMENT :
1. `supabase/migrations/` — créer une vue ou enrichir l'existante `v_calendrier_repro` → **créer une nouvelle vue `v_calendrier_sanitaire_porcelets`**
2. `app/src/app/(app)/sanitaire/calendrier/` — adapter le code de page pour afficher les actes porcelets
3. `app/src/app/(app)/sanitaire/` — pages associées (vue d'ensemble) si nécessaire

Tu ne touches PAS aux modules nutrition, alertes, chatbot, cheptel.

---

## CONTEXTE

- DB : Supabase local Docker, port `54322`, user/pass/db `postgres`
- App standalone redéployée : `/root/projects/smartfarm/app/.next/standalone/projects/smartfarm/app/`
  → Après tes modifs source, rebuild : `cd /root/projects/smartfarm/app && npm run build`
  → Puis script de copie static : voir étape redeploy plus bas
- Tables clés :
  - `mises_bas` (`id, truie_id, bande_id, date_mise_bas, nes_vivants, nes_morts, momifies, poids_portee_kg`)
  - `vaccinations` (`id, animal_id?, lot_id?, protocole_id, date_admin, dose_ml, voie, lot_vaccin, vétérinaire, observations`)
  - `traitements` (`id, animal_id?, lot_id?, type_acte text, date_acte, produit, dose, voie, observations`)
  - `bandes` (`id, code, phase, date_debut, date_fin_prevue, ferme_id`)
  - `protocoles_vaccinaux` (12 seedés, dont Fer dextran J3)

---

## PROBLÈME ACTUEL

L'audit métier a constaté : page `/sanitaire/calendrier` n'affiche RIEN concernant les porcelets nés récemment. Or, une mise-bas génère plusieurs actes obligatoires sur les porcelets :

| Acte | Jour | Source |
|---|---|---|
| Coupe cordon + désinfection | J0 (jour MB) | Protocole néonatal |
| Pesée naissance + traçabilité | J0 | Suivi technique |
| **Injection Fer dextran 200 mg** | **J1-J3** | Anti-anémie (protocole déjà seedé) |
| Coupe queue / castration mâles | J3-J7 | Optionnel selon élevage |
| **Vaccination Mycoplasmose H1** | **J7** | Protocole déjà seedé |
| **Vaccination Mycoplasmose H2** | **J21** | Protocole déjà seedé |
| Pesée sevrage | J28 | Suivi technique |

Aucun de ces actes n'apparaît, alors qu'il y a des mises-bas récentes (T-001 le 2026-05-13, etc.).

---

## OBJECTIF

### 1. Créer une vue SQL `v_calendrier_sanitaire_porcelets`

```sql
CREATE OR REPLACE VIEW v_calendrier_sanitaire_porcelets
WITH (security_invoker=true) AS
WITH actes_planifies AS (
  -- Pour chaque mise-bas, générer les actes attendus
  SELECT
    mb.id AS mise_bas_id,
    mb.bande_id,
    mb.truie_id,
    a.tag AS truie_tag,
    mb.date_mise_bas,
    mb.nes_vivants,
    mb.ferme_id,
    acte.libelle,
    acte.protocole_id,
    acte.jour_offset,
    (mb.date_mise_bas + acte.jour_offset)::date AS date_prevue,
    acte.gravite
  FROM mises_bas mb
  JOIN animaux a ON a.id = mb.truie_id
  CROSS JOIN LATERAL (
    VALUES
      ('Injection Fer dextran 200 mg'::text, 1, 'élevée'::text),
      ('Coupe queue / castration (optionnel)'::text, 3, 'moyenne'::text),
      ('Vaccination Mycoplasmose H1'::text, 7, 'élevée'::text),
      ('Vaccination Mycoplasmose H2'::text, 21, 'élevée'::text),
      ('Pesée sevrage'::text, 28, 'moyenne'::text)
  ) acte(libelle, jour_offset, gravite)
  WHERE mb.deleted_at IS NULL
)
SELECT
  mise_bas_id,
  bande_id,
  truie_id,
  truie_tag,
  date_mise_bas,
  nes_vivants,
  ferme_id,
  libelle AS acte,
  date_prevue,
  gravite,
  CASE
    WHEN date_prevue < CURRENT_DATE THEN 'retard'
    WHEN date_prevue = CURRENT_DATE THEN 'aujourd_hui'
    WHEN date_prevue <= CURRENT_DATE + 7 THEN 'semaine'
    WHEN date_prevue <= CURRENT_DATE + 30 THEN 'mois'
    ELSE 'lointain'
  END AS statut_temporel
FROM actes_planifies
WHERE date_prevue >= CURRENT_DATE - INTERVAL '14 days'
  AND date_prevue <= CURRENT_DATE + INTERVAL '60 days';

GRANT SELECT ON v_calendrier_sanitaire_porcelets TO anon, authenticated;
```

> Note : ne lie pas la protocole_id à un protocole précis dans le seed, on reste sur libellés texte pour simplifier la démo. Si tu lies, fais-le correctement (LEFT JOIN protocoles_vaccinaux).

### 2. Adapter la page `/sanitaire/calendrier`

Lis l'actuel code de la page (`app/src/app/(app)/sanitaire/calendrier/page.tsx` ou équivalent). Ajoute une section :

```
[Section : Actes porcelets attendus (mises-bas récentes)]
  - Groupé par statut_temporel : RETARD (rouge), AUJOURD'HUI (orange), CETTE SEMAINE (jaune), CE MOIS (gris)
  - Chaque ligne : [Truie tag] [Acte] [Date prévue] [Bouton "Marquer fait"]
  - Empty state si vide : "Aucun acte porcelet à venir — aucune mise-bas récente."
```

Le bouton "Marquer fait" doit créer une ligne dans `vaccinations` (pour vaccins) ou `traitements` (pour Fer, castration, pesée). Tu peux mutualiser avec un Server Action existant si tu en trouves un similaire dans `sanitaire/protocoles/` ou `sanitaire/`, sinon crée `_server-actions.ts` minimal :

```ts
'use server'
export async function marquerActePorceletFait(payload: {
  mise_bas_id: string
  acte: string
  type: 'vaccination' | 'traitement'
}) { ... }
```

### 3. Tester côté SQL

```bash
PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -c \
"SELECT acte, COUNT(*), statut_temporel FROM v_calendrier_sanitaire_porcelets GROUP BY acte, statut_temporel ORDER BY statut_temporel;"
```
Attendu : plusieurs lignes (Fer, Mycoplasmose, etc.) car il y a au moins 1 MB récente (T-001 13/05).

### 4. Rebuild + redeploy

Une fois ton code prêt :
```bash
cd /root/projects/smartfarm/app
PATH=/root/.hermes/node/bin:$PATH npm run build

# Copier static (procédure critique post-bundle bug)
cp -rT .next/static .next/standalone/projects/smartfarm/app/.next/static
cp -rT public .next/standalone/projects/smartfarm/app/public 2>/dev/null || true

# Le serveur tourne déjà (background process). Pour le redémarrer :
# Tue l'ancien process Node sur 3000
pkill -f "node server.js" || true
sleep 1
cd /root/projects/smartfarm/app/.next/standalone/projects/smartfarm/app
PORT=3000 HOSTNAME=0.0.0.0 nohup node server.js > /tmp/sf-standalone.log 2>&1 &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/sanitaire/calendrier
```

### 5. Test bout en bout du bouton

Récupérer un mise_bas_id et tester un INSERT via Server Action — peut être fait via curl `POST /sanitaire/calendrier` avec le formulaire, OU directement via `psql` pour valider que les données sont écrivables.

---

## LIVRABLES

1. Migration `2026XXXXXXXXXX_v_calendrier_sanitaire_porcelets.sql` créée + appliquée
2. Page `/sanitaire/calendrier` montre les actes porcelets attendus (vérif HTTP + browser)
3. Bouton "Marquer fait" testé bout en bout (INSERT en DB confirmé via SELECT)
4. Rapport markdown `/root/projects/smartfarm/agents/V2-S1/RAPPORT_V2B.md` avec :
   - Liste des actes affichés sur la page (capture du résultat SQL)
   - Code HTTP de la page
   - Snippet du SQL INSERT confirmant le bouton "Marquer fait"
   - Captures de problèmes éventuels rencontrés

## ANTI-PIÈGES
- N'oublie pas `WITH (security_invoker=true)` + `GRANT SELECT TO anon, authenticated`
- Ne ne touche **PAS** à `v_alertes_actives` ni à `v_kpi_*` (autre chantier)
- Si l'agent V2-A a créé une migration entretemps, ta migration prend un timestamp postérieur
- Toujours **vérifier que le serveur Node est UP** après redeploy (HTTP 200 sur 3 routes)
- Le path Node : `export PATH=/root/.hermes/node/bin:$PATH` avant npm
