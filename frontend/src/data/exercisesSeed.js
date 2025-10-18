// backend/seedExercises.js
// Schéma attendu: exercises(level, category, name, instruction, cue_type)
// -> Aucun temps dans les textes (on les supprime à l’insertion).
// -> 'cue_type' ∈ {'none','split'} ; 'split' réservé aux exos "work" qui alternent gauche/droite.

//////////////////////////////
// Helpers DB
//////////////////////////////
function insertMany(db, rows) {
  const stmt = db.prepare(`
    INSERT INTO exercises (level, category, name, instruction, cue_type)
    VALUES (@level, @category, @name, @instruction, @cue_type)
  `);
  const txn = db.transaction((arr) => {
    for (const r of arr) stmt.run(r);
  });
  txn(rows);
}

//////////////////////////////
// Sanitize "no time in text"
//////////////////////////////
// Retire "pendant trente secondes", "quinze secondes", "1 minute", etc.
// Simplifie "chaque côté quinze secondes" -> "chaque côté".
function sanitizeInstruction(raw) {
  if (!raw) return raw;

  let s = raw;

  // 1) phrases "pendant/durant X secondes|minutes"
  s = s.replace(
    /\b(?:pendant|durant)\s+([a-zàâçéèêëîïôûùüÿœ0-9\s\-]+?)\s*(secondes?|minutes?)\b/gi,
    ""
  );

  // 2) occurrences isolées de "X secondes|minutes" (nombres ou mots usuels)
  const NUM_WORDS =
    "(?:\\d+|dix|quinze|vingt(?:\\s*cinq)?|trente|quarante\\-cinq|soixante|une|deux|trois)";
  s = s.replace(
    new RegExp(`\\b${NUM_WORDS}\\s+(?:secondes?|minutes?)\\b`, "gi"),
    ""
  );

  // 3) cas "chaque côté quinze secondes" / "chaque côté 15 s"
  s = s.replace(
    new RegExp(
      `\\bchaque côté(?:\\s+(?:pendant\\s+)?)?(?:${NUM_WORDS}\\s+)?(?:secondes?|minutes?)\\b`,
      "gi"
    ),
    "chaque côté"
  );

  // 4) "puis quinze secondes" -> "puis"
  s = s.replace(
    new RegExp(
      `\\bpuis\\s+(?:${NUM_WORDS}\\s+)?(?:secondes?|minutes?)\\b`,
      "gi"
    ),
    "puis"
  );

  // 5) Nettoyage ponctuation/espaces résiduels
  s = s
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ", ")
    .replace(/\s+\./g, ".")
    .replace(/\(\s+\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // 6) Terminer par un point si phrase déclarative sans ponctuation finale
  if (!/[.!?…]$/.test(s)) s += ".";

  return s;
}

// Construit lignes seed ; 'split' seulement si category === 'work' et le nom est listé.
function toRows(level, category, items, splitNames = []) {
  const isWork = category === "work";
  const splitSet = new Set(splitNames);
  return items.map(([name, instruction]) => ({
    level,
    category,
    name,
    instruction: sanitizeInstruction(instruction),
    cue_type: isWork && splitSet.has(name) ? "split" : "none",
  }));
}

//////////////////////////////
// Données (avec textes bruts)
// NB: On garde tes textes d’origine, le sanitize enlève les temps.
//////////////////////////////

// Débutant
const warmup_debutant = [
  [
    "Corde à sauter douce",
    "Corde à sauter pendant trente secondes, rythme léger.",
  ],
  ["Pas chassés", "Pas chassés à gauche et à droite pendant trente secondes."],
  [
    "Rotation des épaules",
    "Rotation des épaules vers l’avant puis vers l’arrière pendant trente secondes.",
  ],
  [
    "Shadow boxing léger",
    "Shadow boxing léger, mains hautes, pendant trente secondes.",
  ],
  [
    "Montées de genoux",
    "Montées de genoux dynamiques pendant trente secondes.",
  ],
  ["Talons fesses", "Talons fesses sur place pendant trente secondes."],
  ["Rotation des hanches", "Cercles de hanches lents pendant trente secondes."],
  ["Rotation des poignets", "Poignets en rotation pendant trente secondes."],
  ["Squats légers", "Squats légers contrôlés pendant trente secondes."],
  [
    "Ouverture de cage thoracique",
    "Ouvre et ferme les bras pour mobiliser la poitrine pendant trente secondes.",
  ],
];

const work_debutant = [
  ["Jab rapide", "Jab rapide au sac pendant trente secondes, garde haute."],
  [
    "Jab, croisé",
    "Jab puis croisé pendant trente secondes, cadence régulière.",
  ],
  [
    "Crochet gauche",
    "Crochet gauche propre pendant trente secondes, rotation des hanches.",
  ],
  [
    "Crochet droit",
    "Crochet droit propre pendant trente secondes, rotation des hanches.",
  ],
  [
    "Uppercuts alternés",
    "Uppercuts alternés pendant trente secondes, buste stable.",
  ],
  [
    "Jab, esquive",
    "Jab puis esquive pendant trente secondes, petit mouvement de tête.",
  ],
  ["Jab, jab, croisé", "Deux jabs puis un croisé pendant trente secondes."],
  [
    "Direct au corps, direct à la tête",
    "Direct au corps puis direct à la tête pendant trente secondes.",
  ],
  ["Pas avant, jab", "Pas en avant, jab, puis recul pendant trente secondes."],
  [
    "Jab à gauche / Jab à droite",
    "Quinze secondes jabs main avant, puis quinze secondes jabs main arrière.",
  ], // split
  [
    "Crochet gauche au corps",
    "Crochet gauche au corps pendant trente secondes, souffle.",
  ],
  [
    "Crochet droit à la tête",
    "Crochet droit à la tête pendant trente secondes, remonte la main.",
  ],
  ["Jab, crochet gauche", "Jab puis crochet gauche pendant trente secondes."],
  ["1-2-1", "Jab, croisé, jab pendant trente secondes."],
  ["2-3-2", "Croisé, crochet gauche, croisé pendant trente secondes."],
  ["Garde active", "Petits taps main avant pendant trente secondes."],
  [
    "Blocage simple",
    "Bloque des crochets imaginaires pendant trente secondes, garde serrée.",
  ],
  ["Pivot léger", "Jab puis léger pivot pendant trente secondes."],
  ["Travail en ligne", "Directs en ligne, propres pendant trente secondes."],
  [
    "Respire et cadence",
    "Conserve ta cadence et respire pendant trente secondes.",
  ],
];

const rest_debutant = [
  ["Respiration", "Respiration profonde pendant trente secondes."],
  ["Marche sur place", "Marche sur place pendant trente secondes."],
  ["Relâche épaules", "Secoue doucement les épaules pendant trente secondes."],
  ["Cou, lent", "Mobilise le cou lentement pendant trente secondes."],
  [
    "Bras pendants",
    "Bras pendants, relâche la tension pendant trente secondes.",
  ],
  [
    "Étirement biceps léger",
    "Étirement léger des biceps pendant trente secondes.",
  ],
  ["Étirement trapèzes", "Auto-massage des trapèzes pendant trente secondes."],
  ["Balance des bras", "Bras qui balancent doucement pendant trente secondes."],
  [
    "Respire par le nez",
    "Inspire par le nez, expire par la bouche pendant trente secondes.",
  ],
  ["Détends la mâchoire", "Relâche la mâchoire pendant trente secondes."],
];

const stretch_debutant = [
  [
    "Triceps",
    "Étirement des triceps pendant trente secondes, chaque côté quinze secondes.",
  ],
  [
    "Pectoraux",
    "Étirement des pectoraux contre un mur pendant trente secondes.",
  ],
  ["Épaules", "Étirement des épaules pendant trente secondes."],
  ["Dos rond creux", "Dos rond creux au sol pendant trente secondes."],
  ["Fessiers", "Étirement des fessiers pendant trente secondes."],
  ["Ischios", "Étirement des ischios pendant trente secondes."],
  ["Quadriceps", "Étirement des quadriceps pendant trente secondes."],
  ["Mollets", "Étirement des mollets pendant trente secondes."],
  ["Hanches", "Ouverture des hanches pendant trente secondes."],
  [
    "Respiration calme",
    "Respiration calme et profonde pendant trente secondes.",
  ],
];

// Intermédiaire
const warmup_inter = [
  ["Corde à sauter rythmée", "Corde à sauter rythmée pendant trente secondes."],
  [
    "Shadow boxing mobile",
    "Shadow boxing avec déplacements pendant trente secondes.",
  ],
  ["Pas chassés rapides", "Pas chassés rapides pendant trente secondes."],
  ["Montées de genoux", "Montées de genoux toniques pendant trente secondes."],
  ["Talons fesses", "Talons fesses dynamiques pendant trente secondes."],
  [
    "Rotations épaules élastique",
    "Rotation d’épaules avec amplitude pendant trente secondes.",
  ],
  ["Mobilité hanches", "Mobilité des hanches pendant trente secondes."],
  ["Planche courte", "Planche gainage courte pendant trente secondes."],
  ["Squats contrôlés", "Squats contrôlés pendant trente secondes."],
  [
    "Shadow esquives",
    "Shadow avec esquives et garde haute pendant trente secondes.",
  ],
];

const work_inter = [
  ["1-2, esquive, 2", "Jab croisé, esquive, croisé pendant trente secondes."],
  ["3-2-3", "Crochet gauche, croisé, crochet gauche pendant trente secondes."],
  ["2-3-2", "Croisé, crochet gauche, croisé pendant trente secondes."],
  ["1-2-3-2", "Jab, croisé, crochet gauche, croisé pendant trente secondes."],
  [
    "Uppercuts alternés",
    "Uppercuts alternés toniques pendant trente secondes.",
  ],
  ["Corps tête", "Gauche au corps, droit à la tête pendant trente secondes."],
  ["Jab au retrait", "Jab et retrait du buste pendant trente secondes."],
  ["Double jab", "Double jab puis croisé pendant trente secondes."],
  ["Pivot + 2", "Pivot léger et croisé pendant trente secondes."],
  ["Pression au sac", "Avance, jab, croisé pendant trente secondes."],
  ["Travail puissance", "Croisés puissants contrôlés pendant trente secondes."],
  ["Crochets alternés", "Crochets alternés au sac pendant trente secondes."],
  ["1-1-2-3", "Jab, jab, croisé, crochet gauche pendant trente secondes."],
  ["2-1-2", "Croisé, jab, croisé pendant trente secondes."],
  [
    "Uppercut droit",
    "Uppercut droit puis crochet gauche pendant trente secondes.",
  ],
  ["1-2, pas de côté", "Jab, croisé, pas de côté pendant trente secondes."],
  ["Blocage et riposte", "Bloque puis riposte direct pendant trente secondes."],
  ["Feintes", "Feintes puis croisé pendant trente secondes."],
  ["Main avant", "Travail main avant variée pendant trente secondes."],
  [
    "Cadence respirée",
    "Cadence régulière et respiration pendant trente secondes.",
  ],
];

const rest_inter = [
  ["Respiration nez", "Respiration contrôlée pendant trente secondes."],
  ["Marche active", "Marche active pendant trente secondes."],
  ["Étirement épaules", "Étirement des épaules pendant trente secondes."],
  ["Secoue les bras", "Secoue bras et poignets pendant trente secondes."],
  ["Mobilité cou", "Mobilité douce du cou pendant trente secondes."],
  ["Gainage léger", "Gainage très léger pendant trente secondes."],
  ["Ouvrir la cage", "Ouvre la cage thoracique pendant trente secondes."],
  ["Étirement triceps", "Étire les triceps pendant trente secondes."],
  ["Étirement dorsaux", "Étire les dorsaux pendant trente secondes."],
  ["Relâche tout", "Relâche tout le corps pendant trente secondes."],
];

const stretch_inter = [
  ["Triceps", "Étirement des triceps pendant trente secondes."],
  ["Pectoraux", "Étirement des pectoraux pendant trente secondes."],
  ["Deltoïdes", "Étirement des deltoïdes pendant trente secondes."],
  ["Dos", "Étirement du dos pendant trente secondes."],
  ["Fessiers", "Étirement des fessiers pendant trente secondes."],
  ["Ischios", "Étirement des ischios pendant trente secondes."],
  ["Quadriceps", "Étirement des quadriceps pendant trente secondes."],
  ["Mollets", "Étirement des mollets pendant trente secondes."],
  ["Adducteurs", "Étirement des adducteurs pendant trente secondes."],
  ["Respiration posée", "Respiration posée pendant trente secondes."],
];

// Confirmé
const warmup_conf = [
  [
    "Corde à sauter double",
    "Corde à sauter avec doubles sauts pendant trente secondes.",
  ],
  ["Shadow explosif", "Shadow boxing explosif pendant trente secondes."],
  [
    "Montées de genoux rapides",
    "Montées de genoux rapides pendant trente secondes.",
  ],
  ["Talons fesses rapides", "Talons fesses rapides pendant trente secondes."],
  ["Pas croisés", "Pas croisés avec garde haute pendant trente secondes."],
  ["Mobilité complète", "Mobilité épaules et hanches pendant trente secondes."],
  ["Planche dynamique", "Planche dynamique pendant trente secondes."],
  ["Burpees légers", "Burpees légers et propres pendant trente secondes."],
  ["Squats sautés", "Squats sautés contrôlés pendant trente secondes."],
  [
    "Shadow avec pivots",
    "Shadow avec pivots et feintes pendant trente secondes.",
  ],
];

const work_conf = [
  [
    "1-2-3-2 + pas de côté",
    "Jab, croisé, crochet gauche, croisé, pas de côté pendant trente secondes.",
  ],
  [
    "2-3-2 puissance",
    "Croisé, crochet gauche, croisé en puissance pendant trente secondes.",
  ],
  [
    "1-1-2-3-2",
    "Double jab, croisé, crochet gauche, croisé pendant trente secondes.",
  ],
  [
    "Corps-tête-tête",
    "Direct au corps, croisé à la tête, crochet droit pendant trente secondes.",
  ],
  ["Uppercuts vitesse", "Uppercuts très rapides pendant trente secondes."],
  [
    "Crochets en série",
    "Séries de crochets gauche et droit pendant trente secondes.",
  ],
  [
    "Feintes puis 2-3-2",
    "Feintes puis croisé, crochet gauche, croisé pendant trente secondes.",
  ],
  ["Pivot + séries", "Pivot et séries continues pendant trente secondes."],
  ["1-2 + esquive + 2", "Jab croisé, esquive, croisé pendant trente secondes."],
  [
    "Gauche au corps, droite à la tête",
    "Gauche au corps, droite à la tête pendant trente secondes.",
  ],
  ["Pression continue", "Pression continue au sac pendant trente secondes."],
  [
    "Coups en puissance",
    "Coups en puissance contrôlée pendant trente secondes.",
  ],
  ["1-2-1-2", "Jab croisé jab croisé pendant trente secondes."],
  [
    "3-2-3-2",
    "Crochet gauche, croisé, crochet gauche, croisé pendant trente secondes.",
  ],
  [
    "2-3-6-3",
    "Croisé, crochet gauche, uppercut droit, crochet gauche pendant trente secondes.",
  ],
  ["Contre après bloc", "Contre après blocage pendant trente secondes."],
  [
    "Travail en ligne rapide",
    "Directs en ligne rapides pendant trente secondes.",
  ],
  ["Cadence haute", "Cadence haute et propre pendant trente secondes."],
  [
    "Puissance contrôlée",
    "Puissance contrôlée, souffle, pendant trente secondes.",
  ],
  ["Explosivité", "Explosivité, séries courtes pendant trente secondes."],
];

const rest_conf = [
  [
    "Respiration active",
    "Respiration active et contrôlée pendant trente secondes.",
  ],
  ["Marche dynamique", "Marche dynamique pendant trente secondes."],
  [
    "Étirement épaules rapide",
    "Étirement rapide des épaules pendant trente secondes.",
  ],
  ["Secoue bras", "Secoue les bras pendant trente secondes."],
  ["Mobilité cou soignée", "Mobilité du cou pendant trente secondes."],
  ["Relâche poignets", "Relâche les poignets pendant trente secondes."],
  ["Ouvre la cage", "Ouvre la cage thoracique pendant trente secondes."],
  ["Étirement triceps", "Étirement des triceps pendant trente secondes."],
  ["Étirement dorsaux", "Étirement des dorsaux pendant trente secondes."],
  ["Focus respiration", "Focalise la respiration pendant trente secondes."],
];

const stretch_conf = [
  ["Triceps", "Étirement des triceps pendant trente secondes."],
  ["Pectoraux", "Étirement des pectoraux pendant trente secondes."],
  ["Deltoïdes", "Étirement des deltoïdes pendant trente secondes."],
  ["Dos", "Étirement du dos pendant trente secondes."],
  ["Fessiers", "Étirement des fessiers pendant trente secondes."],
  ["Ischios", "Étirement des ischios pendant trente secondes."],
  ["Quadriceps", "Étirement des quadriceps pendant trente secondes."],
  ["Mollets", "Étirement des mollets pendant trente secondes."],
  ["Adducteurs", "Étirement des adducteurs pendant trente secondes."],
  [
    "Respiration lente",
    "Respiration lente et profonde pendant trente secondes.",
  ],
];

// "split" uniquement sur des exos WORK qui alternent G/D
const splitDebutWork = ["Jab à gauche / Jab à droite"];
const splitInterWork = [];
const splitConfWork = [];

//////////////////////////////
// Seed
//////////////////////////////
export function seedExercisesIfEmpty(db) {
  const row = db.prepare(`SELECT COUNT(*) AS c FROM exercises`).get();
  if (row.c > 0) return; // déjà peuplé

  const rows = [
    // Débutant
    ...toRows("debutant", "warmup", warmup_debutant),
    ...toRows("debutant", "work", work_debutant, splitDebutWork),
    ...toRows("debutant", "rest", rest_debutant),
    ...toRows("debutant", "stretch", stretch_debutant),

    // Intermédiaire
    ...toRows("intermediaire", "warmup", warmup_inter),
    ...toRows("intermediaire", "work", work_inter, splitInterWork),
    ...toRows("intermediaire", "rest", rest_inter),
    ...toRows("intermediaire", "stretch", stretch_inter),

    // Confirmé
    ...toRows("confirme", "warmup", warmup_conf),
    ...toRows("confirme", "work", work_conf, splitConfWork),
    ...toRows("confirme", "rest", rest_conf),
    ...toRows("confirme", "stretch", stretch_conf),
  ];

  insertMany(db, rows);
}

// --- VERSION MOBILE (Capacitor SQLite) ---
// Reçoit un 'db' qui expose db.run / db.executeSet (capacitor-community/sqlite)
export async function seedExercisesIfEmptyMobile(db) {
  // 1) Crée la table si besoin (reprend exactement ton schéma)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      instruction TEXT NOT NULL,
      duration_default INTEGER NOT NULL DEFAULT 30,
      cue_type TEXT NOT NULL DEFAULT 'single',
      split_seconds INTEGER DEFAULT 15
    );
  `);

  // 2) Check si vide
  const res = await db.query(`SELECT COUNT(*) as c FROM exercises;`);
  const count = res.values?.[0]?.c ?? 0;
  if (count > 0) return;

  // 3) Récupère toutes les lignes "rows" comme dans ton seed d’origine
  //    ==> on réutilise exactement ta "insertMany" + "toRows" etc.
  //    Appelle la même fonction que tu exportes déjà (ton seed d’origine).
  //    Si ton seed d’origine construit 'rows', on re-fait le même travail ici:
  //    (Adaptation simple: reconstruire 'rows' avec tes helpers)
  const rows = buildAllSeedRows();
  // ^^^ implémente cette fonction en réutilisant tes arrays + toRows EXACTS
  //     Renvoie un tableau d’objets: { level, category, name, instruction, duration_default, cue_type, split_seconds }

  // 4) Insert en lot
  const statements = rows.map((r) => ({
    statement: `
      INSERT INTO exercises
      (level, category, name, instruction, duration_default, cue_type, split_seconds)
      VALUES (?, ?, ?, ?, ?, ?, ?);
    `,
    values: [
      r.level,
      r.category,
      r.name,
      r.instruction,
      r.duration_default ?? 30,
      r.cue_type ?? "single",
      r.split_seconds ?? 15,
    ],
  }));

  await db.executeSet({ statements });
}

// Exemple : si dans ton seed d’origine tu faisais insertMany(db, rows)
// Mets ici la version "buildAllSeedRows()" qui renvoie 'rows'.
// Tu peux littéralement copier/coller tes tableaux et ton "toRows", puis:
function buildAllSeedRows() {
  // ... CONSTRUIS et retourne le grand tableau 'rows' comme dans ton backend.
  // Exemple:
  // return [
  //   ...toRows("debutant","warmup", warmup_debutant, splitWarmup),
  //   ...toRows("debutant","work",   work_debutant, splitDebutWork),
  //   ...
  // ];
}
