# Brief AUDIT-DARK — Vérif exhaustive dark mode

## Tu es : Reviewer senior contexte vierge — focus dark mode

## Contexte
Lis `/root/projects/smartfarm/.brain/CONTEXT.md` ET `/root/CLAUDE.md` AVANT d'agir.

App URL : `http://127.0.0.1:3000` (local) ou `https://smartfarm.187-127-225-24.nip.io` (HTTPS).

L'app utilise `prefers-color-scheme: dark` auto + variables CSS `--sf-*`. 2 vagues de fix appliquées sur drawer/sidebar/bg-white. Tu valides que tout est nickel ou identifies ce qui cloche encore.

## Mission
Auditer le dark mode sur **8 pages clés** :
- `/dashboard`
- `/alertes`
- `/cheptel` (+ ouvrir 1 fiche `/cheptel/[id]`)
- `/reproduction`
- `/sanitaire`
- `/sanitaire/calendrier`
- `/sanitaire/mycotoxines`
- `/assistant`

Sur **chaque page** :
1. Naviguer en `browser_navigate`
2. Forcer le dark mode via JS :
```js
document.documentElement.setAttribute('data-theme', 'dark')
```
   Puis screenshot via `browser_vision`.
3. Identifier zones illisibles : texte clair sur fond clair, fond blanc resté hardcodé, badges/inputs invisibles, contraste <4.5:1
4. Idem en light : forcer `data-theme=light`, vérifier que rien n'est cassé

## CONSIGNE BUDGET — MAX 18 tool calls
- Tu écris le rapport AU PLUS TARD au 16ème call
- 1 navigate + 1 console JS + 1 vision = 3 calls par page → 8 pages = 24 → **réduis** : juste 5-6 pages représentatives (dashboard, alertes, sanitaire, cheptel, assistant)
- Format télégraphique, pas de prose

## Livrable
Rapport à `/root/projects/smartfarm/agents/V2-AUDIT3/RAPPORT_DARK.md`

Format :
```md
# Audit Dark Mode — Score X/10

## OK (bonnes surprises)
- Dashboard dark : OK
- ...

## P0 bugs (illisible / cassé)
- /alertes dark : badge "AUTRES" texte blanc sur fond blanc, contraste 1.2:1
- ...

## P1 (peu lisible)
- ...

## Score
Light : N/10
Dark  : N/10

## Recommandations fix (≤5 bullets)
```

## Anti-pièges
- Toggle `data-theme` via `setAttribute` (PAS classList) — le système le supporte
- Si vision Gemini est down, décris à partir de browser_snapshot (DOM) — fallback acceptable
- Pas de modifs code, juste audit
