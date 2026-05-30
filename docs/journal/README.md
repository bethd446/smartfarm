# Journal des sessions — coordination multi-sessions

Plusieurs sessions Claude (et humains) travaillent en parallèle sur ce repo. Ce dossier + les **GitHub Issues** sont la mémoire **partagée** : la mémoire interne d'un agent (`~/.claude/.../memory/`) est privée à sa session et **n'est pas vue par les autres**. Tout ce qui doit être commun vit ici, dans le repo.

## Les 3 briques

| Brique | Où | Rôle |
|---|---|---|
| **Registre des tâches** | GitHub Issues (`gh issue list`) | Qui fait quoi, ce qui est à faire / en cours / corrigé. Anti-doublon. |
| **Journal de session** | `docs/journal/AAAA-MM-JJ-sujet.md` (1 fichier/session) | Rapport de ce qu'une session a fait. Jamais de conflit (1 fichier chacun). |
| **Audits** | `docs/audits/` | Rapports d'audit complets, accessibles à toutes les sessions. |

## Protocole (résumé — détail dans `CLAUDE.md` §15)

1. **Au démarrage** : `gh issue list --state open` + lire les 2-3 derniers fichiers de `docs/journal/`. Ne reprends pas une issue déjà assignée ou fermée.
2. **Réserver** : `gh issue edit <N> --add-assignee @me` AVANT de commencer. Si quelqu'un est déjà dessus, choisis autre chose.
3. **Brancher** : 1 issue = 1 branche `fix/<N>-slug` ou `feat/<N>-slug`. `git pull --rebase origin main` avant de pousser.
4. **Finir** : écris ton fichier `docs/journal/<date>-<sujet>.md`, ferme l'issue (`gh issue close <N>`), commit + push.

## Nommage du fichier journal
`AAAA-MM-JJ-<sujet-court>.md` — ex. `2026-05-30-fix-creation-animal.md`. Si deux sessions le même jour, suffixe : `-2`, `-design`, etc.
