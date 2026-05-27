import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Smart Farm',
  description:
    'Politique de confidentialité Smart Farm : données collectées, finalités, durée de conservation, sous-traitants et droits utilisateurs (RGPD + loi ivoirienne 2013-450).',
}

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 prose prose-neutral">
      <h1>Politique de confidentialité</h1>
      <p className="text-sm text-[var(--sf-muted)]">
        Dernière mise à jour : 27 mai 2026
      </p>

      <h2>Préambule</h2>
      <p>
        Smart Farm respecte la confidentialité des données personnelles de ses utilisateurs,
        conformément au Règlement général sur la protection des données (RGPD, UE 2016/679) et à la
        loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère
        personnel.
      </p>

      <h2>Données collectées</h2>
      <ul>
        <li>
          Données de compte utilisateur : adresse email, nom, mot de passe (haché).
        </li>
        <li>
          Données métier d&apos;élevage : animaux, saillies, mises bas, sevrages, traitements,
          stocks, indicateurs technico-économiques.
        </li>
        <li>Photos d&apos;animaux (optionnel, à l&apos;initiative de l&apos;utilisateur).</li>
        <li>
          Logs techniques : adresse IP, type de navigateur, dates de connexion (à des fins de
          sécurité et de diagnostic).
        </li>
      </ul>

      <h2>Finalités</h2>
      <ul>
        <li>Fournir le service de gestion d&apos;élevage porcin.</li>
        <li>Calculer les indicateurs zootechniques selon le référentiel IFIP.</li>
        <li>Assurer la traçabilité sanitaire des animaux.</li>
        <li>Émettre des alertes (mises bas, sevrages, traitements à renouveler).</li>
      </ul>

      <h2>Base légale</h2>
      <ul>
        <li>Exécution du contrat (CGU) pour les données de compte et données métier.</li>
        <li>Intérêt légitime pour les logs de sécurité.</li>
        <li>Consentement exprès pour les photos d&apos;animaux.</li>
      </ul>

      <h2>Durée de conservation</h2>
      <p>
        Les données sont conservées tant que le compte est actif, puis pendant 3 ans après la
        dernière connexion, à des fins de continuité de service en cas de réactivation. Au-delà, les
        données sont supprimées définitivement.
      </p>

      <h2>Sous-traitants</h2>
      <ul>
        <li>Supabase Inc. — hébergement base de données (Frankfurt, Union européenne).</li>
        <li>Hostinger International Ltd. — hébergement frontend (Frankfurt, Union européenne).</li>
        <li>
          Twilio Inc. — envoi de SMS OTP d&apos;authentification (États-Unis, transferts encadrés
          par des clauses contractuelles types).
        </li>
      </ul>

      <h2>Droits des utilisateurs</h2>
      <p>
        Conformément au RGPD (articles 15 à 21) et à la loi ivoirienne n° 2013-450, l&apos;utilisateur
        dispose des droits suivants :
      </p>
      <ul>
        <li>Droit d&apos;accès à ses données.</li>
        <li>Droit de rectification.</li>
        <li>Droit à l&apos;effacement (« droit à l&apos;oubli »).</li>
        <li>Droit à la portabilité.</li>
        <li>Droit d&apos;opposition au traitement.</li>
      </ul>
      <p>
        Ces droits peuvent être exercés depuis la page <a href="/parametres">/parametres</a> ou par
        email à <a href="mailto:contact@smartfarm.group">contact@smartfarm.group</a>.
      </p>

      <h2>Délégué à la protection des données</h2>
      <p>
        Contact DPO : <a href="mailto:contact@smartfarm.group">contact@smartfarm.group</a>
      </p>

      <h2>Réclamation</h2>
      <p>
        En cas de désaccord sur le traitement de ses données, l&apos;utilisateur peut introduire une
        réclamation auprès de l&apos;Autorité Nationale de Protection des Données Personnelles de
        Côte d&apos;Ivoire (ANPDP).
      </p>

      <p className="mt-12 text-sm">
        <a href="/" className="underline">← Retour à l&apos;accueil</a>
      </p>
    </main>
  )
}
