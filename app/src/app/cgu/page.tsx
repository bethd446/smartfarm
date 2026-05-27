import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Smart Farm",
  description:
    "Conditions générales d'utilisation du service Smart Farm : objet, compte, usage, données, disponibilité, responsabilité, résiliation et droit applicable.",
}

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral">
      <h1>Conditions générales d&apos;utilisation</h1>
      <p className="text-sm text-[var(--sf-muted)]">
        Dernière mise à jour : 27 mai 2026
      </p>

      <h2>Objet</h2>
      <p>
        Les présentes conditions régissent l&apos;utilisation du service Smart Farm, plateforme de
        gestion technique d&apos;élevage porcin destinée aux éleveurs et techniciens.
      </p>

      <h2>Acceptation</h2>
      <p>
        La création d&apos;un compte utilisateur vaut acceptation pleine et entière des présentes
        CGU. L&apos;utilisateur déclare avoir pris connaissance de ces conditions et les accepter
        sans réserve.
      </p>

      <h2>Compte</h2>
      <ul>
        <li>
          La création de compte nécessite une adresse email valide et un mot de passe d&apos;au moins
          8 caractères.
        </li>
        <li>
          L&apos;utilisateur est seul responsable de la confidentialité de ses identifiants.
        </li>
        <li>
          Le partage de compte entre plusieurs personnes est interdit. Chaque utilisateur doit
          disposer de son propre compte.
        </li>
      </ul>

      <h2>Usage</h2>
      <ul>
        <li>Le service est destiné à un usage professionnel d&apos;élevage.</li>
        <li>
          Tout usage commercial automatisé (scraping, revente d&apos;accès, intégration sans
          autorisation) est interdit.
        </li>
      </ul>

      <h2>Données</h2>
      <p>
        L&apos;utilisateur reste propriétaire des données métier qu&apos;il saisit dans Smart Farm
        (animaux, événements zootechniques, stocks). Il peut les exporter à tout moment depuis son
        espace personnel.
      </p>

      <h2>Disponibilité</h2>
      <p>
        Smart Farm met en œuvre les moyens raisonnables pour assurer la disponibilité du service.
        Aucune garantie de disponibilité 24h/24 et 7j/7 n&apos;est offerte. Des opérations de
        maintenance peuvent entraîner des interruptions temporaires, annoncées dans la mesure du
        possible.
      </p>

      <h2>Responsabilité</h2>
      <p>
        Smart Farm fournit des indicateurs techniques à titre d&apos;aide à la décision. L&apos;éditeur
        ne saurait être tenu responsable des décisions zootechniques, sanitaires ou économiques
        prises par l&apos;utilisateur sur la base de ces indicateurs.
      </p>

      <h2>Résiliation</h2>
      <p>
        L&apos;utilisateur peut résilier son compte à tout moment depuis la page{' '}
        <a href="/parametres">/parametres</a>. Les données associées sont supprimées dans un délai
        de 30 jours après la demande de résiliation.
      </p>

      <h2>Modification des CGU</h2>
      <p>
        Toute modification substantielle des présentes CGU est notifiée à l&apos;utilisateur par
        email au moins 30 jours avant son entrée en vigueur.
      </p>

      <h2>Droit applicable</h2>
      <p>Les présentes CGU sont régies par le droit ivoirien.</p>

      <h2>Tribunaux compétents</h2>
      <p>
        En cas de litige et à défaut de résolution amiable, les tribunaux compétents sont ceux du
        ressort d&apos;Abidjan.
      </p>

      <p className="mt-12 text-sm">
        <a href="/" className="underline">← Retour à l&apos;accueil</a>
      </p>
    </main>
  )
}
