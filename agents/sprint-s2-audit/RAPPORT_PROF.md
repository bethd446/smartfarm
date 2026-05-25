# RAPPORT PROF — Vérification Sprint S2 (Lanes A/B/C)

**Date** : 2026-05-25 12:48 UTC  
**Vérificateur** : Prof (Claude Sonnet 4.5)  
**Périmètre** : B1 (P0), B2 (P0), B3 (P1), B4 (P1), B6 (P2)  
**Status build** : ✅ `npm run build` PASS (exit 0)  
**Status typecheck** : ✅ `npx tsc --noEmit` 0 erreur  

---

## VERDICTS PAR BUG

| Bug | Modif détectée | Conforme fix ? | Régression ? | Verdict |
|-----|----------------|----------------|--------------|---------|
| **B1** | ✅ `.eq('statut','actif').is('deleted_at',null)` sur 3 counts + liste | ✅ OUI | ❌ NON | **✅** |
| **B2** | ✅ `RelativeTime` client component + `useState`/`useEffect` | ✅ OUI | ❌ NON | **✅** |
| **B3** | ✅ `aria-label="Rechercher maladie"` sur input search | ✅ OUI | ❌ NON | **✅** |
| **B4** | ✅ `h-10` → `h-11` (40px → 44px) | ✅ OUI | ❌ NON | **✅** |
| **B6** | ✅ `min-h-11 py-2` sur lien "Retour Soins" | ✅ OUI | ❌ NON | **✅** |

**Total** : 5/5 bugs fixés conformément au RAPPORT_AUDIT.md  

---

## DÉTAILS TECHNIQUES

### B1 — Cheptel affiche animaux vendus/morts (P0 systémique)
**Fichier** : `app/src/app/(app)/cheptel/page.tsx`  
**Diff** :
- Ligne 63-65 : ajout `.eq('statut', 'actif').is('deleted_at', null)` sur compteurs truies/verrats/porcelets
- Ligne 98 : idem sur query liste animaux
- Ligne 66 (portées) : **pas de filtre** → normal, les portées n'ont pas de statut actif/inactif

**Conformité** : ✅ Fix exact du RAPPORT_AUDIT ligne 28-31  
**Note** : Les autres pages animaux (`/reproduction`, `/sanitaire`, `/pesees`) n'ont **PAS** été auditées dans ce sprint (hors périmètre B1-B6). À auditer ultérieurement selon recommandation RAPPORT_AUDIT ligne 32.

### B2 — React error #418 hydration mismatch (P0)
**Fichiers** :
- `app/src/app/(app)/alertes/_components/alerte-card.tsx` : imports `date-fns` déplacés vers `RelativeTime`
- `app/src/app/(app)/alertes/_components/relative-time.tsx` : **nouveau** client component

**Diff** :
```tsx
'use client'
export function RelativeTime({ date }: { date: Date }) {
  const [label, setLabel] = useState<string>('')
  useEffect(() => {
    setLabel(formatDistanceToNow(date, { locale: fr }))
  }, [date])
  return label ? <>il y a {label}</> : null // SSR = null, client = "il y a X min"
}
```

**Conformité** : ✅ Fix exact du RAPPORT_AUDIT ligne 39 (wrap `useState`+`useEffect` client-only)  
**Note** : Render conditionnel évite tout mismatch SSR/client.

### B3 — Form sans label /sanitaire/maladies (P1, a11y)
**Fichier** : `app/src/app/(app)/sanitaire/maladies/_search.tsx`  
**Diff** : `aria-label="Rechercher maladie"` ajouté sur `<Input type="search">`  
**Conformité** : ✅ Fix exact du RAPPORT_AUDIT ligne 44

### B4 — Input recherche cheptel 40px <44 (P1 touch)
**Fichier** : `app/src/app/(app)/cheptel/page.tsx`  
**Diff** : ligne 199 `className="h-10 ..." → className="h-11 ..."`  
**Conformité** : ✅ Fix exact du RAPPORT_AUDIT ligne 50 (40px → 44px)

### B6 — "Retour Soins" 101×20 (P2)
**Fichier** : `app/src/app/(app)/sanitaire/maladies/page.tsx`  
**Diff** : `min-h-11 py-2` ajouté sur lien `/sanitaire`  
**Conformité** : ✅ Fix exact du RAPPORT_AUDIT ligne 61

---

## TESTS DE NON-RÉGRESSION

### TypeScript
```bash
$ npx tsc --noEmit
(aucune sortie = 0 erreur)
```
✅ **PASS** — Aucune erreur de type introduite.

### Build production
```bash
$ npm run build
Route (app)
...
✓ Generating static pages using 7 workers (23/23) in 271ms
[patch-server-passenger] done
✓ Standalone ready
```
✅ **PASS** — Build complet en ~18s (TypeScript 12.9s + SSG 271ms + deploy scripts).  
Aucune erreur Next.js, aucune erreur Turbopack.

### API routes impactées
Aucune route API modifiée → 0 risque régression backend.

### Imports cassés
Aucun import manquant détecté par TypeScript → 0 risque.

---

## CONCLUSION

**STATUS** : ✅ **READY TO COMMIT**

Les 5 bugs (B1, B2, B3, B4, B6) sont fixés conformément au RAPPORT_AUDIT.md.  
Build + typecheck passent sans erreur.  
Aucune régression détectée sur imports, types, ou API.

**Message de commit suggéré** :
```
fix(s2): P0/P1 UX + hydration — 5 bugs

- B1 (P0) : filtre statut=actif + deleted_at=null cheptel counts+list
- B2 (P0) : hydration date alertes → RelativeTime client component
- B3 (P1) : aria-label search maladies (a11y)
- B4 (P1) : input cheptel h-10→h-11 (touch 44px)
- B6 (P2) : lien "Retour Soins" min-h-11 (touch)

TypeCheck + build PASS. Prêt smoke prod.
```

---

## PROCHAINES ÉTAPES (hors périmètre Prof)

1. **Commit** : `git add . && git commit -m "fix(s2): ..."`
2. **Push** : `git push origin main`
3. **Smoke prod** : Playwright `/cheptel`, `/alertes`, `/sanitaire/maladies` (vérifier counts + 0 erreur #418 console)
4. **Audit étendu B1** : Vérifier `/reproduction`, `/sanitaire`, `/pesees` ont même filtre `statut=actif`

---

**Signature** : Prof (Sonnet 4.5) · Duration: ~3 min (typecheck 0s + build 18s + audit 2min)
