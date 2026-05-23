# SMARTFARM — CONTEXT.md (caveman style, économique tokens)
*Compact 23/05/2026 — Mode: import vérité terrain EasyFarm*

## QUI / OÙ
- User : Christophe Liegeois (Sr DevOps/Agritech, retour CI)
- Project : Smart Farm (web-app gestion porcine multi-fermes)
- Replace : PorcTrack 8 (abandonné mai 2026)
- Prod live : https://smartfarm.group (HTTP 200, auth réelle OK)
- Repo : github.com/bethd446/smartfarm PUBLIC

## ADMIN COMPTE
- 13smartfarm@gmail.com / Fermebio13
- SF-655295, admin "Smart Farm CI-01"
- ferme_id : 3b350176-d45c-4fea-a67e-eae4a5714aa3

## STACK
- Next.js 16 + React 19 + Tailwind v4 + shadcn/ui
- Supabase Cloud tpzhxjzwlxwujboboyit
- VPS Hostinger Hostinger Cloud, Traefik
- 44 tables + 23 vues + 102 RLS policies

## RÈGLES OR
1. **CAVEMAN** : briefs ≤200 lignes, sous-agents 3-5 fichiers max
2. Sous-agents NE FONT PAS `npm run build` (orchestrateur centralise)
3. Vues SQL : security_invoker=true + GRANT authenticated obligatoire
4. Server actions : wrapper SSR cookies (jamais service_role direct)
5. revalidatePath après chaque server action
6. Migrations : `YYYYMMDDHHMMSS_*.sql`
7. Vocab FR pro zootechnique (Saillie/Mise bas/Sevrage/Gestation/Cochette)
8. Pas npm run build sous-agent — orchestrateur uniquement

## SPRINT 3 - SQL APPLIQUÉ ✅
Migration `20260522190000_portee_ration_fertilite_v2.sql` :
- Table `portees` + trigger AFTER INSERT mises_bas → portée auto P-YYYYMM-NNN
- animaux : portee_id, poids_actuel_kg, batiment_id, boucle_posee_le
- batiments : ration_kg_jour, aliment_type, phase
- enum phase étendu : demarrage_1, demarrage_2, croissance, finition
- 10 bâtiments Smart Farm CI-01 stratégiques
- 13 produits catalogue CI XOF Déc 2025
- 4 vues fertilité/ration (security_invoker=true)
- 2 RPC transferer_bande_phase + mortalité

## DONNÉES PRÉSENTES BDD (À PURGER)
- 17 truies FICTIVES TR001-TR017 (Croisé F1)
- 2 verrats FICTIFS VR001-VR002 (Large White)
- 120 porcelets FICTIFS PL001-PL120
- Bande BD2-2026-05 FICTIVE
- Diagnostics + saillies fictifs
→ TOUT SOFT-DELETE avant import vérité EasyFarm

## CHEPTEL RÉEL EASYFARM (à importer)
- **17 truies** (T01→T19 sauf T08/T17) boucles B.10→B.93
- **2 verrats** : V01 Bobi B.89 LW + V02 Aligator B.100 Piétrain
- **117 porcelets** (110 vivants + 7 malades, M56/F61)
- Poids moy 10.4 kg au 19/05/2026
- Tous → bâtiment **Démarrage 2** vrac (consigne user)
- 6 truies CONFIRMÉES par photo cahier user :
  - T01 Monette B.22 Flushing, MB 03/03, 10 vivants
  - T02 Fillaou B.38 Flushing, MB 07/03, 14 vivants
  - T03 Penelope B.23 Flushing, MB 06/03, 13 vivants
  - T06 — B.93 Flushing, MB 14/03, 10 vivants (2 morts)
  - T07 Choupette B.21 Flushing, MB 26/02, 6 vivants
  - T09 Zapata B.31 Flushing, MB 07/03, 8 vivants
- 11 truies à confirmer (statut + dernières MB/saillies)
- 2 truies actuellement en loge maternité (lesquelles ?)

## INCOHÉRENCES DÉTECTÉES (à régulariser)
- 55 boucles dédoublées M/F → convention user OK, ID BDD = boucle+sexe (B4-M / B4-F)
- 2 vrais doublons :
  - B45 femelle x2 → renommé `B45-F` / `B45-F-bis`
  - B53 mâle x2 → renommé `B53-M` / `B53-M-bis`
- 107/117 porcelets sans date_naissance + sans bande
- Boucle "33" du cahier papier ≠ existe en CSV → probable B.93 (changement boucle physique)

## PHOTOS CAHIER USER (vérité terrain)
- Photo 1 : tableau saillies/MB manuscrit (vague 26/02→14/03 + B.24 le 01/04 13 porcelets)
- Photo 2 : suivi maternité 9 loges (cases 1,2,3,4 lisibles)
- Synthèse user partielle (6 truies confirmées + 5 partielles + reste à venir)

## FICHIERS RÉFÉRENCE
- Export EasyFarm : `/tmp/porctrack_audit/porctrack-export-2026-05-19/`
- CSV truies/verrats/porcelets/saillies/bandes/pesees (filtrage `ferme=EasyFarm` obligatoire — fichier contient aussi "Ferme Audit Test" et "Ma ferme" à exclure)

## EN ATTENTE USER
- JSON consolidé depuis autre session Claude (prompt fourni)
- T IDs réordonnés proprement (T01→T17 séquentiel sans trous)
- Réponse : 2 truies en loge maternité actuellement = lesquelles
- Réponse : poids actualisé ou on garde 10.4 kg du 19/05

## PROCHAINE ACTION
Attendre JSON user → script import propre :
1. Soft-delete 17 fictives + 2 fictifs + 120 fictifs + bande BD2
2. Insert 17 vraies truies (avec MB historiques + saillies courantes)
3. Insert 2 verrats Bobi + Aligator
4. Insert 117 porcelets tous Démarrage 2 (avec doublons résolus)
5. Insert portées historiques (vague 26/02→14/03 + 01/04)
6. Vérif effectifs par bâtiment + dashboard live test
