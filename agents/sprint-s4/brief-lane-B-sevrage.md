# Brief LANE B — Cascade sevrage S4

## TOI
Dev senior backend+UI. Caveman. Contexte vierge. 50 min.

## LIS D'ABORD
1. `/root/projects/smartfarm/.brain/CONTEXT.md` (notamment règle 9 filtres animaux)
2. `/root/projects/smartfarm/agents/sprint-s4/RAPPORT_S4_AUDIT.md` §3.1

## PÉRIMÈTRE
✅ Touche :
- `/root/projects/smartfarm/app/src/app/(app)/mises-bas/_dialog-sevrage.tsx` (étendre)
- `/root/projects/smartfarm/app/src/app/(app)/mises-bas/_server-actions.ts` (étendre `creerSevrage()`)

❌ NE PAS toucher autres dialogs/actions (saillie, mise bas, transition)
❌ NE PAS créer migration SQL (les triggers existants suffisent pour cette lane)
❌ NE PAS `npm run build`, pas git commit

## CONTEXTE BUG
Aujourd'hui, sevrage = INSERT 1 ligne `sevrages` avec `effectif_sevre=N`, mais aucune création des N animaux porcelets correspondants dans `animaux`. → Le cheptel n'est PAS mis à jour ! Cf §3.1 du rapport.

Décision orchestrateur #4 : transitions manuelles, donc l'utilisateur CHOISIT le bâtiment destination dans le dialog.

## MISSION

### Phase 1 — Étendre dialog sevrage (~30 min)
Le dialog actuel a 1 étape (formulaire sevrage). Ajouter **étape 2 "Destination"** :

1. Fetch les bâtiments candidats (server side, props) :
   ```ts
   sb.from('batiments')
     .select('id, nom, type, capacite_max, occupation_actuelle')
     .eq('type', 'demarrage')  // ou .in('type', ['demarrage', 'demarrage_1']) selon enum réel
     .is('deleted_at', null)
     .order('nom')
   ```
   ⚠️ **Vérifier d'abord l'enum `batiments.type`** :
   ```bash
   cd /root/projects/smartfarm/app && SR=$(grep "^SUPABASE_SERVICE_ROLE_KEY=" .env.local | cut -d= -f2)
   curl -s "https://tpzhxjzwlxwujboboyit.supabase.co/rest/v1/batiments?select=type,nom" -H "apikey: $SR" -H "Authorization: Bearer $SR" | python3 -c "import json,sys,collections; d=json.load(sys.stdin); print(collections.Counter(r['type'] for r in d))"
   ```
   Adapter le filtre en fonction du résultat. Si aucun type "demarrage" n'existe → fallback `.in('type', ['maternite', 'engraissement', 'demarrage'])` ou filtre permissif (tous bâtiments avec capacité dispo).

2. Step 2 UI : 
   - Select `<Select>` shadcn pour bâtiment
   - Affichage capacité restante (`{capacite_max - occupation_actuelle} places libres`)
   - **Bloquer** si toutes capacités < `effectif_sevre`
   - CTA "Valider sevrage" (au lieu de l'actuel)

3. Wiring step navigation (Précédent/Suivant) : pattern wizard existe déjà dans `_dialog-mise-bas.tsx` (wizard 5 étapes) — t'inspirer mais sans copier exhaustivement.

### Phase 2 — Étendre creerSevrage() (~20 min)

Modifier `_server-actions.ts` :

```ts
export async function creerSevrage(input: {
  // ... champs existants ...
  bâtiment_destination_id: string  // NOUVEAU
}) {
  const sb = await createClient()
  
  // 1. INSERT sevrages (existant) — récupérer sevrage_id
  const { data: sevrage, error: e1 } = await sb.from('sevrages').insert({...}).select().single()
  if (e1) return { error: ... }
  
  // 2. Récupérer la ferme_id depuis la portée
  const { data: portee } = await sb.from('portees').select('ferme_id, mb_id').eq('id', input.portee_id).single()
  
  // 3. INSERT N porcelets en batch
  const porceletsToCreate = Array.from({length: input.effectif_sevre}, (_, i) => ({
    ferme_id: portee.ferme_id,
    tag: `S${sevrage.id.slice(0,8)}-${i+1}`,  // tag temporaire, à boucler après
    categorie: 'porcelet_sevre',
    stade: 'demarrage_1',
    statut: 'actif',
    sexe: 'F',  // ou répartir 50/50, à voir colonne sexe enum
    batiment_id: input.bâtiment_destination_id,
    date_naissance: portee.date_mb,  // si dispo
    portee_id: input.portee_id,
  }))
  
  const { error: e2 } = await sb.from('animaux').insert(porceletsToCreate)
  if (e2) {
    // ROLLBACK : supprimer le sevrage créé
    await sb.from('sevrages').delete().eq('id', sevrage.id)
    return { error: ... }
  }
  
  revalidatePath('/cheptel')
  revalidatePath('/batiments/' + input.bâtiment_destination_id)
  return { ok: true, sevrageId: sevrage.id, porceletsCreated: input.effectif_sevre }
}
```

⚠️ **Vérifier le schéma animaux AVANT INSERT** :
```bash
curl -s "https://tpzhxjzwlxwujboboyit.supabase.co/rest/v1/animaux?select=*&limit=1" -H "apikey: $SR" -H "Authorization: Bearer $SR" | python3 -m json.tool | head -40
```
Adapter les colonnes selon le schéma RÉEL. Si une colonne est NOT NULL et pas dans ton INSERT → erreur. Si `sexe` est obligatoire et tu n'as pas l'info → mettre `'I'` (indéterminé) ou laisser NULL si autorisé.

⚠️ **Tag temporaire** : préfère `'P-' || sevrage_id_short || '-' || i` pour rester unique. L'éleveur le re-boucle plus tard.

## VÉRIFICATIONS OBLIGATOIRES
1. `cd /root/projects/smartfarm/app && npx tsc --noEmit` → 0 erreur
2. Pas d'INSERT testé en BDD (pas de test e2e, juste lint+build coté code)

## LIVRABLE
1. 2 fichiers modifiés
2. Rapport stdout 10 lignes max :
   - Enum batiments.type découvert : [...]
   - Schéma animaux colonnes obligatoires : [...]
   - Dialog : step 2 ajouté OUI/NON
   - Server action : creerSevrage() étendue OUI/NON
   - Rollback : implémenté OUI/NON
   - tsc : OK / FAIL

## ANTI-PIÈGES
- ❌ Ne PAS créer de migration SQL (cette lane = code TS seulement)
- ❌ Ne PAS inventer le schéma — TOUJOURS curl + voir les colonnes RÉELLES avant INSERT
- ❌ Ne PAS oublier le rollback en cas d'échec INSERT porcelets (sinon orphelin sevrages)
- ❌ Ne PAS faire de RPC custom — INSERT batch standard avec service role suffit
- ❌ Tag porcelets : ne PAS utiliser des tags qui pourraient collide avec ceux existants (ex `B.22`) — préfixer avec `P-` ou `S-`
- Si le schéma batiments n'a pas `type='demarrage'` → fallback intelligent (filtre permissif, dropdown ALL avec capacité affichée)

Go.
