// frontend/src/lib/sessionFromDb.js
// Génère la séance à partir de la DB locale (Capacitor SQLite)
const CONFIG = {
  warmup: { steps: 5, stepSec: 60 },
  work: { rounds: 8, workSec: 180, restSec: 60 },
  stretch: { steps: 10, stepSec: 30 },
  splitStrategyByLevel: {
    debutant: "within",
    intermediaire: "within",
    confirme: "across",
  },
};

async function pickRandom(db, level, category, count) {
  const q = await db.query(
    `SELECT * FROM exercises WHERE level=? AND category=? ORDER BY RANDOM() LIMIT ?;`,
    [level, category, count]
  );
  return q.values || [];
}

export async function generateSessionFromDb(db, level, opts = {}) {
  const splitStrategy =
    opts.splitStrategy || CONFIG.splitStrategyByLevel[level] || "within";

  const warmRows = await pickRandom(db, level, "warmup", CONFIG.warmup.steps);
  const stretchRows = await pickRandom(
    db,
    level,
    "stretch",
    CONFIG.stretch.steps
  );

  // Petites banques complètes pour work/rest
  const workBank =
    (
      await db.query(
        `SELECT * FROM exercises WHERE level=? AND category='work';`,
        [level]
      )
    ).values || [];
  const restBank =
    (
      await db.query(
        `SELECT * FROM exercises WHERE level=? AND category='rest';`,
        [level]
      )
    ).values || [];

  const step = (row, duration, sideLabel = null) => ({
    title: row.name + (sideLabel ? ` (${sideLabel})` : ""),
    instruction: row.instruction + (sideLabel ? ` ${sideLabel}.` : ""),
    duration,
    cueMid: null,
    cueRepeat: null,
  });

  const segments = [];

  // --- WARMUP 5x1:00
  segments.push({
    phase: "warmup",
    label: "Échauffement",
    total: CONFIG.warmup.steps * CONFIG.warmup.stepSec,
    steps: warmRows.map((r) => step(r, CONFIG.warmup.stepSec)),
  });

  // --- ROUNDS
  let r = 1;
  while (r <= CONFIG.work.rounds) {
    const row = workBank[Math.floor(Math.random() * workBank.length)];
    const isSplit = row?.cue_type === "split";

    if (isSplit && splitStrategy === "within") {
      const leftFirst = Math.random() < 0.5;
      const A = leftFirst ? "côté gauche" : "côté droit";
      const B = leftFirst ? "côté droit" : "côté gauche";
      segments.push({
        phase: "work",
        label: `Round ${r}`,
        round: r,
        total: CONFIG.work.workSec,
        steps: [step(row, 90, A), step(row, 90, B)],
        tenSecWarning: true,
      });
      // repos
      const restRow = restBank[Math.floor(Math.random() * restBank.length)];
      segments.push({
        phase: "rest",
        label: "Repos",
        total: CONFIG.work.restSec,
        steps: [step(restRow, CONFIG.work.restSec)],
      });
      r += 1;
    } else if (
      isSplit &&
      splitStrategy === "across" &&
      r <= CONFIG.work.rounds - 1
    ) {
      const leftFirst = Math.random() < 0.5;
      const A = leftFirst ? "côté gauche" : "côté droit";
      const B = leftFirst ? "côté droit" : "côté gauche";
      // Round A
      segments.push({
        phase: "work",
        label: `Round ${r}`,
        round: r,
        total: CONFIG.work.workSec,
        steps: [step(row, CONFIG.work.workSec, A)],
        tenSecWarning: true,
      });
      segments.push({
        phase: "rest",
        label: "Repos",
        total: CONFIG.work.restSec,
        steps: [
          step(
            restBank[Math.floor(Math.random() * restBank.length)],
            CONFIG.work.restSec
          ),
        ],
      });
      // Round B
      segments.push({
        phase: "work",
        label: `Round ${r + 1}`,
        round: r + 1,
        total: CONFIG.work.workSec,
        steps: [step(row, CONFIG.work.workSec, B)],
        tenSecWarning: true,
      });
      segments.push({
        phase: "rest",
        label: "Repos",
        total: CONFIG.work.restSec,
        steps: [
          step(
            restBank[Math.floor(Math.random() * restBank.length)],
            CONFIG.work.restSec
          ),
        ],
      });
      r += 2;
    } else {
      // Non split : 3:00
      segments.push({
        phase: "work",
        label: `Round ${r}`,
        round: r,
        total: CONFIG.work.workSec,
        steps: [step(row, CONFIG.work.workSec)],
        tenSecWarning: true,
      });
      segments.push({
        phase: "rest",
        label: "Repos",
        total: CONFIG.work.restSec,
        steps: [
          step(
            restBank[Math.floor(Math.random() * restBank.length)],
            CONFIG.work.restSec
          ),
        ],
      });
      r += 1;
    }
  }

  // --- STRETCH 10x30s
  segments.push({
    phase: "stretch",
    label: "Étirements",
    total: CONFIG.stretch.steps * CONFIG.stretch.stepSec,
    steps: stretchRows.map((r) => step(r, CONFIG.stretch.stepSec)),
  });

  return { level, rounds: CONFIG.work.rounds, segments };
}
