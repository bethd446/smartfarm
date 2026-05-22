# Brief CHANT-D — Bandes : sexage + transit phase

## Périmètre
✅ Touche : 1 migration SQL + créer `src/app/(app)/bandes/[id]/page.tsx` + créer Server Actions transit
❌ Pas : sidebar, autres modules

## Contexte
Lis CONTEXT.md + CLAUDE.md d'abord. Pas `npm run build`.

## Règles métier (Christophe)
À **2 mois (~60j)** post-sevrage : **sexer la bande** pour éviter consanguinité (séparer mâles/femelles).
La bande peut se **diviser en 2 sous-groupes** : groupe M / groupe F.
Lors du **transit entre phases** (démarrage → croissance → engraissement), demander :
- Confirmation **nombre de sujets** qui transitent
- **Poids moyen** au moment du transit
- Compter automatiquement M/F selon la saisie utilisateur

## Mission

### 1. Migration SQL
```sql
-- supabase/migrations/20260522040000_bandes_sexage_transit.sql
BEGIN;

-- Ajouter phase courante et statut sexage à la bande
ALTER TABLE bandes ADD COLUMN IF NOT EXISTS phase_courante text
  CHECK (phase_courante IS NULL OR phase_courante IN ('post_sevrage','demarrage','croissance','finition','engraissement'));
ALTER TABLE bandes ADD COLUMN IF NOT EXISTS sexee boolean NOT NULL DEFAULT false;

-- Sous-groupe sexe sur bande_animaux
ALTER TABLE bande_animaux ADD COLUMN IF NOT EXISTS sous_groupe text
  CHECK (sous_groupe IS NULL OR sous_groupe IN ('M','F','mixte'));

-- Table transits historisés
CREATE TABLE IF NOT EXISTS transits_phase (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  bande_id uuid NOT NULL REFERENCES bandes(id) ON DELETE CASCADE,
  ferme_id uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  phase_avant text NOT NULL,
  phase_apres text NOT NULL,
  date_transit date NOT NULL DEFAULT CURRENT_DATE,
  nb_males integer NOT NULL DEFAULT 0,
  nb_femelles integer NOT NULL DEFAULT 0,
  poids_moyen_m_kg numeric(6,2),
  poids_moyen_f_kg numeric(6,2),
  poids_total_kg numeric(8,2),
  observations text,
  enregistre_par uuid REFERENCES utilisateurs(id),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_transits_phase_bande ON transits_phase(bande_id, date_transit DESC);
GRANT SELECT, INSERT, UPDATE ON transits_phase TO anon, authenticated;

-- Vue effectif bande détaillé par sexe et sous-groupe
CREATE OR REPLACE VIEW v_bande_effectif
WITH (security_invoker=true) AS
SELECT
  b.id AS bande_id,
  b.code,
  b.nom,
  b.statut,
  b.phase_courante,
  b.sexee,
  b.ferme_id,
  COUNT(ba.animal_id) FILTER (WHERE a.deleted_at IS NULL AND a.statut='actif') AS effectif_total,
  COUNT(ba.animal_id) FILTER (WHERE a.deleted_at IS NULL AND a.statut='actif' AND a.sexe='M') AS nb_males,
  COUNT(ba.animal_id) FILTER (WHERE a.deleted_at IS NULL AND a.statut='actif' AND a.sexe='F') AS nb_femelles,
  COUNT(ba.animal_id) FILTER (WHERE ba.sous_groupe='M') AS sous_groupe_m,
  COUNT(ba.animal_id) FILTER (WHERE ba.sous_groupe='F') AS sous_groupe_f,
  -- Âge moyen de la bande (jours depuis date_debut)
  (CURRENT_DATE - b.date_debut) AS age_bande_jours
FROM bandes b
LEFT JOIN bande_animaux ba ON ba.bande_id = b.id AND ba.date_sortie IS NULL
LEFT JOIN animaux a ON a.id = ba.animal_id
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.code, b.nom, b.statut, b.phase_courante, b.sexee, b.ferme_id, b.date_debut;

GRANT SELECT ON v_bande_effectif TO anon, authenticated;

-- Règle alerte R22 : bande non sexée à 2 mois
-- (à ajouter en UNION ALL dans v_alertes_actives, lis pg_get_viewdef d'abord)
COMMIT;
```

R22 mapping `alertes-regles.ts` :
```ts
'R22-bande-non-sexee-2-mois': {
  nom: 'Bande non sexée à 2 mois',
  description: 'Bande active de plus de 60 jours sans sexage — séparer M/F pour éviter consanguinité.',
  gravite_default: 'moyenne',
  categorie: 'reproduction',
},
```

Branche SQL :
```sql
UNION ALL
SELECT 'R22-bande-non-sexee-2-mois'::text AS regle_id,
       'bande'::text AS cible_type,
       b.id::text AS cible_id,
       b.code AS cible_label,
       'moyenne'::text AS gravite,
       'Bande ' || b.code || ' (' || (CURRENT_DATE - b.date_debut) || ' j) — sexage requis' AS titre,
       'Bande active depuis plus de 60 jours sans sexage. Séparer M et F en sous-groupes pour éviter la consanguinité.'::text AS description,
       ('/bandes/' || b.id::text) AS lien_suggere,
       now() AS detecte_le,
       b.ferme_id
FROM bandes b
WHERE b.deleted_at IS NULL
  AND b.statut IN ('active','sevree','engraissement')
  AND (CURRENT_DATE - b.date_debut) >= 60
  AND b.sexee = false
```

### 2. Page `/bandes/[id]/page.tsx`
Détail bande avec :
- Header : code, nom, statut, phase courante, sexée O/N
- KPI : effectif total, nb M, nb F, sous-groupe M, sous-groupe F, âge bande
- Action **"Sexer cette bande"** si pas encore sexée (>=60j)
- Action **"Transit vers phase suivante"**
- Historique transits

```tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { sexerBande, transitPhase } from './_actions'

export default async function BandeDetail({ params }: { params: Promise<{id: string}> }) {
  const { id } = await params
  const sb = await createClient()

  const { data: bande } = await sb.from('v_bande_effectif').select('*').eq('bande_id', id).single()
  if (!bande) notFound()

  const { data: transits } = await sb.from('transits_phase').select('*').eq('bande_id', id).order('date_transit', { ascending: false })

  // ... rendu
}
```

### 3. Server Actions
Fichier `src/app/(app)/bandes/[id]/_actions.ts` :

```ts
'use server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

export async function sexerBande(formData: FormData) {
  const bande_id = String(formData.get('bande_id') ?? '')
  if (!bande_id) return
  const s = sb()
  // 1. Marquer la bande sexée
  await s.from('bandes').update({ sexee: true }).eq('id', bande_id)
  // 2. Attribuer le sous_groupe selon le sexe des animaux
  const { data: animaux } = await s.from('bande_animaux')
    .select('animal_id, animaux:animal_id(sexe)')
    .eq('bande_id', bande_id)
    .is('date_sortie', null)
  for (const ba of animaux ?? []) {
    const sexe = (ba as any).animaux?.sexe
    if (sexe === 'M' || sexe === 'F') {
      await s.from('bande_animaux')
        .update({ sous_groupe: sexe })
        .eq('bande_id', bande_id)
        .eq('animal_id', (ba as any).animal_id)
    }
  }
  revalidatePath(`/bandes/${bande_id}`)
}

export async function transitPhase(formData: FormData) {
  const bande_id = String(formData.get('bande_id') ?? '')
  const phase_avant = String(formData.get('phase_avant') ?? '')
  const phase_apres = String(formData.get('phase_apres') ?? '')
  const nb_males = parseInt(String(formData.get('nb_males') ?? '0'))
  const nb_femelles = parseInt(String(formData.get('nb_femelles') ?? '0'))
  const poids_moyen_m_kg = parseFloat(String(formData.get('poids_moyen_m_kg') ?? '0')) || null
  const poids_moyen_f_kg = parseFloat(String(formData.get('poids_moyen_f_kg') ?? '0')) || null

  // Poids total auto calculé
  const poids_total_kg = (
    (poids_moyen_m_kg ?? 0) * nb_males +
    (poids_moyen_f_kg ?? 0) * nb_femelles
  ) || null

  const s = sb()
  const { data: bande } = await s.from('bandes').select('ferme_id').eq('id', bande_id).single()
  if (!bande) return

  // INSERT transit historique
  await s.from('transits_phase').insert({
    bande_id, ferme_id: bande.ferme_id,
    phase_avant, phase_apres,
    nb_males, nb_femelles,
    poids_moyen_m_kg, poids_moyen_f_kg, poids_total_kg,
    observations: String(formData.get('observations') ?? '') || null,
  })

  // Update phase courante de la bande
  await s.from('bandes').update({ phase_courante: phase_apres }).eq('id', bande_id)

  revalidatePath(`/bandes/${bande_id}`)
}
```

### 4. Forms dans page bande
- Bouton "Sexer la bande" → form simple, pas de Dialog
- Bouton "Nouveau transit" → Dialog avec champs :
  - phase_avant (auto-rempli depuis bande.phase_courante)
  - phase_apres (select : post_sevrage / demarrage / croissance / finition / engraissement)
  - nb_males / nb_femelles
  - poids_moyen_m_kg / poids_moyen_f_kg
  - observations

Helper visible dans le form : **"Poids total estimé = M × poids M + F × poids F"** calculé en live côté JS.

## Vérif
```sql
SELECT bande_id, code, effectif_total, nb_males, nb_femelles, sous_groupe_m, sous_groupe_f, sexee
FROM v_bande_effectif;
```

```bash
BANDE_ID=$(PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -At -c "SELECT id FROM bandes LIMIT 1;")
curl -s -o /dev/null -w "%{http_code}  /bandes/$BANDE_ID\n" "http://127.0.0.1:3000/bandes/$BANDE_ID"
```

## Livrable
1. Migration appliquée
2. Page `/bandes/[id]` opérationnelle
3. 2 Server Actions (`sexerBande`, `transitPhase`)
4. R22 dans v_alertes_actives + alertes-regles.ts
5. Rapport `/root/projects/smartfarm/agents/V2-METIER/RAPPORT_CHANT_D.md` ≤ 80 lignes

## Anti-pièges
- Lis `v_alertes_actives` actuel (21 règles) avant de la réécrire avec R22
- `bandes.phase_courante` est NEW — pas de données existantes, c'est OK
- `bande_animaux.sous_groupe` est NEW — vide pour bandes non sexées
- Conserve `security_invoker=true` sur les vues
- Page `/bandes/page.tsx` existante — peux la garder simple, juste ajouter les liens
