# D — Notes Structurées (Sprint 1 — Lot D)

**Auteur :** Hermes (sous-agent audit)
**Date :** 2026-05-22
**Mission parent :** User a banni l'assistant LLM (coût). Solution = templates structurés terrain saisissables en 2 taps + champ libre optionnel court.

---

## 1. Diagnostic actuel

### 1.1 Inventaire des champs « text libre »

Query exécutée :
```sql
SELECT c.table_name, c.column_name, c.data_type
FROM information_schema.columns c
JOIN information_schema.tables t ON t.table_name=c.table_name AND t.table_schema=c.table_schema
WHERE c.table_schema='public'
  AND t.table_type='BASE TABLE'
  AND (c.column_name LIKE '%observ%' OR c.column_name LIKE '%note%')
  AND c.data_type IN ('text','character varying')
ORDER BY c.table_name;
```

Résultat : **27 champs `text` libre** sur 25 tables (le brief parlait de 21 — chiffre approximatif, la liste exhaustive ci-dessous remplace).

| # | Table | Colonne | Catégorie usage dominante |
|---|---|---|---|
| 1 | animaux | observations | Comportement / Santé visuelle |
| 2 | bandes | observations | Environnement / Conduite |
| 3 | biosecurite_audits | observations | Environnement / Biosécurité |
| 4 | checks_post_mb | observations | Santé visuelle (porcelets J1+) |
| 5 | commandes | observations | Logistique (hors scope terrain) |
| 6 | consommations_aliment | observations | Alimentation |
| 7 | consommations_eau | observations | Alimentation (eau) |
| 8 | departs | observations | Autre (sortie cheptel) |
| 9 | diagnostics_gestation | observations | Reproduction |
| 10 | evenements_prevus | notes | Autre (planification) |
| 11 | lots_matieres_premieres | observations | Alimentation (qualité MP) |
| 12 | matieres_premieres | observations | Alimentation (référentiel) |
| 13 | matieres_premieres | notes_terrain | Alimentation (référentiel) |
| 14 | mises_bas | observations | Reproduction / Santé visuelle |
| 15 | mortalites | observations | Santé visuelle / Pertes |
| 16 | mouvements_stock | observations | Logistique |
| 17 | observations_bcs | notes | Reproduction (BCS) |
| 18 | pesees | observations | Croissance / Comportement |
| 19 | ppa_observations | observations | Santé visuelle (PPA) |
| 20 | protocoles_anti_mycotoxines | observations | Alimentation (référentiel) |
| 21 | saillies | observations | Reproduction |
| 22 | sevrages | observations | Reproduction / Santé visuelle |
| 23 | traitements | observations | Santé visuelle |
| 24 | transits_phase | observations | Environnement (mouvement bâtiment) |
| 25 | types_aliment | observations | Alimentation (référentiel) |
| 26 | vaccinations | observations | Santé visuelle |
| 27 | visites_biosecurite | observations | Environnement / Biosécurité |

> **À périmètre Sprint 1 / saisie terrain :** on cible les **21 tables événementielles** (on exclut les 6 « référentiels » : `commandes`, `matieres_premieres.observations`, `matieres_premieres.notes_terrain`, `protocoles_anti_mycotoxines`, `types_aliment`, `mouvements_stock` — pas de saisie depuis le smartphone éleveur). Le brief « 21 » colle exactement.

### 1.2 État des données actuelles

```sql
animaux      : 17 lignes, 12 observations remplies — toutes = "Seed démo IFIP"
saillies     :  3 lignes,  0 observations
mises_bas    :  2 lignes,  0 observations
sevrages     :  0 lignes
traitements  :  1 ligne ,  1 observation = "Acte porcelets — mise-bas …"
mortalites   :  0 lignes
pesees       : 144 lignes, 144 observations = "Seed IFIP"
vaccinations :  2 lignes,  2 observations  = "Acte porcelets — mise-bas …"
```

**Conclusion** : la base réelle de données utilisateur est ≈ **0 observation rédigée par un humain**. Backfill historique = trivial (tagger toutes les seeds en `categorie='seed_systeme'`).

### 1.3 Risques du modèle actuel

- ❌ **Non searchable** : impossible de filtrer « toutes les truies agitées avant chaleurs » sans full-text scan.
- ❌ **Non agrégeable KPI** : impossible de calculer « % mises bas avec mamelle congestionnée » → aucun signal exploitable pour règle d'alerte.
- ❌ **UX mobile pénible** : taper sur clavier Android dans porcherie (poussière, gants, vitesse) = friction → champ reste vide ou "ok".
- ❌ **Pas de réutilisation** : éleveur retape la même note 30 fois par mois (« refus saillie verrat »).
- ❌ **Pas d'i18n** : un audit FR/EN du vocab terrain est impossible.
- ✅ Seul atout : flexibilité totale → à conserver via champ libre **complémentaire**, pas principal.

---

## 2. Architecture proposée — Option B (polymorphique)

### 2.1 Décision

| | Option A : enum + text libre | **Option B : table polymorphique** ✅ |
|---|---|---|
| Multi-notes par event | ❌ | ✅ |
| Historique éditions | ❌ (UPDATE écrase) | ✅ (INSERT append) |
| Templates versionnables | ❌ | ✅ (FK vers `notes_templates`) |
| Recherche / agrégat | partiel | natif (catégorie + template_id indexés) |
| Coût migration | bas | moyen (table + RLS) |
| Coût UI | bas | moyen (1 composant réutilisable) |

→ **Option B retenue**. L'investissement RLS + composant est payé une seule fois et sert les 21 tables.

### 2.2 Schéma SQL (migration `20260524000000_notes_terrain.sql`)

```sql
-- =========================================================
-- Lot D — Notes terrain structurées (Sprint 1)
-- Migration NON EXÉCUTÉE — à valider par orchestrateur
-- =========================================================
BEGIN;

-- 1. Référentiel des catégories (figé — pas de table SQL, enum suffit)
CREATE TYPE note_categorie AS ENUM (
  'comportement',
  'sante_visuelle',
  'reproduction',
  'alimentation',
  'environnement',
  'autre'
);

-- 2. Référentiel des templates (versionnable)
CREATE TABLE notes_templates (
  id            text PRIMARY KEY,              -- ex. 'T-COMP-01'
  categorie     note_categorie NOT NULL,
  libelle       text NOT NULL,                 -- ex. 'Truie agitée — chaleurs probables'
  contexte      text[] DEFAULT '{}',           -- tables où ce template est pertinent
  gravite_hint  text CHECK (gravite_hint IN ('info','attention','urgent')) DEFAULT 'info',
  actif         boolean NOT NULL DEFAULT true,
  ordre         smallint NOT NULL DEFAULT 100,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notes_templates_cat ON notes_templates(categorie) WHERE actif;

-- 3. Table polymorphique des notes terrain
CREATE TABLE notes_terrain (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ferme_id      uuid NOT NULL REFERENCES fermes(id) ON DELETE CASCADE,
  entity_type   text NOT NULL,                 -- 'animal','saillie','mise_bas','sevrage', etc.
  entity_id     uuid NOT NULL,                 -- FK logique (pas physique : polymorphe)
  categorie     note_categorie NOT NULL,
  template_id   text REFERENCES notes_templates(id),  -- nullable si 100% libre
  note_libre    text,                          -- complément optionnel court (≤280c)
  auteur_id     uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_entity_type CHECK (entity_type IN (
    'animal','bande','saillie','mise_bas','sevrage','diagnostic_gestation',
    'check_post_mb','pesee','vaccination','traitement','mortalite',
    'consommation_aliment','consommation_eau','depart','transit_phase',
    'biosecurite_audit','visite_biosecurite','ppa_observation',
    'observation_bcs','lot_matiere_premiere','evenement_prevu'
  )),
  CONSTRAINT chk_note_libre_len CHECK (note_libre IS NULL OR length(note_libre) <= 280),
  CONSTRAINT chk_au_moins_un CHECK (template_id IS NOT NULL OR note_libre IS NOT NULL)
);

CREATE INDEX idx_notes_terrain_entity     ON notes_terrain(entity_type, entity_id);
CREATE INDEX idx_notes_terrain_ferme_date ON notes_terrain(ferme_id, created_at DESC);
CREATE INDEX idx_notes_terrain_categorie  ON notes_terrain(ferme_id, categorie, created_at DESC);
CREATE INDEX idx_notes_terrain_template   ON notes_terrain(template_id) WHERE template_id IS NOT NULL;

-- 4. RLS conforme conventions SmartFarm
ALTER TABLE notes_terrain     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes_templates   ENABLE ROW LEVEL SECURITY;

CREATE POLICY notes_terrain_select ON notes_terrain FOR SELECT
  USING (ferme_id = current_farm_id() OR user_has_farm_access(ferme_id));
CREATE POLICY notes_terrain_insert ON notes_terrain FOR INSERT
  WITH CHECK (ferme_id = current_farm_id());
CREATE POLICY notes_terrain_update ON notes_terrain FOR UPDATE
  USING (ferme_id = current_farm_id())
  WITH CHECK (ferme_id = current_farm_id());
CREATE POLICY notes_terrain_delete ON notes_terrain FOR DELETE
  USING (ferme_id = current_farm_id());

-- Templates lisibles par tous les authentifiés (catalogue partagé)
CREATE POLICY notes_templates_select ON notes_templates FOR SELECT
  TO authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON notes_terrain   TO authenticated;
GRANT SELECT                          ON notes_templates TO authenticated;

-- 5. Vue confort : dernière note par entité
CREATE OR REPLACE VIEW v_notes_dernieres WITH (security_invoker=true) AS
SELECT DISTINCT ON (n.entity_type, n.entity_id)
  n.entity_type, n.entity_id, n.ferme_id, n.categorie,
  COALESCE(t.libelle, n.note_libre) AS resume,
  n.created_at
FROM notes_terrain n
LEFT JOIN notes_templates t ON t.id = n.template_id
ORDER BY n.entity_type, n.entity_id, n.created_at DESC;
GRANT SELECT ON v_notes_dernieres TO anon, authenticated;

COMMIT;
```

### 2.3 Plan de backfill (zéro perte)

Migration séparée `20260524000100_notes_terrain_backfill.sql` :

```sql
BEGIN;
-- Pour chaque table : on insère 1 note si observations non vide et non "seed"
INSERT INTO notes_terrain (ferme_id, entity_type, entity_id, categorie, note_libre, created_at)
SELECT a.ferme_id, 'animal', a.id, 'autre', a.observations, a.created_at
FROM animaux a
WHERE a.observations IS NOT NULL
  AND length(trim(a.observations)) > 0
  AND a.observations NOT ILIKE 'seed%';

-- Idem pour les 20 autres tables (saillies, mises_bas, …)
-- Truncation à 280c via substring(... for 280) si nécessaire.

COMMIT;
```

**Décision « zéro perte »** :
1. ✅ La migration **n'efface pas** les colonnes `observations` originales.
2. ✅ Conservation **30 jours minimum** (rollback possible : `DROP TABLE notes_terrain` et tout repart).
3. ✅ UI ajoute le nouveau composant **à côté** du Textarea existant, pas en remplacement immédiat.
4. ✅ Après J+30 sans incident → migration `…_drop_observations_legacy.sql` retire les colonnes une à une.

---

## 3. Catégories + Templates (56 templates)

Vocabulaire FR pro zootechnique (charte CONTEXT.md : « Cochette, Reproduction, Mises bas, Sanitaire, Stock. PAS folklo CI »).

### 3.1 Comportement (10)

| ID | Libellé | Contexte tables |
|---|---|---|
| T-COMP-01 | Truie agitée — chaleurs probables | animal, saillie |
| T-COMP-02 | Refus saillie — verrat agressif | saillie |
| T-COMP-03 | Verrat hésitant — libido faible | saillie |
| T-COMP-04 | Truie chevauche ses congénères | animal |
| T-COMP-05 | Animal apathique — prostré | animal, mortalite, traitement |
| T-COMP-06 | Animal isolé du groupe | animal |
| T-COMP-07 | Cannibalisme — morsure de queue | animal, mortalite |
| T-COMP-08 | Truie écrase ses porcelets | mise_bas, mortalite |
| T-COMP-09 | Truie refuse l'allaitement | mise_bas, sevrage |
| T-COMP-10 | Agressivité au sevrage | sevrage |

### 3.2 Santé visuelle (15)

| ID | Libellé | Contexte tables |
|---|---|---|
| T-SANTE-01 | Mamelle congestionnée post mise-bas | mise_bas, check_post_mb |
| T-SANTE-02 | Mammite — quartier dur et chaud | mise_bas, traitement |
| T-SANTE-03 | Écoulement vulvaire purulent | animal, diagnostic_gestation, traitement |
| T-SANTE-04 | Boiterie — antérieur droit | animal, traitement |
| T-SANTE-05 | Boiterie — postérieur gauche | animal, traitement |
| T-SANTE-06 | Toux sèche persistante | animal, traitement, ppa_observation |
| T-SANTE-07 | Diarrhée jaune verdâtre | animal, traitement, mortalite |
| T-SANTE-08 | Diarrhée hémorragique | animal, ppa_observation, mortalite |
| T-SANTE-09 | Vomissements répétés | animal, traitement |
| T-SANTE-10 | Hyperthermie palpée (chaude au toucher) | animal, traitement, ppa_observation |
| T-SANTE-11 | Cyanose oreilles / extrémités | animal, ppa_observation |
| T-SANTE-12 | Pétéchies cutanées (taches rouges) | animal, ppa_observation, mortalite |
| T-SANTE-13 | Hernie ombilicale visible | animal |
| T-SANTE-14 | Plaie / abcès en cours de cicatrisation | animal, traitement |
| T-SANTE-15 | Aucune anomalie clinique observée | animal, check_post_mb, vaccination |

### 3.3 Reproduction (12)

| ID | Libellé | Contexte tables |
|---|---|---|
| T-REPRO-01 | Chaleurs nettes — réflexe d'immobilisation | animal, saillie |
| T-REPRO-02 | Chaleurs douteuses — à représenter | saillie, diagnostic_gestation |
| T-REPRO-03 | Saillie réussie au premier passage | saillie |
| T-REPRO-04 | Double saillie effectuée (J0 + J1) | saillie |
| T-REPRO-05 | Retour en chaleurs à 21 jours | saillie, diagnostic_gestation |
| T-REPRO-06 | Diagnostic gestation positif (échographe) | diagnostic_gestation |
| T-REPRO-07 | Diagnostic gestation négatif (vide) | diagnostic_gestation |
| T-REPRO-08 | Avortement précoce constaté | diagnostic_gestation, mortalite |
| T-REPRO-09 | Mise-bas spontanée sans assistance | mise_bas |
| T-REPRO-10 | Mise-bas dystocique — intervention manuelle | mise_bas |
| T-REPRO-11 | Mort-nés présents — anoxie probable | mise_bas, mortalite |
| T-REPRO-12 | Cochette à réformer — infertile 2 cycles | animal, depart |

### 3.4 Alimentation (8)

| ID | Libellé | Contexte tables |
|---|---|---|
| T-ALIM-01 | Refus aliment — appétit nul | consommation_aliment, animal |
| T-ALIM-02 | Consommation excessive — gaspillage trémie | consommation_aliment |
| T-ALIM-03 | Aliment grumeleux / humide | consommation_aliment, lot_matiere_premiere |
| T-ALIM-04 | Présence moisissure sur aliment | consommation_aliment, lot_matiere_premiere |
| T-ALIM-05 | Eau trouble / contaminée | consommation_eau |
| T-ALIM-06 | Abreuvoir bouché — débit insuffisant | consommation_eau, biosecurite_audit |
| T-ALIM-07 | Transition aliment effectuée (stade suivant) | transit_phase, consommation_aliment |
| T-ALIM-08 | Aliment changé — réaction digestive | consommation_aliment, animal |

### 3.5 Environnement (8)

| ID | Libellé | Contexte tables |
|---|---|---|
| T-ENV-01 | Chaleur excessive — animaux haletants | bande, animal, biosecurite_audit |
| T-ENV-02 | Litière souillée — à renouveler | biosecurite_audit, visite_biosecurite |
| T-ENV-03 | Ventilation insuffisante — odeur ammoniac | biosecurite_audit, bande |
| T-ENV-04 | Densité excessive dans la case | transit_phase, bande |
| T-ENV-05 | Sol glissant — risque chute | biosecurite_audit |
| T-ENV-06 | Clôture / portillon endommagé | biosecurite_audit, visite_biosecurite |
| T-ENV-07 | Présence rongeurs / oiseaux observée | biosecurite_audit, ppa_observation |
| T-ENV-08 | Pédiluve sec / inactif | biosecurite_audit, visite_biosecurite |

### 3.6 Autre (3)

| ID | Libellé | Contexte tables |
|---|---|---|
| T-AUTRE-01 | À surveiller — recontrôler dans 24h | toutes |
| T-AUTRE-02 | Visite vétérinaire programmée | toutes |
| T-AUTRE-03 | Photo prise (référence externe) | toutes |

**Total : 56 templates** couvrant les 6 catégories. Versionnable via `notes_templates.actif=false` + `ordre`.

### 3.7 Seed SQL (extrait, migration `20260524000200_notes_templates_seed.sql`)

```sql
INSERT INTO notes_templates (id, categorie, libelle, contexte, gravite_hint, ordre) VALUES
('T-COMP-01','comportement','Truie agitée — chaleurs probables',ARRAY['animal','saillie'],'info',10),
('T-COMP-02','comportement','Refus saillie — verrat agressif',ARRAY['saillie'],'attention',20),
-- … (54 autres lignes)
('T-AUTRE-03','autre','Photo prise (référence externe)',ARRAY['*'],'info',999);
```

---

## 4. UI Dialog proposée

### 4.1 Composant réutilisable `<NoteTerrainDialog />`

Emplacement proposé : `src/components/notes/note-terrain-dialog.tsx`

```tsx
'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ajouterNoteTerrain } from '@/app/actions/notes-terrain'

const CATEGORIES = [
  { id: 'comportement',    label: 'Comportement',    icon: '🐗' },
  { id: 'sante_visuelle',  label: 'Santé visuelle',  icon: '🩺' },
  { id: 'reproduction',    label: 'Reproduction',    icon: '♀️' },
  { id: 'alimentation',    label: 'Alimentation',    icon: '🌾' },
  { id: 'environnement',   label: 'Environnement',   icon: '🏚' },
  { id: 'autre',           label: 'Autre',           icon: '📝' },
] as const

type Props = {
  entityType: string
  entityId: string
  templates: Array<{ id: string; categorie: string; libelle: string }>
  open: boolean
  onOpenChange: (o: boolean) => void
}

export function NoteTerrainDialog({ entityType, entityId, templates, open, onOpenChange }: Props) {
  const [categorie, setCategorie] = useState<string>('comportement')
  const [templateId, setTemplateId] = useState<string>('')
  const [noteLibre, setNoteLibre] = useState<string>('')

  const templatesVisibles = templates.filter(t => t.categorie === categorie)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="uppercase tracking-wide">Ajouter une note terrain</DialogTitle>
        </DialogHeader>

        <form action={ajouterNoteTerrain} className="space-y-4">
          <input type="hidden" name="entity_type" value={entityType} />
          <input type="hidden" name="entity_id" value={entityId} />

          {/* Étape 1 — Catégorie (radio-group icônes) */}
          <div>
            <Label className="text-xs uppercase tracking-wider">1. Catégorie</Label>
            <RadioGroup
              name="categorie"
              value={categorie}
              onValueChange={(v) => { setCategorie(v); setTemplateId('') }}
              className="grid grid-cols-3 gap-2 mt-2"
            >
              {CATEGORIES.map(c => (
                <label
                  key={c.id}
                  className={`flex flex-col items-center justify-center min-h-14 border-2 cursor-pointer
                    ${categorie === c.id ? 'border-[var(--sf-primary)] bg-[var(--sf-surface-2)]' : 'border-[var(--sf-line)]'}`}
                >
                  <RadioGroupItem value={c.id} className="sr-only" />
                  <span className="text-xl">{c.icon}</span>
                  <span className="text-[11px] uppercase tracking-wide mt-1">{c.label}</span>
                </label>
              ))}
            </RadioGroup>
          </div>

          {/* Étape 2 — Template (select) */}
          <div>
            <Label htmlFor="template_id" className="text-xs uppercase tracking-wider">
              2. Note prédéfinie {templatesVisibles.length === 0 && '(aucune disponible)'}
            </Label>
            <Select name="template_id" value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger className="min-h-14"><SelectValue placeholder="Choisir une formule…" /></SelectTrigger>
              <SelectContent>
                {templatesVisibles.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.libelle}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Étape 3 — Complément libre (optionnel) */}
          <div>
            <Label htmlFor="note_libre" className="text-xs uppercase tracking-wider">
              3. Précision (optionnel, 280 caractères max)
            </Label>
            <Textarea
              id="note_libre"
              name="note_libre"
              rows={2}
              maxLength={280}
              value={noteLibre}
              onChange={(e) => setNoteLibre(e.target.value)}
              placeholder="Détail spécifique…"
            />
            <div className="text-[10px] text-right opacity-60">{noteLibre.length}/280</div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button
              type="submit"
              disabled={!templateId && noteLibre.trim().length === 0}
              className="min-h-14 uppercase tracking-[0.08em]"
            >
              Enregistrer la note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
```

### 4.2 Server Action associée

`src/app/actions/notes-terrain.ts` :

```ts
'use server'
import { createSupabaseServer } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function ajouterNoteTerrain(formData: FormData) {
  const supabase = await createSupabaseServer()
  const entity_type = String(formData.get('entity_type') ?? '')
  const entity_id   = String(formData.get('entity_id') ?? '')
  const categorie   = String(formData.get('categorie') ?? '')
  const template_id = String(formData.get('template_id') ?? '') || null
  const note_libre  = String(formData.get('note_libre') ?? '').trim() || null

  if (!entity_type || !entity_id || !categorie) return { ok: false, error: 'champs requis manquants' }
  if (!template_id && !note_libre) return { ok: false, error: 'au moins un template ou note libre' }

  const { error } = await supabase.from('notes_terrain').insert({
    entity_type, entity_id, categorie, template_id, note_libre,
  })
  if (error) return { ok: false, error: error.message }

  revalidatePath('/cheptel')
  revalidatePath(`/cheptel/${entity_id}`)
  return { ok: true }
}
```

### 4.3 Intégration dans dialogs existants

Dans chacun des 21 dialogs concernés (`_dialog-faire-monter.tsx`, `_dialog-elle-a-fait.tsx`, etc.), **remplacer** :

```tsx
<Label htmlFor="observations">Observations</Label>
<Textarea id="observations" rows={2} {...register('observations')} />
```

**par** un bouton qui ouvre `<NoteTerrainDialog />` une fois l'entité créée :

```tsx
<Button type="button" variant="outline" onClick={() => setOpenNoteDialog(true)}>
  + Ajouter une note terrain
</Button>
{createdId && (
  <NoteTerrainDialog
    entityType="saillie" entityId={createdId}
    templates={templates} open={openNoteDialog} onOpenChange={setOpenNoteDialog}
  />
)}
```

→ La note est créée **après** l'événement (cohérent : multi-notes possibles, peut être ajoutée plus tard via vue détail).

### 4.4 Mode dégradé (phase transitoire)

Pendant les 30 jours de migration : conserver le Textarea original **caché derrière un `<details>`** intitulé « ✏️ Note libre legacy » → migration UX douce, pas de régression brutale.

---

## 5. Plan migration (zéro perte, 4 étapes)

| Étape | Action | Quand | Risque |
|---|---|---|---|
| 1 | Migration `20260524000000_notes_terrain.sql` (CREATE TABLE + RLS + enum) | J0 | nul (tables nouvelles) |
| 2 | Migration `20260524000200_notes_templates_seed.sql` (56 templates) | J0 | nul (INSERT seul) |
| 3 | Migration `20260524000100_notes_terrain_backfill.sql` (INSERT depuis `observations` non-seed) | J0+1h | nul (lecture-seule sur legacy) |
| 4 | Déploiement UI `<NoteTerrainDialog />` + intégration 21 dialogs | J0 → J+7 | bas (additif) |
| 5 | Période d'observation 30 jours | J+7 → J+37 | — |
| 6 | Migration `20260623000000_drop_observations_legacy.sql` (`ALTER TABLE ... DROP COLUMN observations`) | J+37 | élevé → exiger validation Christophe |

---

## 6. KPI / Bénéfices attendus

- **Saisie 2 taps** au lieu de 30 caractères tapés sur clavier mobile → temps moyen par note divisé par ≈5.
- **Searchable** : `SELECT * FROM notes_terrain WHERE template_id='T-SANTE-08' AND created_at > now()-interval '7 days'` → permet création **règle R29 « Diarrhée hémorragique multi-cas »**.
- **Aucune dépendance LLM** → coût marginal nul.
- **Données structurées** → futur dashboard « top 10 motifs de note » par ferme.

---

## 7. Decisions to escalate

1. **Périmètre exact des 21 tables** : confirmer qu'on **exclut bien** `commandes`, `mouvements_stock`, `types_aliment`, `protocoles_anti_mycotoxines`, `matieres_premieres` (×2 colonnes). Si Christophe veut les inclure → +5 entity_types dans le CHECK constraint.
2. **Suppression des colonnes `observations` legacy** : à valider après J+30 — risque sur intégrations externes (export CSV ?) à auditer.
3. **`gravite_hint` du template** : doit-il **alimenter automatiquement** une alerte (créer ligne dans `v_alertes_actives` si `gravite_hint='urgent'`) ? → règle R29 à concevoir si oui.
4. **Multi-tag** : un même fait terrain peut-il relever de 2 catégories (ex. « truie écrase ses porcelets » = comportement **et** reproduction) ? → V1 : non, single-categorie ; V2 : table `notes_terrain_tags` si besoin.
5. **Photo jointe** (T-AUTRE-03) : où stocke-t-on l'URL ? Ajouter `photo_url text` dans `notes_terrain` dès V1, ou attendre Sprint 2 ?
6. **Auteur** : doit-on retenir aussi le **rôle** (éleveur / vétérinaire / technicien) au-delà de `auth.users(id)` ? → facilitera filtres futurs.
7. **i18n templates** : `libelle` est FR-only. Si EN/Dyula attendus → ajouter `libelle_translations jsonb`.

---

## 8. Annexe — Stats actuelles (référence)

```
Tables événementielles ciblées : 21
Tables exclues (référentiels)  :  6
Colonnes texte libre totales   : 27
Templates proposés             : 56
Catégories                     :  6 (enum figé)
Migrations à créer             :  3 (+ 1 future J+37)
Composants UI nouveaux         :  1 (réutilisable)
Server Actions nouvelles       :  1
Dialogs à modifier             : 21
```

**Fin du livrable D — Notes Structurées.**
