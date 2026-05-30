# Audit design web + mobile — Smart Farm — 2026-05-30

Testé en live (`feat/design-phase-d`, compte démo, 9 écrans desktop+mobile + console) puis audit code isolé multi-agents. Méthode : critique impeccable (Nielsen + anti-patterns + personas). Issues GitHub : #15-18 (P0), #23 (P1), #25 (mineurs).

## Score Nielsen : 24/40 (passable+)
Fondations visuelles solides minées par l'intégrité des données et la densité mobile.

| Heuristique | /4 | Problème clé |
|---|---|---|
| Visibilité de l'état | 2 | « 84 alertes » inclut des alertes mortes |
| Correspondance monde réel | 3 | Vocabulaire métier excellent ; gestation « 5 mois » impossible |
| Contrôle & liberté | 3 | Nav claire ; dialog diagnostic buggé |
| Cohérence & standards | 2 | Double FAB, nav desktop≠mobile, CRITIQUE en rose |
| Prévention erreurs | 2 | Placeholder trompeur, aucun garde-fou statut |
| Reconnaissance | 3 | Tabs/sidebar OK ; colonnes vides |
| Flexibilité & efficience | 2 | Zéro raccourci, 22 truies = 22 écrans |
| Esthétique & minimalisme | 3 | Login/Sanitaire superbes ; dashboard surchargé |
| Récupération d'erreurs | 2 | Hydration #418 visible |
| Aide & doc | 2 | Hub Sanitaire = doc ; « en construction » visible |

## Verdict anti-patterns : ✅ réussi
Détecteur déterministe (179 fichiers) : 0 gradient-text, 0 dummy, em-dash respecté dans le copy, palette Terre & Mil tenue, boutons ≥48px par défaut. **Aucun feel « AI-generated »** : DNA « Terrain Vivant » réellement porté.

## Ce qui marche (à préserver)
- Identité forte : vert Sahel + crèmes + Big Shoulders condensé (registre presse agricole).
- Login + hub Sanitaire éditorial (01-07) + tuiles « Actions rapides pensé gants ».
- Boutons unifiés (`button.tsx` ≥48px), `RowActions` accessibles, 1 primary/zone.

## P0 (issues #15-18)
- **Double FAB superposé sur 9 routes** (#15) — `app-shell.tsx:~92` (QuickActionsFab global) + `_fab.tsx` par page. Fix : FAB global limité à `/dashboard` ; supprimer `page-fab.tsx` mort.
- **Densité mobile cheptel** (#16) — `responsive-table.tsx:~108` rend 8 colonnes en cartes ~600px/animal. Fix : carte mobile 2 lignes, masquer champs null.
- **Fatigue d'alerte** (#17) — `dashboard/_components/alertes-widget.tsx:~53` sans péremption ; colostrum CRITIQUE depuis 7 mois ×4. Fix : auto-expirer, dédupliquer, badge actionnable du jour.
- **Hydration #418** (#18) — `ui/dialog.tsx:~48` clone Button base-ui via Radix asChild. Déjà corrigé sur `fix/bug-sweep` (PR #14).

## P1 (issue #23)
- Badges CRITIQUE rose pâle au lieu du rouge plein `alert-critical #DC2626`.
- Cohérence cycle : GESTANTE >114j en vert succès (`cheptel/page.tsx:~332`).
- Nav à deux voix (ACCUEIL≠Tableau de bord, MATERNITÉ≠Mises bas) + sidebar 15 items (>12). Module `lib/nav.ts` partagé.
- Colonnes RACE/NAISSANCE vides 100% + placeholder « B.22 » vs tags « T01 ».
- Titres d'alertes non distinctifs (4 lignes identiques).

## Personas
- **Awa (débutante, entrée de gamme, plein soleil)** : bloquée dès la 1ʳᵉ recherche (« B.22 » → 0 résultat), se perd dans le scroll, ne distingue pas les 4 alertes identiques.
- **Koffi (technicien, 200 truies)** : ne peut pas scanner le cheptel (T17 = 17 écrans), aucun tri, repère « gestante 5 mois » et perd confiance.

## Mineurs (issue #25)
FAB 80px qui empiète + redondant sur actions-rapides · doublon « Nouvel animal » header+FAB · ~8 cibles tactiles 32-36px · em-dash titres Sanitaire · « Conseiller en construction » en prod · 4 `console.log` `proxy.ts` · 3 side-stripe borders `design-v1.css` · `RelativeTime` dupliqué · `slate` hors-palette `contrast-toggle.tsx` · dashboard surchargé (~8 blocs).
