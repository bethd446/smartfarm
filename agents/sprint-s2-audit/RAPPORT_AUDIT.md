# RAPPORT AUDIT S2 — Smart Farm prod
Date : 2026-05-25 · Auditeur : sous-agent caveman (Sonnet 4.5) + orchestrateur (Opus 4.7)
Cible : https://smartfarm.group · Compte : 13smartfarm@gmail.com

## Synthèse
| ID | Sévérité | Page | Fichier coupable probable | Effort (min) |
|---|---|---|---|---|
| B1 | **P0** | /cheptel?tab=porcelets | brain CONTEXT.md OU import porcelets | 15 |
| B2 | **P0** | /alertes (mobile) | alertes-list.tsx (hydration) | 30 |
| B3 | P1 | /sanitaire/maladies | _search.tsx (form label) | 5 |
| B4 | P1 | /cheptel (mobile) | cheptel/page.tsx (input search h-10) | 5 |
| B5 | ~~P2~~ FAUX POSITIF | n/a | bouton 28×28 transitoire (loading skeleton ?) non reproduit au re-test | 0 |
| B6 | P2 | /sanitaire/maladies | _search.tsx (texte "Retour Soins" cliquable 20px) | 5 |

**Total effort : ~80 min.** Aucun overflow horizontal, aucun image cassée, aucune 4xx/5xx.
LCP excellents : 183-519 ms (cible <2.5s) — perf OK.

---

## B1 — Cheptel affiche animaux vendus/morts/supprimés (P0 systémique)
**Symptôme** : `/cheptel?tab=porcelets` affiche **135** lignes (UI), brain dit 117, BDD `statut=actif` = **129**.
**Cause confirmée** : `cheptel/page.tsx` lignes 62-66 (counts) + 98-104 (list query) **n'ont AUCUN filtre `.eq('statut', 'actif').is('deleted_at', null)`**. La RLS filtre par `ferme_id` mais pas par statut → réformés/vendus/morts affichés comme actifs.
**Preuve** :
- curl service-role `statut=actif` + ferme Smart Farm = **129**
- curl sans `statut` = **135**
- delta = **6 animaux sortis** affichés à tort
**Fix** :
```ts
// ligne 63-66 (counts) ET 98 (liste) : ajouter à chaque chaîne
.eq('statut', 'actif').is('deleted_at', null)
```
**Étendre** : auditer toutes les pages animaux (`/reproduction`, `/sanitaire`, `/pesees`, etc.) → même filtre obligatoire partout.
**Vérif** : UI count = SQL count avec `statut=actif AND deleted_at IS NULL`.

## B2 — React error #418 hydration mismatch (P0)
**Symptôme** : Sur `/alertes` mobile, erreur console `Minified React error #418` après login.
**Doc** : https://react.dev/errors/418 = "Text content does not match server-rendered HTML"
**Cause probable** : `formatDistanceToNow(detecteLe)` dans `alerte-card.tsx` ligne 117-118 → calcul date côté serveur ≠ côté client (drift secondes/timezone). Pattern connu Next 16 RSC + date-fns.
**Fix** : wrap dans `useState`+`useEffect` (client-only) OU passer `dateString` pré-calculée du serveur OU `suppressHydrationWarning` sur le span.
**Vérif** : 0 erreur #418 console après rebuild.

## B3 — Form sans label /sanitaire/maladies (P1, a11y)
**Symptôme** : `<input type="search">` placeholder "Rechercher par nom, symptôme…" sans `<label htmlFor>` lié.
**Fix** : `_search.tsx` → wrap input dans `<label class="sr-only">Rechercher maladie</label>` ou `aria-label="Rechercher maladie"`.
**Vérif** : Lighthouse a11y >95.

## B4 — Input recherche cheptel 40px <44 (P1 touch)
**Symptôme** : `/cheptel` mobile, `<input type=search name=q>` height 40px (cible 44px min terrain).
**Preuve** : `/tmp/sf-s2/probe-report.json` `{"tag":"input","width":259,"height":40}`.
**Fix** : `cheptel/page.tsx` ligne 199 `h-10` → `h-11` (44px).
**Vérif** : `getBoundingClientRect().height >= 44`.

## B5 — Boutons icône 28×28 sur 5 pages (P2)
**Symptôme** : présent sur `/pesees`, `/sanitaire/maladies`, `/calendrier`, `/stock`, `/reproduction` (cf probe-report.json).
**Hypothèse** : bouton de fermeture toast/modal OU icon-only menu PAS dans `<Button>` shadcn.
**Investigation requise** : screenshot annoté pour identifier.
**Fix probable** : remplacer par `<Button size="icon" className="min-h-11 min-w-11">`.

## B6 — "Retour Soins" 101×20 (P2)
**Symptôme** : `/sanitaire/maladies` lien "Retour Soins" h=20px (touch fail).
**Fix** : ajouter `inline-flex items-center min-h-11 py-2`.

---

## Hors périmètre P0 confirmé
- ✅ Pas d'overflow horizontal (toutes pages, Pixel 7 + Desktop 1280)
- ✅ Pas d'image cassée
- ✅ Pas de 4xx/5xx réseau
- ✅ LCP <600ms partout (perf saine)
- ✅ Console clean sauf B2 (#418)
- ✅ Authentification fonctionnelle
- ✅ Toast snooze (S1) confirmé fonctionnel
- ✅ Bouton "Rechercher" cheptel (S1) confirmé renommé

## Recommandation orchestrateur
Sprint S2 = 4 lanes parallèles (1 sous-agent / bug ou groupe) :
- **Lane A** (P0) : B1 vérif DB count porcelets + sync brain
- **Lane B** (P0) : B2 fix hydration date alerte-card
- **Lane C** (P1 a11y) : B3 + B4 + B6 (3 tweaks CSS/aria, 1 seul lane)
- **Lane D** (P2 investigation) : B5 identifier le bouton 28×28

Puis **Lane Prof** : vérificateur Opus relit diff de chaque lane, build, smoke prod.
