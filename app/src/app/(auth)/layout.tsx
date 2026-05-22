import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Smart Farm — Layout du segment (auth)
 * -------------------------------------------------------------------------
 * Pas de Sidebar / BottomNav ici (volontairement hors du groupe (app)).
 * Card centrée max-w-md, palette Terre & Mil, logo Cachet B en header.
 * Lisible sur mobile dès 320px, gros boutons (min-h-14) pour terrain.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--sf-surface-0)] text-[var(--sf-ink)] flex flex-col">
      <header className="px-5 pt-8 pb-4 flex flex-col items-center gap-3">
        <Link href="/" aria-label="Retour à l'accueil" className="block">
          <Image
            src="/logo-smartfarm.svg"
            alt="Smart Farm"
            width={88}
            height={88}
            priority
            className="h-20 w-20"
          />
        </Link>
        <div className="text-center">
          <div
            className="font-[family-name:var(--sf-font-display)] uppercase tracking-tight text-[var(--sf-ink)] leading-none text-3xl"
          >
            Smart Farm
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-[var(--sf-muted)]">
            Élevage porcin · Côte d&apos;Ivoire
          </div>
        </div>
      </header>

      <main className="flex-1 px-5 pb-10 flex items-start sm:items-center justify-center">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      <footer className="px-5 py-6 text-center text-[10px] uppercase tracking-[0.14em] text-[var(--sf-subtle)]">
        v0.1 — Hermes × Christophe Liegeois
      </footer>
    </div>
  )
}
