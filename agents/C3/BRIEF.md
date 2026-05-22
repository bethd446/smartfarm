# CHANTIER C3 — Alertes intelligentes (12 règles)

## Contexte projet

Smart Farm — Next.js 16 + React 19 + Tailwind v4 + Supabase Docker local. Élevage porcin CI.
Repo `/root/projects/smartfarm/app/`. DB locale port 54322. DEMO_FERME_ID `'00000000-0000-0000-0000-000000000001'`.

## Mission C3

Construire un **système d'alertes intelligentes** qui détecte automatiquement les anomalies dans l'élevage et les présente à l'éleveur sur le tableau de bord. 12 règles à implémenter, en se basant sur les données déjà saisies (cheptel, reproduction, sanitaire, mortalités, stock, consommations).

## Architecture — vue d'ensemble

Pas de table de stockage des alertes (V1). Les alertes sont **calculées à la volée** depuis les données existantes via des SQL views ou des queries Postgres. Ça reste cohérent (toujours à jour), pas de désynchro possible, et c'est plus simple à itérer.

V2 plus tard : table `alertes` avec dismissal/snooze. Hors scope V1.

## Périmètres disjoints — 3 agents en parallèle

---

### AGENT C3-A — Schéma + moteur de règles (SQL views Postgres)

**Fichiers AUTORISÉS** :
- `supabase/migrations/20260521000001_alertes_views.sql` (NEW) — toutes les views SQL
- `app/src/lib/alertes-engine.ts` (NEW) — fonction `getAlertesActives(supabase)` qui query `v_alertes_actives` et retourne un tableau typé
- `app/src/lib/alertes-regles.ts` (NEW) — métadonnées des 12 règles (libellé, description, gravité, lien suggéré)

**Spec — 12 règles à implémenter via views SQL** :

Crée d'abord une **view racine** `v_alertes_actives` qui UNION ALL toutes les règles. Format unifié :
```sql
create view v_alertes_actives as
  select
    'R01-truie-vide-prolongee' as regle_id,
    'truie' as cible_type,
    a.id::text as cible_id,
    a.tag as cible_label,
    'élevée' as gravite,
    'Truie vide depuis ' || X || ' jours' as titre,
    '...' as description,
    '/cheptel/' || a.id as lien_suggere,
    now() as detecte_le
  from animaux a where ...
  UNION ALL
  -- R02, R03, ...
```

**Les 12 règles** :

| # | ID | Cible | Description | SQL hint |
|---|---|---|---|---|
| R01 | truie-vide-prolongee | truie | Truie sans saillie/diagnostic gestation depuis > 30 jours après sevrage ou >45j depuis dernier événement | jointure saillies/mises_bas, computed last_event |
| R02 | retour-chaleur-non-saillie | truie | Truie revenue en chaleur (saillie + diagnostic négatif) sans nouvelle saillie dans les 25j | diagnostics_gestation `negatif` + age |
| R03 | gestante-mise-bas-imminente | truie | Truie gestante avec date_prevue mise-bas dans 7 jours ou en retard | saillies confirmées + 114j |
| R04 | gestante-en-retard | truie | Truie gestante avec date_prevue mise-bas dépassée de >3 jours sans mise_bas saisie | saillies + mise_bas absente |
| R05 | porcelets-non-pesés | bande | Bande avec porcelets nés depuis >14j sans aucune pesée enregistrée | bandes/pesees |
| R06 | porcelets-non-vaccinés-J14 | animal | Porcelet âgé entre 16 et 25 jours sans vaccination Mycoplasma | animaux + vaccinations |
| R07 | sevrage-en-retard | bande | Mise-bas datant de >35 jours sans sevrage saisi (sevrage prévu ~28j) | mises_bas + sevrages |
| R08 | mortalite-elevee-7j | bande | Mortalité bande >5% sur 7 derniers jours | mortalites GROUP BY bande |
| R09 | mortalite-elevee-30j | ferme | Taux mortalité ferme entière >2% sur 30j | mortalites/effectif |
| R10 | stock-critique | matiere | Matière première dont stock_actuel < seuil_alerte | matieres_premieres direct |
| R11 | aliment-rupture-prevue | matiere | Stock matière en cours de rupture dans <7j (basé conso moyenne 30j) | matieres_premieres + consommations |
| R12 | acte-sanitaire-en-retard | animal | Acte vaccin/soin obligatoire en retard de >7j (réutilise logique calendrier sanitaire) | jointure protocoles + vaccinations |

**Pour chaque règle** :
- Gravité (`info`, `moyenne`, `élevée`, `critique`)
- Lien suggéré (route vers page concernée)
- Description claire en français pro

**Spec `alertes-engine.ts`** :
```ts
export type Alerte = {
  regle_id: string
  cible_type: 'truie' | 'verrat' | 'animal' | 'bande' | 'ferme' | 'matiere'
  cible_id: string
  cible_label: string
  gravite: 'info' | 'moyenne' | 'élevée' | 'critique'
  titre: string
  description: string
  lien_suggere: string
  detecte_le: Date
}

export async function getAlertesActives(supabase): Promise<Alerte[]>
export function compteParGravite(alertes: Alerte[]): Record<gravite, number>
export function groupParRegle(alertes: Alerte[]): Map<regle_id, Alerte[]>
```

**Spec `alertes-regles.ts`** :
```ts
export const REGLES_ALERTES: Record<string, { nom: string, description: string, gravite_default: ..., categorie: 'reproduction'|'sanitaire'|'nutrition'|'pertes' }>
```

**Définition de DONE** :
- Migration appliquée sans erreur : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/20260521000001_alertes_views.sql`
- `select count(*) from v_alertes_actives;` retourne un entier (peut être 0 si DB demo vide)
- 12 règles couvertes dans la view
- `npm run build` ✅

---

### AGENT C3-B — Page Alertes + composants UI

**Fichiers AUTORISÉS** :
- `app/src/app/(app)/alertes/page.tsx` (NEW) — page hub /alertes
- `app/src/app/(app)/alertes/_components/alertes-list.tsx` (NEW) — composant liste avec filtres
- `app/src/app/(app)/alertes/_components/alerte-card.tsx` (NEW) — card individuelle
- `app/src/components/sidebar.tsx` (MODIFY chirurgical) — ajouter lien "Alertes" dans la sidebar (juste avant "Paramètres" ou dans section pertinente)

**Spec page `/alertes`** :
- En-tête avec 4 KPI cards :
  1. Total alertes actives
  2. Critiques (rouge)
  3. Élevées (orange)
  4. Moyennes (jaune)
- Filtres : par gravité (tous / critique / élevée / moyenne / info), par catégorie (reproduction / sanitaire / nutrition / pertes)
- Liste groupée par catégorie ou par règle (toggle)
- Chaque carte d'alerte affiche :
  - Badge gravité couleur (critique=destructive, élevée=danger, moyenne=warning, info=secondary)
  - Titre + description
  - Cible avec lien cliquable (vers page détail animal/bande/matière)
  - Date détection
  - Action rapide "Aller voir" → lien_suggere
- Si zéro alerte : message neutre "Aucune alerte active. Tout va bien 👍"

**Spec sidebar** :
- Section nouvelle "ALERTES" ou ajouter dans "PILOTAGE" un lien "Alertes" avec icône `Bell` (lucide-react)
- Si possible, ajouter un badge compteur next to "Alertes" (mais Server Component → fetch count) — sinon laisse pour V2

**Définition de DONE** :
- Page `/alertes` HTTP 200
- Filtres fonctionnels (côté client OK, ou server avec searchParams)
- Lien sidebar visible
- `npm run build` ✅

---

### AGENT C3-C — Widget alertes sur Tableau de bord + Dashboard top alertes

**Fichiers AUTORISÉS** :
- `app/src/app/(app)/dashboard/_components/alertes-widget.tsx` (NEW) — composant à afficher sur `/dashboard`
- `app/src/app/(app)/dashboard/page.tsx` (MODIFY chirurgical) — ajouter `<AlertesWidget />` dans la grille du dashboard
- `app/src/app/(app)/sanitaire/_components/alertes-sanitaires.tsx` (NEW) — sous-widget filtré gravite élevée+critique catégorie sanitaire pour la page /sanitaire (optionnel mais bonus)

**Spec widget dashboard** :
- Card titre "🔔 Alertes actives"
- Top 5 alertes triées par gravité décroissante (critique > élevée > moyenne > info)
- Format compact : icône gravité + libellé + temps écoulé ("il y a 2j")
- Footer : "Voir toutes les alertes →" lien vers `/alertes`
- Si zéro alerte : "Aucune alerte ✓"

**Spec dashboard page.tsx (MODIFY)** :
- Lire la page actuelle `app/src/app/(app)/dashboard/page.tsx`
- Insérer `<AlertesWidget />` en position pertinente (en haut ou colonne droite) sans casser la structure existante
- Ne PAS toucher au reste

**Définition de DONE** :
- Widget visible sur `/dashboard`
- `/dashboard` HTTP 200
- `npm run build` ✅

---

## Contraintes communes

1. Vocabulaire français standard pro
2. UI : Card / Badge / Button / Select déjà migrés Radix
3. Server Components par défaut
4. Pas de hardcoded hex, utiliser `var(--sf-*)`
5. Date : `date-fns` locale fr (helper `formatDistanceToNow`)
6. Service role key pour query
7. Vérif build : `cd /root/projects/smartfarm/app && npm run build`
8. Test HTTP au moins 1 route par chantier

## Hors-périmètre — INTERDIT
- Reproduction, mises-bas, pesées, sanitaire (pages), stock, cheptel, bandes, alimentation
- Pas de touche aux composants UI base
- Agents B et C ne touchent pas aux views SQL (agent A only)

## Livrable rapport
1. Fichiers créés/modifiés
2. Build (15 dernières lignes)
3. `curl -sI http://localhost:3000/<route>` HTTP 200
4. `PGPASSWORD=postgres psql ... -c "SELECT regle_id, count(*) FROM v_alertes_actives GROUP BY regle_id;"` (agent A)
5. Hypothèses

GO.
