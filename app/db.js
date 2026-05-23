/**
 * db.js — Smart Farm
 * ---------------------------------------------------------------------------
 * Stub de connexion Supabase requis par le wizard "Connect Database"
 * d'Hostinger. Ce fichier N'EST PAS importé par l'application Next.js :
 * la vraie intégration vit dans `app/src/lib/supabase/{client,server}.ts`
 * (@supabase/ssr, recommandé pour Next.js 16 + RSC).
 *
 * Conservé pour :
 *   1. Satisfaire le détecteur d'intégration BDD d'Hostinger
 *   2. Permettre un smoke-test CLI rapide via `node db.js`
 *
 * Variables supportées (fallback en cascade) :
 *   SUPABASE_URL              | NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_ANON_KEY         | NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * NE PAS supprimer sans annuler côté hPanel le wizard "Connect Database".
 * ---------------------------------------------------------------------------
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// Smoke-test exécuté uniquement quand on lance directement `node db.js`
if (require.main === module) {
  if (!supabase) {
    console.error(
      '[db.js] SUPABASE_URL / SUPABASE_ANON_KEY absents — variables env manquantes.'
    );
    process.exit(1);
  }
  supabase
    .from('fermes')
    .select('id, nom')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.error('[db.js] Connection error:', error.message);
        process.exit(2);
      }
      console.log('[db.js] Connected. Sample row:', data);
      process.exit(0);
    });
}

module.exports = supabase;
