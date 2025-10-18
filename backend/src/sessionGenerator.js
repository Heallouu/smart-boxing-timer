// backend/generateSession.js

function pickRandomRows(db, level, category, count) {
  return db
    .prepare(
      `SELECT * FROM exercises WHERE level=? AND category=? ORDER BY RANDOM() LIMIT ?`
    )
    .all(level, category, count);
}

function pickOne(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Config
const CONFIG = {
  warmup: { steps: 5, stepSec: 60 }, // 5:00 en 5×1:00
  work: { rounds: 8, workSec: 180, restSec: 60 },
  stretch: { steps: 10, stepSec: 30 },
  // Défauts par niveau (modifiable plus tard via settings)
  splitStrategyByLevel: {
    debutant: "within", // 1:30 / 1:30 dans le round
    intermediaire: "within",
    confirme: "across", // 3:00 puis 3:00 sur deux rounds
  },
};

/**
 * Génère la session :
 * - Warmup: 5×60s
 * - Work/Rest: 8 rounds * (3:00 work + 1:00 rest)
 *   • Exo non split => 1 step de 180s
 *   • Exo split + 'within'  => 2 steps de 90s (G puis D, ordre aléatoire)
 *   • Exo split + 'across'  => 2 rounds consécutifs (3:00 G, repos, 3:00 D, repos)
 *     - Si on arrive à la fin et qu’il ne reste qu’1 round dispo, on *bascule en 'within'*
 * - Stretch: 10×30s
 */
export function generateSession(db, level, opts = {}) {
  const splitStrategy =
    opts.splitStrategy || CONFIG.splitStrategyByLevel[level] || "within";

  const warmupRows = pickRandomRows(db, level, "warmup", CONFIG.warmup.steps);
  const stretchRows = pickRandomRows(
    db,
    level,
    "stretch",
    CONFIG.stretch.steps
  );
  const workBank = db
    .prepare(`SELECT * FROM exercises WHERE level=? AND category='work'`)
    .all(level);
  const restBank = db
    .prepare(`SELECT * FROM exercises WHERE level=? AND category='rest'`)
    .all(level);

  const segments = [];

  // util pour créer un step (une consigne jouée au début du step)
  const makeStep = (row, duration, sideLabel = null) => {
    const addSide = sideLabel ? ` ${sideLabel}.` : "";
    // On évite la double ponctuation si l'instruction finit déjà par un point.
    const instr = row.instruction?.trim() || "";
    const endsWithPunct = /[.!?…]$/.test(instr);
    const finalInstr = endsWithPunct
      ? instr + (sideLabel ? ` ${sideLabel}.` : "")
      : instr + addSide;

    return {
      title: row.name + (sideLabel ? ` (${sideLabel})` : ""),
      instruction: finalInstr,
      duration,
      cueMid: null,
      cueRepeat: null,
    };
  };

  // --- ÉCHAUFFEMENT : 5 × 60 s
  segments.push({
    phase: "warmup",
    label: "Échauffement",
    total: CONFIG.warmup.steps * CONFIG.warmup.stepSec,
    steps: warmupRows.map((rw) => makeStep(rw, CONFIG.warmup.stepSec)),
  });

  // --- ROUNDS DE TRAVAIL (3:00) + REPOS (1:00)
  let roundIndex = 1;
  while (roundIndex <= CONFIG.work.rounds) {
    const row = pickOne(workBank);
    const isSplit = row.cue_type === "split";

    if (isSplit && splitStrategy === "across") {
      // Besoin de 2 rounds disponibles ; sinon fallback 'within'
      if (roundIndex <= CONFIG.work.rounds - 1) {
        const leftFirst = Math.random() < 0.5;
        const sideA = leftFirst ? "côté gauche" : "côté droit";
        const sideB = leftFirst ? "côté droit" : "côté gauche";

        // Round A
        segments.push({
          phase: "work",
          label: `Round ${roundIndex}`,
          round: roundIndex,
          total: CONFIG.work.workSec,
          steps: [makeStep(row, CONFIG.work.workSec, sideA)],
          tenSecWarning: true,
        });
        // Repos
        const restRowA = pickOne(restBank);
        segments.push({
          phase: "rest",
          label: "Repos",
          total: CONFIG.work.restSec,
          steps: [makeStep(restRowA, CONFIG.work.restSec)],
        });

        // Round B
        segments.push({
          phase: "work",
          label: `Round ${roundIndex + 1}`,
          round: roundIndex + 1,
          total: CONFIG.work.workSec,
          steps: [makeStep(row, CONFIG.work.workSec, sideB)],
          tenSecWarning: true,
        });
        // Repos
        const restRowB = pickOne(restBank);
        segments.push({
          phase: "rest",
          label: "Repos",
          total: CONFIG.work.restSec,
          steps: [makeStep(restRowB, CONFIG.work.restSec)],
        });

        roundIndex += 2;
        continue;
      } else {
        // Pas assez de rounds restants -> fallback en 'within'
      }
    }

    if (isSplit && splitStrategy === "within") {
      const leftFirst = Math.random() < 0.5;
      const side1 = leftFirst ? "côté gauche" : "côté droit";
      const side2 = leftFirst ? "côté droit" : "côté gauche";

      segments.push({
        phase: "work",
        label: `Round ${roundIndex}`,
        round: roundIndex,
        total: CONFIG.work.workSec, // 180
        steps: [makeStep(row, 90, side1), makeStep(row, 90, side2)],
        tenSecWarning: true,
      });

      const restRow = pickOne(restBank);
      segments.push({
        phase: "rest",
        label: "Repos",
        total: CONFIG.work.restSec,
        steps: [makeStep(restRow, CONFIG.work.restSec)],
      });

      roundIndex += 1;
    } else {
      // Exercice non split (ou split 'across' mais fallback à la fin)
      segments.push({
        phase: "work",
        label: `Round ${roundIndex}`,
        round: roundIndex,
        total: CONFIG.work.workSec,
        steps: [makeStep(row, CONFIG.work.workSec)],
        tenSecWarning: true,
      });

      const restRow = pickOne(restBank);
      segments.push({
        phase: "rest",
        label: "Repos",
        total: CONFIG.work.restSec,
        steps: [makeStep(restRow, CONFIG.work.restSec)],
      });

      roundIndex += 1;
    }
  }

  // --- ÉTIREMENTS : 10 × 30 s
  segments.push({
    phase: "stretch",
    label: "Étirements",
    total: CONFIG.stretch.steps * CONFIG.stretch.stepSec,
    steps: stretchRows.map((rw) => makeStep(rw, CONFIG.stretch.stepSec)),
  });

  return {
    level,
    rounds: CONFIG.work.rounds,
    segments,
  };
}
