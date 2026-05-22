# Brief SA-B — PPA Surveillance (Peste Porcine Africaine)

## Périmètre
✅ Touche : 1 migration SQL + créer `src/app/(app)/sanitaire/ppa/page.tsx` + Server Action déclaration
❌ Pas : autres modules. Pas `npm run build`.

## Contexte
Lis CONTEXT.md + CLAUDE.md d'abord.

**PPA (Peste Porcine Africaine)** : maladie virale hautement contagieuse, mortalité 100%, **DÉCLARATION OBLIGATOIRE OIE/WOAH**. Pas de vaccin, pas de traitement. Côte d'Ivoire = zone à risque endémique africaine.

## Mission

### 1. Migration SQL

Fichier : `supabase/migrations/20260522060000_ppa_surveillance.sql`

```sql
BEGIN;

-- Table : observations cliniques suspectes PPA
CREATE TABLE IF NOT EXISTS ppa_observations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  date_observation date NOT NULL DEFAULT CURRENT_DATE,
  bande_id uuid REFERENCES bandes(id),
  animal_id uuid REFERENCES animaux(id),
  nb_animaux_affectes integer NOT NULL DEFAULT 1 CHECK (nb_animaux_affectes >= 1),
  symptomes text[] NOT NULL DEFAULT '{}'::text[],
  temperature_max numeric(3,1),
  hemorragies_observees boolean DEFAULT false,
  mortalite_subite boolean DEFAULT false,
  prostration boolean DEFAULT false,
  inappetence boolean DEFAULT false,
  cyanose_oreilles boolean DEFAULT false,
  vomissements_diarrhees boolean DEFAULT false,
  niveau_suspicion text NOT NULL CHECK (niveau_suspicion IN ('faible','moyen','eleve','tres_eleve')),
  observations text,
  declare_aux_autorites boolean DEFAULT false,
  date_declaration date,
  reference_declaration text,
  prelevement_effectue boolean DEFAULT false,
  date_prelevement date,
  resultat_laboratoire text CHECK (resultat_laboratoire IS NULL OR resultat_laboratoire IN ('en_attente','negatif','positif','indetermine')),
  date_resultat date,
  enregistre_par uuid REFERENCES utilisateurs(id),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ppa_ferme_date ON ppa_observations(ferme_id, date_observation DESC);
GRANT SELECT, INSERT, UPDATE ON ppa_observations TO anon, authenticated;

-- Vue agrégée surveillance ferme
CREATE OR REPLACE VIEW v_ppa_surveillance
WITH (security_invoker=true) AS
SELECT
  p.ferme_id,
  COUNT(*) FILTER (WHERE p.date_observation >= CURRENT_DATE - 30 AND p.deleted_at IS NULL) AS obs_30j,
  COUNT(*) FILTER (WHERE p.niveau_suspicion IN ('eleve','tres_eleve') AND p.date_observation >= CURRENT_DATE - 30 AND p.deleted_at IS NULL) AS suspicions_critiques_30j,
  COUNT(*) FILTER (WHERE p.resultat_laboratoire = 'positif' AND p.deleted_at IS NULL) AS confirmes_total,
  COUNT(*) FILTER (WHERE p.declare_aux_autorites = false AND p.niveau_suspicion IN ('eleve','tres_eleve') AND p.deleted_at IS NULL) AS suspicions_non_declarees,
  MAX(p.date_observation) FILTER (WHERE p.deleted_at IS NULL) AS derniere_observation
FROM ppa_observations p
GROUP BY p.ferme_id;

GRANT SELECT ON v_ppa_surveillance TO anon, authenticated;

COMMIT;
```

### 2. Page `/sanitaire/ppa/page.tsx`

Server Component avec :
- Encart pédagogique en haut : "PPA = mortalité 100%, déclaration OIE obligatoire, pas de vaccin"
- KPI surveillance (depuis v_ppa_surveillance)
- Tableau historique observations
- Bouton "Nouvelle observation suspecte" → ouvre Dialog
- Liste des symptômes typiques PPA (checklist visuelle)

```tsx
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { AlertTriangle, Shield, Activity, Phone } from 'lucide-react'
import { DialogObservationPPA } from './_dialog-observation'
import { Metadata } from 'next'

export const metadata: Metadata = { title: 'PPA — Surveillance — Smart Farm' }

export default async function PPAPage() {
  const sb = await createClient()
  const { data: surveillance } = await sb.from('v_ppa_surveillance').select('*').single()
  const { data: observations } = await sb.from('ppa_observations').select('*').order('date_observation', { ascending: false }).limit(30)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3" style={{ fontFamily: "var(--sf-font-display)" }}>
            <AlertTriangle className="h-8 w-8 text-red-600" />
            PPA — Surveillance
          </h1>
          <p className="text-sm text-[var(--sf-muted)] mt-1">Peste Porcine Africaine — Déclaration OIE/WOAH obligatoire</p>
        </div>
        <DialogObservationPPA />
      </div>

      {/* Encart pédagogique */}
      <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/30 dark:border-red-900">
        <CardHeader>
          <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
            <Shield className="h-5 w-5" />
            À savoir sur la PPA
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p><strong>Mortalité 100 %</strong> · Pas de vaccin · Pas de traitement · Transmission par contact direct, viande crue, vecteurs (mouches piqueuses).</p>
          <p><strong>Symptômes clés</strong> : fièvre &gt;40°C, prostration, refus aliment, hémorragies sous-cutanées (oreilles, abdomen), cyanose, mortalité subite jeunes.</p>
          <p><strong>Obligation légale</strong> : toute suspicion = déclaration immédiate aux services vétérinaires officiels (OIE/WOAH). Confinement total ferme jusqu'à diagnostic.</p>
          <p className="text-red-700 dark:text-red-300"><strong>📞 Urgence vétérinaire :</strong> Direction des Services Vétérinaires Côte d'Ivoire</p>
        </CardContent>
      </Card>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Observations 30j</div><div className="text-3xl font-bold">{surveillance?.obs_30j ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Suspicions critiques 30j</div><div className="text-3xl font-bold text-amber-600">{surveillance?.suspicions_critiques_30j ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Non déclarées</div><div className="text-3xl font-bold text-red-600">{surveillance?.suspicions_non_declarees ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Confirmés (cumul)</div><div className="text-3xl font-bold">{surveillance?.confirmes_total ?? 0}</div></CardContent></Card>
      </div>

      {/* Tableau observations */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des observations</CardTitle>
          <CardDescription>{observations?.length ?? 0} observation(s) enregistrée(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {(observations ?? []).length === 0 ? (
            <EmptyState icon={Activity} title="Aucune observation enregistrée" description="Cliquer sur 'Nouvelle observation suspecte' pour signaler un cas." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Nb affectés</th>
                    <th className="text-left p-2">Niveau</th>
                    <th className="text-left p-2">Symptômes</th>
                    <th className="text-left p-2">Déclaré</th>
                    <th className="text-left p-2">Résultat labo</th>
                  </tr>
                </thead>
                <tbody>
                  {observations!.map((obs: any) => (
                    <tr key={obs.id} className="border-b">
                      <td className="p-2">{new Date(obs.date_observation).toLocaleDateString('fr-FR')}</td>
                      <td className="p-2 font-mono">{obs.nb_animaux_affectes}</td>
                      <td className="p-2"><Badge variant={obs.niveau_suspicion === 'tres_eleve' ? 'danger' : obs.niveau_suspicion === 'eleve' ? 'warning' : 'secondary'}>{obs.niveau_suspicion}</Badge></td>
                      <td className="p-2 text-xs">{[obs.hemorragies_observees && 'hémorragies', obs.mortalite_subite && 'mort subite', obs.prostration && 'prostration', obs.inappetence && 'refus aliment', obs.cyanose_oreilles && 'cyanose'].filter(Boolean).join(', ') || '—'}</td>
                      <td className="p-2">{obs.declare_aux_autorites ? <Badge variant="success">Oui</Badge> : <Badge variant="danger">Non</Badge>}</td>
                      <td className="p-2">{obs.resultat_laboratoire ? <Badge>{obs.resultat_laboratoire}</Badge> : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### 3. Server Action `_actions.ts`

```ts
'use server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function sb() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
}

export async function enregistrerObservationPPA(formData: FormData) {
  const niveau = String(formData.get('niveau_suspicion') ?? 'moyen')
  const nb = parseInt(String(formData.get('nb_animaux_affectes') ?? '1'))
  const temp = parseFloat(String(formData.get('temperature_max') ?? '0')) || null
  const obs = String(formData.get('observations') ?? '') || null

  const s = sb()
  const { data: fermes } = await s.from('fermes').select('id').limit(1)
  const ferme_id = fermes?.[0]?.id
  if (!ferme_id) return

  await s.from('ppa_observations').insert({
    ferme_id,
    nb_animaux_affectes: nb,
    niveau_suspicion: niveau,
    temperature_max: temp,
    hemorragies_observees: formData.get('hemorragies') === 'on',
    mortalite_subite: formData.get('mortalite_subite') === 'on',
    prostration: formData.get('prostration') === 'on',
    inappetence: formData.get('inappetence') === 'on',
    cyanose_oreilles: formData.get('cyanose') === 'on',
    vomissements_diarrhees: formData.get('vomissements') === 'on',
    declare_aux_autorites: formData.get('declare') === 'on',
    observations: obs,
  })

  revalidatePath('/sanitaire/ppa')
}
```

### 4. Dialog `_dialog-observation.tsx`

Dialog client avec form simple :
- Date observation (default = today)
- Nb animaux affectés
- Niveau suspicion (select : faible / moyen / élevé / très élevé)
- Température max (input number step 0.1)
- Checkboxes symptômes : hémorragies, mort subite, prostration, refus aliment, cyanose oreilles, vomissements/diarrhées
- Checkbox "Déclaré aux autorités"
- Textarea observations
- Bouton submit

## Lien dans sidebar
**Ne touche PAS la sidebar** — sera ajouté dans un sprint suivant si Christophe valide. Pour l'instant, la page est accessible directement par URL.

(Christophe : tu peux quand même cliquer sur "Sanitaire" et arriver à la page via un lien manuel si besoin — mais pas obligatoire pour cette étape.)

## Vérif
```sql
SELECT * FROM v_ppa_surveillance;
SELECT COUNT(*) FROM ppa_observations;
```
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/sanitaire/ppa
# = 200
```

## Livrable
1. Migration appliquée
2. Page `/sanitaire/ppa` opérationnelle
3. Dialog + Server Action
4. Rapport `/root/projects/smartfarm/agents/V2-SPRINT-A/RAPPORT_SA_B.md` ≤ 60 lignes

## Anti-pièges
- Pas de touche autres tables existantes
- `text[]` syntax Postgres : `'{}'::text[]`
- Si CHECK constraint refuse une valeur, vérifier l'enum/IN
- Ne pas créer de règle d'alertes V_alertes_actives pour PPA (sera ajoutée plus tard avec critères précis)
