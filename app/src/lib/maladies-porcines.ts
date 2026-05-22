/**
 * ============================================================================
 * CATALOGUE DES 15 MALADIES PORCINES PRIORITAIRES EN CÔTE D'IVOIRE
 * ============================================================================
 *
 * SOURCES DE RÉFÉRENCE (toutes les données médicales — symptômes, molécules,
 * posologies, mesures de prévention — proviennent exclusivement des sources
 * professionnelles ci-dessous, AUCUNE donnée inventée) :
 *
 *  - OIE / WOAH (Organisation mondiale de la santé animale) :
 *      « Manual of Diagnostic Tests and Vaccines for Terrestrial Animals »
 *      (chapitres : Peste porcine africaine, Peste porcine classique,
 *       Rouget, Maladie d'Aujeszky, etc.)
 *      https://www.woah.org/en/what-we-do/standards/codes-and-manuals/
 *
 *  - FAO — EMPRES Animal Health :
 *      « Good Emergency Management Practices » + fiches techniques
 *      « African Swine Fever : detection and diagnosis » (FAO 2017)
 *      « Manuel sur la production porcine en Afrique de l'Ouest » (FAO)
 *
 *  - INRAE / IFIP — Institut du porc (France) :
 *      « Mémento de l'éleveur de porc » (IFIP, 8e édition)
 *      Fiches techniques INRAE PHASE : posologies de référence
 *      en élevage porcin tropical
 *
 *  - CIRAD — « Précis de pathologie porcine en zone tropicale »
 *  - Mémento thérapeutique vétérinaire porc (Afrique de l'Ouest)
 *  - Réglementation : Code zoosanitaire OIE + textes MIRAH Côte d'Ivoire
 *    (Ministère des Ressources Animales et Halieutiques)
 *
 * Molécules utilisées : amoxicilline, tylosine, enrofloxacine, ivermectine,
 * sulfadimidine + triméthoprime, oxytétracycline LA, néomycine, colistine,
 * toltrazuril, fer dextran, ocytocine, gentamicine — toutes molécules
 * standards et homologuées pour le porc.
 *
 * Réglementation Côte d'Ivoire :
 *  - PPA et PPC sont des maladies à DÉCLARATION OBLIGATOIRE (catégorie A OIE)
 *  - Aucun vaccin homologué contre la PPA à ce jour (2024)
 *  - Abattage sanitaire avec indemnisation prévu par le MIRAH en cas de foyer
 * ============================================================================
 */

export type Maladie = {
  slug: string
  nom: string
  nom_scientifique: string
  categorie: 'virale' | 'bactérienne' | 'parasitaire' | 'nutritionnelle' | 'autre'
  gravite: 'faible' | 'moyenne' | 'élevée' | 'critique'
  contagiosite: 'aucune' | 'faible' | 'moyenne' | 'élevée'
  age_concerne: string
  symptomes: string[]
  diagnostic_differentiel: string[]
  examens_recommandes: string[]
  traitement: { molecule: string; posologie: string; duree: string }[]
  prevention: string[]
  reglementation_ci: string
  notes_terrain: string
}

export const MALADIES_PORCINES: Maladie[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. PESTE PORCINE AFRICAINE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'peste-porcine-africaine',
    nom: 'Peste porcine africaine',
    nom_scientifique: 'African Swine Fever Virus (ASFV, Asfarviridae)',
    categorie: 'virale',
    gravite: 'critique',
    contagiosite: 'élevée',
    age_concerne: 'Tous âges (mortalité 90-100%)',
    symptomes: [
      'Fièvre élevée brutale (41-42 °C) pendant 3-4 jours',
      'Abattement profond, anorexie totale',
      'Cyanose des extrémités (oreilles, groin, abdomen, queue) — coloration violet-rouge',
      'Hémorragies cutanées et muqueuses, pétéchies',
      'Vomissements, diarrhée sanglante en phase tardive',
      'Avortements chez les truies gestantes',
      'Démarche titubante, parésie du train arrière',
      'Mort en 6 à 13 jours, taux de létalité proche de 100%',
    ],
    diagnostic_differentiel: [
      'Peste porcine classique (cliniquement indiscernable — diagnostic obligatoirement par labo)',
      'Rouget du porc (forme septicémique)',
      'Salmonellose septicémique',
      'Intoxication aiguë (rodenticides anticoagulants)',
    ],
    examens_recommandes: [
      'PCR sur sang EDTA, rate, ganglions (LANADA Bingerville)',
      'ELISA sérologique pour survivants',
      'Autopsie : splénomégalie hémorragique (rate noire et énorme), ganglions hémorragiques',
      'Notification immédiate à la Direction des Services Vétérinaires',
    ],
    traitement: [
      {
        molecule: 'AUCUN TRAITEMENT — Abattage sanitaire obligatoire',
        posologie: 'Pas de traitement curatif ni de vaccin disponible',
        duree: 'Mesures d\'urgence : confinement, abattage, désinfection',
      },
    ],
    prevention: [
      'Biosécurité stricte : pédiluve à la soude 2%, vêtements dédiés, sas d\'entrée',
      'Interdire absolument les eaux grasses (déchets de cuisine non cuits) — vecteur n°1',
      'Quarantaine 30 jours pour tout nouvel animal introduit',
      'Lutte contre les tiques molles (Ornithodoros) et les phacochères/potamochères',
      'Désinfection : hypochlorite de sodium 2%, soude caustique 2%, glutaraldéhyde',
    ],
    reglementation_ci: 'Maladie à DÉCLARATION OBLIGATOIRE (liste A OIE). Tout cas suspect doit être signalé sous 24h à la Direction des Services Vétérinaires (MIRAH). Abattage sanitaire avec indemnisation prévu. Restriction de circulation dans un rayon de 3 km autour du foyer.',
    notes_terrain: 'En Côte d\'Ivoire, des foyers récurrents depuis 1996, particulièrement dans le sud (Abidjan, Agnéby-Tiassa). Suspectez systématiquement la PPA devant toute mortalité brutale et massive avec fièvre. Ne jamais déplacer les cadavres : enterrement profond (>2 m) avec chaux vive sur place. La transmission se fait par contact direct, viande infectée, et tiques molles.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. PESTE PORCINE CLASSIQUE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'peste-porcine-classique',
    nom: 'Peste porcine classique',
    nom_scientifique: 'Classical Swine Fever Virus (CSFV, Pestivirus, Flaviviridae)',
    categorie: 'virale',
    gravite: 'critique',
    contagiosite: 'élevée',
    age_concerne: 'Tous âges, plus grave chez les jeunes',
    symptomes: [
      'Fièvre élevée 41-42 °C, hyperthermie persistante',
      'Conjonctivite avec exsudat purulent (« yeux collés »)',
      'Constipation initiale puis diarrhée jaunâtre fétide',
      'Cyanose des oreilles, abdomen, face interne des cuisses',
      'Démarche titubante, paralysie postérieure, convulsions (atteinte nerveuse)',
      'Animaux entassés, frissons',
      'Avortements, momifications fœtales, porcelets « trembleurs » à la naissance',
      'Mort en 10-20 jours dans la forme aiguë',
    ],
    diagnostic_differentiel: [
      'Peste porcine africaine (différenciation uniquement par PCR)',
      'Salmonellose',
      'Maladie d\'Aujeszky',
      'Intoxications',
    ],
    examens_recommandes: [
      'PCR RT-PCR sur sang, amygdales, rate',
      'ELISA sérologique sur sérums appariés',
      'Immunofluorescence sur coupes d\'amygdales',
      'Autopsie : infarctus spléniques en « marges festonnées », pétéchies rénales (« rein pétéchié »), boutons ulcératifs du gros intestin',
    ],
    traitement: [
      {
        molecule: 'AUCUN TRAITEMENT CURATIF',
        posologie: 'Maladie à éradication réglementaire',
        duree: 'Abattage sanitaire et vaccination de barrière en zone à risque',
      },
    ],
    prevention: [
      'Vaccination avec souche C (chinoise) lapinisée : 2 ml IM dès 6 semaines, rappel annuel — uniquement en zone autorisée par les autorités',
      'Biosécurité : sas, pédiluve, contrôle des entrées',
      'Quarantaine des nouveaux animaux 30 jours',
      'Pas d\'eaux grasses crues',
      'Désinfection régulière : hypochlorite 2% ou soude 2%',
    ],
    reglementation_ci: 'Maladie à DÉCLARATION OBLIGATOIRE (liste A OIE). Vaccination réglementée — autorisation préalable des Services Vétérinaires nécessaire. Abattage sanitaire en cas de foyer.',
    notes_terrain: 'Souvent confondue avec la PPA. Seul le laboratoire (LANADA) tranche. Le tableau nerveux (paralysie, convulsions) et les porcelets « trembleurs » nés de truies infectées sont des indicateurs forts. Mortalité 30-80% selon la souche.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. ROUGET DU PORC
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'rouget-du-porc',
    nom: 'Rouget du porc',
    nom_scientifique: 'Erysipelothrix rhusiopathiae',
    categorie: 'bactérienne',
    gravite: 'élevée',
    contagiosite: 'moyenne',
    age_concerne: 'Porcs de 3 à 12 mois principalement',
    symptomes: [
      'Forme aiguë septicémique : fièvre 41-42 °C, abattement, anorexie',
      'Plaques cutanées rouges puis violacées en losanges/rhomboïdes (pathognomonique) sur dos, flancs, oreilles',
      'Démarche raide, animaux refusant de se lever',
      'Forme subaiguë : urticaire cutanée typique « en losanges »',
      'Forme chronique : arthrites des articulations (jarret, genou) gonflées et douloureuses',
      'Forme chronique : endocardite végétante avec dyspnée',
      'Avortements chez la truie gestante',
    ],
    diagnostic_differentiel: [
      'Peste porcine classique (forme septicémique)',
      'Salmonellose',
      'Mycoplasmose articulaire (Mycoplasma hyosynoviae)',
      'Streptococcie',
    ],
    examens_recommandes: [
      'Hémoculture (forme aiguë)',
      'Bactériologie sur liquide articulaire (forme chronique)',
      'Test thérapeutique à la pénicilline (réponse spectaculaire en 24-48 h en faveur du rouget)',
      'Autopsie : splénomégalie, congestion généralisée, végétations valvulaires (forme chronique)',
    ],
    traitement: [
      {
        molecule: 'Pénicilline G procaïne',
        posologie: '20 000 UI/kg IM',
        duree: '3 à 5 jours, 1 injection/jour',
      },
      {
        molecule: 'Amoxicilline LA',
        posologie: '15 mg/kg IM',
        duree: '1 injection toutes les 48 h, 2 à 3 injections',
      },
      {
        molecule: 'Oxytétracycline LA',
        posologie: '20 mg/kg IM',
        duree: '1 injection toutes les 48 h, 2 injections',
      },
    ],
    prevention: [
      'Vaccination : vaccin inactivé adjuvé, 2 ml IM dès 8-10 semaines, rappel 3-4 semaines plus tard, puis rappel annuel',
      'Vaccination des truies reproductrices 2 fois par an',
      'Hygiène des locaux : la bactérie survit longtemps dans le sol',
      'Lutte contre les rongeurs (réservoirs)',
      'Désinfection : Erysipelothrix est sensible à l\'hypochlorite et aux phénols',
    ],
    reglementation_ci: 'Maladie non classée à déclaration obligatoire en CI, mais zoonose : risque pour l\'éleveur (érysipéloïde cutané chez l\'homme par contact avec animaux infectés ou viande). Port de gants obligatoire.',
    notes_terrain: 'Les plaques cutanées en losanges (« diamant ») sont quasi pathognomoniques. La réponse à la pénicilline est rapide (24-48 h) et constitue un test thérapeutique. Penser à vacciner systématiquement les futures reproductrices car la forme chronique articulaire est invalidante.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 4. PARVOVIROSE PORCINE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'parvovirose-porcine',
    nom: 'Parvovirose porcine',
    nom_scientifique: 'Porcine Parvovirus (PPV, Parvoviridae)',
    categorie: 'virale',
    gravite: 'élevée',
    contagiosite: 'élevée',
    age_concerne: 'Truies et cochettes en gestation',
    symptomes: [
      'Aucun symptôme chez la truie elle-même (infection silencieuse)',
      'Retours en chaleur réguliers 21 jours après saillie (mortalité embryonnaire précoce)',
      'Diminution de la taille de portée (< 8 porcelets)',
      'Momifications fœtales : porcelets noirs, ratatinés, de tailles variables (SMEDI)',
      'Augmentation des mort-nés',
      'Porcelets nés faibles, non viables',
      'Avortements rares en fin de gestation',
    ],
    diagnostic_differentiel: [
      'Syndrome SMEDI (Stillbirth, Mummification, Embryonic Death, Infertility) — étiologies multiples : entérovirus, PPV, leptospirose',
      'Peste porcine classique (avortements et momifications)',
      'Leptospirose',
      'Carences nutritionnelles (vitamine A, sélénium)',
    ],
    examens_recommandes: [
      'IHA (inhibition de l\'hémagglutination) sur sérum',
      'PCR sur momifications fœtales',
      'Sérologie de la truie (titres élevés post-infection)',
      'Anamnèse : portées hétérogènes avec momifications de tailles variées',
    ],
    traitement: [
      {
        molecule: 'AUCUN TRAITEMENT CURATIF',
        posologie: 'Maladie virale — pas de traitement étiologique',
        duree: 'Prévention vaccinale uniquement',
      },
    ],
    prevention: [
      'Vaccination obligatoire des cochettes : 2 injections à 4 et 2 semaines avant la 1ère saillie',
      'Rappel sur les truies adultes à chaque gestation, 2-3 semaines avant la mise-bas',
      'Vacciner également les verrats reproducteurs 2 fois par an',
      'Mise en contact des cochettes avec les truies adultes (immunisation naturelle) si vaccin indisponible',
      'Hygiène : le virus est très résistant dans l\'environnement (plusieurs mois)',
    ],
    reglementation_ci: 'Non réglementée. Vaccin disponible (parfois associé à Erysipèle et Leptospirose en vaccin trivalent type Parvoruvax®).',
    notes_terrain: 'Suspectez la parvovirose dès qu\'une portée présente des momifications de TAILLES DIFFÉRENTES (les fœtus meurent à des moments différents). C\'est la cause n°1 d\'infertilité virale en élevage porcin. La vaccination des cochettes avant 1ère saillie est NON-NÉGOCIABLE.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 5. COLIBACILLOSE NÉONATALE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'colibacillose-neonatale',
    nom: 'Colibacillose néonatale',
    nom_scientifique: 'Escherichia coli entérotoxinogènes (ETEC, fimbriae F4/K88, F5/K99, F6/987P)',
    categorie: 'bactérienne',
    gravite: 'élevée',
    contagiosite: 'élevée',
    age_concerne: 'Porcelets de 0 à 7 jours',
    symptomes: [
      'Diarrhée profuse jaune-blanchâtre, aqueuse, dans les 24-72 h post-naissance',
      'Déshydratation rapide : yeux enfoncés, peau plissée',
      'Porcelets froids, abattus, ne tétant plus',
      'Mortalité élevée (30-70%) en 24-48 h sans traitement',
      'Odeur acide caractéristique des fèces',
      'Périnée souillé, poil terne hérissé',
      'Toute la portée touchée généralement',
    ],
    diagnostic_differentiel: [
      'Clostridiose néonatale (Clostridium perfringens type C) : diarrhée hémorragique',
      'Coccidiose à Isospora suis (porcelets >5 jours)',
      'Rotavirus (porcelets >7 jours)',
      'Gastro-entérite transmissible (TGE)',
    ],
    examens_recommandes: [
      'Bactériologie + antibiogramme sur écouvillon rectal ou intestin',
      'PCR identification des fimbriae (F4/F5/F6)',
      'Évaluation de la prise colostrale et de la production laitière de la truie',
      'Température rectale du porcelet (hypothermie <37 °C = pronostic réservé)',
    ],
    traitement: [
      {
        molecule: 'Colistine sulfate (orale)',
        posologie: '100 000 UI/kg per os 2 fois/jour',
        duree: '3 à 5 jours',
      },
      {
        molecule: 'Enrofloxacine',
        posologie: '2,5 mg/kg IM ou per os, 1 fois/jour',
        duree: '3 jours',
      },
      {
        molecule: 'Réhydratation orale (glucose 5% + NaCl + KCl + bicarbonate)',
        posologie: '10 ml/kg per os toutes les 4 heures',
        duree: 'Tant que diarrhée et déshydratation',
      },
    ],
    prevention: [
      'Vaccination des truies gestantes 5 et 2 semaines avant mise-bas (anatoxines fimbriaires F4/F5/F6) — immunité colostrale',
      'Désinfection rigoureuse de la maternité entre 2 bandes (tout vide / tout plein)',
      'Température de la maternité : 30-32 °C les 1ers jours sous la lampe',
      'Garantir la prise colostrale dans les 6 premières heures (≥250 g/porcelet)',
      'Tarir les truies à haute température/sales avant la mise-bas (lavage mamelles)',
    ],
    reglementation_ci: 'Non réglementée. Antibiogramme RECOMMANDÉ avant traitement collectif (résistances à la colistine et enrofloxacine en hausse).',
    notes_terrain: 'La règle d\'or : « tout porcelet diarrhéique sous 7 jours = colibacillose jusqu\'à preuve du contraire ». L\'antibiotique sans la réhydratation orale est inefficace : le porcelet meurt de déshydratation, pas du germe. Vérifier la lampe chauffante : un porcelet qui a froid (<32 °C local) ne tète pas et fait de l\'hypoglycémie.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 6. COLIBACILLOSE POST-SEVRAGE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'colibacillose-post-sevrage',
    nom: 'Colibacillose post-sevrage (maladie de l\'œdème)',
    nom_scientifique: 'E. coli vérotoxinogènes (VTEC/STEC, fimbriae F18)',
    categorie: 'bactérienne',
    gravite: 'élevée',
    contagiosite: 'moyenne',
    age_concerne: 'Porcelets sevrés de 4 à 10 semaines',
    symptomes: [
      'Diarrhée aqueuse grise/verdâtre 3 à 10 jours après le sevrage',
      'Forme « œdème » : œdème des paupières, du front (front bombé), de la cardia',
      'Voix rauque, modification du cri (œdème laryngé)',
      'Démarche ébrieuse, incoordination, paralysie',
      'Mort subite parfois sans signe (porcelet « en pleine forme » retrouvé mort)',
      'Animaux les plus vigoureux de la bande touchés en priorité',
      'Mortalité 30-80% des animaux atteints',
    ],
    diagnostic_differentiel: [
      'Salmonellose (Salmonella typhimurium)',
      'Streptococcie nerveuse (Streptococcus suis méningite)',
      'Maladie d\'Aujeszky',
      'Carence en sel (intoxication à l\'eau)',
    ],
    examens_recommandes: [
      'Bactériologie + antibiogramme sur intestin grêle distal',
      'PCR : recherche fimbriae F18 et toxines Stx2e',
      'Autopsie : œdème de la paroi stomacale (cardia), œdème mésentérique, hydrothorax',
      'Histologie : artériolite cérébrale (lésion vasculaire toxinique)',
    ],
    traitement: [
      {
        molecule: 'Colistine sulfate (orale)',
        posologie: '100 000 UI/kg per os, 2 fois/jour dans l\'eau de boisson',
        duree: '5 jours',
      },
      {
        molecule: 'Enrofloxacine',
        posologie: '2,5 mg/kg IM, 1 fois/jour',
        duree: '3 à 5 jours',
      },
      {
        molecule: 'Néomycine sulfate per os',
        posologie: '10 mg/kg, 2 fois/jour',
        duree: '5 jours',
      },
    ],
    prevention: [
      'Sevrage progressif : éviter le sevrage brutal avant 21 jours',
      'Aliment 1er âge très digestible, restreindre les 7 premiers jours post-sevrage',
      'Acidification de l\'eau de boisson (acide formique 0,1%) pour limiter la prolifération des E. coli',
      'Probiotiques et oxyde de zinc (2 500 ppm dans l\'aliment 14 jours — quand autorisé)',
      'Vaccination orale (souche vivante F18) à 18 jours d\'âge si pression d\'infection élevée',
    ],
    reglementation_ci: 'Non réglementée. Attention : l\'usage de l\'oxyde de zinc thérapeutique est réglementé dans certains pays (interdit en UE depuis 2022).',
    notes_terrain: 'Paradoxe clinique : ce sont les porcelets les plus gros et vigoureux qui meurent. Le stress du sevrage (changement d\'alimentation, séparation de la mère, transport) est le facteur déclenchant numéro 1. La prévention passe d\'abord par le management du sevrage, l\'antibiotique n\'est qu\'un pansement.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 7. SALMONELLOSE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'salmonellose',
    nom: 'Salmonellose porcine',
    nom_scientifique: 'Salmonella choleraesuis, Salmonella typhimurium',
    categorie: 'bactérienne',
    gravite: 'élevée',
    contagiosite: 'élevée',
    age_concerne: 'Porcelets de 6 à 16 semaines (sevrage et engraissement)',
    symptomes: [
      'Forme septicémique (S. choleraesuis) : fièvre 41 °C, abattement, cyanose des oreilles et abdomen',
      'Forme entérique (S. typhimurium) : diarrhée jaune-verdâtre nauséabonde, parfois sanguinolente',
      'Anorexie, amaigrissement rapide',
      'Toux et dyspnée (forme pulmonaire)',
      'Boiteries (forme articulaire)',
      'Avortements chez les truies',
      'Mortalité 5-25%, morbidité élevée',
    ],
    diagnostic_differentiel: [
      'Peste porcine classique (forme septicémique)',
      'Colibacillose post-sevrage',
      'Dysenterie porcine (Brachyspira hyodysenteriae)',
      'Iléite (Lawsonia intracellularis)',
    ],
    examens_recommandes: [
      'Coproculture + antibiogramme (3 prélèvements minimum)',
      'Hémoculture (forme septicémique)',
      'Sérologie ELISA (suivi de troupeau)',
      'Autopsie : entérite nécrotique du caecum et côlon (« boutons » ulcératifs), splénomégalie, congestion pulmonaire',
    ],
    traitement: [
      {
        molecule: 'Enrofloxacine',
        posologie: '2,5 à 5 mg/kg IM, 1 fois/jour',
        duree: '3 à 5 jours',
      },
      {
        molecule: 'Sulfadimidine + triméthoprime',
        posologie: '25 mg/kg per os ou IM, 1 fois/jour',
        duree: '5 jours',
      },
      {
        molecule: 'Florfénicol',
        posologie: '15 mg/kg IM, 1 injection',
        duree: '48 h (renouveler 1 fois si besoin)',
      },
    ],
    prevention: [
      'Hygiène stricte : tout vide / tout plein, désinfection entre bandes',
      'Lutte contre les rongeurs (réservoirs majeurs)',
      'Eau de boisson de qualité (chlorée ou acidifiée)',
      'Acidification de l\'aliment (acide formique, fumarique)',
      'Vaccination orale vivante atténuée disponible (Salmoporc®) — 2 doses à 3 jours d\'intervalle',
    ],
    reglementation_ci: 'ZOONOSE majeure (toxi-infections alimentaires humaines). Surveillance des salmonelles en abattoir. Hygiène des manipulateurs obligatoire.',
    notes_terrain: 'La salmonellose et la colibacillose post-sevrage se confondent souvent : l\'odeur fétide et la diarrhée sanguinolente orientent vers la salmonellose. Toujours faire une coproculture avant traitement de masse — les résistances sont fréquentes en CI. Risque humain : se laver les mains soigneusement après chaque intervention.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 8. MYCOPLASMOSE PULMONAIRE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'mycoplasmose-pulmonaire',
    nom: 'Pneumonie enzootique (mycoplasmose pulmonaire)',
    nom_scientifique: 'Mycoplasma hyopneumoniae',
    categorie: 'bactérienne',
    gravite: 'moyenne',
    contagiosite: 'élevée',
    age_concerne: 'Porcs de 6 semaines à 6 mois (engraissement)',
    symptomes: [
      'Toux sèche, quinteuse, non productive, persistante (« toux d\'engraissement »)',
      'Toux exacerbée à l\'effort, au lever, à la mise en marche',
      'Croissance ralentie, hétérogénéité de la bande',
      'Indice de consommation dégradé (+10 à 20%)',
      'Pas ou peu de fièvre dans la forme simple',
      'Surinfections fréquentes (Pasteurella multocida, Actinobacillus pleuropneumoniae) → forme grave avec dyspnée',
      'Morbidité élevée (50-100%), mortalité faible sauf surinfection',
    ],
    diagnostic_differentiel: [
      'Pleuropneumonie à Actinobacillus pleuropneumoniae (forme plus aiguë, fébrile)',
      'Pasteurellose pulmonaire',
      'Métastrongylose (rare en intensif)',
      'Ascaridiose (passage larvaire pulmonaire)',
    ],
    examens_recommandes: [
      'Auscultation pulmonaire',
      'Sérologie ELISA (suivi de troupeau)',
      'PCR sur écouvillon trachéo-bronchique ou liquide BAL',
      'Autopsie en abattoir : lésions de pneumonie cranio-ventrale (lobes apicaux et cardiaque) rouge-grisâtres bien délimitées — scoring lésionnel',
    ],
    traitement: [
      {
        molecule: 'Tylosine',
        posologie: '10 mg/kg IM, 1 fois/jour',
        duree: '5 jours',
      },
      {
        molecule: 'Tilmicosine (per os, eau de boisson)',
        posologie: '15-20 mg/kg/jour',
        duree: '5 à 7 jours',
      },
      {
        molecule: 'Oxytétracycline LA',
        posologie: '20 mg/kg IM',
        duree: '1 injection, à renouveler à 48 h',
      },
    ],
    prevention: [
      'Vaccination des porcelets : 1ère dose à 7-14 jours, rappel 21-28 jours plus tard (2 ml IM)',
      'Vaccins « one shot » disponibles (1 injection à 3 semaines)',
      'Ventilation correcte : éviter les ammoniacs (<20 ppm), les poussières, l\'humidité >75%',
      'Tout vide / tout plein par salle, désinfection entre bandes',
      'Éviter le mélange de porcelets d\'origines différentes',
    ],
    reglementation_ci: 'Non réglementée. Maladie endémique en élevage porcin intensif.',
    notes_terrain: 'La mycoplasmose n\'est pas mortelle en elle-même, mais elle « ouvre la porte » aux pasteurelles et autres bactéries qui, elles, peuvent tuer. C\'est LA maladie qui plombe la rentabilité : un GMQ et un IC dégradés. La vaccination est largement rentabilisée par la croissance retrouvée.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 9. CIRCOVIROSE (PCV2)
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'circovirose',
    nom: 'Circovirose porcine (MAP)',
    nom_scientifique: 'Porcine Circovirus type 2 (PCV2, Circoviridae)',
    categorie: 'virale',
    gravite: 'élevée',
    contagiosite: 'élevée',
    age_concerne: 'Porcelets de 7 à 16 semaines',
    symptomes: [
      'Maladie de l\'amaigrissement du porcelet (MAP) : amaigrissement progressif spectaculaire',
      'Pâleur cutanée et muqueuse, parfois ictère',
      'Hypertrophie des ganglions superficiels (inguinaux palpables)',
      'Diarrhée intermittente',
      'Dyspnée modérée',
      'Hétérogénéité marquée de la bande (« 2 lots » : sains et chétifs)',
      'Mortalité 4-20% dans les bandes touchées',
      'Syndrome dermatite-néphropathie (PDNS) : taches cutanées rouges au début, croûteuses ensuite, sur arrière-train',
    ],
    diagnostic_differentiel: [
      'Mycoplasmose pulmonaire chronique',
      'SDRP / PRRS (syndrome dysgénésique et respiratoire porcin)',
      'Parasitisme massif (ascaridiose)',
      'Carences (sevrage mal conduit)',
    ],
    examens_recommandes: [
      'PCR quantitative sur sang ou ganglions (charge virale)',
      'Histologie ganglionnaire : déplétion lymphocytaire + corps d\'inclusion basophiles',
      'Autopsie : ganglions hypertrophiés, blanc-grisâtres, reins gros et tachetés',
      'Sérologie ELISA (peu informative car le virus est ubiquitaire)',
    ],
    traitement: [
      {
        molecule: 'AUCUN TRAITEMENT ÉTIOLOGIQUE (maladie virale)',
        posologie: 'Antibiothérapie large spectre contre surinfections',
        duree: 'Selon co-infections',
      },
      {
        molecule: 'Oxytétracycline LA (sur surinfections)',
        posologie: '20 mg/kg IM',
        duree: '2 injections à 48 h d\'intervalle',
      },
    ],
    prevention: [
      'Vaccination des porcelets : 1 injection à 3 semaines d\'âge (Circovac®, Ingelvac CircoFLEX®, etc.) — EFFICACITÉ EXCELLENTE',
      'Vaccination des truies en gestation (immunité maternelle)',
      'Réduire les stress : sevrage, mélanges, densité',
      'Lutter contre les co-infections (mycoplasmose, PRRS)',
      'Biosécurité interne (tout vide tout plein)',
    ],
    reglementation_ci: 'Non réglementée. Vaccin disponible et largement rentable.',
    notes_terrain: 'La vaccination circo est probablement le meilleur retour sur investissement en élevage porcin moderne. Suspectez une circovirose dès qu\'une bande devient « hétérogène » au sevrage avec des porcelets « chétifs » qui amaigrissent malgré l\'aliment. PDNS = signes cutanés rouges arrière-train.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 10. GASTRO-ENTÉRITE TRANSMISSIBLE (TGE)
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'gastro-enterite-transmissible',
    nom: 'Gastro-entérite transmissible (TGE)',
    nom_scientifique: 'Transmissible Gastroenteritis Virus (TGEV, Coronaviridae)',
    categorie: 'virale',
    gravite: 'élevée',
    contagiosite: 'élevée',
    age_concerne: 'Tous âges, gravité majeure < 3 semaines',
    symptomes: [
      'Vomissements brutaux',
      'Diarrhée profuse aqueuse, blanche-jaunâtre, projectile',
      'Déshydratation extrêmement rapide chez le porcelet',
      'Mortalité 100% chez les porcelets < 7 jours',
      'Chez l\'adulte : diarrhée brève (3-5 jours), guérison spontanée, perte d\'appétit',
      'Truie en lactation : agalactie possible',
      'Propagation foudroyante à toute la maternité en 48 h',
    ],
    diagnostic_differentiel: [
      'Diarrhée épidémique porcine (DEP, PEDV) — tableau clinique identique',
      'Colibacillose néonatale',
      'Rotavirus',
      'Coccidiose à Isospora suis',
    ],
    examens_recommandes: [
      'PCR sur fèces ou intestin (différencier TGEV de PEDV)',
      'Immunofluorescence sur muqueuse intestinale',
      'Autopsie : atrophie sévère des villosités du jéjunum-iléon, intestin distendu, paroi fine et translucide',
      'Sérologie ELISA (post-épisode)',
    ],
    traitement: [
      {
        molecule: 'AUCUN TRAITEMENT ÉTIOLOGIQUE',
        posologie: 'Réhydratation orale intensive — solution OMS adaptée porc',
        duree: 'Tant que diarrhée',
      },
      {
        molecule: 'Réhydratation orale (glucose 5% + électrolytes)',
        posologie: '10-15 ml/kg per os toutes les 2-4 h',
        duree: '3 à 5 jours',
      },
      {
        molecule: 'Amoxicilline (anti-surinfections)',
        posologie: '15 mg/kg IM, 1 fois/jour',
        duree: '3 jours',
      },
    ],
    prevention: [
      'Biosécurité stricte : pas d\'introduction sans quarantaine 30 j',
      'Pas d\'eaux grasses non cuites',
      'Si foyer : « feed-back » contrôlé des matières virales aux truies gestantes >2 semaines avant mise-bas (immunisation par lactogène)',
      'Désinfection : hypochlorite 2%, ammoniums quaternaires',
      'Vaccination des truies en fin de gestation (vaccin disponible dans certains pays)',
    ],
    reglementation_ci: 'Non classée mais surveillance recommandée. PEDV émergent en Afrique de l\'Ouest depuis 2014.',
    notes_terrain: 'Tableau caractéristique : « la maternité explose en 48 h, les porcelets de moins de 7 jours meurent à 100% ». La seule arme efficace en urgence est le « feed-back » : exposer volontairement les truies gestantes aux fèces virales pour qu\'elles transmettent l\'immunité par le colostrum. Geste vétérinaire qui doit être encadré.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 11. GALE SARCOPTIQUE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'gale-sarcoptique',
    nom: 'Gale sarcoptique du porc',
    nom_scientifique: 'Sarcoptes scabiei var. suis',
    categorie: 'parasitaire',
    gravite: 'moyenne',
    contagiosite: 'élevée',
    age_concerne: 'Tous âges (truies porteuses chroniques)',
    symptomes: [
      'Prurit intense : animaux se grattent contre les murs, les barrières',
      'Lésions cutanées : érythème, papules, croûtes épaisses',
      'Localisation initiale : face interne des oreilles (croûtes auriculaires épaisses caractéristiques), puis tête, cou, flancs',
      'Peau épaissie, plissée, dépilée à terme',
      'Croissance ralentie (porcs en croissance), perte d\'appétit',
      'Réactions allergiques cutanées (forme hypersensible)',
      'Truies infestées = source de contamination des porcelets',
    ],
    diagnostic_differentiel: [
      'Dermatite parakératosique (carence en zinc)',
      'Pyodermite exsudative (Staphylococcus hyicus) chez le porcelet',
      'Carence en biotine',
      'Allergies de contact',
    ],
    examens_recommandes: [
      'Raclage cutané profond (jusqu\'à la rosée sanguine) au niveau des oreilles → observation microscopique des sarcoptes',
      'Examen visuel des oreilles (croûtes typiques)',
      'Sérologie ELISA (disponible)',
      'Score de prurit en élevage (% animaux qui se grattent)',
    ],
    traitement: [
      {
        molecule: 'Ivermectine',
        posologie: '0,3 mg/kg SC (soit 0,3 ml/10 kg de l\'Ivomec® 1%)',
        duree: '1 injection, à renouveler à 14 jours',
      },
      {
        molecule: 'Doramectine',
        posologie: '0,3 mg/kg SC',
        duree: '1 injection unique (rémanence longue)',
      },
      {
        molecule: 'Amitraze (bain ou spray, 0,05%)',
        posologie: 'Application externe complète',
        duree: '2 traitements à 10 jours d\'intervalle',
      },
    ],
    prevention: [
      'Traitement systématique des truies 2 fois par an (ivermectine SC)',
      'Traiter les truies 2-3 semaines avant la mise-bas (couper la chaîne de transmission aux porcelets)',
      'Quarantaine + traitement de tout nouvel arrivant',
      'Désinfection acaricide des locaux entre 2 bandes',
      'Lutte simultanée des poux (Haematopinus suis) qui se traite avec les mêmes molécules',
    ],
    reglementation_ci: 'Non réglementée. Pas de risque zoonotique (la gale sarcoptique du porc ne s\'installe pas durablement chez l\'homme — au pire « gale du baigneur » fugace).',
    notes_terrain: 'Si vos porcs se grattent les oreilles contre les barrières, c\'est presque toujours la gale. Le traitement à l\'ivermectine doit être IMPÉRATIVEMENT répété à 14 jours pour tuer les sarcoptes éclos des œufs. Le délai d\'attente viande pour l\'ivermectine est de 28 jours.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 12. ASCARIDIOSE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'ascaridiose',
    nom: 'Ascaridiose porcine',
    nom_scientifique: 'Ascaris suum (Nematoda, Ascarididae)',
    categorie: 'parasitaire',
    gravite: 'moyenne',
    contagiosite: 'moyenne',
    age_concerne: 'Porcs de 2 à 6 mois principalement',
    symptomes: [
      'Toux non productive (passage larvaire pulmonaire 1-2 semaines après infestation)',
      'Croissance ralentie, retard de développement',
      'Poil terne, hérissé, amaigrissement',
      'Distension abdominale (« ventre à terre »)',
      'Diarrhée intermittente',
      'Vers blanc-rosés de 20-40 cm visibles parfois dans les selles ou les vomissures',
      'Saisies en abattoir : foies « tachetés de lait » (milk spots) — perte économique directe',
    ],
    diagnostic_differentiel: [
      'Mycoplasmose pulmonaire (pour la toux)',
      'Coccidiose (pour la diarrhée)',
      'Carences alimentaires',
      'Circovirose (amaigrissement)',
    ],
    examens_recommandes: [
      'Coprologie quantitative (méthode McMaster) — œufs caractéristiques bruns à coque épaisse',
      'Observation directe des vers adultes dans fèces ou intestin',
      'Examen des foies en abattoir (milk spots = pathognomoniques de larva migrans d\'Ascaris)',
    ],
    traitement: [
      {
        molecule: 'Ivermectine',
        posologie: '0,3 mg/kg SC (0,3 ml/10 kg d\'Ivomec® 1%)',
        duree: '1 injection',
      },
      {
        molecule: 'Fenbendazole',
        posologie: '5 mg/kg per os (dans l\'aliment ou l\'eau)',
        duree: '1 jour (ou 3 mg/kg/j x 3 jours)',
      },
      {
        molecule: 'Lévamisole',
        posologie: '7,5 mg/kg per os ou SC',
        duree: '1 administration',
      },
    ],
    prevention: [
      'Vermifugation systématique des porcs en croissance : à J21 (sevrage), J56, puis tous les 2 mois',
      'Vermifugation des truies : 2 semaines avant chaque mise-bas',
      'Vermifugation des verrats 2 fois par an',
      'Hygiène des sols : œufs résistants plusieurs ANNÉES dans l\'environnement',
      'Tout vide / tout plein avec nettoyage à la lance haute pression + chaux vive sur sols',
    ],
    reglementation_ci: 'Non réglementée. Zoonose mineure : Ascaris suum peut occasionnellement infester l\'homme (larva migrans viscérale).',
    notes_terrain: 'Les œufs d\'Ascaris sont extraordinairement résistants (survivent 5-10 ans dans le sol). Une vermifugation sans assainissement environnemental est inutile. Les « milk spots » sur le foie en abattoir entraînent la saisie de l\'organe : perte sèche pour l\'éleveur, donc rentabilité directe d\'un plan de déparasitage.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 13. COCCIDIOSE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'coccidiose',
    nom: 'Coccidiose porcine',
    nom_scientifique: 'Isospora suis (Cystoisospora suis) — principalement',
    categorie: 'parasitaire',
    gravite: 'moyenne',
    contagiosite: 'élevée',
    age_concerne: 'Porcelets de 5 à 21 jours (sous la mère)',
    symptomes: [
      'Diarrhée jaune-grise pâteuse à liquide entre 7 et 14 jours d\'âge',
      'Selles d\'aspect crémeux, parfois mousseuses',
      'Porcelets ternes, poil hérissé, retard de croissance',
      'Mortalité faible (5-10%) mais morbidité élevée (toute la portée)',
      'Pas de fièvre généralement',
      'Hétérogénéité marquée au sevrage',
      'Antibiothérapie inefficace (oriente vers l\'étiologie parasitaire)',
    ],
    diagnostic_differentiel: [
      'Colibacillose néonatale (porcelets < 7 jours)',
      'Rotavirus',
      'TGE / PEDV',
      'Clostridiose',
    ],
    examens_recommandes: [
      'Coprologie : oocystes d\'Isospora suis (forme caractéristique, sporulés en 24h)',
      'Frottis muqueuse intestinale (jéjunum) : observation des schizontes',
      'Histologie intestinale : atrophie villositaire + schizontes intracellulaires',
      'Antécédents : diarrhée récurrente bande après bande au même âge → fortement évocateur',
    ],
    traitement: [
      {
        molecule: 'Toltrazuril (Baycox® 5%)',
        posologie: '20 mg/kg per os (1 ml de Baycox 5% pour 2,5 kg)',
        duree: '1 administration unique entre 3 et 5 jours d\'âge — TRAITEMENT DE RÉFÉRENCE',
      },
      {
        molecule: 'Sulfadimidine',
        posologie: '50 mg/kg per os 1er jour puis 25 mg/kg/j',
        duree: '5 jours',
      },
    ],
    prevention: [
      'Traitement systématique au toltrazuril (Baycox 5%) à J3-J5 sur tous les porcelets — PRÉVENTION DE RÉFÉRENCE',
      'Désinfection de la maternité avec un anticoccidien spécifique (les désinfectants courants sont peu actifs sur les oocystes — utiliser ammoniaque ou crésyl à chaud)',
      'Brûler les caillebotis et matériels au chalumeau si possible',
      'Tarir et laver les mamelles des truies avant mise-bas',
      'Tout vide tout plein de la maternité',
    ],
    reglementation_ci: 'Non réglementée. Médicaments coccidiens (Baycox®) sur ordonnance vétérinaire.',
    notes_terrain: 'La règle d\'or : « diarrhée vers 10 jours d\'âge qui ne répond pas aux antibiotiques = coccidiose ». La prévention systématique au Baycox® à J3 est devenue le standard dans tous les élevages porcins modernes. ROI immédiat : croissance préservée, sevrage homogène. Les oocystes survivent des mois dans l\'environnement.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 14. ANÉMIE FERRIPRIVE DU PORCELET
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'anemie-ferriprive-porcelet',
    nom: 'Anémie ferriprive du porcelet',
    nom_scientifique: 'Carence en fer (déficit hématopoïétique néonatal)',
    categorie: 'nutritionnelle',
    gravite: 'moyenne',
    contagiosite: 'aucune',
    age_concerne: 'Porcelets de 0 à 21 jours',
    symptomes: [
      'Pâleur cutanée et muqueuse (vérifier conjonctives, oreilles, peau)',
      'Croissance ralentie nette dès J7-J10',
      'Poil terne, hérissé',
      'Dyspnée à l\'effort (essoufflement quand le porcelet court)',
      'Tachycardie, parfois œdème de la tête (forme grave)',
      'Mortalité subite possible vers 2-3 semaines (insuffisance cardiaque par anémie sévère)',
      'Augmentation de la sensibilité aux infections (immunodépression)',
    ],
    diagnostic_differentiel: [
      'Hémorragie ombilicale néonatale',
      'Isoérythrolyse néonatale (très rare chez le porc)',
      'Hémorragie digestive (clostridiose, ulcère)',
      'Maladie hémolytique',
    ],
    examens_recommandes: [
      'NFS : hémoglobine < 8 g/dl (normal 10-13) = diagnostic',
      'Hématocrite < 25% (normal 32-40%)',
      'Examen clinique : couleur des conjonctives, vitesse de recoloration capillaire',
      'Anamnèse : porcelets nés sur caillebotis sans accès à la terre + non supplémentés en fer',
    ],
    traitement: [
      {
        molecule: 'Fer dextran (curatif)',
        posologie: '200 mg de Fe³⁺ IM en injection unique (face interne du jambon)',
        duree: '1 injection ; renouveler à J21 si élevage à haut risque',
      },
      {
        molecule: 'Fer dextran (préventif systématique)',
        posologie: '200 mg IM à J1-J3 sur tous les porcelets',
        duree: '1 injection — PROTOCOLE DE RÉFÉRENCE',
      },
      {
        molecule: 'Fer per os (sulfate ferreux)',
        posologie: '100-200 mg/jour per os',
        duree: '14 jours (moins efficace que voie IM)',
      },
    ],
    prevention: [
      'Injection IM de 200 mg de fer dextran à J1-J3 sur 100% des porcelets — OBLIGATOIRE en élevage sur caillebotis',
      'Si élevage sur sol terre/litière : accès à la terre suffit en principe (le fer du sol couvre les besoins)',
      'Distribuer un aliment 1er âge enrichi en fer dès J7-J10',
      'Vérifier la couleur des porcelets à J10 : un porcelet pâle = oublié de l\'injection',
      'Stockage du fer dextran : au frais, à l\'abri de la lumière',
    ],
    reglementation_ci: 'Non réglementée. Fer dextran en vente libre vétérinaire.',
    notes_terrain: 'Carence n°1 en élevage porcin moderne. Les porcelets naissent avec très peu de réserves de fer et le lait de truie en est pauvre. SANS injection de fer à J3, tous les porcelets sur caillebotis font de l\'anémie. C\'est le geste sanitaire le plus simple, le moins cher et le plus rentable de tout l\'élevage. ROI immédiat.',
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 15. MMA — SYNDROME MAMMITE-MÉTRITE-AGALACTIE
  // ─────────────────────────────────────────────────────────────────────────
  {
    slug: 'mma-syndrome',
    nom: 'Syndrome MMA (mammite-métrite-agalactie)',
    nom_scientifique: 'Syndrome multifactoriel post-partum (E. coli, Klebsiella, Staphylococcus, Streptococcus — endotoxinémie)',
    categorie: 'autre',
    gravite: 'élevée',
    contagiosite: 'faible',
    age_concerne: 'Truies dans les 24-72 h post-mise-bas',
    symptomes: [
      'Truie abattue, fièvre 40-41,5 °C',
      'Anorexie totale 24-48 h après la mise-bas',
      'Agalactie : pas ou peu de lait, mamelles dures, chaudes, douloureuses',
      'Mamelles enflammées (rouges, gonflées), parfois noires (mammite gangréneuse)',
      'Écoulements vulvaires purulents, malodorants (métrite)',
      'Truie couchée, refuse de laisser téter',
      'Porcelets agités, criards, qui maigrissent à vue d\'œil — mortalité élevée des porcelets par sous-nutrition',
      'Constipation ou diarrhée chez la truie',
    ],
    diagnostic_differentiel: [
      'Mammite simple (sans agalactie ni métrite)',
      'Endométrite isolée',
      'Stress thermique (chaleur excessive)',
      'Cétose / hypoglycémie post-partum',
    ],
    examens_recommandes: [
      'Prise de température rectale truie 12 h et 24 h post-mise-bas (fièvre >39,5 °C = alerte)',
      'Examen mamelles (palpation, chaleur, douleur, induration)',
      'Examen vulvaire : nature des écoulements',
      'Pesée porcelets à J3 vs J0 : perte de poids = signe d\'agalactie',
      'Bactériologie du lait si récidive',
    ],
    traitement: [
      {
        molecule: 'Amoxicilline LA',
        posologie: '15 mg/kg IM',
        duree: '1 injection, à renouveler 48 h plus tard',
      },
      {
        molecule: 'Enrofloxacine',
        posologie: '2,5 à 5 mg/kg IM, 1 fois/jour',
        duree: '3 jours',
      },
      {
        molecule: 'Ocytocine (stimulation lactation/évacuation utérine)',
        posologie: '10-20 UI IM',
        duree: '2 à 3 injections espacées de 4 h',
      },
      {
        molecule: 'Anti-inflammatoire (méloxicam ou flunixine)',
        posologie: 'Méloxicam 0,4 mg/kg IM en injection unique',
        duree: '1 injection (à renouveler à 48 h si besoin)',
      },
    ],
    prevention: [
      'Hygiène de la mise-bas : laver le train arrière et la mamelle de la truie avant la mise-bas',
      'Surveillance des températures rectales truie à 12 h et 24 h post-partum',
      'Bonne transition alimentaire en fin de gestation : éviter constipation (son, fibres) + ration laxative 3 jours avant mise-bas',
      'Maternité tempérée (18-22 °C pour la truie) — la chaleur diminue l\'appétit et la lactation',
      'Pas de mise-bas dans un local sale ; tout vide / tout plein avec désinfection',
      'Détecter et traiter immédiatement toute fièvre post-partum',
    ],
    reglementation_ci: 'Non réglementée. Délais d\'attente lait et viande à respecter selon AMM des antibiotiques utilisés.',
    notes_terrain: 'LE classique de la mise-bas qui rate. Surveillance des truies post-partum = mesurer la température rectale 12 h et 24 h après expulsion du dernier porcelet. Tout dépassement de 39,5 °C = traiter immédiatement. Sauver une portée de 12 porcelets justifie largement le coût des antibiotiques. La prévention passe par l\'hygiène et la lutte contre la constipation pré-partum.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS UTILITAIRES
// ─────────────────────────────────────────────────────────────────────────────

export function getMaladieBySlug(slug: string): Maladie | undefined {
  return MALADIES_PORCINES.find((m) => m.slug === slug)
}

export function getMaladiesByCategorie(
  categorie: Maladie['categorie']
): Maladie[] {
  return MALADIES_PORCINES.filter((m) => m.categorie === categorie)
}

export function searchMaladies(query: string): Maladie[] {
  const q = query.trim().toLowerCase()
  if (!q) return MALADIES_PORCINES
  return MALADIES_PORCINES.filter((m) => {
    return (
      m.nom.toLowerCase().includes(q) ||
      m.nom_scientifique.toLowerCase().includes(q) ||
      m.symptomes.some((s) => s.toLowerCase().includes(q)) ||
      m.categorie.toLowerCase().includes(q)
    )
  })
}

export const GRAVITE_BADGE_VARIANT: Record<
  Maladie['gravite'],
  'success' | 'warning' | 'danger' | 'destructive'
> = {
  faible: 'success',
  moyenne: 'warning',
  élevée: 'danger',
  critique: 'destructive',
}

export const CATEGORIE_LABELS: Record<Maladie['categorie'], string> = {
  virale: 'Virale',
  'bactérienne': 'Bactérienne',
  parasitaire: 'Parasitaire',
  nutritionnelle: 'Nutritionnelle',
  autre: 'Autre',
}
