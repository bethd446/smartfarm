#!/usr/bin/env node
/**
 * Script de réconciliation pesées — Smart Farm
 *
 * Usage : npx tsx scripts/reconcile-pesees.ts <fichier-pesees.txt> [--dry-run]
 *
 * Format fichier-pesees.txt :
 *   BATIMENT 2 (Femelle)
 *   LOGE 1
 *   B2:25
 *   B9:25
 *   SB:20         <- sans boucle
 *   ...
 *
 *   LOGE 5 mixte
 *   M:B41:15      <- mâle B41
 *   F:B40:17      <- femelle B40
 *   M:SB:16       <- mâle sans boucle
 *
 * Algorithme :
 *   1. Parse le fichier en liste [(boucle, sexe, loge, poids, sans_boucle?)]
 *   2. Pour chaque ligne boucleée : match (numero_boucle, sexe) en DB → animal_id
 *   3. Pour les sans-boucle : créer animal SB temporaire (statut_boucle='a_reboucler')
 *   4. Insère pesées avec animal_id valide
 *   5. Pour les boucles en DB jamais pesées : flag statut_boucle='perdue'
 *   6. Identifie porcelets ≥24kg → suggestion transfert Croissance
 *
 * NB: ne supprime jamais d'animaux. Les "perdues" gardent leur historique.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { argv, exit } from "node:process";

interface PeseeLine {
  boucle: string | null;
  sexe: "M" | "F" | "INCONNU";
  loge: string;
  poids: number;
  sansBoucle: boolean;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const FERME_ID = process.env.RECONCILE_FERME_ID || "fdba3bb2-85dd-4ac1-9ab3-713c750980dc"; // 13smart

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function parsePeseeFile(path: string): PeseeLine[] {
  const text = readFileSync(path, "utf-8");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const result: PeseeLine[] = [];
  let currentBat: "B1" | "B2" | null = null;
  let currentLoge: string | null = null;
  let currentSexDefault: "M" | "F" | "INCONNU" = "INCONNU";

  for (const line of lines) {
    if (/^BATIMENT\s*1/i.test(line) || /^BAT\s*1/i.test(line)) {
      currentBat = "B1";
      currentSexDefault = "M";
      continue;
    }
    if (/^BATIMENT\s*2/i.test(line) || /^BAT\s*2/i.test(line)) {
      currentBat = "B2";
      currentSexDefault = "F";
      continue;
    }
    const logeMatch = line.match(/^LOGE\s*(\d+)/i);
    if (logeMatch) {
      currentLoge = `${currentBat}-L${parseInt(logeMatch[1])}`;
      // Détecter mixte
      if (/mixte/i.test(line)) {
        currentSexDefault = "INCONNU";
      } else {
        currentSexDefault = currentBat === "B1" ? "M" : "F";
      }
      continue;
    }

    // Ligne pesée : "B2:25" ou "SB:20" ou "M:B41:15" ou "F:B40:17" ou "M:SB:16"
    const parts = line.split(":").map((p) => p.trim());
    if (parts.length < 2 || !currentLoge) continue;

    let sexe: "M" | "F" | "INCONNU" = currentSexDefault;
    let boucleOrSB: string;
    let poidsStr: string;

    if (parts.length === 3 && (parts[0] === "M" || parts[0] === "F")) {
      sexe = parts[0] as "M" | "F";
      boucleOrSB = parts[1];
      poidsStr = parts[2];
    } else if (parts.length === 2) {
      boucleOrSB = parts[0];
      poidsStr = parts[1];
    } else {
      continue;
    }

    const poids = parseFloat(poidsStr.replace(/[^\d.]/g, ""));
    if (isNaN(poids)) continue;

    const sansBoucle = boucleOrSB.toUpperCase().startsWith("SB");
    const boucle = sansBoucle ? null : boucleOrSB;

    result.push({ boucle, sexe, loge: currentLoge, poids, sansBoucle });
  }

  return result;
}

async function main() {
  const file = argv[2];
  const dryRun = argv.includes("--dry-run");
  if (!file) {
    console.error("Usage : tsx reconcile-pesees.ts <fichier> [--dry-run]");
    exit(1);
  }

  const pesees = parsePeseeFile(file);
  console.log(`📊 ${pesees.length} pesées parsées (${pesees.filter((p) => p.sansBoucle).length} sans-boucle)`);

  // Récupérer animaux Démarrage 2 actifs
  const { data: animaux } = await supabase
    .from("animaux")
    .select("id, tag, numero_boucle, sexe, statut_boucle, batiment_id, case_id, poids_actuel_kg")
    .eq("ferme_id", FERME_ID)
    .eq("statut", "actif");

  if (!animaux) {
    console.error("Aucun animal trouvé");
    exit(1);
  }

  const dbIndex = new Map<string, typeof animaux[0]>();
  for (const a of animaux) {
    dbIndex.set(`${a.numero_boucle}|${a.sexe}`, a);
  }

  // Récupérer cases
  const { data: cases } = await supabase
    .from("cases")
    .select("id, numero, batiment_id")
    .ilike("numero", "B%t%-L%");
  const caseMap = new Map<string, string>();
  cases?.forEach((c) => caseMap.set(c.numero, c.id));

  // Matching
  const seen = new Set<string>();
  let matched = 0,
    sansBoucleCount = 0,
    doublons = 0,
    nouvelles = 0;

  for (const p of pesees) {
    if (p.sansBoucle) {
      sansBoucleCount++;
      continue;
    }
    const key = `B${p.boucle?.replace(/^B/, "")}-${p.sexe}|${p.sexe}`;
    const animal = dbIndex.get(key);
    if (!animal) {
      nouvelles++;
      console.log(`  🆕 Nouvelle boucle pesée: ${p.boucle}-${p.sexe} en ${p.loge} (${p.poids}kg)`);
    } else if (seen.has(key)) {
      doublons++;
      console.log(`  ⚠️ Doublon pesée: ${p.boucle}-${p.sexe} en ${p.loge} (${p.poids}kg)`);
    } else {
      matched++;
      seen.add(key);
    }
  }

  console.log(`\n=== Stats matching ===`);
  console.log(`  Matchés:        ${matched}`);
  console.log(`  Doublons:       ${doublons}`);
  console.log(`  Sans boucle:    ${sansBoucleCount}`);
  console.log(`  Nouvelles:      ${nouvelles}`);
  console.log(`  TOTAL:          ${matched + doublons + sansBoucleCount + nouvelles}`);

  if (dryRun) {
    console.log("\n💡 --dry-run : aucune écriture en base");
    return;
  }

  console.log("\n⚠️  Mode WRITE non implémenté dans cette version skeleton.");
  console.log("    Voir migration 20260524230000_pesee_24_05_phase_5_boucles.sql");
  console.log("    et la fonction handleReconcile() à étendre.");
}

main().catch((e) => {
  console.error(e);
  exit(1);
});
