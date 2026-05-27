# Rapport Lane Inscription — Phase A item A11

**Date** : 2026-05-27
**Lane** : Inscription (item A11 du brief V2)
**Périmètre** : `app/src/app/(auth)/inscription/page.tsx` (1 fichier)
**Statut** : ✅ Livré

---

## Mission

Ajouter validation inline temps réel au formulaire d'inscription (email, password ≥8, bouton submit conditionnel) — actuellement 0 feedback avant submit.

## Changements

**Fichier modifié** : `app/src/app/(auth)/inscription/page.tsx`

### Logique ajoutée
- État local React (`useState`) : `nom`, `email`, `emailDebounced`, `emailTouched`, `password`
- Regex email basique `EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/` (couvre 99% cas)
- Debounce 300ms sur email via `useEffect` → évite clignotement erreur pendant frappe
- `evaluatePwd()` : note 0-4 (longueur ≥12 / maj / chiffre / spécial) → `faible | moyen | fort`
- `allValid` = `nomOk && emailValid && pwdLenOk` (gate du bouton submit)

### Comportement UX
| Champ | onChange | onBlur | Feedback OK | Feedback KO |
|---|---|---|---|---|
| **Nom complet** | tracké | — | (pas d'indicateur, juste gate submit ≥2 chars) | — |
| **Email** | regex + debounce 300ms | check immédiat | icône `Check` verte à droite de l'input | message rouge `Email invalide` sous le champ |
| **Password** | longueur immédiate | — | `✓ Longueur OK` + `Force : Faible/Moyen/Fort` | `Encore N caractères (X/8)` rouge |
| **Bouton submit** | `disabled` tant que `!allValid` | — | — | — |

### Style (tokens existants, 0 nouvelle dépendance)
- Rouge : `text-[var(--sf-danger-ink,#7A2A1F)]` (cohérent avec `aria-invalid` natif Input)
- Vert : `text-[var(--sf-success,#2D4A1F)]`
- Icône check : `lucide-react` `Check` (déjà installé, utilisé partout)
- Font-size erreur/hint : `text-xs` (12px) — conforme brief
- A11y : `aria-invalid`, `aria-describedby`, `noValidate` sur `<form>` (on gère nous-même)

### Préservation existant
- Wording FR Cachet B Minimal intact (`Créer mon compte`, `Tu recevras un numéro client unique…`)
- `inscriptionAction` server action inchangée
- Écran succès post-inscription (numéro client SF-XXXXXX) inchangé
- `PasswordInput` (œil show/hide) inchangé, juste passé `value` + `onChange`
- `useActionState` + flux pending conservé

## Vérifications

| Check | Résultat |
|---|---|
| `npx tsc --noEmit` | ⚠️ **Non exécutable** dans cet environnement de sous-agent (Bash bloqué sur `npx tsc`). À lancer côté orchestrateur avant commit. |
| Audit statique des types | ✅ `Input` = `React.ComponentProps<'input'>` (accepte `value`/`onChange`/`onBlur`/`aria-*`). `PasswordInput` = `Omit<..., 'type'>` (idem). Aucun cast nécessaire. |
| Imports | ✅ `useEffect`, `useMemo`, `useState` ajoutés à l'import React existant. `Check` ajouté depuis `lucide-react` (déjà dans deps). |
| Périmètre | ✅ 1 seul fichier touché (`inscription/page.tsx`). 0 modif `/connexion`, server actions, composants UI globaux. |
| Wording FR | ✅ Cachet B Minimal préservé. Nouveaux messages : `Email invalide (format attendu : nom@domaine.xx)`, `Encore N caractère(s) (X/8)`, `Longueur OK`, `Force : Faible/Moyen/Fort`. |
| 0 nouvelle dépendance | ✅ |

## Points d'attention pour l'orchestrateur

1. **À valider visuellement** (Phase 4 EPCV) : screenshot mobile 360px + desktop 1280px, vérifier que l'icône Check verte ne chevauche pas le placeholder/texte sur petit écran (un `pr-8` est appliqué uniquement quand le check est visible).
2. **TSC** : à exécuter `cd app && npx tsc --noEmit` côté orchestrateur — vérification déterministe non disponible ici.
3. **Test manuel suggéré** :
   - Saisir email progressivement `a`, `a@`, `a@b`, `a@b.c` → erreur disparaît à `a@b.c`
   - Saisir password `1234567` → message rouge `Encore 1 caractère`, à `12345678` → vert + force `Faible`, à `Abc12345!` → force `Fort`
   - Bouton `Créer mon compte` reste grisé tant que les 3 champs ne sont pas valides

## Diff (résumé)

- **Avant** : 123 lignes, 0 état local, aucun feedback inline
- **Après** : ~230 lignes, validation complète onChange/onBlur, debounce email, indicateur force password, submit gate

Mode caveman terminé.
