# Session 2026-05-30 — Nettoyage PorcTrack, audit design, mise en place coordination

**Branche** : `chore/repo-cleanup` (depuis `main`) · **Statut** : terminé

## Fait
1. **Abandon PorcTrack8** : projet remplacé par Smart Farm. Dossiers locaux supprimés (`~/PorcTrack8` 1,9 Go re-clonable depuis GitHub `bethd446/PorcTrack8`, `~/porctrack-test-screens`). Mémoire Claude privée reconstruite sur Smart Farm.
2. **Consolidation worktrees** : 4 copies → **1 seule** `~/smartfarm`. Worktrees `smartfarm-design`, `smartfarm-fix`, `.claude/worktrees/objective-cerf` supprimés. ⚠️ `smartfarm-design` a été retiré pendant qu'une autre session y lançait des agents (collision — d'où ce système de coordination). Toutes les branches sont sur origin.
3. **bug-sweep sauvegardé** + **PR #14 repointée sur `main`** (était sur `feat/design-phase-d`, en conflit) → MERGEABLE/CLEAN. À merger en premier (apporte hydration #418, sécu, filtres + Phase D1/D2). Reste un geste humain (déploie sur smartfarm.group).
4. **Repo dégraissé** : zip d'audit 33 Mo supprimé ; 198 screenshots (~71 Mo) sortis du tracking de `agents/` et `.audits/` ; **158 rapports .md conservés** versionnés.
5. **Audit design web+mobile** → `docs/audits/2026-05-30-audit-design-web-mobile.md` (Nielsen 24/40).
6. **Système de coordination multi-sessions** installé : GitHub Issues (#15-25) + `docs/journal/` + `docs/audits/` + protocole `CLAUDE.md` §15. Audit fonctionnel d'une autre session (P5) intégré au registre.

## Registre créé (issues)
- P0 design : #15 double FAB, #16 densité mobile cheptel, #17 fatigue d'alerte, #18 hydration #418.
- P0 fonctionnel (audit P5, session ce58e94d) : #19 création animal KO, #20 saillie IA_double, #21 pesées KO, #22 formulation déconnectée.
- Suivi : #23 P1 design, #24 P1 fonctionnel, #25 P2/P3 mineurs.

## Reste à faire (prochaine session)
1. **Merger PR #14** (`bug-sweep → main`) — geste humain, déploie.
2. Ensuite **rebaser `feat/design-phase-d` sur le nouveau `main`** (D3 a divergé).
3. Attaquer les P0 : commencer par les **fonctionnels #19-22** (features cassées, plus urgent que le design) sur la base à jour, PAS sur `fix/bug-sweep`.
4. Pousser/merger `chore/repo-cleanup` (dégraissage + ce système) — branche locale non poussée à ce stade.
