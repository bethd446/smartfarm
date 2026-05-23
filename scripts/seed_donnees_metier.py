#!/usr/bin/env python3
"""
seed_donnees_metier.py — Seed du référentiel métier porcin ivoirien
dans la table public.donnees_metier (Supabase Cloud).

Source de vérité : /root/.hermes/cache/documents/doc_483334232317_prompt_hermes_cycle_vie.md
Sections : 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6

Idempotent : ON CONFLICT (type, cle, version) DO UPDATE.
Exécution via Supabase Management API SQL endpoint.
"""

from __future__ import annotations
import json
import os
import sys
from typing import Any

import requests

TOKEN = os.environ.get("SUPABASE_ACCESS_TOKEN")
PROJECT_REF = "tpzhxjzwlxwujboboyit"
SQL_URL = f"https://api.supabase.com/v1/projects/{PROJECT_REF}/database/query"

if not TOKEN:
    print("ERREUR: SUPABASE_ACCESS_TOKEN manquant.", file=sys.stderr)
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


def exec_sql(query: str) -> Any:
    r = requests.post(SQL_URL, headers=HEADERS, json={"query": query}, timeout=30)
    if r.status_code >= 400:
        print(f"SQL ERROR {r.status_code}: {r.text}", file=sys.stderr)
        r.raise_for_status()
    return r.json()


def upsert(type_: str, cle: str, data: dict, version: int = 1, pays: str = "CI") -> None:
    """Insert ou update une entrée donnees_metier."""
    data_json = json.dumps(data, ensure_ascii=False).replace("'", "''")
    sql = (
        f"INSERT INTO donnees_metier (type, cle, version, data, pays, actif) "
        f"VALUES ('{type_}', '{cle}', {version}, '{data_json}'::jsonb, '{pays}', true) "
        f"ON CONFLICT (type, cle, version) DO UPDATE SET "
        f"data = EXCLUDED.data, updated_at = now();"
    )
    exec_sql(sql)


# ============================================================
# 1. NUTRITIONAL REQUIREMENTS — brief 3.1 (9 stades)
# ============================================================
NUTRITIONAL_REQUIREMENTS = {
    "lactation": {
        "tranche_poids_kg": [1.5, 8],
        "tranche_age_jours": [0, 28],
        "PB_min_pct": 20, "PB_max_pct": 22,
        "lysine_dig_min_pct": 1.30, "lysine_dig_max_pct": 1.40,
        "EN_min_MJ_kg": 10.0, "EN_max_MJ_kg": 10.5,
        "lipides_min_pct": 5, "lipides_max_pct": 8,
        "fibres_max_pct": 4,
        "calcium_min_pct": 0.85, "calcium_max_pct": 0.90,
        "phosphore_dig_min_pct": 0.45, "phosphore_dig_max_pct": 0.50,
        "lactose_min_pct": 15, "lactose_max_pct": 25,
        "ration_kg_jour_par_sujet": None,
        "aliments_reference_ci": ["Romelko (Koudijs/De Heus)", "Lactarine (Vitalac)"],
        "notes": "Porcelet sous mère. Lactose très important.",
    },
    "demarrage_1": {
        "tranche_poids_kg": [8, 15],
        "tranche_age_jours": [28, 50],
        "PB_min_pct": 19, "PB_max_pct": 21,
        "lysine_dig_min_pct": 1.20, "lysine_dig_max_pct": 1.30,
        "EN_min_MJ_kg": 9.8, "EN_max_MJ_kg": 10.2,
        "lipides_min_pct": 4, "lipides_max_pct": 6,
        "fibres_max_pct": 4, "fibres_min_pct": 3,
        "calcium_min_pct": 0.80, "calcium_max_pct": 0.80,
        "phosphore_dig_min_pct": 0.42, "phosphore_dig_max_pct": 0.42,
        "ration_kg_jour_par_sujet": None,
        "aliments_reference_ci": ["Maridav Démarrage", "De Heus/Koudijs 1er âge sécurisé", "Vitalac Ecolac/Zenilac"],
        "notes": "Post-sevrage. Transition alimentaire critique, risque diarrhée post-sevrage.",
    },
    "demarrage_2": {
        "tranche_poids_kg": [15, 25],
        "tranche_age_jours": [50, 80],
        "PB_min_pct": 17, "PB_max_pct": 19,
        "lysine_dig_min_pct": 1.05, "lysine_dig_max_pct": 1.15,
        "EN_min_MJ_kg": 9.7, "EN_max_MJ_kg": 10.0,
        "lipides_min_pct": 3, "lipides_max_pct": 5,
        "fibres_min_pct": 3.5, "fibres_max_pct": 4.5,
        "calcium_min_pct": 0.75, "calcium_max_pct": 0.75,
        "phosphore_dig_min_pct": 0.38, "phosphore_dig_max_pct": 0.38,
        "ration_kg_jour_par_sujet": None,
        "aliments_reference_ci": ["Aliment 2ème âge De Heus/Maridav/Vitalac"],
        "notes": "2ème âge.",
    },
    "croissance": {
        "tranche_poids_kg": [25, 60],
        "tranche_age_jours": [80, 130],
        "PB_min_pct": 16, "PB_max_pct": 17,
        "lysine_dig_min_pct": 0.90, "lysine_dig_max_pct": 1.00,
        "EN_min_MJ_kg": 9.5, "EN_max_MJ_kg": 9.8,
        "lipides_min_pct": 3, "lipides_max_pct": 5,
        "fibres_min_pct": 4, "fibres_max_pct": 5,
        "calcium_min_pct": 0.70, "calcium_max_pct": 0.70,
        "phosphore_dig_min_pct": 0.33, "phosphore_dig_max_pct": 0.33,
        "gmq_cible_g_j": [650, 800],
        "IC_cible": [2.3, 2.5],
        "ration_kg_jour_par_sujet": None,
        "notes": "Croissance. GMQ cible 650-800 g/j, IC 2.3-2.5.",
    },
    "finition": {
        "tranche_poids_kg": [60, 100],
        "tranche_age_jours": [130, 180],
        "PB_min_pct": 14, "PB_max_pct": 16,
        "lysine_dig_min_pct": 0.75, "lysine_dig_max_pct": 0.85,
        "EN_min_MJ_kg": 9.3, "EN_max_MJ_kg": 9.6,
        "lipides_min_pct": 3, "lipides_max_pct": 5,
        "fibres_min_pct": 4, "fibres_max_pct": 6,
        "calcium_min_pct": 0.60, "calcium_max_pct": 0.60,
        "phosphore_dig_min_pct": 0.28, "phosphore_dig_max_pct": 0.28,
        "gmq_cible_g_j": [800, 900],
        "IC_cible": [2.7, 3.0],
        "ration_kg_jour_par_sujet": None,
        "notes": "Finition. Cible 100 kg à 5 mois (idéal), 6 mois max.",
    },
    "truie_gestante": {
        "tranche_poids_kg": None,
        "tranche_age_jours": None,
        "PB_min_pct": 13, "PB_max_pct": 15,
        "lysine_dig_min_pct": 0.55, "lysine_dig_max_pct": 0.65,
        "EN_min_MJ_kg": 9.2, "EN_max_MJ_kg": 9.5,
        "fibres_min_pct": 6, "fibres_max_pct": 9,
        "calcium_min_pct": 0.80, "calcium_max_pct": 0.80,
        "phosphore_dig_min_pct": 0.35, "phosphore_dig_max_pct": 0.35,
        "ration_kg_jour_min": 2.2, "ration_kg_jour_max": 2.8,
        "notes": "Fibre ÉLEVÉE (satiété + transit). Rationnement strict. Sources : orge, son de blé, son de maïs.",
    },
    "truie_allaitante": {
        "tranche_poids_kg": None,
        "tranche_age_jours": None,
        "PB_min_pct": 16, "PB_max_pct": 18,
        "lysine_dig_min_pct": 1.00, "lysine_dig_max_pct": 1.10,
        "EN_min_MJ_kg": 9.8, "EN_max_MJ_kg": 10.2,
        "lipides_min_pct": 5, "lipides_max_pct": 8,
        "calcium_min_pct": 0.85, "calcium_max_pct": 0.85,
        "phosphore_dig_min_pct": 0.40, "phosphore_dig_max_pct": 0.40,
        "ration_kg_jour_min": 5.5, "ration_kg_jour_max": 7.0,
        "eau_l_jour_min": 25, "eau_l_jour_max": 40,
        "notes": "Souvent libre service. EAU 25-40 L/j CRUCIAL en climat ivoirien.",
    },
    "verrat": {
        "tranche_poids_kg": None,
        "tranche_age_jours": None,
        "PB_min_pct": 14, "PB_max_pct": 16,
        "lysine_dig_min_pct": 0.65, "lysine_dig_max_pct": 0.75,
        "ration_kg_jour_min": 2.5, "ration_kg_jour_max": 3.0,
        "notes": "Important : vitamine E, sélénium, zinc (qualité semence, climat chaud).",
    },
    "porcelets_naissance_lampe": {
        "tranche_poids_kg": [1.5, 3],
        "tranche_age_jours": [0, 3],
        "notes": "Zone lampe chauffante 30-34°C. Pas d'aliment solide standardisé, colostrum prioritaire.",
    },
}


# ============================================================
# 2. INGREDIENTS — brief 3.3 (12 MP)
# ============================================================
INGREDIENTS = {
    "mais": {
        "nom_fr": "Maïs",
        "categorie": "céréale_énergétique",
        "PB_pct": 8.5, "EN_MJ_kg": 9.9,
        "disponibilite_ci": "locale (~600 000 t/an)",
        "fournisseurs_potentiels": ["Kenz", "production locale"],
        "incorporation_max_pct": {"demarrage": 60, "croissance": 65, "finition": 70, "truie": 50},
        "vigilance": "mycotoxines en saison humide",
        "notes": "Base de toutes les rations en CI. PB 8-9%.",
    },
    "son_de_mais": {
        "nom_fr": "Son de maïs",
        "categorie": "co-produit_céréale",
        "disponibilite_ci": "locale (co-produit courant)",
        "fournisseurs_potentiels": ["minoteries locales"],
        "incorporation_max_pct": {"truie_gestante": 15},
        "notes": "Plus de fibre que le grain entier.",
    },
    "son_de_ble": {
        "nom_fr": "Son de blé",
        "categorie": "co-produit_céréale",
        "fibres_pct": 10.5,
        "disponibilite_ci": "importée",
        "fournisseurs_potentiels": ["Kenz"],
        "incorporation_max_pct": {"demarrage": 10, "croissance": 12, "finition": 15, "truie_gestante": 30},
        "notes": "Importé, riche en fibre (10-11%), utile truies gestantes.",
    },
    "son_de_riz": {
        "nom_fr": "Son de riz",
        "categorie": "co-produit_céréale",
        "disponibilite_ci": "locale (zones rizicoles)",
        "vigilance": "rancissement rapide en climat chaud",
        "notes": "Stockage soigné requis.",
    },
    "manioc": {
        "nom_fr": "Manioc (farine, racines séchées)",
        "categorie": "énergétique_local",
        "disponibilite_ci": "locale",
        "notes": "Source énergétique alternative, pauvre en protéine.",
    },
    "tourteau_soja": {
        "nom_fr": "Tourteau de soja 48%",
        "categorie": "protéique_végétal",
        "PB_pct": 47, "lysine_pct": 2.9,
        "disponibilite_ci": "importée",
        "fournisseurs_potentiels": ["Kenz"],
        "incorporation_max_pct": {"demarrage": 25, "croissance": 20, "finition": 15, "truie_allaitante": 22},
        "notes": "Référence protéique. Le plus utilisé en élevage moderne CI.",
    },
    "tourteau_coton": {
        "nom_fr": "Tourteau de coton",
        "categorie": "protéique_végétal",
        "disponibilite_ci": "locale",
        "vigilance": "gossypol — éviter chez porcelets, limiter à 5-10% en finition",
        "incorporation_max_pct": {"finition": 5, "demarrage": 0, "porcelets": 0},
        "notes": "À limiter strictement.",
    },
    "tourteau_palmiste": {
        "nom_fr": "Tourteau de palmiste",
        "categorie": "protéique_végétal",
        "disponibilite_ci": "locale (co-produit)",
        "incorporation_max_pct": {"croissance": 5, "finition": 5, "truie_gestante": 8},
        "notes": "Fibreux, utiliser modérément.",
    },
    "tourteau_arachide": {
        "nom_fr": "Tourteau d'arachide",
        "categorie": "protéique_végétal",
        "disponibilite_ci": "locale (Afrique de l'Ouest)",
        "vigilance": "aflatoxines",
        "notes": "Contrôle qualité essentiel.",
    },
    "farine_poisson": {
        "nom_fr": "Farine de poisson",
        "categorie": "protéique_animal",
        "PB_pct": 62,
        "disponibilite_ci": "importée",
        "fournisseurs_potentiels": ["Kenz"],
        "incorporation_max_pct": {"lactation": 8, "demarrage_1": 5, "demarrage_2": 3},
        "notes": "PB 60-65%, excellente qualité protéique mais coûteuse — privilégier porcelets.",
    },
    "dreche_biere": {
        "nom_fr": "Drèche de bière",
        "categorie": "co-produit_brasserie",
        "disponibilite_ci": "locale (brasseries)",
        "notes": "Utilisable pour truies et engraissement.",
    },
    "coquillages_concasses": {
        "nom_fr": "Coquillages concassés",
        "categorie": "minéral_calcium",
        "disponibilite_ci": "locale (très accessible CI)",
        "prix_xof_sac_50kg": 4500,
        "notes": "Source de calcium locale. ~4500 FCFA/sac 50 kg.",
    },
}


# ============================================================
# 3. SUPPLIERS — brief 3.2 (6 fournisseurs)
# ============================================================
SUPPLIERS = {
    "de_heus_koudijs": {
        "nom_complet": "De Heus / Koudijs Côte d'Ivoire",
        "type": "fabricant",
        "ville_principale": "Attinguié PK24",
        "gammes_porc": [
            "Romelko (lactation/sevrage)",
            "KPC (concentré protéique)",
            "Aliments complets truies/porcelets/croissance/finition",
        ],
        "contact": None,
        "notes": "Acteur majeur, usine locale depuis 2023, nouvelle usine prévue à Korhogo.",
    },
    "vitalac_e3cit": {
        "nom_complet": "Vitalac (distribué en CI via E3CIT)",
        "type": "fabricant",
        "ville_principale": "France (distribution Abidjan)",
        "gammes_porc": [
            "Lactarine (porcelet sous mère)",
            "Ecolac (sevrage)",
            "Zenilac",
            "Vitafaf porc (premix/AMV 1,5-2 %)",
            "Concentré porc 30 %",
        ],
        "contact": None,
        "notes": "Spécialiste minéraux et premix, qualité reconnue.",
    },
    "maridav": {
        "nom_complet": "Maridav CI",
        "type": "distributeur",
        "ville_principale": "Abidjan (Marcory Biétry)",
        "gammes_porc": [
            "Concentré protéique porc (jusqu'à 25 kg)",
            "Aliment Démarrage",
            "Aliment Croissance",
            "Aliment Finition (formulés avec concentrés Hendrix)",
        ],
        "contact": None,
        "notes": "Acteur historique CI.",
    },
    "nutrika": {
        "nom_complet": "Nutrika",
        "type": "distributeur",
        "ville_principale": "CI (dépôts à l'intérieur du pays)",
        "gammes_porc": [
            "Premix",
            "Compléments liquides",
            "Aliment 1er âge",
            "Additifs",
        ],
        "contact": None,
        "notes": "Distributeur depuis 2017. Dépôts à l'intérieur du pays.",
    },
    "kenz": {
        "nom_complet": "Kenz",
        "type": "importateur",
        "ville_principale": "Abidjan",
        "gammes_porc": [
            "Tourteau soja",
            "Farine de poisson",
            "Maïs",
            "Coquillage",
            "Son de blé",
            "Concentrés porcelet",
            "Premix",
        ],
        "contact": None,
        "notes": "Importateur matières premières. Pour éleveurs FAF (Fabrication À la Ferme).",
    },
    "africagri": {
        "nom_complet": "AfricAgri",
        "type": "importateur",
        "ville_principale": "Abidjan",
        "gammes_porc": [
            "Additifs spécialisés",
            "Matières premières spécialisées",
        ],
        "contact": None,
        "notes": "Représentant exclusif marques allemandes/italiennes. Ingrédients spécialisés.",
    },
}


# ============================================================
# 4. PATHOLOGIES — brief 3.6 (10 maladies)
# ============================================================
PATHOLOGIES = {
    "peste_porcine_africaine": {
        "nom_fr": "Peste Porcine Africaine (PPA)",
        "agent": "virus ASFV",
        "severity": "critical",
        "endemique_ci": True,
        "symptomes_cles": [
            "fièvre 40,5-42 °C",
            "abattement brutal",
            "anorexie",
            "rougeurs/cyanose (oreilles, ventre, queue)",
            "mort en 2-7 jours",
        ],
        "mortalite_pct": "~100",
        "vaccin_disponible": False,
        "prevention": "biosécurité totale (clôtures, contrôle visiteurs, pas de déchets de cuisine aux porcs)",
        "action_app": "ALERTE CRITIQUE + protocole déclaration MIRAH obligatoire",
        "obligation_legale": "déclaration MIRAH",
    },
    "cysticercose": {
        "nom_fr": "Cysticercose porcine",
        "agent": "Taenia solium",
        "severity": "alert",
        "endemique_ci": True,
        "prevalence_ci_pct": 13,
        "symptomes_cles": ["cysticerques musculaires", "zoonose grave (neurocysticercose humaine)"],
        "vaccin_disponible": False,
        "prevention": "pas de divagation, latrines, contrôle accès excréments humains",
        "action_app": "recommandations biosécurité, latrines, ne jamais laisser porcs en divagation",
        "obligation_legale": None,
        "notes": "Endémique CI, prévalence ~13 % en élevage traditionnel. Zoonose grave.",
    },
    "prrs": {
        "nom_fr": "PRRS (Syndrome Dysgénésique et Respiratoire Porcin)",
        "agent": "virus PRRSV",
        "severity": "alert",
        "endemique_ci": True,
        "symptomes_cles": [
            "avortements tardifs",
            "momifications",
            "porcelets faibles",
            "troubles respiratoires",
        ],
        "vaccin_disponible": True,
        "prevention": "vaccination, biosécurité, contrôle introductions",
        "action_app": "ALERTE reproductive si avortements > 5 %",
    },
    "parvovirose": {
        "nom_fr": "Parvovirose porcine",
        "agent": "Porcine Parvovirus (PPV)",
        "severity": "warning",
        "endemique_ci": True,
        "symptomes_cles": ["momifications fœtales", "surtout primipares non vaccinées"],
        "vaccin_disponible": True,
        "prevention": "vaccin cochettes OBLIGATOIRE",
        "action_app": "rappel vaccination cochettes systématique",
    },
    "rouget": {
        "nom_fr": "Rouget du porc",
        "agent": "Erysipelothrix rhusiopathiae",
        "severity": "warning",
        "endemique_ci": True,
        "symptomes_cles": ["fièvre", "plaques cutanées rhomboïdes", "arthrite"],
        "vaccin_disponible": True,
        "prevention": "vaccin standard",
        "action_app": "rappel vaccination standard",
    },
    "grippe_porcine": {
        "nom_fr": "Grippe porcine",
        "agent": "virus influenza porcin (SIV)",
        "severity": "warning",
        "endemique_ci": True,
        "symptomes_cles": ["toux", "fièvre", "jetage", "propagation rapide"],
        "vaccin_disponible": True,
        "prevention": "ventilation, biosécurité",
        "action_app": "ALERTE respiratoire si toux > 10 % effectif",
    },
    "aujeszky": {
        "nom_fr": "Maladie d'Aujeszky (pseudorage)",
        "agent": "Suid herpesvirus 1",
        "severity": "alert",
        "endemique_ci": True,
        "symptomes_cles": ["troubles nerveux porcelets", "avortements"],
        "vaccin_disponible": True,
        "prevention": "vaccination, biosécurité",
        "action_app": "ALERTE neuro chez porcelets",
    },
    "diarrhees_neonatales": {
        "nom_fr": "Diarrhées néonatales",
        "agent": "E. coli, Clostridium, rotavirus",
        "severity": "alert",
        "endemique_ci": True,
        "symptomes_cles": ["diarrhée porcelets < 7 jours", "déshydratation", "mortalité élevée"],
        "vaccin_disponible": True,
        "prevention": "vaccination truies en fin de gestation, hygiène maternité, colostrum",
        "action_app": "ALERTE digestive néonatale dès 1er cas",
    },
    "pneumonie_enzootique": {
        "nom_fr": "Pneumonie enzootique",
        "agent": "Mycoplasma hyopneumoniae",
        "severity": "warning",
        "endemique_ci": True,
        "symptomes_cles": ["toux chronique", "retard de croissance"],
        "vaccin_disponible": True,
        "prevention": "vaccination, ambiance (ventilation, densité)",
        "action_app": "alerte si toux persistante + retard GMQ",
    },
    "parasitoses": {
        "nom_fr": "Parasitoses majeures (ascaridiose, gale sarcoptique, coccidiose, trypanosomose)",
        "agent": "Ascaris suum, Sarcoptes scabiei, Isospora suis, Trypanosoma spp.",
        "severity": "warning",
        "endemique_ci": True,
        "symptomes_cles": [
            "retard croissance",
            "prurit (gale)",
            "diarrhée porcelets (coccidiose)",
            "anémie (trypanosomose dans certaines zones)",
        ],
        "vaccin_disponible": False,
        "prevention": "déparasitage régulier, hygiène, lutte vectorielle",
        "action_app": "plan de déparasitage à proposer",
    },
}


# ============================================================
# 5. GROWTH CURVES — brief 2.3 (LW × LR CI)
# ============================================================
GROWTH_CURVES = {
    "LARGE_WHITE_x_LANDRACE_CI": {
        "race_pere": "LARGE_WHITE",
        "race_mere": "LANDRACE",
        "pays": "CI",
        "conditions": "alimentation industrielle correcte, ambiance tropicale gérée",
        "points": [
            {"age_jours": 0,   "stade": "naissance",            "poids_kg": 1.5,  "gmq_g_j": None},
            {"age_jours": 21,  "stade": "mi_lactation",         "poids_kg": 5.5,  "gmq_g_j": 200},
            {"age_jours": 28,  "stade": "sevrage",              "poids_kg": 7.5,  "gmq_g_j": 250},
            {"age_jours": 50,  "stade": "fin_demarrage_1",      "poids_kg": 15,   "gmq_g_j": 320},
            {"age_jours": 80,  "stade": "fin_demarrage_2",      "poids_kg": 25,   "gmq_g_j": 350},
            {"age_jours": 110, "stade": "mi_croissance",        "poids_kg": 45,   "gmq_g_j": 650},
            {"age_jours": 130, "stade": "fin_croissance",       "poids_kg": 60,   "gmq_g_j": 750},
            {"age_jours": 150, "stade": "finition_5mois_ideal", "poids_kg": 100,  "gmq_g_j": 850},
            {"age_jours": 180, "stade": "finition_6mois_max",   "poids_kg": 105,  "gmq_g_j": 750},
        ],
        "notes": "Cible idéale : 100 kg en 5 mois. Max : 6 mois.",
    },
}


# ============================================================
# 6. FEED FORMULAS — brief 3.4 (6 formules FAF)
# ============================================================
FEED_FORMULAS = {
    "demarrage_1_faf_ci": {
        "stade_cible": "DEMARRAGE_1",
        "mode": "FAF",
        "rendement_kg": 100,
        "ingredients": [
            {"ingredient": "mais", "kg": 55},
            {"ingredient": "tourteau_soja", "kg": 22},
            {"ingredient": "farine_poisson", "kg": 5},
            {"ingredient": "son_de_ble", "kg": 8},
            {"ingredient": "concentre_cmv_porcelet", "kg": 8},
            {"ingredient": "sel", "kg": 0.3},
            {"ingredient": "coquillages_concasses", "kg": 1.5},
        ],
        "cout_estimatif_xof_kg": None,
        "notes": "Recalculer selon prix MP courants.",
    },
    "demarrage_2_faf_ci": {
        "stade_cible": "DEMARRAGE_2",
        "mode": "FAF",
        "rendement_kg": 100,
        "ingredients": [
            {"ingredient": "mais", "kg": 60},
            {"ingredient": "tourteau_soja", "kg": 18},
            {"ingredient": "son_de_ble", "kg": 10},
            {"ingredient": "farine_poisson", "kg": 3},
            {"ingredient": "cmv", "kg": 7},
            {"ingredient": "sel", "kg": 0.3},
            {"ingredient": "coquillages_concasses", "kg": 1.5},
        ],
        "cout_estimatif_xof_kg": None,
        "notes": "Recalculer selon prix MP courants.",
    },
    "croissance_faf_ci": {
        "stade_cible": "CROISSANCE",
        "mode": "FAF",
        "rendement_kg": 100,
        "ingredients": [
            {"ingredient": "mais", "kg": 60},
            {"ingredient": "tourteau_soja", "kg": 16.5},
            {"ingredient": "son_de_ble", "kg": 12},
            {"ingredient": "tourteau_palmiste", "kg": 5},
            {"ingredient": "cmv", "kg": 5},
            {"ingredient": "sel", "kg": 0.4},
            {"ingredient": "coquillages_concasses", "kg": 1.5},
        ],
        "cout_estimatif_xof_kg": None,
        "notes": "Tourteau soja 15-18 kg : valeur médiane 16,5 kg retenue.",
    },
    "finition_faf_ci": {
        "stade_cible": "FINITION",
        "mode": "FAF",
        "rendement_kg": 100,
        "ingredients": [
            {"ingredient": "mais", "kg": 65},
            {"ingredient": "tourteau_soja", "kg": 12},
            {"ingredient": "son_de_ble", "kg": 15},
            {"ingredient": "tourteau_palmiste", "kg": 5},
            {"ingredient": "cmv", "kg": 4},
            {"ingredient": "sel", "kg": 0.4},
            {"ingredient": "coquillages_concasses", "kg": 1.2},
        ],
        "cout_estimatif_xof_kg": None,
        "notes": "Limiter tourteau de coton à < 5 % en finition.",
    },
    "truie_gestante_faf_ci": {
        "stade_cible": "TRUIE_GESTANTE",
        "mode": "FAF",
        "rendement_kg": 100,
        "ration_kg_jour": 2.5,
        "ingredients": [
            {"ingredient": "mais", "kg": 30},
            {"ingredient": "son_de_ble", "kg": 30},
            {"ingredient": "son_de_mais", "kg": 15},
            {"ingredient": "tourteau_soja", "kg": 8},
            {"ingredient": "tourteau_palmiste", "kg": 8},
            {"ingredient": "cmv_truie", "kg": 5},
            {"ingredient": "coquillages_concasses", "kg": 3},
            {"ingredient": "sel", "kg": 0.5},
        ],
        "cout_estimatif_xof_kg": None,
        "notes": "Rationnement 2,5 kg/j. Fibre élevée (satiété + transit).",
    },
    "truie_allaitante_faf_ci": {
        "stade_cible": "TRUIE_ALLAITANTE",
        "mode": "FAF",
        "rendement_kg": 100,
        "ration_kg_jour": 6,
        "ingredients": [
            {"ingredient": "mais", "kg": 50},
            {"ingredient": "tourteau_soja", "kg": 20},
            {"ingredient": "son_de_ble", "kg": 10},
            {"ingredient": "farine_poisson", "kg": 5},
            {"ingredient": "huile_vegetale", "kg": 2},
            {"ingredient": "cmv_truie", "kg": 10},
            {"ingredient": "coquillages_concasses", "kg": 2.5},
            {"ingredient": "sel", "kg": 0.5},
        ],
        "cout_estimatif_xof_kg": None,
        "notes": "Libre service ~6 kg/j. EAU 25-40 L/j obligatoire.",
    },
}


# ============================================================
# 7. ENVIRONMENT TARGETS — brief 3.5 (8 stades)
# ============================================================
ENVIRONMENT_TARGETS = {
    "porcelets_lampe": {
        "stade": "porcelets_naissance_0_3j",
        "temperature_optimale_c": [30, 34],
        "temperature_critique_haute_c": None,
        "zone": "sous lampe chauffante",
        "notes": "Zone lampe 30-34 °C, indispensable pour les 0-3 jours.",
    },
    "lactation": {
        "stade": "lactation",
        "temperature_optimale_porcelets_c": [26, 28],
        "temperature_optimale_truie_c": [18, 20],
        "temperature_critique_haute_c": 28,
        "impact_t_haute": "T° truie >28°C = chute conso, baisse lactation",
        "eau_l_jour_par_sujet": [25, 40],
        "debit_abreuvoir_l_min": 2,
        "notes": "Dualité thermique zone porcelets / zone truie.",
    },
    "demarrage_1": {
        "stade": "demarrage_1",
        "temperature_optimale_c": [26, 28],
        "temperature_critique_haute_c": 30,
        "consigne_evolution": "baisser 1 °C par semaine",
        "eau_l_jour_par_sujet": [1, 2],
        "notes": "Transition thermique progressive.",
    },
    "demarrage_2": {
        "stade": "demarrage_2",
        "temperature_optimale_c": [22, 24],
        "temperature_critique_haute_c": 28,
        "eau_l_jour_par_sujet": [1, 2],
        "notes": "",
    },
    "croissance": {
        "stade": "croissance",
        "temperature_optimale_c": [20, 22],
        "temperature_critique_haute_c": 26,
        "eau_l_jour_par_sujet": [3, 6],
        "notes": "",
    },
    "finition": {
        "stade": "finition",
        "temperature_optimale_c": [18, 20],
        "temperature_critique_haute_c": 24,
        "impact_gmq_par_c_sup": -25,
        "impact_gmq_formule": "GMQ_corrigé = GMQ_théorique - 25 × (T_amb - 24) si T>24",
        "eau_l_jour_par_sujet": [6, 10],
        "notes": "-25 g GMQ par °C au-dessus de 24°C.",
    },
    "truie_gestante": {
        "stade": "truie_gestante",
        "temperature_optimale_c": [18, 20],
        "temperature_critique_haute_c": 25,
        "risque_t_haute": "risque embryonnaire au-dessus de 25°C",
        "eau_l_jour_par_sujet": [12, 15],
        "notes": "",
    },
    "truie_allaitante": {
        "stade": "truie_allaitante",
        "temperature_optimale_c": [18, 20],
        "temperature_critique_haute_c": 25,
        "risque_t_haute": "baisse conso + lactation au-dessus de 25°C",
        "eau_l_jour_par_sujet": [25, 40],
        "debit_abreuvoir_l_min": 2,
        "notes": "EAU NON NÉGOCIABLE. Débit min abreuvoir 2 L/min.",
    },
    "verrat": {
        "stade": "verrat",
        "temperature_optimale_c": [16, 18],
        "temperature_critique_haute_c": 25,
        "risque_t_haute": "-20 % qualité semence pendant 6 semaines au-dessus de 25°C",
        "eau_l_jour_par_sujet": [8, 12],
        "notes": "Sensibilité maximale au stress thermique.",
    },
    "_global": {
        "stade": "global_climat_ci",
        "humidite_cible_pct": [55, 75],
        "vitesse_air_zone_vie_m_s": [0, 0.2],
        "vitesse_air_saison_chaude_m_s": [0.3, 0.8],
        "regle_correction_hr_t": "Si HR>75% ET T°>24°C : GMQ -= 12 × (HR - 75) / 10",
        "constat_ci": "En CI (24-32°C ambiant), on dépasse PERMANEMMENT les zones de confort adultes.",
        "recommandations": [
            "ventilation forte",
            "brumisation/bassinage",
            "abreuvement à volonté",
            "ombrage des bâtiments",
        ],
        "notes": "Paramètres ambiance transversaux climat ivoirien.",
    },
}


# ============================================================
# 8. REPRODUCTION PARAMETERS — brief 2.4 (1 entrée)
# ============================================================
REPRODUCTION_PARAMETERS = {
    "truie_ci_lw_landrace": {
        "duree_gestation_jours": 114,
        "tolerance_gestation_jours": [112, 119],
        "cycle_oestral_jours": 21,
        "intervalle_sevrage_chaleurs_min_j": 5,
        "intervalle_sevrage_chaleurs_max_j": 7,
        "cycle_reproducteur_complet_j": 150,
        "age_min_1ere_saillie_mois": 8,
        "age_max_1ere_saillie_mois": 10,
        "poids_min_1ere_saillie_kg": 130,
        "productivite_cible_porcelets_an": [20, 25],
        "productivite_optimale_porcelets_an": 27,
        "taille_portee_nv_min": 10,
        "taille_portee_nv_max": 12,
        "porcelets_sevres_min": 9,
        "porcelets_sevres_max": 11,
        "seuils_reforme": {
            "nb_portees_max": 7,
            "ia_infructueuses_max": 3,
            "chaleurs_absentes_jours_max": 21,
            "vivants_moyens_min": 8,
        },
        "alertes_calendaires_jours": {
            "J0": "noter date saillie, calculer écho (J28) et mise bas (J114)",
            "J21": "à surveiller — retour en chaleurs possible si non gestante",
            "J28": "échographie à programmer",
            "J85": "préparer transition vers maternité (J108 = J-7 mise bas)",
            "J108": "transfert maternité + nettoyage case + lampe chauffante porcelets",
            "J112": "surveillance accrue mise bas",
            "J114": "mise bas attendue (± 2 j)",
            "J+1_mise_bas": "vérifier prise colostrale, marquer porcelets",
            "J+3_mise_bas": "soins porcelets (fer injectable, coupe dents, identification)",
            "J+21_a_J+28": "sevrage à planifier",
            "J+5_post_sevrage": "surveillance chaleurs truie",
            "J+7_post_sevrage_sans_chaleurs": "ALERTE infertilité",
        },
        "notes": "Constantes biologiques invariantes. Cible 20-25 porcelets sevrés/truie/an (réaliste CI), 27 si optimal.",
    },
}


# ============================================================
# MAIN
# ============================================================
def main() -> int:
    plan: list[tuple[str, dict]] = [
        ("nutritional_requirements", NUTRITIONAL_REQUIREMENTS),
        ("ingredients", INGREDIENTS),
        ("suppliers", SUPPLIERS),
        ("pathologies", PATHOLOGIES),
        ("growth_curves", GROWTH_CURVES),
        ("feed_formulas", FEED_FORMULAS),
        ("environment_targets", ENVIRONMENT_TARGETS),
        ("reproduction_parameters", REPRODUCTION_PARAMETERS),
    ]

    total = 0
    recap: dict[str, int] = {}

    for type_, entries in plan:
        n = 0
        for cle, data in entries.items():
            try:
                upsert(type_, cle, data)
                n += 1
                total += 1
                print(f"  ✓ {type_:28s} / {cle}")
            except Exception as e:
                print(f"  ✗ {type_} / {cle}: {e}", file=sys.stderr)
                raise
        recap[type_] = n
        print(f"[OK] {type_}: {n} entrées")

    print("\n=== RÉCAP FINAL ===")
    for t, n in recap.items():
        print(f"  {t:28s} {n:3d}")
    print(f"  {'TOTAL':28s} {total:3d}")

    # Vérification finale via SELECT
    print("\n=== VÉRIFICATION BDD ===")
    res = exec_sql(
        "SELECT type, count(*)::int AS n FROM donnees_metier "
        "WHERE pays='CI' GROUP BY type ORDER BY type;"
    )
    for row in res:
        print(f"  {row['type']:28s} {row['n']:3d}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
