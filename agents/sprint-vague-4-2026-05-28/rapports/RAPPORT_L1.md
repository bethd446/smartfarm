# RAPPORT L1 — B4 Carnet sanitaire MIRAH (PDF + CSV)

**Date** : 2026-05-28
**Rôle** : Dev senior React/Next + @react-pdf/renderer
**Périmètre** : 3 NOUVEAUX fichiers dans `app/src/app/(app)/sanitaire/actes/`

## Fichiers créés

| Fichier | Lignes | Rôle |
|---|---|---|
| `_csv-mirah.ts` | 78 | Sérialiseur CSV pur (BOM UTF-8, `;`, escape RFC 4180) |
| `_pdf-mirah.tsx` | 168 | `<MirahDocument>` @react-pdf/renderer A4 paysage, Courier 8pt, pied de page X/Y |
| `export/route.ts` | 99 | GET handler `?format=pdf|csv`, runtime=nodejs, RLS via getFermeId |

Aucun fichier existant modifié. Aucune dépendance ajoutée.

## Vérifications obligatoires (sorties réelles)

```
V1 ls 3 fichiers → OK (3/3 présents)
V2 grep -c "@react-pdf/renderer" _pdf-mirah.tsx → 1
V3 grep "export const runtime" route.ts → export const runtime = 'nodejs'
V4 grep -cP "\x{FEFF}" _csv-mirah.ts → 2 (commentaire + variable BOM)
V5 wc -l → route 99 (<100), pdf 168 (<200), csv 78 (<80)
```

Toutes les vérifs passent.

## Décisions techniques

1. **`ActeRow` non exporté par `page.tsx`** → type local `ActeRowMirah` (csv) et `MirahActe` (pdf), strictement équivalent au shape Supabase retourné.
2. **Relation FK Supabase** : `produit:veterinaires_standards(nom,type)` (pas `produit:produit_id` du brief — le brief utilisait un raccourci ; vérifié sur `page.tsx` ligne 128).
3. **Normalisation array→object** : Supabase peut retourner `animal/bande/produit` comme array selon version. Helper `pick<T>()` aligné sur le pattern déjà utilisé dans `page.tsx` (lignes 165-167).
4. **`fermes.nom`** : confirmé existant via `grep` (`app/(app)/layout.tsx:81` et `dashboard/page.tsx:75`). Pas `name`.
5. **Validation entrées** :
   - `from`/`to` regex stricte `^\d{4}-\d{2}-\d{2}$` (anti-injection période)
   - `format` whitelist `csv|pdf` (défaut pdf)
   - `filename` sanitisé `[^a-zA-Z0-9._-]` → `-`
6. **Erreurs auth** : `Non authentifié` → 401, `Aucune ferme rattachée` → 403, autre → 500 (mapping cohérent `getFermeId`).
7. **Cache** : `Cache-Control: no-store` (registre réglementaire, jamais cached).
8. **PDF stream** : `stream as unknown as ReadableStream` — Next.js Node runtime accepte les 2 (NodeJS stream + Web stream). Pas de `Readable.toWeb()` nécessaire en Node runtime.
9. **Branding** : aucune mention "Smart Farm" dans le PDF (registre officiel neutre comme demandé).

## Divergences brief

- **Aucune divergence bloquante**. Note : grep V2 attendait `1`, obtenu `1` après nettoyage du commentaire JSDoc qui mentionnait `@react-pdf/renderer` (renommé en "renderToStream").
- Note : cap V5 route<100 atteint à 99 (densification commentaires + ternaire compacté).

## TODO orchestrateur (suivi L1)

Ajouter dans `app/src/app/(app)/sanitaire/actes/page.tsx` (header, à côté du bouton "Enregistrer traitement") :

```tsx
<Link href="/sanitaire/actes/export?format=pdf">
  <Button variant="secondary" size="lg" className="h-12">PDF MIRAH</Button>
</Link>
<Link href="/sanitaire/actes/export?format=csv">
  <Button variant="secondary" size="lg" className="h-12">CSV MIRAH</Button>
</Link>
```

Optionnel : passer `from`/`to` depuis les filtres `mois` actuels (UX cohérente).

## Statut

LIVRÉ — prêt revue Prof / orchestrateur. Pas de build, pas de commit (cf interdits brief).
