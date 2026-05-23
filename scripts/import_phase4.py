#!/usr/bin/env python3
"""
Phase 4 — Import vrai cheptel EasyFarm dans Smart Farm Cloud
- 2 verrats (Bobi + Aligator) → Verraterie
- 17 truies → Gestation/Maternité/Verraterie selon statut
- 6 portées historiques (T16, T10, T18, T19, T14, T12) 
- 10 saillies en cours (truies pleines avec mb_prevue future)

Source : /root/.hermes/cache/documents/doc_703bf75af8e1_easyfarm-verite-terrain-2026-05-22.json
"""
import os, json, requests, sys
from datetime import date

TOK = os.environ.get('SUPABASE_ACCESS_TOKEN')
if not TOK:
    print("ERROR: SUPABASE_ACCESS_TOKEN manquant"); sys.exit(1)

PROJ = 'tpzhxjzwlxwujboboyit'
URL = f'https://api.supabase.com/v1/projects/{PROJ}/database/query'
HEADERS = {'Authorization': f'Bearer {TOK}', 'Content-Type': 'application/json'}

# IDs déjà créés en Phase 3
FERME_ID = 'fdba3bb2-85dd-4ac1-9ab3-713c750980dc'
USER_ID = 'eb6880f4-4636-42aa-9149-d32de15f7859'

# IDs des bâtiments par phase
BATIMENTS = {
    'verraterie':    '640cca6d-7c18-47e0-a92f-13d4f5aeb36c',
    'gestation':     'dc8980db-a29f-4dc8-bbdc-59e026fe5805',
    'maternite':     '3982ddff-d524-42d2-bd6b-12018b30cb41',
    'demarrage_1':   '174b73eb-70e6-45d8-b7d8-f70246c8f92a',
    'demarrage_2':   '81883984-142f-4152-8bba-ed239a8183d2',
    'croissance':    '68740b52-8bfe-4aab-b1fc-2077f8d93c75',
    'finition':      '3011ddd6-f75c-4f43-97d1-5d2168b27979',
}

def sql(query: str):
    r = requests.post(URL, headers=HEADERS, json={'query': query}, timeout=30)
    if r.status_code not in (200, 201):
        print(f"❌ SQL HTTP {r.status_code}:\n{query[:200]}...\n  → {r.text[:300]}")
        return None
    try:
        return r.json()
    except Exception:
        return None

def sql_q(query: str):
    """SQL avec gestion erreur stricte, retourne resultat (peut être [])"""
    res = sql(query)
    if res is None:
        sys.exit(1)
    if isinstance(res, dict) and 'message' in res:
        print(f"❌ SQL ERROR: {res['message'][:300]}\n  query: {query[:200]}")
        sys.exit(1)
    return res  # peut être [] (valide)

def esc(s):
    """Escape simple SQL"""
    if s is None: return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"

# ─────────────────────────────────────────────────────────────────────
# CHARGE DONNÉES SOURCE
# ─────────────────────────────────────────────────────────────────────
with open('/root/.hermes/cache/documents/doc_703bf75af8e1_easyfarm-verite-terrain-2026-05-22.json') as f:
    DATA = json.load(f)

print(f"=== Source : {DATA['cheptel_a_jour_le']} ===")
print(f"  truies = {len(DATA['truies'])}")
print(f"  verrats = {len(DATA['verrats'])}")
print(f"  porcelets total = {DATA['porcelets_actualisés']['total_lignes_csv']}")

# ─────────────────────────────────────────────────────────────────────
# RACES — ne devrait pas être nécessaire (race_code enum direct sur animaux)
# ─────────────────────────────────────────────────────────────────────
# On vérifie qu'il y a au moins une race par défaut (Large White)
print("\n=== Races ===")
races_res = sql_q("SELECT id, nom FROM races")
existing_races = {r['nom']: r['id'] for r in (races_res or [])}
for rn, code in [('Large White', 'LARGE_WHITE'), ('Piétrain', 'PIETRAIN'), ('Landrace', 'LANDRACE'), ('Croisé', 'CROISE')]:
    if rn not in existing_races:
        res = sql_q(f"INSERT INTO races (nom, espece) VALUES ({esc(rn)}, 'porcine') RETURNING id, nom")
        if res:
            existing_races[res[0]['nom']] = res[0]['id']
            print(f"  + {rn}: {res[0]['id']}")
    else:
        print(f"  = {rn}: {existing_races[rn]}")

LW = existing_races.get('Large White')
PIE = existing_races.get('Piétrain')
LR = existing_races.get('Landrace')
CR = existing_races.get('Croisé')

# ─────────────────────────────────────────────────────────────────────
# IMPORT VERRATS (2)
# ─────────────────────────────────────────────────────────────────────
print("\n=== Import 2 verrats ===")
verrats_inserted = {}
for v in DATA['verrats']:
    race_id = LW if v['race'] == 'Large White' else PIE if v['race'] == 'Piétrain' else CR
    race_code = 'LARGE_WHITE' if v['race'] == 'Large White' else 'PIETRAIN' if v['race'] == 'Piétrain' else 'CROISE'
    query = f"""
    INSERT INTO animaux (ferme_id, tag, nom, sexe, categorie, stade, race_id, race_code, batiment_id, statut, destination, date_entree, observations)
    VALUES ({esc(FERME_ID)}, {esc(v['boucle'])}, {esc(v['nom'])}, 'M', 'verrat', 'verrat', {esc(race_id) if race_id else 'NULL'}, {esc(race_code)}::race_porc, {esc(BATIMENTS['verraterie'])}, 'actif'::statut_animal, 'REPRODUCTION', '2025-06-01', {esc('Code EasyFarm: ' + v['code_id'])})
    RETURNING id, tag, nom
    """
    res = sql_q(query)
    if res:
        verrats_inserted[v['code_id']] = res[0]['id']
        print(f"  + {v['code_id']} {v['boucle']} {v['nom']} ({v['race']}) → {res[0]['id'][:8]}...")

# ─────────────────────────────────────────────────────────────────────
# IMPORT TRUIES (17)
# ─────────────────────────────────────────────────────────────────────
print("\n=== Import 17 truies ===")
truies_inserted = {}

STATUT_MAP = {
    'Pleine': ('truie_gestante', 'gestation', 'actif'),
    'En maternité': ('truie_allaitante', 'maternite', 'actif'),
    'En attente saillie': ('truie_vide', 'gestation', 'actif'),
    'À surveiller': ('truie_vide', 'gestation', 'actif'),  # statut=actif + obs précise
    'Réforme': ('reforme', 'gestation', 'reforme'),
}

for t in DATA['truies']:
    stade, bat_phase, statut = STATUT_MAP.get(t['statut'], ('truie_vide', 'gestation', 'actif'))
    race_str = t.get('race') or 'Large White'
    race_id = LW if 'Large' in race_str else CR
    race_code = 'LARGE_WHITE' if 'Large' in race_str else 'CROISE'
    obs_parts = [f"Code EasyFarm: {t['code_id']}"]
    if t.get('observations'):
        obs_parts.append(t['observations'])
    if t['statut'] == 'À surveiller':
        obs_parts.append("Motif: fertilité (user)")
    obs = ' | '.join(obs_parts)
    
    query = f"""
    INSERT INTO animaux (ferme_id, tag, nom, sexe, categorie, stade, race_id, race_code, batiment_id, statut, destination, date_entree, observations)
    VALUES (
      {esc(FERME_ID)}, 
      {esc(t['boucle_actuelle'])}, 
      {esc(t.get('nom'))}, 
      'F', 
      'truie', 
      '{stade}'::stade_porc, 
      {esc(race_id) if race_id else 'NULL'}, 
      '{race_code}'::race_porc,
      {esc(BATIMENTS[bat_phase])}, 
      '{statut}'::statut_animal, 
      'REPRODUCTION', 
      '2025-01-01', 
      {esc(obs)}
    )
    RETURNING id, tag, nom, stade
    """
    res = sql_q(query)
    if res:
        truies_inserted[t['code_id']] = res[0]['id']
        n = res[0].get('nom') or '(sans nom)'
        print(f"  + {t['code_id']:6} {t['boucle_actuelle']:8} {n:15} → {res[0]['stade']:18} [{statut}]")

# ─────────────────────────────────────────────────────────────────────
# IMPORT 10 SAILLIES EN COURS (truies pleines avec saillie tracée)
# ─────────────────────────────────────────────────────────────────────
print("\n=== Import saillies en cours ===")
n_saillies = 0
for t in DATA['truies']:
    if t.get('derniere_saillie') and t['derniere_saillie'].get('date'):
        truie_id = truies_inserted.get(t['code_id'])
        if not truie_id:
            print(f"  ! truie {t['code_id']} pas trouvée"); continue
        verrat_nom = t['derniere_saillie'].get('verrat')
        verrat_id = None
        if verrat_nom == 'Bobi':
            verrat_id = verrats_inserted.get('V01')
        elif verrat_nom == 'Aligator':
            verrat_id = verrats_inserted.get('V02')
        if not verrat_id:
            print(f"  ! verrat {verrat_nom} pas trouvé pour {t['code_id']}"); continue
        
        query = f"""
        INSERT INTO saillies (ferme_id, truie_id, verrat_id, date_saillie, methode, resultat_diag, statut, observations)
        VALUES (
          {esc(FERME_ID)},
          {esc(truie_id)},
          {esc(verrat_id)},
          {esc(t['derniere_saillie']['date'])},
          'naturelle'::methode_saillie,
          'en_attente'::resultat_diag,
          'en_cours'::statut_saillie,
          {esc('Saillie historique importée EasyFarm')}
        )
        RETURNING id
        """
        res = sql_q(query)
        if res:
            n_saillies += 1
            print(f"  + saillie {t['code_id']} × {verrat_nom} le {t['derniere_saillie']['date']}")

print(f"\n  Total saillies importées : {n_saillies}")

# ─────────────────────────────────────────────────────────────────────
# IMPORT 6 MISES BAS HISTORIQUES + PORTÉES (par trigger auto)
# ─────────────────────────────────────────────────────────────────────
print("\n=== Import mises-bas historiques + portées auto ===")
n_mb = 0
for t in DATA['truies']:
    if t.get('derniere_mise_bas') and t['derniere_mise_bas'].get('date'):
        truie_id = truies_inserted.get(t['code_id'])
        if not truie_id: continue
        mb = t['derniere_mise_bas']
        nv = mb.get('nes_vivants') or 0
        mn = mb.get('morts_nes') or 0
        query = f"""
        INSERT INTO mises_bas (ferme_id, truie_id, saillie_id, date_mb, nes_vivants, morts_nes, observations)
        VALUES (
          {esc(FERME_ID)},
          {esc(truie_id)},
          NULL,
          {esc(mb['date'])},
          {nv},
          {mn},
          {esc('Mise-bas historique importée EasyFarm | ' + (mb.get('observations') or ''))}
        )
        RETURNING id, date_mb
        """
        res = sql_q(query)
        if res:
            n_mb += 1
            print(f"  + MB {t['code_id']} le {mb['date']} ({nv} nés vivants)")

print(f"\n  Total mises-bas importées : {n_mb}")

# Portées auto-créées par trigger
res_portees = sql_q("SELECT count(*) AS nb FROM portees WHERE ferme_id = " + esc(FERME_ID))
print(f"  Portées créées par trigger : {res_portees[0]['nb']}")

# ─────────────────────────────────────────────────────────────────────
# RÉCAP FINAL
# ─────────────────────────────────────────────────────────────────────
print("\n=== RÉCAP PHASE 4 ===")
recap = sql_q(f"""
SELECT 
  (SELECT count(*) FROM animaux WHERE ferme_id={esc(FERME_ID)} AND categorie='truie') AS truies,
  (SELECT count(*) FROM animaux WHERE ferme_id={esc(FERME_ID)} AND categorie='verrat') AS verrats,
  (SELECT count(*) FROM saillies WHERE ferme_id={esc(FERME_ID)}) AS saillies,
  (SELECT count(*) FROM mises_bas WHERE ferme_id={esc(FERME_ID)}) AS mises_bas,
  (SELECT count(*) FROM portees WHERE ferme_id={esc(FERME_ID)}) AS portees,
  (SELECT count(*) FROM batiments WHERE ferme_id={esc(FERME_ID)}) AS batiments,
  (SELECT count(*) FROM evenements_prevus WHERE ferme_id={esc(FERME_ID)}) AS events_prevus
""")
print(json.dumps(recap[0], indent=2))
print("\n✅ Phase 4 terminée")
