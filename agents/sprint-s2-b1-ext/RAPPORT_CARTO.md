# CARTO B1-EXT — Queries animaux

**Date** : 2026-05-25 · **Auditeur** : caveman Sonnet 4.5  
**Mission** : classifier 17 fichiers `from('animaux')` → 🟢/🟡/🔴/⚪

---

## Synthèse

| Fichier | 🟢 | 🟡 | 🔴 | Total |
|---------|----|----|----| ------|
| dashboard/page.tsx | 3 | 0 | 0 | 3 |
| alertes/page.tsx | 0 | 0 | 0 | 0 |
| batiments/page.tsx | 0 | 0 | 0 | 0 |
| batiments/[id]/page.tsx | 0 | 0 | 0 | 0 |
| cheptel/page.tsx | — | — | — | fixé B1 |
| cheptel/_actions.tsx | 0 | 1 | 0 | 1 |
| cheptel/_server-actions.ts | 0 | 3 | 3 | 6 |
| cheptel/[id]/_actions.ts | 0 | 1 | 2 | 3 |
| cheptel/[id]/genealogie/page.tsx | 0 | 1 | 0 | 1 |
| cheptel/[id]/page.tsx | 0 | 1 | 0 | 1 |
| pesees/page.tsx | 1 | 0 | 0 | 1 |
| reproduction/page.tsx | 2 | 0 | 0 | 2 |
| sanitaire/calendrier/_queries.ts | 2 | 0 | 0 | 2 |
| api/registre/mensuel/_helpers.ts | 0 | 1 | 0 | 1 |
| api/registre/route.ts | 0 | 1 | 0 | 1 |
| lib/chatbot/rag.ts | 0 | 1 | 0 | 1 |
| lib/chatbot/tools/get-animal-by-tag.ts | 0 | 1 | 0 | 1 |
| **TOTAL** | **8** | **11** | **5** | **24** |

**Légende** :
- 🟢 SELECT-list/count cheptel actif → **DOIT** avoir `.eq('statut','actif').is('deleted_at',null)`
- 🟡 SELECT contextuel (ID/tag lookup, historique) → garder TOUTES données
- 🔴 Mutation (INSERT/UPDATE/DELETE) → NE PAS toucher
- ⚪ Soft-delete → NE PAS toucher

---

## 🟢 Patches requis (8 queries)

### 1. dashboard/page.tsx

**L92** — count total animaux actifs (KPI dashboard) :
```ts
// AVANT
sb.from('animaux').select('*', { count: 'exact', head: true }).eq('statut', 'actif')
// APRÈS
sb.from('animaux').select('*', { count: 'exact', head: true }).eq('statut', 'actif').is('deleted_at', null)
```

**L93** — count truies actives :
```ts
// AVANT
sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'truie').eq('statut', 'actif')
// APRÈS
sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'truie').eq('statut', 'actif').is('deleted_at', null)
```

**L94** — count verrats actifs :
```ts
// AVANT
sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'verrat').eq('statut', 'actif')
// APRÈS
sb.from('animaux').select('*', { count: 'exact', head: true }).eq('categorie', 'verrat').eq('statut', 'actif').is('deleted_at', null)
```

---

### 2. pesees/page.tsx

**L17** — dropdown animaux pour saisie pesée :
```ts
// AVANT
sb.from('animaux').select('id, tag, nom').order('tag')
// APRÈS
sb.from('animaux').select('id, tag, nom').eq('statut', 'actif').is('deleted_at', null).order('tag')
```

---

### 3. reproduction/page.tsx

**L58-64** — dropdown truies (dialog "faire monter") :
```ts
// AVANT
sb.from('animaux')
  .select('id, tag, nom')
  .eq('sexe', 'F')
  .in('categorie', ['truie', 'cochette'])
  .eq('statut', 'actif')
  .order('tag', { ascending: true })
// APRÈS
sb.from('animaux')
  .select('id, tag, nom')
  .eq('sexe', 'F')
  .in('categorie', ['truie', 'cochette'])
  .eq('statut', 'actif')
  .is('deleted_at', null)
  .order('tag', { ascending: true })
```

**L67-73** — dropdown verrats :
```ts
// AVANT
sb.from('animaux')
  .select('id, tag, nom')
  .eq('sexe', 'M')
  .eq('categorie', 'verrat')
  .eq('statut', 'actif')
  .order('tag', { ascending: true })
// APRÈS
sb.from('animaux')
  .select('id, tag, nom')
  .eq('sexe', 'M')
  .eq('categorie', 'verrat')
  .eq('statut', 'actif')
  .is('deleted_at', null)
  .order('tag', { ascending: true })
```

---

### 4. sanitaire/calendrier/_queries.ts

**L115-117** — liste animaux pour calcul actes sanitaires prévus :
```ts
// AVANT
sb.from('animaux')
  .select('id, tag, nom, categorie, date_naissance, statut')
  .neq('statut', 'mort')
// APRÈS
sb.from('animaux')
  .select('id, tag, nom, categorie, date_naissance, statut')
  .eq('statut', 'actif')
  .is('deleted_at', null)
```

**L409-411** — count effectif vivant (KPI taux mortalité) :
```ts
// AVANT
sb.from('animaux')
  .select('id', { count: 'exact', head: true })
  .neq('statut', 'mort')
// APRÈS
sb.from('animaux')
  .select('id', { count: 'exact', head: true })
  .eq('statut', 'actif')
  .is('deleted_at', null)
```

---

## 🟡 Justifications contextuel (11 queries)

| Fichier | Ligne | Contexte | Raison |
|---------|-------|----------|--------|
| cheptel/_actions.tsx | L21 | Scan QR → lookup tag | Besoin retrouver animal même réformé (traçabilité) |
| cheptel/_server-actions.ts | L62 | Mouvement bâtiment | Validation ID quel que soit statut |
| cheptel/_server-actions.ts | L149 | Transfert croissance | ✅ Déjà filtré actif (OK) |
| cheptel/_server-actions.ts | L229 | Éligibilité transfert | Erreur métier gérée côté applicatif |
| cheptel/[id]/_actions.ts | L50 | Édition stade | Accès fiche édition quel que soit statut |
| cheptel/[id]/genealogie/page.tsx | L35 | Arbre généalogique | Ascendants/descendants même réformés |
| cheptel/[id]/page.tsx | L51 | Fiche animal détail | Rapport éleveur, historique complet |
| api/registre/mensuel/_helpers.ts | L187 | Effectif truies mois N-1 | Snapshot historique (À CONFIRMER orchestrateur) |
| api/registre/route.ts | L403 | Entrées période | Traçabilité réglementaire, tous mouvements |
| lib/chatbot/rag.ts | L32 | Snapshot ferme chatbot | À CONFIRMER : `.neq('mort')` ou actif strict ? |
| lib/chatbot/tools/get-animal-by-tag.ts | L50 | Tool chatbot | Répondre sur animal même réformé (ex: "poids vente B.76") |

---

## 🔴 Mutations (5 queries)

| Fichier | Ligne | Type | Description |
|---------|-------|------|-------------|
| cheptel/_server-actions.ts | L36 | INSERT | Créer animal |
| cheptel/_server-actions.ts | L101 | UPDATE | Déplacer bâtiment |
| cheptel/_server-actions.ts | L196 | UPDATE | Transfert batch croissance |
| cheptel/[id]/_actions.ts | L81 | UPDATE | Changer stade |
| cheptel/[id]/_actions.ts | L150 | UPDATE | Soft-delete réforme |

---

## ✅ Déjà conformes (3 queries)

- **alertes/page.tsx L37** : `.eq('statut','actif').is('deleted_at',null)` ✅
- **batiments/page.tsx L24** : `.eq('statut','actif').is('deleted_at',null)` ✅
- **batiments/[id]/page.tsx L75** : `.eq('statut','actif').is('deleted_at',null)` ✅

---

## Notes orchestrateur

1. **cheptel/page.tsx** : déjà fixé dans B1 (hors périmètre carto)
2. **cheptel/[id]/_historique-poids.tsx** : pas de query `from('animaux')` directe (requête `pesees` uniquement)
3. **api/registre/mensuel/_helpers.ts L187** : possiblement manque filtre date_entree/sortie pour snapshot mois N-1 → validation métier requise
4. **lib/chatbot/rag.ts L32** : utilise `.neq('mort')` au lieu de `actif` strict → décision orchestrateur : snapshot chatbot = cheptel actif uniquement ?

---

**FIN RAPPORT** · 5.9 KB · Prêt pour sous-agents producteurs
