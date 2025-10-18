// frontend/src/utils/localSession.js

// --- Mini seed lisible (tu pourras enrichir à volonté) ---
const BANK = {
  debutant: {
    warmup: [
      {
        name: "Corde douce",
        instruction: "Corde à sauter rythme léger.",
        split: false,
      },
      {
        name: "Pas chassés",
        instruction: "Pas chassés gauche puis droite.",
        split: false,
      },
      {
        name: "Mobilité épaules",
        instruction: "Rotation d’épaules avant puis arrière.",
        split: false,
      },
      {
        name: "Shadow mobile",
        instruction: "Shadow boxing léger, mains hautes.",
        split: false,
      },
      {
        name: "Montées de genoux",
        instruction: "Montées de genoux toniques.",
        split: false,
      },
      {
        name: "Talons fesses",
        instruction: "Talons fesses dynamiques.",
        split: false,
      },
      {
        name: "Mobilité hanches",
        instruction: "Cercles de hanches lents.",
        split: false,
      },
      { name: "Poignets", instruction: "Rotation des poignets.", split: false },
      {
        name: "Squats légers",
        instruction: "Squats légers contrôlés.",
        split: false,
      },
      {
        name: "Ouverture cage",
        instruction: "Ouvre et ferme les bras.",
        split: false,
      },
    ],
    work: [
      {
        name: "Jab rapide",
        instruction: "Jab rapide au sac, garde haute.",
        split: false,
      },
      {
        name: "Jab, croisé",
        instruction: "Jab puis croisé, cadence régulière.",
        split: false,
      },
      {
        name: "Uppercuts alternés",
        instruction: "Uppercuts alternés, buste stable.",
        split: false,
      },
      {
        name: "Crochet main avant",
        instruction: "Crochet main avant propre.",
        split: false,
      },
      {
        name: "Crochet main arrière",
        instruction: "Crochet main arrière propre.",
        split: false,
      },
      {
        name: "Jab à gauche / Jab à droite",
        instruction: "Jab main avant, puis jab main arrière.",
        split: true,
      },
      {
        name: "Direct corps-tête",
        instruction: "Direct au corps puis à la tête.",
        split: false,
      },
      {
        name: "Pas avant + jab",
        instruction: "Pas en avant, jab, puis recul.",
        split: false,
      },
      {
        name: "Blocage simple",
        instruction: "Bloque des crochets imaginaires.",
        split: false,
      },
      {
        name: "Travail en ligne",
        instruction: "Directs en ligne, propres.",
        split: false,
      },
      // ...ajoute-en autant que tu veux
    ],
    rest: [
      {
        name: "Respiration",
        instruction: "Respiration profonde, récupère.",
        split: false,
      },
      {
        name: "Marche sur place",
        instruction: "Relâche épaules et bras.",
        split: false,
      },
      {
        name: "Secoue les bras",
        instruction: "Secoue doucement les bras.",
        split: false,
      },
      {
        name: "Mobilité cou",
        instruction: "Mobilité douce du cou.",
        split: false,
      },
      {
        name: "Respire par le nez",
        instruction: "Inspire par le nez, expire par la bouche.",
        split: false,
      },
      // ...
    ],
    stretch: [
      {
        name: "Triceps",
        instruction: "Étire les triceps, chaque côté.",
        split: false,
      },
      {
        name: "Pectoraux",
        instruction: "Étire les pectoraux contre un mur.",
        split: false,
      },
      { name: "Épaules", instruction: "Étire les épaules.", split: false },
      {
        name: "Dos",
        instruction: "Dos rond et dos creux au sol.",
        split: false,
      },
      { name: "Ischios", instruction: "Étirement des ischios.", split: false },
      {
        name: "Quadriceps",
        instruction: "Étirement des quadriceps.",
        split: false,
      },
      { name: "Mollets", instruction: "Étirement des mollets.", split: false },
      { name: "Hanches", instruction: "Ouverture des hanches.", split: false },
      {
        name: "Fessiers",
        instruction: "Étirement des fessiers.",
        split: false,
      },
      {
        name: "Respiration calme",
        instruction: "Respiration calme et profonde.",
        split: false,
      },
    ],
  },
  intermediaire: null, // fallback sur debutant si null
  confirme: null, // idem
};

function pick(arr, n) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

const CONFIG = {
  warmup: { steps: 5, stepSec: 60 }, // 5:00 en 5×1:00
  work: { rounds: 8, workSec: 180, restSec: 60 },
  stretch: { steps: 10, stepSec: 30 },
  splitStrategyByLevel: {
    debutant: "within", // 1:30 / 1:30
    intermediaire: "within",
    confirme: "across", // 3:00 puis 3:00
  },
};

export function generateLocalSession(level = "debutant", opts = {}) {
  const L = BANK[level] || BANK.debutant;
  const splitStrategy =
    opts.splitStrategy || CONFIG.splitStrategyByLevel[level] || "within";

  const warmSel = pick(
    L.warmup,
    Math.min(L.warmup.length, CONFIG.warmup.steps)
  );
  const restBank = L.rest;
  const workBank = L.work;
  const stretchSel = pick(
    L.stretch,
    Math.min(L.stretch.length, CONFIG.stretch.steps)
  );

  const step = (row, duration, side = null) => ({
    title: row.name + (side ? ` (${side})` : ""),
    instruction: row.instruction + (side ? ` ${side}.` : ""),
    duration,
    cueMid: null,
    cueRepeat: null,
  });

  const segments = [];

  // Warmup 5×1:00
  segments.push({
    phase: "warmup",
    label: "Échauffement",
    total: CONFIG.warmup.steps * CONFIG.warmup.stepSec,
    steps: warmSel.map((r) => step(r, CONFIG.warmup.stepSec)),
  });

  // 8 rounds
  let r = 1;
  while (r <= CONFIG.work.rounds) {
    const row = workBank[Math.floor(Math.random() * workBank.length)];
    const isSplit = !!row.split;

    if (isSplit && splitStrategy === "across" && r <= CONFIG.work.rounds - 1) {
      // Round r : côté A
      const leftFirst = Math.random() < 0.5;
      const sideA = leftFirst ? "côté gauche" : "côté droit";
      const sideB = leftFirst ? "côté droit" : "côté gauche";

      segments.push({
        phase: "work",
        label: `Round ${r}`,
        round: r,
        total: CONFIG.work.workSec,
        steps: [step(row, CONFIG.work.workSec, sideA)],
        tenSecWarning: true,
      });
      segments.push({
        phase: "rest",
        label: "Repos",
        total: CONFIG.work.restSec,
        steps: [
          {
            title: "Repos",
            instruction: "Récupère et respire.",
            duration: CONFIG.work.restSec,
            cueMid: null,
            cueRepeat: null,
          },
        ],
      });
      segments.push({
        phase: "work",
        label: `Round ${r + 1}`,
        round: r + 1,
        total: CONFIG.work.workSec,
        steps: [step(row, CONFIG.work.workSec, sideB)],
        tenSecWarning: true,
      });
      if (r + 1 <= CONFIG.work.rounds) {
        segments.push({
          phase: "rest",
          label: "Repos",
          total: CONFIG.work.restSec,
          steps: [
            {
              title: "Repos",
              instruction: "Récupère et respire.",
              duration: CONFIG.work.restSec,
              cueMid: null,
              cueRepeat: null,
            },
          ],
        });
      }
      r += 2;
    } else if (isSplit && splitStrategy === "within") {
      // 90/90
      const leftFirst = Math.random() < 0.5;
      const side1 = leftFirst ? "côté gauche" : "côté droit";
      const side2 = leftFirst ? "côté droit" : "côté gauche";
      segments.push({
        phase: "work",
        label: `Round ${r}`,
        round: r,
        total: CONFIG.work.workSec,
        steps: [step(row, 90, side1), step(row, 90, side2)],
        tenSecWarning: true,
      });
      segments.push({
        phase: "rest",
        label: "Repos",
        total: CONFIG.work.restSec,
        steps: [
          {
            title: "Repos",
            instruction: "Récupère et respire.",
            duration: CONFIG.work.restSec,
            cueMid: null,
            cueRepeat: null,
          },
        ],
      });
      r += 1;
    } else {
      // non split : 3:00 plein
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
          {
            title: "Repos",
            instruction: "Récupère et respire.",
            duration: CONFIG.work.restSec,
            cueMid: null,
            cueRepeat: null,
          },
        ],
      });
      r += 1;
    }
  }

  // Étirements 10×30s
  segments.push({
    phase: "stretch",
    label: "Étirements",
    total: CONFIG.stretch.steps * CONFIG.stretch.stepSec,
    steps: stretchSel.map((rw) => step(rw, CONFIG.stretch.stepSec)),
  });

  return { level, rounds: CONFIG.work.rounds, segments };
}
