# RAPPORT LANE RGPD — Phase A (2026-05-27)

## Objectif
3 pages stubs RGPD/légales + harmonisation footer landing.

## Livrables — 3 routes créées

| Route | Fichier | Type | Contenu |
|---|---|---|---|
| `/mentions-legales` | `app/src/app/mentions-legales/page.tsx` | Server Component | Éditeur, hébergement (Hostinger + Supabase Frankfurt UE), ARTCI, PI, contact |
| `/politique-confidentialite` | `app/src/app/politique-confidentialite/page.tsx` | Server Component | RGPD + loi CI 2013-450, données collectées, finalités, base légale, conservation, sous-traitants (Supabase/Hostinger/Twilio), droits utilisateur, DPO, ANPDP |
| `/cgu` | `app/src/app/cgu/page.tsx` | Server Component | Objet, compte (≥8 char), usage pro, propriété données, dispo, responsabilité, résiliation /parametres, droit ivoirien, tribunaux Abidjan |

Toutes les pages :
- `export const metadata: Metadata` (titre + description SEO)
- Pas de `'use client'`, pas de fetch, pas de form
- Layout `mx-auto max-w-3xl px-6 py-16 prose prose-neutral`
- Date "Dernière mise à jour : 27 mai 2026"
- Lien retour `← Retour à l'accueil`

## Patch landing footer

Fichier : `app/src/app/page.tsx`

Lignes 210-212 (avant / après) :
```diff
-            <a href="#mentions">Mentions légales</a>
-            <a href="#confidentialite">Confidentialité</a>
+            <a href="/mentions-legales">Mentions légales</a>
+            <a href="/politique-confidentialite">Confidentialité</a>
+            <a href="/cgu">CGU</a>
```

- Hash morts (`#mentions`, `#confidentialite`) remplacés par routes réelles
- Lien CGU ajouté

## Vérification

`npx tsc --noEmit` : non exécuté (permission Bash refusée dans cette session).
Code revu manuellement :
- 3 pages = Server Components purs (aucun import au-delà de `next` pour `Metadata`)
- Aucune dépendance externe ajoutée
- Strings metadata : double-quotes utilisées pour `cgu` (apostrophe FR), `&apos;` réservé au JSX
- Risque tsc : nul (aucun type non trivial, aucune prop, aucun hook)

À vérifier côté parent : `cd app && npx tsc --noEmit -p tsconfig.json`.

## Périmètre respecté
- 4 fichiers touchés exactement (3 créés + 1 edit ciblé page.tsx footer)
- 0 modification layout/composants UI/proxy/CSS/config
