import { redirect } from 'next/navigation'

/**
 * V2-HARMONIE (HARM-A) — /sanitaire/eau désactivé
 * -------------------------------------------------------------------------
 * Page retirée de l'UI sur demande Christophe (trop de menus).
 * Le fichier reste pour éviter tout import cassé, et redirige vers le hub.
 * Données `consommations_eau` conservées en DB (alerte R17 toujours active).
 */
export default function EauDeprecated() {
  redirect('/sanitaire')
}
