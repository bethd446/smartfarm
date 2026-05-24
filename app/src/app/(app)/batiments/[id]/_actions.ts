'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

/**
 * Server action — édition de la ration journalière (kg/jour/sujet)
 * d'un bâtiment.
 *
 * Validation Zod :
 *   - ration positive
 *   - < 10 kg (sanity-check : un porc adulte > truie gestante consomme
 *     ~3 kg/j, un porc engraissement ~3.5 kg/j max. 10 kg = aberrant)
 */
const SchemaRation = z.object({
  batimentId: z.string().uuid(),
  ration: z
    .number()
    .nonnegative('La ration doit être positive')
    .max(10, 'Ration aberrante (> 10 kg/jour/sujet)'),
})

export async function updateBatimentRation(input: {
  batimentId: string
  ration: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Validation
  const parsed = SchemaRation.safeParse(input)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(' ; ')
    console.error('[updateBatimentRation] validation', { input, msg })
    return { ok: false, error: msg }
  }

  const sb = await createClient()

  // Vérif auth — RLS doit s'occuper du multi-tenant, mais on log pour debug
  const {
    data: { user },
  } = await sb.auth.getUser()
  if (!user) {
    console.error('[updateBatimentRation] no session')
    return { ok: false, error: 'Session expirée — reconnecte-toi.' }
  }

  const { error } = await sb
    .from('batiments')
    .update({ ration_kg_jour_par_sujet: parsed.data.ration })
    .eq('id', parsed.data.batimentId)

  if (error) {
    console.error('[updateBatimentRation] UPDATE failed', {
      batimentId: parsed.data.batimentId,
      code: error.code,
      message: error.message,
    })
    return { ok: false, error: error.message }
  }

  revalidatePath(`/batiments/${parsed.data.batimentId}`)
  revalidatePath('/batiments')
  revalidatePath('/alimentation/plans')
  return { ok: true }
}
