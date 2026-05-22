# Brief V2-D — BCS truie partout + décomposition mortalité néonatale

## Tu es : Producteur Sonnet 4.5 — contexte vierge
## Mission : Ajouter l'évaluation BCS (1-5) sur les écrans clés et exploiter `nes_morts`/`momifies` déjà présents en DB

---

## PÉRIMÈTRE EXCLUSIF — NE TOUCHE QUE :

1. `supabase/migrations/` — créer **UNE seule** migration `20260521210000_bcs_et_mortalite_neonatale.sql`
2. `app/src/app/(app)/reproduction/_dialog-faire-monter.tsx` (dialog saillie)
3. `app/src/app/(app)/mises-bas/_dialog-nouvelle-mb.tsx` (dialog mise bas — vérifie le nom exact)
4. `app/src/app/(app)/cheptel/[id]/page.tsx` (fiche truie — pour affichage BCS historique)
5. `app/src/app/(app)/reproduction/_schemas.ts` + `_server-actions.ts`
6. Idem pour mises-bas
7. Ne touche **PAS** : nutrition, sanitaire, chatbot, sidebar/bottom-nav, alertes

---

## CONTEXTE

- DB : `PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres`
- Tables clés :
  - `saillies` (id, ferme_id, truie_id, verrat_id, date_saillie, methode, rang_porte, observations)
  - `mises_bas` (id, saillie_id, truie_id, bande_id, date_mise_bas, **nes_totaux**, **nes_vivants**, **nes_morts**, **momifies**, poids_portee_kg, duree_minutes, assistance, observations)
  - `sevrages` (id, mise_bas_id, truie_id, date_sevrage, nb_sevres, poids_total_kg, age_jours)
  - Pas de table dédiée BCS — on ajoute des colonnes optionnelles
- App Next.js 16 standalone, redéploy procédure à la fin du brief
- PATH Node : `export PATH=/root/.hermes/node/bin:$PATH`

---

## OBJECTIF 1 : BCS truie aux 3 moments clés

### Ajouts schéma (1 migration)

```sql
BEGIN;

-- BCS au moment de la saillie
ALTER TABLE saillies ADD COLUMN IF NOT EXISTS bcs_truie numeric(2,1)
  CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5));

-- BCS à la mise-bas
ALTER TABLE mises_bas ADD COLUMN IF NOT EXISTS bcs_truie numeric(2,1)
  CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5));
-- + écrasés (pertes typiques post-naissance, en plus de nes_morts qui sont les mort-nés)
ALTER TABLE mises_bas ADD COLUMN IF NOT EXISTS ecrases integer DEFAULT 0
  CHECK (ecrases IS NULL OR ecrases >= 0);

-- BCS au sevrage
ALTER TABLE sevrages ADD COLUMN IF NOT EXISTS bcs_truie numeric(2,1)
  CHECK (bcs_truie IS NULL OR (bcs_truie >= 1 AND bcs_truie <= 5));

-- Vue historique BCS truie (consommée par la fiche animal)
CREATE OR REPLACE VIEW v_bcs_historique_truie
WITH (security_invoker=true) AS
SELECT truie_id, date_saillie AS date_obs, bcs_truie, 'saillie'::text AS evenement, ferme_id
FROM saillies WHERE bcs_truie IS NOT NULL AND deleted_at IS NULL
UNION ALL
SELECT truie_id, date_mise_bas, bcs_truie, 'mise_bas', NULL::uuid
FROM mises_bas WHERE bcs_truie IS NOT NULL AND deleted_at IS NULL
UNION ALL
SELECT truie_id, date_sevrage, bcs_truie, 'sevrage', NULL::uuid
FROM sevrages WHERE bcs_truie IS NOT NULL AND deleted_at IS NULL;

GRANT SELECT ON v_bcs_historique_truie TO anon, authenticated;

COMMIT;
```

Note : `mises_bas` n'a pas de colonne `ferme_id`. Pour la vue, c'est OK de mettre NULL (le RLS sera côté truie).

### Form changes — saillie

Dans `_dialog-faire-monter.tsx` + `_schemas.ts` :
- Ajoute champ optionnel `bcs_truie` (number, 1-5, step 0.5) avec label "BCS truie (1-5)" et helper text "1 = très maigre, 3 = optimal, 5 = grasse"
- Sélecteur visuel : 5 boutons radios horizontaux 1/2/3/4/5, le 3 surligné comme idéal
- Server action `creerSaillie` doit accepter `bcs_truie` et l'insérer

### Form changes — mise-bas

Idem dans le dialog nouvelle mise-bas :
- Champ `bcs_truie` (même UX que saillie)
- Champ `ecrases` (integer, défaut 0)
- Server action étendue

### Fiche truie `/cheptel/[id]`

Ajoute une **carte "Évolution BCS"** sur la fiche truie :
```tsx
<Card>
  <CardHeader>BCS (Body Condition Score)</CardHeader>
  <CardContent>
    {bcsHistorique.length === 0 ? (
      <EmptyState>Aucune évaluation BCS enregistrée. Renseigne le BCS lors des saillies, mises-bas et sevrages.</EmptyState>
    ) : (
      <ul>
        {bcsHistorique.map(b => (
          <li>
            <span className="font-mono">{b.bcs_truie}/5</span>
            <Badge>{b.evenement}</Badge>
            <span>{formatDate(b.date_obs)}</span>
          </li>
        ))}
      </ul>
    )}
  </CardContent>
</Card>
```

Query côté serveur : `SELECT date_obs, bcs_truie, evenement FROM v_bcs_historique_truie WHERE truie_id = $1 ORDER BY date_obs DESC`.

---

## OBJECTIF 2 : Exploitation décomposition mortalité néonatale

Les colonnes `nes_morts` (mort-nés) et `momifies` existent déjà dans `mises_bas` — l'audit avait raison, **elles ne sont pas affichées**. On ajoute :

### Sur le dialog nouvelle mise-bas
- Champ `nes_morts` (integer, défaut 0) — label "Mort-nés"
- Champ `momifies` (integer, défaut 0) — label "Momifiés"
- Champ `ecrases` (integer, défaut 0) — label "Écrasés (post-naissance)"
- Validation côté schéma : `nes_totaux === nes_vivants + nes_morts + momifies` (sinon avertissement non bloquant — le terrain peut être imprécis)
- Helper text : "Décomposition utile pour le diagnostic pré/post-natal"

### Sur la liste des mises-bas (`/mises-bas/page.tsx`)
- Ajoute colonnes "Vivants / Mort-nés / Momifiés / Écrasés" si elles n'existent pas
- Garde la colonne "Total nés" déjà présente

### Sur la fiche truie `/cheptel/[id]`
- Dans la section "Historique des portées" (ou crée-la si absente), affiche pour chaque MB : `Vivants: N | Mort-nés: M | Momifiés: P | Écrasés: Q | Poids portée: X kg`

---

## PROCÉDURE D'EXÉCUTION

1. Lis les fichiers existants AVANT d'éditer :
   ```bash
   ls -la app/src/app/\(app\)/reproduction/
   ls -la app/src/app/\(app\)/mises-bas/
   ls -la app/src/app/\(app\)/cheptel/\[id\]/
   ```
2. Crée la migration et applique
3. Modifie les fichiers front
4. Rebuild + redeploy (procédure plus bas)
5. Tests HTTP

### Rebuild + redeploy

⚠️ NE LANCE PAS `npm run build`. Ne touche pas au serveur Node. L'orchestrateur centralisera build + redeploy à la fin de la vague. Tu te contentes de modifier les fichiers source et appliquer la migration SQL. Indique simplement dans ton rapport "Build pending — à faire par l'orchestrateur".

---

## LIVRABLES

1. Migration `20260521210000_bcs_et_mortalite_neonatale.sql` créée + appliquée
2. 3 dialogs étendus (saillie, mise-bas) avec BCS + champs décomposition mortalité
3. Fiche truie `/cheptel/[id]` enrichie (carte BCS + historique portées décomposées)
4. Rapport markdown `/root/projects/smartfarm/agents/V2-S2/RAPPORT_V2D.md` avec :
   - SQL `\d saillies | grep bcs`, idem mises_bas et sevrages
   - Liste des composants modifiés
   - Codes HTTP des routes testées

## ANTI-PIÈGES

- N'invente pas le nom du fichier dialog mise-bas — vérifie avec `ls`
- Les Server Actions Next.js exigent rebuild + (parfois) restart du serveur — note-le si besoin
- Ne touche pas à `_actions-porcelets.ts` créé par V2-B
- Ne modifie pas la signature des Server Actions existantes au-delà de l'ajout des nouveaux champs optionnels
