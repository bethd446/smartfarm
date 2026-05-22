'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

/**
 * Smart Farm — page d'accueil / login
 * -------------------------------------------------------------------------
 * Pattern « Terrain Vivant » :
 *  - surface chaude (--sf-surface-0), pas de gradient
 *  - logo SVG en haut, taille généreuse
 *  - titre Big Shoulders Display 48 px, sous-titre Instrument Sans 16 px
 *  - infos compte démo : liste texte, pas de Card
 *  - CTA « Se connecter » : Button default (tampon), lg (56 px)
 *  - petit footer discret « Test interne — connexion automatique »
 */
export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--sf-surface-0)] text-[var(--sf-ink)] flex items-start sm:items-center justify-center px-5 py-12">
      <div className="w-full max-w-md flex flex-col items-center text-center">

        {/* Logo Smart Farm */}
        <Image
          src="/logo-smartfarm.svg"
          alt="Smart Farm"
          width={160}
          height={160}
          priority
          className="h-32 w-32 mb-8"
        />

        {/* Titre + sous-titre */}
        <h1
          className="font-[family-name:var(--sf-font-display)] uppercase tracking-tight text-[var(--sf-ink)] leading-none"
          style={{ fontSize: '48px' }}
        >
          Smart Farm
        </h1>
        <p
          className="mt-3 text-[var(--sf-muted)] font-[family-name:var(--sf-font-body)]"
          style={{ fontSize: '16px' }}
        >
          Gestion d&apos;élevage porcin · Côte d&apos;Ivoire
        </p>

        {/* Infos compte démo — liste simple, pas de Card */}
        <dl className="mt-10 w-full max-w-sm divide-y divide-[var(--sf-line)] border-t border-b border-[var(--sf-line)] text-[14px]">
          <div className="flex justify-between py-3">
            <dt className="text-[var(--sf-muted)]">Compte démo</dt>
            <dd className="font-mono tabular-nums text-[var(--sf-ink)]">demo@smartfarm.local</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-[var(--sf-muted)]">Ferme</dt>
            <dd className="text-[var(--sf-ink)]">Smart Farm Yamoussoukro</dd>
          </div>
          <div className="flex justify-between py-3">
            <dt className="text-[var(--sf-muted)]">Pays</dt>
            <dd className="text-[var(--sf-ink)]">🇨🇮 Côte d&apos;Ivoire</dd>
          </div>
        </dl>

        {/* CTA */}
        <Link href="/dashboard" className="block w-full max-w-sm mt-8">
          <Button variant="default" size="lg" className="w-full">
            Se connecter
          </Button>
        </Link>

        {/* Footer discret */}
        <p
          className="mt-10 text-[var(--sf-subtle)] eyebrow"
          style={{ fontSize: '10px', letterSpacing: '0.14em' }}
        >
          v0.1 — Hermes × Christophe Liegeois
        </p>
        <p
          className="mt-2 text-[var(--sf-subtle)] text-[9px]"
          style={{ letterSpacing: '0.08em' }}
        >
          Test interne — connexion automatique
        </p>
      </div>
    </main>
  )
}
