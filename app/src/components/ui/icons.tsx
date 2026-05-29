'use client'

/**
 * Re-export client de lucide-react.
 *
 * Pourquoi un barrel `'use client'` ?
 * lucide-react 1.16 a introduit `LucideContext` : le composant `Icon` appelle
 * `useContext(LucideContext)`. Une icône importée directement (`from 'lucide-react'`)
 * dans un Server Component, puis placée à l'intérieur d'un trigger de dialog
 * (`<Button><Icon/>label</Button>`) que Radix `DialogTrigger asChild` clone via
 * `Slot`, est pré-rendue côté serveur avec son hook de contexte. La sortie
 * SSR de cette icône diverge alors du rendu client après clonage par Slot →
 * tout le sous-arbre du trigger ne SSR pas → React #418
 * (« Hydration failed because the server rendered HTML didn't match the client »).
 *
 * En important les icônes via ce barrel `'use client'`, l'icône devient une
 * référence client. Elle n'est plus pré-rendue côté serveur dans le payload
 * RSC : elle est rendue côté client à l'hydratation, identique au serveur
 * (qui rend ici une bordure de Suspense vide). Plus de divergence, plus de #418.
 *
 * À utiliser dans tout Server Component qui construit un trigger de Dialog/
 * Sheet/Popover avec une icône lucide. Les Client Components peuvent continuer
 * à importer directement depuis `lucide-react` (cas déjà sain : `_fab.tsx`).
 *
 * Réf. bisection : `srv-icon` ÉCHEC, `srv-clienticon` OK (via ce barrel).
 */
export * from 'lucide-react'
