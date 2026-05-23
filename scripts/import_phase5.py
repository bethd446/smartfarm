#!/usr/bin/env python3
"""
Phase 5 — Import 117 porcelets en Démarrage 2 + ajout T14 MB 01/04
- 117 porcelets EasyFarm (110 vivants + 7 malades)
- Convention boucle BDD : <boucle>-<sexe> (B1-M, B1-F, B4-M, B4-F...)
- Doublons B45 et B53 : 2e ligne renommée -bis
- Tous tag → Démarrage 2 (consigne user)
- Date naissance estimée : 2026-04-01 par défaut (poids moy 10.4 kg = ~5-6 semaines)
- Convention couleur : BLEU=mâle / VERT=femelle (déjà cohérent avec data)

+ MB T14 (B.24) le 2026-04-01 13 porcelets (info terrain user, déjà sevré)
"""
import os, json, requests, sys
from datetime import date

TOK = os.environ.get('SUPABASE_ACCESS_TOKEN')
PROJ = 'tpzhxjzwlxwujboboyit'
URL = f'https://api.supabase.com/v1/projects/{PROJ}/database/query'
HEADERS = {'Authorization': f'Bearer {TOK}', 'Content-Type': 'application/json'}

FERME_ID = 'fdba3bb2-85dd-4ac1-9ab3-713c750980dc'
BATIMENT_DEMARRAGE_2 = '81883984-142f-4152-8bba-ed239a8183d2'
DATE_PESEE = '2026-05-02'  # date du snapshot
DATE_NAISSANCE_ESTIMEE = '2026-04-01'

def sql(query: str):
    r = requests.post(URL, headers=HEADERS, json={'query': query}, timeout=30)
    if r.status_code not in (200, 201):
        print(f"❌ HTTP {r.status_code}: {r.text[:300]}")
        return None
    try: return r.json()
    except: return None

def sql_q(query: str):
    res = sql(query)
    if res is None: sys.exit(1)
    if isinstance(res, dict) and 'message' in res:
        print(f"❌ {res['message'][:400]}\n  query: {query[:200]}")
        sys.exit(1)
    return res

def esc(s):
    if s is None: return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

with open('/root/.hermes/cache/documents/doc_703bf75af8e1_easyfarm-verite-terrain-2026-05-22.json') as f:
    DATA = json.load(f)

# ─────────────────────────────────────────────────────────────────────
# T14 (B.24) MB historique 01/04 13 porcelets — INFO TERRAIN USER
# ─────────────────────────────────────────────────────────────────────
print("=== Ajout MB T14 B.24 (info terrain) ===")
# Trouver l'id de la truie T14 (boucle B.24)
res = sql_q(f"SELECT id FROM animaux WHERE ferme_id={esc(FERME_ID)} AND tag='B.24' AND categorie='truie'")
if not res:
    print("  ! T14 (B.24) introuvable")
else:
    truie_t14_id = res[0]['id']
    # MB historique : 13 nés vivants, 13 sevrés (info user "déjà sevrée")
    mb = sql_q(f"""
    INSERT INTO mises_bas (ferme_id, truie_id, date_mb, nes_vivants, morts_nes, observations)
    VALUES ({esc(FERME_ID)}, {esc(truie_t14_id)}, '2026-04-01', 13, 0, 
            'Info terrain user (NON saisie dans export EasyFarm initial). Portée déjà sevrée.')
    RETURNING id, date_mb
    """)
    print(f"  + MB T14 B.24 le 2026-04-01 (13 nés vivants) — portée auto par trigger")
    # Maintenant on remet la truie T14 en statut "truie_vide" (puisque sevrée selon décision user)
    upd = sql_q(f"""
    UPDATE animaux SET stade='truie_vide'::stade_porc, batiment_id={esc('dc8980db-a29f-4dc8-bbdc-59e026fe5805')}
    WHERE id={esc(truie_t14_id)}
    RETURNING tag, stade
    """)
    print(f"  → T14 reprogrammée → truie_vide, déplacée vers Gestation")

# ─────────────────────────────────────────────────────────────────────
# IMPORT 117 PORCELETS (en lot pour performance)
# ─────────────────────────────────────────────────────────────────────
print("\n=== Import 117 porcelets en Démarrage 2 ===")

porcelets = DATA['porcelets_actualisés']['porcelets_detail_complet']
print(f"  Source : {len(porcelets)} lignes")

# Dédoublonnage : track (boucle, sexe) déjà vu pour ajouter -bis
seen = {}
inserted = []
for p in porcelets:
    key = (p['boucle'], p['sexe'])
    if key in seen:
        # doublon → suffix -bis
        tag = f"{p['boucle']}-{p['sexe']}-bis"
        obs = f"DOUBLON corrigé (2e ligne CSV même boucle/sexe). Convention: {p.get('note','doublon')}"
    else:
        tag = f"{p['boucle']}-{p['sexe']}"
        obs = "Importé EasyFarm 2026-05-19"
        seen[key] = True
    
    sexe_db = 'M' if p['sexe'] == 'M' else 'F'
    couleur = p.get('couleur', 'BLEU' if sexe_db == 'M' else 'VERT')
    statut_db = 'malade' if p.get('statut') == 'MALADE' else 'actif'
    
    inserted.append({
        'tag': tag,
        'sexe': sexe_db,
        'couleur': couleur,
        'poids': p['poids_kg'],
        'statut': statut_db,
        'obs': obs,
    })

print(f"  Après dédoublonnage : {len(inserted)} porcelets uniques à insérer")
print(f"  Doublons trouvés et résolus : {len(porcelets) - len(seen)} → suffix -bis")

# Insert batch — INSERT...SELECT VALUES (un seul gros INSERT)
batch_values = []
for p in inserted:
    batch_values.append(
        f"({esc(FERME_ID)}, {esc(p['tag'])}, 'F' /*placeholder*/, 'porcelet_sevre'::categorie_animal, 'demarrage_2'::stade_porc, "
        f"'CROISE'::race_porc, {esc(BATIMENT_DEMARRAGE_2)}, {p['poids']}, '{DATE_PESEE}', "
        f"'{p['couleur']}'::couleur_boucle, '{p['statut']}'::statut_animal, 'ELEVAGE', "
        f"'{DATE_NAISSANCE_ESTIMEE}', '{DATE_NAISSANCE_ESTIMEE}', {esc(p['obs'])})"
    )
# Note : on a un piège — le sexe doit être correct, je dois le mettre par porcelet
# Refonte avec sexe correct :
batch_values = []
for p in inserted:
    batch_values.append(
        f"({esc(FERME_ID)}, {esc(p['tag'])}, '{p['sexe']}'::sexe_animal, "
        f"'porcelet_sevre'::categorie_animal, 'demarrage_2'::stade_porc, "
        f"'CROISE'::race_porc, {esc(BATIMENT_DEMARRAGE_2)}, {p['poids']}, '{DATE_PESEE}', "
        f"'{p['couleur']}'::couleur_boucle, '{p['statut']}'::statut_animal, 'ELEVAGE', "
        f"'{DATE_NAISSANCE_ESTIMEE}', '{DATE_NAISSANCE_ESTIMEE}', {esc(p['obs'])})"
    )

# Insertion par chunks de 30 pour pas exploser la longueur de query
CHUNK = 30
total_inserted = 0
for i in range(0, len(batch_values), CHUNK):
    chunk = batch_values[i:i+CHUNK]
    query = f"""
    INSERT INTO animaux 
      (ferme_id, tag, sexe, categorie, stade, race_code, batiment_id, poids_actuel_kg, 
       date_derniere_pesee, couleur_boucle, statut, destination, date_naissance, date_entree, observations)
    VALUES {','.join(chunk)}
    RETURNING tag
    """
    res = sql_q(query)
    if res:
        total_inserted += len(res)
        print(f"  Chunk {i//CHUNK+1}: +{len(res)} porcelets")

# ─────────────────────────────────────────────────────────────────────
# AJOUT PESÉES INITIALES (1 par porcelet, pour algos GMQ)
# ─────────────────────────────────────────────────────────────────────
print(f"\n=== Création pesées initiales ({total_inserted} entrées) ===")
res = sql_q(f"""
INSERT INTO pesees (ferme_id, animal_id, date_pesee, poids_kg, contexte, pesee_collective, observations)
SELECT ferme_id, id, '{DATE_PESEE}', poids_actuel_kg, 'controle', false, 'Pesée initiale snapshot EasyFarm'
FROM animaux 
WHERE ferme_id={esc(FERME_ID)} AND categorie='porcelet_sevre'
RETURNING id
""")
print(f"  Pesées créées : {len(res or [])}")

# ─────────────────────────────────────────────────────────────────────
# RÉCAP FINAL PHASE 5
# ─────────────────────────────────────────────────────────────────────
print("\n=== RÉCAP PHASE 5 ===")
recap = sql_q(f"""
SELECT 
  (SELECT count(*) FROM animaux WHERE ferme_id={esc(FERME_ID)} AND categorie='truie') AS truies,
  (SELECT count(*) FROM animaux WHERE ferme_id={esc(FERME_ID)} AND categorie='verrat') AS verrats,
  (SELECT count(*) FROM animaux WHERE ferme_id={esc(FERME_ID)} AND categorie='porcelet_sevre') AS porcelets,
  (SELECT count(*) FROM animaux WHERE ferme_id={esc(FERME_ID)} AND statut='malade') AS malades,
  (SELECT count(*) FROM saillies WHERE ferme_id={esc(FERME_ID)}) AS saillies,
  (SELECT count(*) FROM mises_bas WHERE ferme_id={esc(FERME_ID)}) AS mises_bas,
  (SELECT count(*) FROM portees WHERE ferme_id={esc(FERME_ID)}) AS portees,
  (SELECT count(*) FROM pesees WHERE ferme_id={esc(FERME_ID)}) AS pesees,
  (SELECT count(*) FROM evenements_prevus WHERE ferme_id={esc(FERME_ID)}) AS events
""")
print(json.dumps(recap[0], indent=2))

print("\n=== Cheptel par stade ===")
stades = sql_q(f"""
SELECT stade::text AS stade, count(*) AS nb 
FROM animaux WHERE ferme_id={esc(FERME_ID)}
GROUP BY stade
ORDER BY count(*) DESC
""")
for s in stades or []:
    print(f"  {s['stade']:25} {s['nb']:>4}")

print("\n=== Cheptel par bâtiment ===")
bats = sql_q(f"""
SELECT b.nom, b.phase::text as phase, b.capacite, count(a.id) AS effectif
FROM batiments b
LEFT JOIN animaux a ON a.batiment_id = b.id AND a.deleted_at IS NULL
WHERE b.ferme_id={esc(FERME_ID)}
GROUP BY b.id, b.nom, b.phase, b.capacite, b.ordre_cycle
ORDER BY b.ordre_cycle
""")
for b in bats or []:
    saturation = f"{b['effectif']}/{b['capacite']}"
    print(f"  {b['nom']:25} {b['phase']:15} {saturation}")

print("\n✅ Phase 5 terminée")
