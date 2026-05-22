# Brief POLISH-C — Conformité + Biosécurité + ISS alerte

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : 4 fix conformité/sécurité P1-P2 identifiés par l'audit V2 Round 2

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `supabase/migrations/` — UNE migration `20260522000100_polish_c_conformite.sql`
2. `app/src/lib/alertes-regles.ts` (ajout R20 alerte ISS)
3. `app/src/app/(app)/sanitaire/biosecurite/page.tsx` + `_actions.ts` (checklist persistante)

NE TOUCHE PAS : nutrition-engine, sidebar, dashboard, autres pages métier.

---

## FIX #1 — Mycotoxines : ajouter OTA + FUM (CI risque élevé)

### Bug audit V2 R2 (P1 métier)
La table `lots_matieres_premieres` ne tracke que aflatoxine B1, zéaralénone, DON. Manque **2 mycotoxines critiques en zone tropicale** :
- **Ochratoxine A (OTA)** — risque sur arachide stockée humide, seuil porcin ≤ 50 ppb
- **Fumonisines (FB1+FB2)** — risque maïs en zone tropicale, seuil ≤ 5 000 ppb porcs sevrés

### Fix DB
```sql
ALTER TABLE lots_matieres_premieres ADD COLUMN IF NOT EXISTS analyse_ochratoxine_a_ppb numeric(8,2);
ALTER TABLE lots_matieres_premieres ADD COLUMN IF NOT EXISTS analyse_fumonisine_ppb numeric(10,2);

COMMENT ON COLUMN lots_matieres_premieres.analyse_ochratoxine_a_ppb IS 'Ochratoxine A en ppb (µg/kg). Seuil UE porcs : ≤ 50';
COMMENT ON COLUMN lots_matieres_premieres.analyse_fumonisine_ppb IS 'Fumonisines totales (FB1+FB2) en ppb. Seuil UE porcs sevrés : ≤ 5000';

-- Recalculer la colonne 'conforme' avec les nouvelles toxines
ALTER TABLE lots_matieres_premieres DROP COLUMN IF EXISTS conforme;
ALTER TABLE lots_matieres_premieres ADD COLUMN conforme boolean GENERATED ALWAYS AS (
  (analyse_aflatoxine_b1_ppb IS NULL OR analyse_aflatoxine_b1_ppb <= 20)
  AND (analyse_zearalenone_ppb IS NULL OR analyse_zearalenone_ppb <= 250)
  AND (analyse_don_ppb IS NULL OR analyse_don_ppb <= 900)
  AND (analyse_ochratoxine_a_ppb IS NULL OR analyse_ochratoxine_a_ppb <= 50)
  AND (analyse_fumonisine_ppb IS NULL OR analyse_fumonisine_ppb <= 5000)
) STORED;
```

⚠️ `DROP/ADD COLUMN conforme` : la colonne est `GENERATED` donc on peut la recréer sans perte de données.

### Frontend
NE MODIFIE PAS la page mycotoxines (P2 polish — peut être fait plus tard).
**Documente** dans le rapport que la page front affiche déjà colonnes Afla/ZEA/DON et que les nouvelles colonnes OTA/FUM sont en base prêtes à être affichées dans une future PR.

---

## FIX #2 — Biosécurité : checklist persistante

### Bug audit V2 R2 (P2-6)
La checklist biosécurité (12 points) est 100% statique : pas d'état "coché/non coché" persistant en DB, pas de bouton "Marquer point conforme".

### Fix DB
```sql
CREATE TABLE IF NOT EXISTS biosecurite_audits (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ferme_id uuid NOT NULL REFERENCES fermes(id),
  checklist_item_id uuid NOT NULL REFERENCES biosecurite_checklist(id),
  statut text NOT NULL CHECK (statut IN ('conforme','non_conforme','non_evalue')),
  date_audit date NOT NULL DEFAULT CURRENT_DATE,
  observations text,
  audite_par uuid REFERENCES utilisateurs(id),
  created_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_biosecurite_audits_ferme_item
  ON biosecurite_audits(ferme_id, checklist_item_id, date_audit DESC);

GRANT SELECT, INSERT, UPDATE ON biosecurite_audits TO anon, authenticated;

-- Vue dernier audit par item (pour affichage page)
CREATE OR REPLACE VIEW v_biosecurite_etat_actuel
WITH (security_invoker=true) AS
SELECT DISTINCT ON (a.ferme_id, a.checklist_item_id)
  a.ferme_id,
  a.checklist_item_id,
  c.categorie,
  c.item,
  c.obligatoire,
  c.ordre,
  a.statut,
  a.date_audit,
  a.observations
FROM biosecurite_audits a
JOIN biosecurite_checklist c ON c.id = a.checklist_item_id
WHERE a.deleted_at IS NULL
ORDER BY a.ferme_id, a.checklist_item_id, a.date_audit DESC, a.created_at DESC;

GRANT SELECT ON v_biosecurite_etat_actuel TO anon, authenticated;
```

### Frontend `app/src/app/(app)/sanitaire/biosecurite/page.tsx`

Ajoute un Server Action dans `_actions.ts` :

```ts
export async function noterAuditBiosecurite(formData: FormData) {
  const checklist_item_id = String(formData.get('checklist_item_id') ?? '')
  const statut = String(formData.get('statut') ?? 'conforme')
  const observations = formData.get('observations') ? String(formData.get('observations')) : null

  if (!checklist_item_id) return
  const supabase = sb()
  const { data: fermes } = await supabase.from('fermes').select('id').limit(1)
  const ferme_id = fermes?.[0]?.id
  if (!ferme_id) return

  await supabase.from('biosecurite_audits').insert({
    ferme_id, checklist_item_id, statut, observations,
  })
  revalidatePath('/sanitaire/biosecurite')
}
```

Dans la page, lis depuis `v_biosecurite_etat_actuel` au lieu de la checklist statique seule, et pour chaque item affiche :
- Statut actuel (conforme / non_conforme / non_evalue)
- Badge coloré
- Bouton "Marquer conforme" + "Marquer non conforme" (2 formulaires)

```tsx
{items.map(item => (
  <li key={item.id} className="flex items-center gap-2 py-2 border-b last:border-0">
    <Badge variant={item.statut === 'conforme' ? 'success' : item.statut === 'non_conforme' ? 'danger' : 'secondary'}>
      {item.statut === 'conforme' ? '✓ OK' : item.statut === 'non_conforme' ? '✗ Non conforme' : 'Non évalué'}
    </Badge>
    <span className="flex-1">{item.item}</span>
    {item.obligatoire && <Badge variant="warning">Obligatoire</Badge>}
    <form action={noterAuditBiosecurite} className="inline">
      <input type="hidden" name="checklist_item_id" value={item.checklist_item_id} />
      <input type="hidden" name="statut" value="conforme" />
      <Button type="submit" size="sm" variant="ghost">✓</Button>
    </form>
    <form action={noterAuditBiosecurite} className="inline">
      <input type="hidden" name="checklist_item_id" value={item.checklist_item_id} />
      <input type="hidden" name="statut" value="non_conforme" />
      <Button type="submit" size="sm" variant="ghost">✗</Button>
    </form>
  </li>
))}
```

⚠️ Pour les items jamais audités (pas dans `v_biosecurite_etat_actuel`), tu dois faire un LEFT JOIN côté SQL ou côté code :

```ts
const supabase = await createClient()
const { data: checklist } = await supabase
  .from('biosecurite_checklist').select('*').order('categorie').order('ordre')
const { data: audits } = await supabase
  .from('v_biosecurite_etat_actuel').select('*')

const checklistAvecEtat = (checklist ?? []).map(item => {
  const audit = (audits ?? []).find(a => a.checklist_item_id === item.id)
  return {
    ...item,
    checklist_item_id: item.id,
    statut: audit?.statut ?? 'non_evalue',
    date_audit: audit?.date_audit,
    observations: audit?.observations,
  }
})
```

---

## FIX #3 — Alerte ISS (Intervalle Sevrage-Saillie) > 10j

### Manque audit métier V2 R2
Une vraie alerte métier manque : intervalle sevrage→nouvelle saillie > 10 jours = ralentissement reproductif (cible biologique 5-7j).

### Fix
Récupérer la déf de `v_alertes_actives` post-POLISH-A et ajouter une branche R20 :

```sql
UNION ALL
SELECT 'R20-iss-trop-long'::text AS regle_id,
       'truie'::text AS cible_type,
       sv.truie_id::text AS cible_id,
       a.tag AS cible_label,
       'moyenne'::text AS gravite,
       'Truie ' || a.tag || ' : ISS = ' || (CURRENT_DATE - sv.date_sevrage) || ' jours depuis le sevrage sans nouvelle saillie' AS titre,
       'Intervalle sevrage-saillie > 10 j (cible 5-7 j). Vérifier détection chaleur, état corporel BCS, alimentation flushing.'::text AS description,
       ('/cheptel/' || sv.truie_id::text) AS lien_suggere,
       now() AS detecte_le,
       a.ferme_id
FROM sevrages sv
JOIN animaux a ON a.id = sv.truie_id AND a.statut='actif' AND a.deleted_at IS NULL
LEFT JOIN saillies s ON s.truie_id = sv.truie_id AND s.date_saillie > sv.date_sevrage AND s.deleted_at IS NULL
WHERE sv.deleted_at IS NULL
  AND s.id IS NULL  -- aucune saillie après ce sevrage
  AND (CURRENT_DATE - sv.date_sevrage) > 10
  AND sv.date_sevrage = (
    SELECT MAX(sv2.date_sevrage) FROM sevrages sv2
    WHERE sv2.truie_id = sv.truie_id AND sv2.deleted_at IS NULL
  )
```

### Mapping UI `alertes-regles.ts`
```ts
'R20-iss-trop-long': {
  nom: 'ISS trop long (>10j)',
  description:
    'Intervalle sevrage→saillie supérieur à 10 jours (cible biologique 5-7 j) — détection chaleur ou BCS à vérifier.',
  gravite_default: 'moyenne',
  categorie: 'reproduction',
},
```

---

## FIX #4 — Site IM "encolure" au lieu de "entre les côtes"

### Bug audit métier V2 R2 (P2)
Certains libellés mentionnent vaccination "entre les côtes" — dangereux (risque ponction pulmonaire/cardiaque). La voie IM standard porcine est **encolure** (musculature massétère).

### Fix
```bash
grep -rn "entre les côtes\|inter-cost\|intercostal" /root/projects/smartfarm/app/src/ 2>&1
grep -rn "entre les côtes\|inter-cost" /root/projects/smartfarm/supabase/ 2>&1
```

Si trouvé : remplacer par "encolure (musculature massétère)". Sinon : note dans le rapport "aucune occurrence trouvée, libellé déjà sain".

Mets aussi à jour la colonne `voie` dans `protocoles_vaccinaux` si elle contient une valeur trop courte/ambiguë :
```sql
UPDATE protocoles_vaccinaux SET voie = 'IM (encolure)'
WHERE voie = 'IM' AND deleted_at IS NULL;
```

---

## PROCÉDURE

1. Migration en transaction unique
2. Modifier `alertes-regles.ts` (ajout R20)
3. Modifier page biosécurité + actions
4. Cherche "entre les côtes" dans codebase + migrations
5. Vérif :
   ```sql
   SELECT regle_id, COUNT(*) FROM v_alertes_actives GROUP BY regle_id ORDER BY regle_id;
   SELECT COUNT(*) FROM biosecurite_audits;
   SELECT voie, COUNT(*) FROM protocoles_vaccinaux GROUP BY voie;
   ```
6. ⚠️ NE LANCE PAS `npm run build`

---

## LIVRABLES

1. Migration appliquée (lots OTA/FUM + biosecurite_audits + vue + R20 dans v_alertes + UPDATE voie)
2. `alertes-regles.ts` enrichi (19 → 20 règles)
3. Page biosécurité avec checklist interactive
4. Voie IM précisée "encolure"
5. Rapport `/root/projects/smartfarm/agents/V2-POLISH/RAPPORT_POLISH_C.md`

## ANTI-PIÈGES
- POLISH-A modifie aussi `v_alertes_actives` (ajout R19). Lis la déf POST-POLISH-A.
- POLISH-A modifie aussi `alertes-regles.ts` (ajout R19). Coordonne : ajoute R20 sans écraser R19.
- `DROP/ADD COLUMN conforme` : OK car GENERATED (pas de data perdue), mais teste l'intégrité après
- `biosecurite_audits` : ne supprime PAS la table `biosecurite_checklist` existante
