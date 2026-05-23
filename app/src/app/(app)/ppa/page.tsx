import { permanentRedirect } from 'next/navigation'

/**
 * Smart Farm — Alias /ppa → /sanitaire/ppa
 * -------------------------------------------------------------------------
 * URL historique `/ppa` renvoyait 404. La vraie page PPA est sous
 * `/sanitaire/ppa` (cohérent avec l'architecture sanitaire). Ce fichier
 * sert d'alias permanent (308) au cas où des liens externes ou anciens
 * bookmarks pointent vers /ppa.
 */
export default function PpaAliasPage(): never {
  permanentRedirect('/sanitaire/ppa')
}

export const dynamic = 'force-static'
