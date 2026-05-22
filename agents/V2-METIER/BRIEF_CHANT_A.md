# Brief CHANT-A — Retour chaleur post-saillie

## Périmètre
✅ Touche : 1 migration SQL + `src/app/(app)/reproduction/_dialog-diagnostic.tsx` + `_server-actions.ts` + `_schemas.ts` + `page.tsx` + `src/lib/alertes-regles.ts`
❌ Pas : autres modules, sidebar, dashboard

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md` d'abord. Pas `npm run build`.

## Règles métier (Christophe — éleveur senior)
Truie sailliée → **diagnostic gestation J+18-24** (détection retour chaleur si pas gestante).
Si retour chaleur observé → enregistrer + déclencher nouvelle saillie (cycle 21j).
3 retours = candidate réforme (R01 déjà couvre).

## Mission

### 1. Migration SQL — fenêtre suivi retour chaleur
```sql
-- supabase/migrations/20260522020000_suivi_saillie.sql
BEGIN;

-- Vue : saillies en attente de diagnostic
CREATE OR REPLACE VIEW v_saillies_a_diagnostiquer
WITH (security_invoker=true) AS
SELECT
  s.id AS saillie_id,
  s.truie_id,
  a.tag AS truie_tag,
  a.nom AS truie_nom,
  s.date_saillie,
  s.verrat_id,
  v.tag AS verrat_tag,
  s.ferme_id,
  (CURRENT_DATE - s.date_saillie) AS jours_post_saillie,
  CASE
    WHEN (CURRENT_DATE - s.date_saillie) BETWEEN 18 AND 24 THEN 'fenetre_diagnostic'
    WHEN (CURRENT_DATE - s.date_saillie) BETWEEN 25 AND 35 THEN 'fenetre_echographie'
    WHEN (CURRENT_DATE - s.date_saillie) > 35 THEN 'retard'
    ELSE 'attente'
  END AS phase_diagnostic,
  -- Date prévue mise-bas (saillie + 114j)
  (s.date_saillie + 114) AS date_mb_prevue
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.statut='actif' AND a.deleted_at IS NULL
LEFT JOIN animaux v ON v.id = s.verrat_id
LEFT JOIN diagnostics_gestation d ON d.saillie_id = s.id
LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND d.id IS NULL              -- pas encore de diagnostic
  AND mb.id IS NULL             -- pas de mise-bas
  AND (CURRENT_DATE - s.date_saillie) BETWEEN 14 AND 45;

GRANT SELECT ON v_saillies_a_diagnostiquer TO anon, authenticated;

-- Règle R21 dans v_alertes_actives : diagnostic gestation en retard
-- Lis pg_get_viewdef('v_alertes_actives') puis ajoute branche :
-- (à faire dans la migration, recréation complète de la vue)
COMMIT;
```

Pour R21, **lis la déf complète actuelle** (20 règles R01-R20) et ajoute en UNION ALL :
```sql
SELECT 'R21-diagnostic-gestation-attendu'::text AS regle_id,
       'truie'::text AS cible_type,
       s.truie_id::text AS cible_id,
       a.tag AS cible_label,
       'moyenne'::text AS gravite,
       'Diagnostic gestation à faire pour ' || a.tag || ' — J+' || (CURRENT_DATE - s.date_saillie) || ' post-saillie' AS titre,
       'Fenêtre de retour chaleur (18-24j post-saillie). Observer comportement ou faire échographie.'::text AS description,
       '/reproduction?diagnostic=' || s.id::text AS lien_suggere,
       now() AS detecte_le,
       s.ferme_id
FROM saillies s
JOIN animaux a ON a.id = s.truie_id AND a.statut='actif' AND a.deleted_at IS NULL
LEFT JOIN diagnostics_gestation d ON d.saillie_id = s.id
LEFT JOIN mises_bas mb ON mb.saillie_id = s.id AND mb.deleted_at IS NULL
WHERE s.deleted_at IS NULL
  AND d.id IS NULL
  AND mb.id IS NULL
  AND (CURRENT_DATE - s.date_saillie) BETWEEN 18 AND 35
```

### 2. Mapping UI R21 dans `alertes-regles.ts`
```ts
'R21-diagnostic-gestation-attendu': {
  nom: 'Diagnostic gestation attendu',
  description: 'Fenêtre 18-24j post-saillie — détecter retour chaleur ou confirmer gestation par échographie.',
  gravite_default: 'moyenne',
  categorie: 'reproduction',
},
```

### 3. Section sur page `/reproduction` — "Saillies à diagnostiquer"
Au-dessus de la liste actuelle des saillies, ajoute une carte :

```tsx
{/* Section diagnostic */}
const { data: aDiagnostiquer } = await sb
  .from('v_saillies_a_diagnostiquer')
  .select('*')
  .order('jours_post_saillie', { ascending: false })

{(aDiagnostiquer ?? []).length > 0 && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-amber-600" />
        Saillies à diagnostiquer ({aDiagnostiquer.length})
      </CardTitle>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2">
        {aDiagnostiquer.map((s: any) => (
          <li key={s.saillie_id} className="flex items-center justify-between gap-3 p-3 border rounded-md">
            <div className="flex-1">
              <div className="font-mono font-semibold">{s.truie_tag}{s.truie_nom && <span className="text-muted-foreground"> ({s.truie_nom})</span>}</div>
              <div className="text-xs text-muted-foreground">
                Saillie {new Date(s.date_saillie).toLocaleDateString('fr-FR')} · J+{s.jours_post_saillie}
              </div>
            </div>
            <Badge variant={s.phase_diagnostic === 'retard' ? 'danger' : 'warning'}>
              {s.phase_diagnostic === 'fenetre_diagnostic' ? 'Fenêtre 18-24j' :
               s.phase_diagnostic === 'fenetre_echographie' ? 'Échographie 25-35j' :
               s.phase_diagnostic === 'retard' ? 'EN RETARD' : 'À attendre'}
            </Badge>
            <DialogDiagnostic saillieId={s.saillie_id} truieTag={s.truie_tag} />
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
)}
```

### 4. Améliorer `DialogDiagnostic` (`_dialog-diagnostic.tsx`)
Les options du select résultat doivent être :
- "Gestante (positive)" → `positif`
- "Retour chaleur (négative)" → `retour_chaleur`
- "Vide (negative sans signes chaleur)" → `negatif`
- "En attente (à recontroler)" → `en_attente`

Si l'utilisateur sélectionne `retour_chaleur` ou `negatif`, afficher un encart info :
> "💡 Truie revenue en chaleur. Prévoir nouvelle saillie sous 21 jours (cycle œstral). Si 3ᵉ retour consécutif → candidate réforme."

Et un bouton secondaire dans le dialog : "Programmer nouvelle saillie maintenant" qui ouvre directement `<DialogFaireMonter truieId={…} />` (pré-rempli).

## Vérif
```sql
SELECT COUNT(*) FROM v_saillies_a_diagnostiquer;
-- doit retourner > 0 si des saillies existent dans la fenêtre 14-45j
```

```bash
grep -c "R21" /root/projects/smartfarm/app/src/lib/alertes-regles.ts
# = 1
```

## Livrable
1. Migration appliquée
2. UI réorganisée
3. Rapport `/root/projects/smartfarm/agents/V2-METIER/RAPPORT_CHANT_A.md` ≤ 60 lignes

## Anti-pièges
- Lis la vue `v_alertes_actives` **avant** de la réécrire (21 règles maintenant avec R21)
- `security_invoker=true` + `GRANT … TO anon, authenticated`
- Pas de modif sidebar/dashboard
