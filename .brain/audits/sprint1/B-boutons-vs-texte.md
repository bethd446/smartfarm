# B — Boutons vs Texte

> **Audit Sprint 1 Lot B** — Smart Farm · Doctrine éleveur 20 ans = 1-tap whenever possible.
> Lecture seule, aucun code modifié. Recense **tous** les `<Input>` / `<Textarea>` / champs FormData text-libre dans `/app/src/app/(app)/`.

---

## Verdict général

| Métrique | Valeur |
|---|---|
| Fichiers contenant des champs texte | 28 |
| Champs texte libre recensés | **42** (hors `<input type="date">`, `type="number"`, `type="hidden"`) |
| Verdict **GARDER TEXTE LIBRE** | 14 (33 %) |
| Verdict **CONVERTIR EN PICKER** | 19 (45 %) |
| Verdict **CONVERTIR EN BOUTON / QUICK-ACTION** | 9 (22 %) |
| Excellents patterns existants | BCS truie 1-tap (faire-monter, elle-a-fait, enlever-petits, cheptel/[id]) — **à généraliser** |

⚠️ Constat fort : **toutes les `Textarea` "Observations"** (10 occurrences) sont des champs texte libre rarement remplis sur le terrain. → Patron unique : `<QuickNotes>` avec **chips presets + textarea optionnel** (cf. Quick Actions plus bas).

---

## Recensement complet

| Fichier | Composant / Section | Type actuel | Champ (`name`) | Verdict | Composant cible |
|---|---|---|---|---|---|
| `cheptel/_dialog-nouvel-animal.tsx` L139 | Nouvel animal | `<Input>` | `tag` | **GARDER** | Input + `<BarcodeScanner>` (toggle déjà dispo) |
| `cheptel/_dialog-nouvel-animal.tsx` L148 | Nouvel animal | `<Input>` | `nom` (surnom) | **GARDER** | Input (optionnel, libre par nature) |
| `cheptel/_dialog-nouvel-animal.tsx` L267 | Nouvel animal | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` chips + textarea repliable |
| `cheptel/[id]/page.tsx` L531-545 | Fiche animal → BCS rapide | ✅ **Boutons 1-tap** | `bcs` (1.0→5.0 step 0.5) | **DÉJÀ OK** | — (référence d'or à réutiliser) |
| `reproduction/_dialog-faire-monter.tsx` L168 | Nouvelle saillie | `<Input type="date">` | `date_saillie` | **GARDER** | Input date + bouton "Aujourd'hui" |
| `reproduction/_dialog-faire-monter.tsx` L214-251 | Nouvelle saillie → BCS | ✅ **Boutons radio 1-tap** | `bcs_truie` | **DÉJÀ OK** | — |
| `reproduction/_dialog-faire-monter.tsx` L264 | Nouvelle saillie | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` (chips: "Saillie OK", "Verrat réactif", "Truie calme") |
| `reproduction/_dialog-diagnostic.tsx` L199-246 | Diagnostic gestation → résultat | ✅ **Boutons tuiles** | `resultat` (positif/négatif/retour) | **DÉJÀ OK** | — |
| `reproduction/_dialog-diagnostic.tsx` L298-302 | Diagnostic gestation | `<Input>` | `methode` (placeholder "échographie, observation…") | **CONVERTIR PICKER** | `<Select>` Échographie · Palpation · Observation chaleur · Autre |
| `reproduction/_dialog-diagnostic.tsx` L307 | Diagnostic gestation | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` (chips: "Embryons visibles", "Doute", "Refaire à J45") |
| `mises-bas/_dialog-elle-a-fait.tsx` L404-440 | Mise bas → BCS | ✅ **Boutons radio 1-tap** | `bcs_truie` | **DÉJÀ OK** | — |
| `mises-bas/_dialog-elle-a-fait.tsx` L453 | Mise bas | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` (chips: "MB facile", "MB longue", "Truie épuisée", "Aide manuelle") |
| `mises-bas/_dialog-enlever-petits.tsx` L226-265 | Sevrage → BCS | ✅ **Boutons radio 1-tap** | `bcs_truie` | **DÉJÀ OK** | — |
| `mises-bas/_dialog-enlever-petits.tsx` L278 | Sevrage | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` (chips: "Sevrage OK", "Truie maigre", "Quelques chétifs") |
| `mises-bas/check-j1/page.tsx` L317-323 | Check J1 portée | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` (chips: "Tout OK", "Truie sans lait", "Porcelet faible", "Diarrhée") |
| `pesees/_dialog-peser.tsx` L267-272 | Nouvelle pesée | `<Textarea>` | `observations` | **GARDER** | Textarea repliable (rare, contextuel) |
| `sanitaire/_dialogs-sanitaire.tsx` L294 | Vaccination | `<Input>` | `produit` ("Ex. Suvaxyn PRRS MLV") | **CONVERTIR PICKER** | `<Combobox>` sur table `protocoles` (vaccins seedés) + bouton "Nouveau vaccin" |
| `sanitaire/_dialogs-sanitaire.tsx` L301 | Vaccination | `<Input>` | `lot` | **GARDER** | Input (N° lot lu sur flacon, libre) |
| `sanitaire/_dialogs-sanitaire.tsx` L305 | Vaccination | `<Input>` | `veterinaire` | **CONVERTIR PICKER** | `<Combobox>` sur table `intervenants` (mémorisé entre sessions) |
| `sanitaire/_dialogs-sanitaire.tsx` L311 | Vaccination | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` (chips: "Bien toléré", "Réaction locale", "Lot fin", "Reste à finir") |
| `sanitaire/_dialogs-sanitaire.tsx` L458 | Soin / traitement | `<Input>` | `motif` ("Ex. Diarrhée néonatale") | **CONVERTIR PICKER** | `<Combobox>` motifs fréquents (Diarrhée, Boiterie, Toux, Anorexie, Plaie, Mammite, Métrite, Anémie, Préventif) + saisie libre |
| `sanitaire/_dialogs-sanitaire.tsx` L465 | Soin / traitement | `<Input>` | `produit` | **CONVERTIR PICKER** | `<Combobox>` sur `protocoles` (antibios/AINS seedés) |
| `sanitaire/_dialogs-sanitaire.tsx` L490 | Soin / traitement | `<Input>` | `posologie` ("Ex. 1 ml/10 kg") | **GARDER** | Input (variable selon poids animal — calcul terrain) |
| `sanitaire/_dialogs-sanitaire.tsx` L494 | Soin / traitement | `<Input>` | `veterinaire` | **CONVERTIR PICKER** | `<Combobox>` intervenants |
| `sanitaire/_dialogs-sanitaire.tsx` L512 | Soin / traitement | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` (chips: "Amélioration", "Récidive", "Arrêté pour DLU", "À revoir J+3") |
| `sanitaire/_dialogs-sanitaire.tsx` L652 | Nouvelle perte | `<Input>` | `cause` ("Ex. Maladie, écrasement…") | **CONVERTIR BOUTONS** | `<RadioGroup>` 6 tuiles : 🤒 Maladie · 💢 Écrasement · ⚡ Accident · 🌡️ Stress thermique · 🤰 Mort-né · ❓ Inconnue |
| `sanitaire/_dialogs-sanitaire.tsx` L658 | Nouvelle perte | `<Input>` | `diagnostic` | **GARDER** | Input (suspicion clinique = contexte spécifique) |
| `sanitaire/_dialogs-sanitaire.tsx` L673 | Nouvelle perte | `<Textarea>` | `observations` | **CONVERTIR** | `<QuickNotes>` (chips: "Trouvé matin", "Sevrage tardif", "Bcs très bas") |
| `sanitaire/biosecurite/_dialog-visite.tsx` L175 | Visite biosécurité | `<Input>` | `nom_visiteur` | **CONVERTIR PICKER** | `<Combobox>` visiteurs récurrents + saisie libre |
| `sanitaire/biosecurite/_dialog-visite.tsx` L183 | Visite biosécurité | `<Input>` | `societe` | **CONVERTIR PICKER** | `<Combobox>` sociétés récurrentes |
| `sanitaire/biosecurite/_dialog-visite.tsx` L258 | Visite biosécurité | `<Textarea>` | observations | **CONVERTIR** | `<QuickNotes>` (chips: "RAS", "Refus douche", "Tenue oubliée") |
| `sanitaire/eau/_dialog-eau.tsx` L224 | Relevé eau | `<Textarea>` | observations | **GARDER** | Textarea (rare) |
| `sanitaire/ppa/_dialog-observation.tsx` L207-213 | Observation PPA | `<Input type="text">` | `reference_declaration` | **GARDER** | Input (N° dossier DSV = libre obligatoire) |
| `sanitaire/ppa/_dialog-observation.tsx` L253-260 | Observation PPA | `<Textarea>` | `observations` (placeholder long) | **GARDER** | Textarea (contexte épidémio précis = légitime) |
| `sanitaire/mycotoxines/_dialog-lot.tsx` L202-206 | Lot matière myco | `<Input>` | `origine` ("Ex. Marché Bouaké, Coop ABC") | **CONVERTIR PICKER** | `<Combobox>` fournisseurs/origines fréquents |
| `sanitaire/mycotoxines/_dialog-lot.tsx` L271-278 | Lot matière myco | `<Textarea>` | observations | **GARDER** | Textarea (analyses labo, contexte technique) |
| `sanitaire/protocoles/_dialog-protocole.tsx` L158-162 | Nouveau protocole | `<Input>` | `nom` | **GARDER** | Input (paramétrage admin, rare) |
| `sanitaire/protocoles/_dialog-protocole.tsx` L168-173 | Nouveau protocole | `<Textarea>` | `description` | **GARDER** | Textarea (instructions vétés, riche) |
| `stock/_dialogs-stock.tsx` L221 | Entrée stock | `<Input>` | `reference` (BL fournisseur) | **GARDER** | Input (N° bon livraison = libre) |
| `stock/_dialogs-stock.tsx` L226 | Entrée stock | `<Textarea>` | observations | **CONVERTIR** | `<QuickNotes>` (chips: "Sacs OK", "Sacs déchirés", "Humidité", "Retard livraison") |
| `stock/_dialogs-stock.tsx` L393 | Sortie stock | `<Input>` | `reference` | **GARDER** | Input |
| `stock/_dialogs-stock.tsx` L398 | Sortie stock | `<Textarea>` | observations | **CONVERTIR** | `<QuickNotes>` |
| `stock/_dialogs-stock.tsx` L520 | Nouveau matériel | `<Input>` | `nom` ("Ex. Maïs grain") | **GARDER** | Input (admin, rare) |
| `stock/_dialogs-stock.tsx` L549 | Nouveau matériel | `<Input>` | `unite` ("kg / dose / L / sac") | **CONVERTIR PICKER** | `<Select>` kg · L · dose · sac · pièce · m³ |
| `stock/_dialogs-stock.tsx` L592 | Nouveau matériel | `<Textarea>` | observations | **GARDER** | Textarea (admin) |
| `alimentation/matieres/_dialog-matiere.tsx` L380-385 | Matière première | `<Textarea>` | `notes_terrain` | **GARDER** | Textarea (config fine, paramétrage) |
| `alimentation/consommations/_dialog-conso.tsx` L239-244 | Consommation aliment | `<Textarea>` | observations ("Notes terrain qualité, refus…") | **CONVERTIR** | `<QuickNotes>` (chips: "Tout consommé", "Refus partiel", "Refus total", "Aliment humide") |
| `bandes/[id]/_dialog-transit.tsx` L181-186 | Transit phase | `<Textarea>` | observations ("État sanitaire, hétérogénéité…") | **CONVERTIR** | `<QuickNotes>` (chips: "Lot homogène", "Hétérogène", "Quelques chétifs", "Transit OK") |
| `assistant/_components/chatbot.tsx` | Chatbot | `<input>` chat | message libre | **GARDER** | Chat conversationnel = nature texte |
| `sanitaire/maladies/_search.tsx` | Recherche maladie | `<input>` search | query | **GARDER** | Search bar |
| `conseiller/_components/search-tips.tsx` | Recherche conseil | `<input>` search | query | **GARDER** | Search bar |
| `alimentation/concentres/page.tsx` | Page concentrés | `<input>` filtre | filter | **GARDER** | Search/filter input |
| `alimentation/formulation/_calculator.tsx` | Calculateur formule | `<input>` numériques | ratios | **GARDER** | Numeric inputs (calcul) |
| `alimentation/matieres/page.tsx` | Liste matières | `<input>` search | filter | **GARDER** | Search bar |
| `sanitaire/biosecurite/page.tsx` | Audit biosec | hidden + checkbox | statut | **DÉJÀ OK** | — (déjà boutons conforme/non-conforme) |
| `sanitaire/calendrier/page.tsx` | Calendrier sanitaire | hidden inputs uniquement | mise_bas_id, acte | **N/A** | Hidden form data |

---

## Conversions P0 (gain maximal éleveur)

### P0-1 · `<QuickNotes>` — composant universel "Observations"

**Impact : 10 conversions en une fois.** Tous les `<Textarea name="observations" rows={2}>` → bouton chips presets + textarea repliable derrière "Autre…".

**AVANT** (×10 occurrences quasi-identiques) :
```tsx
<div>
  <Label htmlFor="observations">Observations</Label>
  <Textarea id="observations" rows={2} {...register('observations')} />
</div>
```

**APRÈS** (proposé) :
```tsx
// src/components/quick-notes.tsx (NOUVEAU)
<QuickNotes
  field="observations"
  register={register}
  setValue={setValue}
  value={watch('observations')}
  presets={['MB facile', 'MB longue', 'Truie épuisée', 'Aide manuelle']}
  label="Observations rapides"
/>
```

Comportement : 4-6 chips toggle (badge variant outline → default si sélectionné). Concatène en `"MB longue · Aide manuelle"`. Bouton "Autre…" déplie un `<Textarea>` pour ajout libre. Idéal gants.

**Tables impactées** : `saillies.observations`, `mises_bas.observations`, `sevrages.observations`, `diagnostics_gestation.observations`, `vaccinations.observations`, `traitements.observations`, `mortalites.observations`, `consommations_aliment.observations`, `transits_phase.observations`, `mvts_stock.observations`, `checks_post_mb.observations`, `animaux.observations` — **12 tables** alignées.

---

### P0-2 · Cause de mortalité = tuiles 1-tap

**AVANT** (`sanitaire/_dialogs-sanitaire.tsx` L650-654) :
```tsx
<div>
  <Label htmlFor="perte-cause">Cause</Label>
  <Input id="perte-cause" {...register('cause')} placeholder="Ex. Maladie, écrasement, accident…" />
  <FieldError message={errors.cause?.message} />
</div>
```

**APRÈS** :
```tsx
<div>
  <Label>Cause *</Label>
  <RadioGroup
    value={watch('cause')}
    onValueChange={(v) => setValue('cause', v, { shouldValidate: true })}
    className="grid grid-cols-3 gap-2"
  >
    {[
      { v: 'maladie',    icon: '🤒', l: 'Maladie' },
      { v: 'ecrasement', icon: '💢', l: 'Écrasement' },
      { v: 'accident',   icon: '⚡', l: 'Accident' },
      { v: 'thermique',  icon: '🌡️', l: 'Chaleur' },
      { v: 'mort_ne',    icon: '🤰', l: 'Mort-né' },
      { v: 'inconnue',   icon: '❓', l: 'Inconnue' },
    ].map(o => (
      <RadioGroupItem key={o.v} value={o.v} className="h-16 flex-col">
        <span className="text-xl">{o.icon}</span>
        <span className="text-xs">{o.l}</span>
      </RadioGroupItem>
    ))}
  </RadioGroup>
</div>
```

⚠️ Note KPI IFIP : "écrasement" = exclusion TMM (cf. `v_kpi_techniques_truie`). Cette enum normalisée corrige les variations orthographiques actuelles qui font foirer le calcul.

---

### P0-3 · Motif de soin = combobox + saisie libre

**AVANT** (`sanitaire/_dialogs-sanitaire.tsx` L457-460) :
```tsx
<Input id="soin-motif" {...register('motif')} placeholder="Ex. Diarrhée néonatale" />
```

**APRÈS** :
```tsx
<Combobox
  options={[
    'Diarrhée', 'Boiterie', 'Toux', 'Anorexie', 'Plaie',
    'Mammite', 'Métrite', 'Anémie', 'Stress thermique',
    'Préventif', 'Antiparasitaire',
  ]}
  value={watch('motif')}
  onValueChange={v => setValue('motif', v)}
  allowCustom
  placeholder="Choisir ou taper…"
/>
```

⚠️ Combobox **n'existe pas** dans `@/components/ui` actuellement. Alternatives :
- (a) Créer un `<Combobox>` (Radix Popover + Command list) — propre mais effort.
- (b) Solution rapide : `<Select>` + 11 items + une option "Autre…" qui révèle un `<Input>` conditionnel.
- (c) Bouton chips wrap (visuel "tags") + champ libre.

Recommandé : **(c)** car aligné avec le composant `<QuickNotes>` (réutilisation).

---

### P0-4 · Méthode diagnostic gestation = Select

**AVANT** (`reproduction/_dialog-diagnostic.tsx` L296-302) :
```tsx
<div>
  <Label htmlFor="methode">Méthode</Label>
  <Input id="methode" placeholder="échographie, observation…" {...register('methode')} />
</div>
```

**APRÈS** :
```tsx
<div>
  <Label>Méthode</Label>
  <Select
    value={watch('methode') || ''}
    onValueChange={v => setValue('methode', v ?? '')}
  >
    <SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="echographie">Échographie</SelectItem>
      <SelectItem value="palpation">Palpation</SelectItem>
      <SelectItem value="observation_chaleur">Observation chaleur</SelectItem>
      <SelectItem value="autre">Autre</SelectItem>
    </SelectContent>
  </Select>
</div>
```

Permet de **filtrer KPI fiabilité** par méthode (échographie = très fiable, observation = douteuse).

---

### P0-5 · Unité matière = Select fermé

**AVANT** (`stock/_dialogs-stock.tsx` L548-553) :
```tsx
<Input id="unite" {...register('unite')} placeholder="kg / dose / L / sac" />
```

**APRÈS** :
```tsx
<Select value={watch('unite') || 'kg'} onValueChange={v => setValue('unite', v ?? 'kg')}>
  <SelectTrigger><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="kg">kg</SelectItem>
    <SelectItem value="L">Litre (L)</SelectItem>
    <SelectItem value="dose">Dose</SelectItem>
    <SelectItem value="sac">Sac</SelectItem>
    <SelectItem value="piece">Pièce</SelectItem>
    <SelectItem value="m3">m³</SelectItem>
  </SelectContent>
</Select>
```

Évite "Kg", "KG", "kg ", "kilo", "kgs"… qui pourrissent les KPI IC/MCA actuels.

---

### P0-6 · Produit vaccin / traitement = picker sur table `protocoles`

**AVANT** (`sanitaire/_dialogs-sanitaire.tsx` L293-296 + L464-466) :
```tsx
<Input id="vac-produit" {...register('produit')} placeholder="Ex. Suvaxyn PRRS MLV" />
```

**APRÈS** :
```tsx
// Charge depuis Server Component : protocoles seedés (catégorie='vaccin' ou 'traitement')
<Combobox
  options={protocoles.map(p => ({ value: p.nom, label: `${p.nom} (${p.voie})` }))}
  value={watch('produit')}
  onValueChange={v => setValue('produit', v)}
  allowCustom
/>
```

Bonus : auto-pré-remplit voie + posologie si protocole choisi (already columns dans `protocoles`).

---

### P0-7 · Intervenant vétérinaire = mémorisation cross-session

**AVANT** (`sanitaire/_dialogs-sanitaire.tsx` L304-306, L493-495) :
```tsx
<Input id="vac-vet" {...register('veterinaire')} />
```

**APRÈS** :
```tsx
// Server fetch des 10 derniers veterinaires distincts depuis vaccinations + traitements
<Combobox
  options={veterinairesRecents}
  value={watch('veterinaire')}
  onValueChange={v => setValue('veterinaire', v)}
  allowCustom
  placeholder="Dr. Kouassi…"
/>
```

Évite "Dr Kouassi" vs "Dr. Kouassi" vs "kouassi" (8 variantes vues en DB potentielles).

→ **Migration suggérée (escalade)** : créer table `intervenants(id, ferme_id, nom, role, telephone)` + FK `vaccinations.intervenant_id`.

---

### P0-8 · Origine lot mycotoxines = picker fournisseurs

**AVANT** (`sanitaire/mycotoxines/_dialog-lot.tsx` L201-206) :
```tsx
<Input id="lot-origine" {...register('origine')} placeholder="Ex. Marché Bouaké, Coopérative ABC" />
```

**APRÈS** :
```tsx
<Combobox
  options={originesRecentes}  // SELECT DISTINCT origine FROM lots_matieres_premieres
  value={watch('origine')}
  onValueChange={v => setValue('origine', v)}
  allowCustom
/>
```

→ Permet KPI "fréquence dépassement aflatoxine par origine".

---

### P0-9 · Visiteur biosec = combobox récurrents

**AVANT** (`sanitaire/biosecurite/_dialog-visite.tsx` L174-188) :
```tsx
<Input id="vis-nom" {...register('nom_visiteur')} placeholder="Ex. Dr. Kouassi" />
<Input id="vis-soc" {...register('societe')} placeholder="Ex. Cabinet Vétos Abidjan" />
```

**APRÈS** : Combobox sur `biosecurite_audits.nom_visiteur` distincts + idem société.

Bonus terrain : 90 % des visites = mêmes 3-4 personnes (vétérinaire, technicien aliment, vendeur).

---

### P0-10 · Bouton "Aujourd'hui" sur tous les `<Input type="date">`

Quasi-pattern systématique : `defaultValues.date_X = todayIso()`. Bon. Mais **bouton "Aujourd'hui"** à côté de chaque date facilite la re-sélection sans clavier (ex. après corriger une faute).

```tsx
<div className="flex gap-2">
  <Input type="date" {...register('date')} className="flex-1" />
  <Button type="button" variant="outline" size="sm"
    onClick={() => setValue('date', todayIso())}
  >Auj.</Button>
</div>
```

→ Concerné : 11 `<Input type="date">` recensés.

---

## Quick Actions à créer (presets 1-tap)

Patron : **bouton "raccourci" sur page de hub** qui ouvre le dialog correspondant avec valeurs pré-remplies.

| Quick Action | Cible | Pré-remplit |
|---|---|---|
| **`Saillie confirmée`** | `/reproduction` | Dialog faire-monter, date=aujourd'hui, methode=naturelle, BCS=3 |
| **`Mise bas OK`** | `/mises-bas` | Dialog elle-a-fait, date=aujourd'hui, BCS=3, nés_morts=0, momifies=0, observations="MB facile" |
| **`Mise bas difficile`** | `/mises-bas` | idem mais observations="MB longue · Aide manuelle" |
| **`BCS update`** | `/cheptel` | Liste truies + boutons 1-9 (BCS 1→5 step 0.5) → écrit dans `observations_bcs` (déjà implémenté `cheptel/[id]` L531, **étendre en bulk**) |
| **`Mortalité`** | `/sanitaire` | Dialog perte, date=aujourd'hui, cause=tuile à sélectionner |
| **`Diagnostic gestation +`** | `/reproduction` | Dialog diagnostic, resultat=positif, date=aujourd'hui |
| **`Diagnostic gestation –`** | `/reproduction` | idem mais resultat=retour_chaleur (déclenche programmation J+21) |
| **`Vaccination J14`** | `/sanitaire` | Dialog vaccin, protocole=Mycoplasma J14 (auto-detect actes attendus depuis `v_calendrier_sanitaire_porcelets`) |
| **`Vaccination J28`** | `/sanitaire` | idem Mycoplasma J28 |
| **`Fer J1`** | `/sanitaire` | idem Fer dextran |
| **`Castration J5`** | `/sanitaire` | idem castration |
| **`Sevrage J28`** | `/mises-bas` | Dialog enlever-petits, date=aujourd'hui, âge=28j auto, BCS=3 |
| **`Transit phase`** | `/bandes/[id]` | Dialog transit, phase_apres=auto selon phase actuelle |
| **`Refus aliment`** | `/alimentation` | Dialog conso, observations chips "Refus partiel" pré-cochée |

→ **Page `/actions-rapides` actuelle** (cf. `actions-rapides/page.tsx`) n'a que **4 actions très génériques**. Étendre à **12-14 actions** avec presets contextuels = gros gain terrain.

### Layout proposé `/actions-rapides`

3 colonnes × 5 lignes (mobile : 2 colonnes), chaque tuile h-32, icône lucide + label uppercase Big Shoulders + sous-titre court. Conformes à la doctrine 1-tap gants.

---

## Composants à créer

| Composant | Path | Effort | Réutilisations |
|---|---|---|---|
| `<QuickNotes>` | `src/components/quick-notes.tsx` | 1-2h | 10 dialogs |
| `<Combobox>` | `src/components/ui/combobox.tsx` | 2-3h (Radix Popover + Command) | 8 champs |
| `<RadioTiles>` (cause mortalité) | inline ou `src/components/radio-tiles.tsx` | 30 min | 2-3 endroits |
| `<DateWithTodayButton>` | `src/components/date-with-today.tsx` | 20 min | 11 dates |
| `quick-actions-presets.ts` (config) | `src/lib/quick-actions-presets.ts` | 1h | source unique de vérité |

**Bonus** : composant `<BCSPicker>` à extraire des 4 endroits qui dupliquent actuellement le même bloc `[1,2,3,4,5].map(n => …)` (DRY).

---

## Decisions to escalate

1. **Combobox vs RadioTiles** pour les 4 champs avec valeurs récurrentes mais ouvertes (motif, produit, vétérinaire, origine). Recommandation : **chips wrap avec saisie libre** (composant `QuickNotes` extensible) pour cohérence visuelle avec le reste. Confirmation Christophe ?

2. **Table `intervenants` ?** Créer table normalisée pour vétérinaires/techniciens/visiteurs ou rester sur champ texte + autocomplete via `DISTINCT` ? Préconisé : commencer par autocomplete (zéro migration), créer table si besoins KPI émergent.

3. **Quick Actions auto-générées** depuis `v_calendrier_sanitaire_porcelets` (actes Fer J1/Castration J5/Mycoplasma J14+J28) — déjà présent dans `/sanitaire/calendrier`. Question : doubler dans `/actions-rapides` ou laisser uniquement dans la page calendrier ? Préconisé : **dupliquer** car raccourci home doit être complet.

4. **Migration enum `mortalites.cause`** : aujourd'hui c'est `text`. Passer à enum (`maladie|ecrasement|accident|thermique|mort_ne|inconnue`) ou garder text + RadioGroup + valeurs normalisées côté UI ? Préconisé : **garder text** (souple, rétro-compatible) + RadioGroup avec valeurs canoniques côté UI.

5. **Mémo persistant éleveur (localStorage)** : "dernière fois tu as choisi Suvaxyn PRRS MLV à 14h12 → on pré-remplit" — utile mais ajoute complexité. À discuter sprint 2.

6. **Chatbot vs Quick Actions** : `/assistant` permet déjà la saisie vocale conversationnelle ("J'ai sevré 12 porcelets de Rosie aujourd'hui"). Garder en parallèle des Quick Actions ou pousser le vocal en first-class ? Préconisé : **maintenir les deux** — vocal pour cas complexes, Quick Actions pour gestes quotidiens.

---

## Synthèse priorisation

| Priorité | Item | ROI éleveur | Effort dev |
|---|---|---|---|
| **P0** | `<QuickNotes>` + chips presets (10 textareas) | 🔥🔥🔥 | M |
| **P0** | Cause mortalité → 6 tuiles | 🔥🔥🔥 | S |
| **P0** | Page `/actions-rapides` étendue 12 actions | 🔥🔥🔥 | M |
| **P0** | Unité matière → Select fermé | 🔥🔥 (KPI) | S |
| **P1** | Combobox motif/produit/vétérinaire | 🔥🔥 | L (créer compo) |
| **P1** | Bouton "Aujourd'hui" sur dates | 🔥 | S |
| **P1** | Méthode diagnostic → Select | 🔥 | S |
| **P2** | Mémo localStorage dernières valeurs | 🔥 | M |
| **P2** | Table `intervenants` normalisée | 🔥 | L (migration) |

**Estimation effort total P0 : ~1 sprint (2 semaines, 1 dev).**
