import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Mentions légales — Smart Farm',
  description:
    'Mentions légales du service Smart Farm : éditeur, hébergement, conformité ARTCI, propriété intellectuelle et contact.',
}

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral">
      <h1>Mentions légales</h1>
      <p className="text-sm text-[var(--sf-muted)]">
        Dernière mise à jour : 27 mai 2026
      </p>

      <h2>Éditeur</h2>
      <p>
        Smart Farm — service de gestion technique d&apos;élevage porcin.
        <br />
        Contact : <a href="mailto:contact@smartfarm.group">contact@smartfarm.group</a>
        <br />
        Site : <a href="https://smartfarm.group">smartfarm.group</a>
      </p>

      <h2>Hébergement</h2>
      <p>
        Frontend : Hostinger International Ltd. — datacenter Frankfurt (Allemagne, Union européenne).
        <br />
        Backend &amp; base de données : Supabase Inc. — datacenter Frankfurt (Allemagne, Union européenne).
      </p>

      <h2>Conformité ARTCI</h2>
      <p>
        Smart Farm s&apos;engage à respecter la réglementation ivoirienne applicable aux services
        numériques. Déclaration auprès de l&apos;Autorité de Régulation des Télécommunications et des
        TIC de Côte d&apos;Ivoire (ARTCI) en cours.
      </p>

      <h2>Propriété intellectuelle</h2>
      <p>
        La marque Smart Farm, son logo, son interface, ses contenus rédactionnels et son code source
        sont protégés par le droit de la propriété intellectuelle. Toute reproduction ou utilisation
        non autorisée est interdite.
      </p>

      <h2>Contact</h2>
      <p>
        Pour toute question relative à ces mentions :{' '}
        <a href="mailto:contact@smartfarm.group">contact@smartfarm.group</a>
      </p>

      <p className="mt-12 text-sm">
        <a href="/" className="underline">← Retour à l&apos;accueil</a>
      </p>
    </main>
  )
}
