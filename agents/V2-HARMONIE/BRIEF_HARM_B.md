# Brief HARM-B — Mycotoxines : produits anti-mycotoxines + rappels

## Périmètre
✅ Touche : 1 migration SQL + `src/app/(app)/sanitaire/mycotoxines/page.tsx`
❌ Pas : sidebar, autres pages, alertes-regles

## Contexte
Lis CONTEXT.md + CLAUDE.md d'abord. Pas `npm run build`.

## Demande utilisateur (Christophe)
"pour la mycotoxine contenue du maïs, on peut ajouter des rappels ou des produits indispensables comme Mycroprotect de Vitalac ou Micofix"

## Mission

### 1. Migration SQL — catalogue produits anti-mycotoxines + rappels

Fichier : `supabase/migrations/20260522080000_anti_mycotoxines.sql`

```sql
BEGIN;

-- Table : produits anti-mycotoxines disponibles (référentiel)
CREATE TABLE IF NOT EXISTS produits_anti_mycotoxines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom text NOT NULL,
  fabricant text NOT NULL,
  type text NOT NULL CHECK (type IN ('liant','enzymatique','combiné','antioxydant','probiotique')),
  spectre text[] NOT NULL DEFAULT '{}'::text[],   -- Afla, ZEA, DON, OTA, FUM
  dose_kg_par_tonne_aliment numeric(6,3),
  cout_fcfa_par_kg numeric(8,2),
  description text,
  url_fournisseur text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT ON produits_anti_mycotoxines TO anon, authenticated;

-- Seed catalogue (produits effectivement disponibles CI / Afrique de l'Ouest)
INSERT INTO produits_anti_mycotoxines (nom, fabricant, type, spectre, dose_kg_par_tonne_aliment, cout_fcfa_par_kg, description) VALUES
  ('Mycoprotect',     'Vitalac',         'combiné',     ARRAY['Afla','ZEA','DON','OTA','FUM'], 2.0, 1850, 'Liant argileux + enzymatique + antioxydants. Large spectre. Référence Vitalac.'),
  ('Mycofix Plus',    'Biomin',          'combiné',     ARRAY['Afla','ZEA','DON','OTA','FUM','T2'], 2.5, 2100, 'Solution biotransformation enzymatique (BBSH) + adsorbants. Biomin (Erber).'),
  ('Toxy-Nil Plus',   'Nutriad',         'combiné',     ARRAY['Afla','ZEA','DON','OTA','FUM'], 1.5, 1700, 'Mélange aluminosilicates + extraits végétaux antioxydants.'),
  ('Mycosorb A+',     'Alltech',         'liant',       ARRAY['Afla','ZEA','DON','OTA','FUM'], 1.0, 2200, 'Polysaccharides de paroi cellulaire (yeast cell wall). Reconnu international.'),
  ('Biotox',          'Cargill',         'combiné',     ARRAY['Afla','ZEA','DON','FUM'], 2.0, 1900, 'Bentonite + parois levures + antioxydants. Cargill Provimi.'),
  ('Detoxa Plus',     'Anpario',         'combiné',     ARRAY['Afla','ZEA','DON','OTA','FUM'], 1.0, 1650, 'Liant + activateur immunitaire + protection hépatique.');

-- Table rappels protocole anti-mycotoxines (par lot)
CREATE TABLE IF NOT EXISTS protocoles_anti_mycotoxines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  produit_id uuid NOT NULL REFERENCES produits_anti_mycotoxines(id),
  matiere_premiere_id uuid REFERENCES matieres_premieres(id),   -- maïs / arachide / etc.
  dose_kg_par_tonne numeric(6,3) NOT NULL,
  date_debut date NOT NULL DEFAULT CURRENT_DATE,
  date_fin date,
  actif boolean NOT NULL DEFAULT true,
  observations text,
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

GRANT SELECT, INSERT, UPDATE ON protocoles_anti_mycotoxines TO anon, authenticated;

-- Vue : recommandation anti-mycotoxines par lot
CREATE OR REPLACE VIEW v_recommandations_anti_mycotoxines
WITH (security_invoker=true) AS
SELECT
  lmp.id AS lot_id,
  lmp.ferme_id,
  lmp.reference_lot,
  mp.nom AS matiere_nom,
  lmp.date_reception,
  lmp.analyse_aflatoxine_b1_ppb,
  lmp.analyse_zearalenone_ppb,
  lmp.analyse_don_ppb,
  lmp.analyse_ochratoxine_a_ppb,
  lmp.analyse_fumonisine_ppb,
  lmp.conforme,
  -- Indication risque
  CASE
    WHEN lmp.analyse_aflatoxine_b1_ppb >= 15 OR lmp.analyse_zearalenone_ppb >= 200 OR lmp.analyse_don_ppb >= 700 OR lmp.analyse_ochratoxine_a_ppb >= 40 OR lmp.analyse_fumonisine_ppb >= 4000 THEN 'eleve'
    WHEN lmp.analyse_aflatoxine_b1_ppb >= 5 OR lmp.analyse_zearalenone_ppb >= 100 OR lmp.analyse_don_ppb >= 400 OR lmp.analyse_ochratoxine_a_ppb >= 20 OR lmp.analyse_fumonisine_ppb >= 2000 THEN 'modere'
    WHEN lmp.conforme IS NULL THEN 'non_analyse'
    ELSE 'faible'
  END AS niveau_risque
FROM lots_matieres_premieres lmp
JOIN matieres_premieres mp ON mp.id = lmp.matiere_premiere_id
WHERE lmp.deleted_at IS NULL
  AND mp.nom ILIKE ANY (ARRAY['%maïs%', '%mais%', '%arachide%', '%soja%']);

GRANT SELECT ON v_recommandations_anti_mycotoxines TO anon, authenticated;

COMMIT;
```

### 2. Refonte `src/app/(app)/sanitaire/mycotoxines/page.tsx`

Sections à ajouter (en plus du tableau lots déjà existant) :

```tsx
// AJOUT 1 : encart pédagogique "produits recommandés"
<Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-900">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <Sparkles className="h-5 w-5 text-amber-600" />
      Produits anti-mycotoxines recommandés
    </CardTitle>
    <CardDescription>Liants + enzymatiques + antioxydants à incorporer dans la ration en saison à risque ou sur lots suspects</CardDescription>
  </CardHeader>
  <CardContent>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 border-b">
          <tr>
            <th className="text-left p-2">Produit</th>
            <th className="text-left p-2">Fabricant</th>
            <th className="text-left p-2">Type</th>
            <th className="text-left p-2">Spectre</th>
            <th className="text-right p-2">Dose (kg/t)</th>
            <th className="text-right p-2">Coût (FCFA/kg)</th>
          </tr>
        </thead>
        <tbody>
          {produits.map((p) => (
            <tr key={p.id} className="border-b">
              <td className="p-2 font-semibold">{p.nom}</td>
              <td className="p-2">{p.fabricant}</td>
              <td className="p-2"><Badge variant="secondary">{p.type}</Badge></td>
              <td className="p-2 text-xs">{(p.spectre ?? []).join(', ')}</td>
              <td className="p-2 text-right font-mono">{p.dose_kg_par_tonne_aliment}</td>
              <td className="p-2 text-right font-mono">{p.cout_fcfa_par_kg?.toLocaleString('fr-FR') ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </CardContent>
</Card>

// AJOUT 2 : section "rappel saison à risque"
<Card className="border-orange-200 bg-orange-50/30">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <CloudRain className="h-5 w-5 text-orange-600" />
      Rappels saisonniers (CI)
    </CardTitle>
  </CardHeader>
  <CardContent className="text-sm space-y-2">
    <p>🌧️ <strong>Saison des pluies (avril-octobre)</strong> : risque élevé aflatoxines maïs/arachide. Analyser systématiquement chaque lot. Stocker au sec ventilé.</p>
    <p>📦 <strong>Stockage</strong> : silos < 14% humidité, ventilation, rotation FIFO. Bâche au sol obligatoire.</p>
    <p>🍃 <strong>Incorporation systématique</strong> : ajouter Mycoprotect/Mycofix/Toxy-Nil à 1.5-2 kg/tonne d'aliment pendant toute la saison à risque, sans attendre analyse positive.</p>
    <p>💧 <strong>Eau</strong> : T° abreuvoir < 28°C limite multiplication moisissures dans cuves.</p>
    <p>🐷 <strong>Animaux sensibles</strong> : truies gestantes (avortements ZEA), porcelets sevrage (immunodépression Afla).</p>
  </CardContent>
</Card>

// AJOUT 3 : recommandation par lot (utilise v_recommandations_anti_mycotoxines)
<Card>
  <CardHeader>
    <CardTitle>Lots à risque — recommandation</CardTitle>
  </CardHeader>
  <CardContent>
    {recos.length === 0 ? (
      <EmptyState icon={ShieldCheck} title="Aucun lot à risque" description="Tous les lots analysés sont en dessous des seuils d'action." />
    ) : (
      <ul className="space-y-2">
        {recos.map((r) => (
          <li key={r.lot_id} className="border-l-4 p-3 rounded-r-md" style={{
            borderColor: r.niveau_risque === 'eleve' ? 'rgb(220,38,38)' :
                         r.niveau_risque === 'modere' ? 'rgb(217,119,6)' :
                         r.niveau_risque === 'non_analyse' ? 'rgb(100,116,139)' : 'rgb(34,197,94)'
          }}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{r.matiere_nom} — lot {r.reference_lot}</div>
                <div className="text-xs text-muted-foreground">
                  Reçu {new Date(r.date_reception).toLocaleDateString('fr-FR')} ·
                  Afla {r.analyse_aflatoxine_b1_ppb ?? '?'} · ZEA {r.analyse_zearalenone_ppb ?? '?'} · DON {r.analyse_don_ppb ?? '?'}
                </div>
              </div>
              <Badge variant={r.niveau_risque === 'eleve' ? 'danger' : r.niveau_risque === 'modere' ? 'warning' : r.niveau_risque === 'non_analyse' ? 'secondary' : 'success'}>
                {r.niveau_risque === 'eleve' ? '🔴 Risque élevé' :
                 r.niveau_risque === 'modere' ? '🟠 Modéré' :
                 r.niveau_risque === 'non_analyse' ? '⚪ Non analysé' : '🟢 Faible'}
              </Badge>
            </div>
            {r.niveau_risque === 'eleve' && (
              <p className="text-sm mt-2 text-red-700 dark:text-red-300">
                ⚠️ <strong>Action immédiate</strong> : incorporer Mycoprotect/Mycofix à 2.5 kg/t, ou refuser le lot pour truies gestantes/porcelets sevrage.
              </p>
            )}
            {r.niveau_risque === 'modere' && (
              <p className="text-sm mt-2 text-amber-700 dark:text-amber-300">
                💡 <strong>Recommandation</strong> : Toxy-Nil ou Detoxa Plus à 1.5 kg/t.
              </p>
            )}
            {r.niveau_risque === 'non_analyse' && (
              <p className="text-sm mt-2 text-slate-600">
                📋 Faire analyser ce lot avant toute incorporation.
              </p>
            )}
          </li>
        ))}
      </ul>
    )}
  </CardContent>
</Card>
```

### 3. Requêtes data

```ts
const { data: produits } = await sb.from('produits_anti_mycotoxines').select('*').eq('actif', true).order('nom')
const { data: recos } = await sb.from('v_recommandations_anti_mycotoxines').select('*').order('niveau_risque', { ascending: false })
```

## Vérif
```sql
SELECT COUNT(*) FROM produits_anti_mycotoxines;
-- attendu : 6
SELECT lot_id, matiere_nom, niveau_risque FROM v_recommandations_anti_mycotoxines;
```

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/sanitaire/mycotoxines
# = 200
```

## Livrable
1. Migration appliquée
2. 6 produits seedés
3. Page mycotoxines enrichie (3 nouvelles cards : produits + rappels saisonniers + recos par lot)
4. Rapport `/root/projects/smartfarm/agents/V2-HARMONIE/RAPPORT_HARM_B.md` ≤ 60 lignes

## Anti-pièges
- Pas de touche v_alertes_actives, sidebar, autres modules
- Si `lots_matieres_premieres` n'a pas d'analyses récentes, `v_recommandations` retourne lignes avec niveau `'non_analyse'` — c'est OK
- Conserver les icônes Lucide (CloudRain, Sparkles, ShieldCheck déjà importables)
